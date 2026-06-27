import ollama
import logging
import time

logger = logging.getLogger(__name__)

class ModelManager:
    """
    Manages AI model inference using a local Ollama instance.
    """
    
    def __init__(self):
        self.model = "medllama2"
        # Check if ollama is available, though we'll assume it is running locally
        try:
            # simple check if the model is available (not strictly required here, but good practice)
            pass
        except Exception as e:
            logger.error(f"Failed to initialize Ollama client: {str(e)}")

    def generate_analysis(self, data, system_prompt, retry_count=0):
        """
        Generate analysis using the local Ollama model.
        """
        if retry_count > 3:
            return {"success": False, "error": "Model failed after multiple retries"}

        try:
            logger.info(f"Attempting generation with local Ollama model: {self.model}")
            
            response = ollama.chat(model=self.model, messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": str(data)}
            ])
            
            return {
                "success": True,
                "content": response['message']['content'],
                "model_used": f"ollama/{self.model}"
            }
                
        except Exception as e:
            error_message = str(e).lower()
            logger.warning(f"Ollama Model {self.model} failed: {error_message}")
            
            # Wait briefly before retrying
            time.sleep(2)
            
            return self.generate_analysis(data, system_prompt, retry_count + 1)
