import ollama
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

class ChatAgent:
    def __init__(self):
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000, chunk_overlap=200
        )
        self.model_name = "medllama2"

    def initialize_vector_store(self, text_content):
        """Create vector store from text content."""
        if not text_content or text_content.strip() == "":
            text_content = "No report context available."

        texts = self.text_splitter.split_text(text_content)
        if not texts:
            texts = [text_content]

        vectorstore = FAISS.from_texts(texts, self.embeddings)
        return vectorstore

    def _format_chat_history(self, chat_history):
        """Format chat history for API."""
        messages = []
        for msg in chat_history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        return messages

    def _contextualize_query(self, query, chat_history):
        """Reformulate query considering chat history."""
        if not chat_history:
            return query

        recent_history = chat_history[-4:]
        history_text = "\n".join(
            [
                f"{'User' if msg['role'] == 'user' else 'Assistant'}: {msg['content']}"
                for msg in recent_history
            ]
        )

        contextualize_prompt = f"""Given a chat history and the latest user question, formulate a standalone question which can be understood without the chat history. Do NOT answer the question, just reformulate it if needed and otherwise return it as is.

Chat History:
{history_text}

Latest User Question: {query}

Standalone Question:"""

        try:
            response = ollama.chat(
                model=self.model_name,
                messages=[
                    {
                        "role": "system",
                        "content": "You reformulate questions to be standalone.",
                    },
                    {"role": "user", "content": contextualize_prompt},
                ],
            )
            return response['message']['content'].strip()
        except Exception:
            return query

    def get_response(self, query, vectorstore, chat_history=None):
        """Get response using RAG."""
        if chat_history is None:
            chat_history = []

        contextualized_query = self._contextualize_query(query, chat_history)

        try:
            retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
            docs = retriever.get_relevant_documents(contextualized_query)
            context = "\n\n".join([doc.page_content for doc in docs])

            if context.strip() == "No report context available.":
                context = ""
        except Exception:
            context = ""

        qa_system_prompt = (
            "You are a specialized medical assistant. Your ONLY purpose is to answer health and medical questions. "
            "You may respond politely to simple greetings (Hi, Hello, Bye, Ok). "
            "For ALL OTHER non-medical topics (like writing poems, fixing cars, programming, etc.), you MUST politely decline and remind the user you can only discuss health. "
            "Use the following pieces of retrieved context from the medical report to answer the question. "
            "If you don't know the answer, just say that you don't know. "
            "Use three sentences maximum and keep the answer concise."
        )

        messages = [{"role": "system", "content": qa_system_prompt}]

        if chat_history:
            formatted_history = self._format_chat_history(chat_history[-6:])
            messages.extend(formatted_history)

        if context and context.strip() and context.strip() != "No report context available.":
            user_message = f"Context:\n{context}\n\nQuestion: {query}"
        else:
            user_message = f"Question: {query}\n\nNote: No report context is available. Please answer based on the chat history."
        
        messages.append({"role": "user", "content": user_message})

        try:
            response = ollama.chat(
                model=self.model_name,
                messages=messages
            )
            return response['message']['content']
        except Exception as e:
            return f"Error generating response: {str(e)}"
