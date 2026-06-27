from datetime import datetime, timedelta
import streamlit as st
import ollama
import logging

try:
    from octochains.base import Agent, Aggregator
    from octochains.engine import Engine
except ImportError:
    # Fallback/Mock just in case octochains isn't installed during dev
    class Agent:
        def __init__(self, role, goal):
            self.role = role
            self.goal = goal
        def _build_prompt(self, p):
            return f"{self.role}: {self.goal}\n{p}"
    class Aggregator:
        def __init__(self, role, goal, llm_callable):
            self.role = role
            self.goal = goal
            self.llm_callable = llm_callable
        def _format_reports(self, r):
            return str(r)
    class Engine:
        def __init__(self, agents, aggregator):
            self.agents = agents
            self.aggregator = aggregator
            
        def run(self, problem_data, show_log=False):
            class Report:
                def __init__(self, c, t):
                    self.consensus = c
                    self.traces = t
            return Report("Please install octochains", {})

logger = logging.getLogger(__name__)

# LLM Callable for Octochains using Groq
def groq_llm(prompt: str) -> str:
    try:
        import urllib.request
        import json
        import os
        
        # Try to get from st.secrets first, then env
        try:
            api_key = st.secrets["GROQ_API_KEY"]
        except Exception:
            api_key = os.environ.get("GROQ_API_KEY", "")
            
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
        data = {
            "model": "llama-3.1-8b-instant",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2
        }
        
        req = urllib.request.Request(url, headers=headers, data=json.dumps(data).encode("utf-8"))
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode("utf-8"))
            return result['choices'][0]['message']['content']
    except Exception as e:
        err_msg = str(e)
        if hasattr(e, 'read'):
            err_msg += " Body: " + e.read().decode('utf-8')
        logger.error(f"Groq API error: {err_msg}")
        return f"API error: {err_msg}"

# Define Parallel Agents
class PathologyAgent(Agent):
    def __init__(self):
        super().__init__(
            role="Pathology Specialist", 
            goal="Analyze any numerical lab results, test metrics, or pathology descriptions provided in the report."
        )

    def execute(self, problem_data: str) -> str:
        system_prompt = self._build_prompt(problem_data)
        full_prompt = f"{system_prompt}\n\nPlease provide your specialized pathology analysis based on the report."
        return groq_llm(full_prompt)

class DiagnosticAgent(Agent):
    def __init__(self):
        super().__init__(
            role="Diagnostic Specialist", 
            goal="Correlate the patient's symptoms with any provided test results to predict potential diseases or conditions."
        )

    def execute(self, problem_data: str) -> str:
        system_prompt = self._build_prompt(problem_data)
        full_prompt = f"{system_prompt}\n\nPlease provide your specialized diagnostic analysis and potential differential diagnoses."
        return groq_llm(full_prompt)

class ClinicalDietitianAgent(Agent):
    def __init__(self):
        super().__init__(
            role="Clinical Dietitian Specialist", 
            goal="Analyze the patient's condition, symptoms, and test results to formulate a highly specific, actionable dietary and lifestyle plan."
        )

    def execute(self, problem_data: str) -> str:
        system_prompt = self._build_prompt(problem_data)
        full_prompt = f"{system_prompt}\n\nPlease provide a customized dietary plan indicating what to eat and avoid based on the findings."
        return groq_llm(full_prompt)

# Define Aggregator
class ChiefMedicalOfficer(Aggregator):
    def __init__(self):
        super().__init__(
            role="Chief Medical Officer",
            goal="Synthesize the specialized medical reports into a comprehensive, patient-friendly final report.",
            llm_callable=groq_llm
        )

    def execute(self, agent_reports: dict) -> str:
        compiled_reports = self._format_reports(agent_reports)
        prompt = f"""
        Role: {self.role}
        Goal: {self.goal}
        
        You have received the following isolated analyses from your specialized medical team:
        {compiled_reports}
        
        Please provide the FINAL VERDICT. Combine the medical insights, disease predictions, and the custom dietary plan into a single cohesive, highly accurate health report for the patient. 
        CRITICAL INSTRUCTION: You MUST write out the FULL dietary plan and specific medical insights in your response. Do NOT summarize it by saying "see attached" or "refer to the diet plan". You must literally copy or integrate the specific foods, nutrients, and meal suggestions into your response.
        Format your response using Markdown headers (e.g. ### Diagnosis, ### Dietary Plan, ### Recommendations).
        Do NOT repeat these instructions. Do NOT include any meta-notes.
        
        FINAL VERDICT:
        """
        return self.llm_callable(prompt)


class AnalysisAgent:
    """
    Agent responsible for managing report analysis using Octochains parallel reasoning.
    """
    
    def __init__(self):
        self._init_state()
        
    def _init_state(self):
        """Initialize analysis-related session state variables."""
        if 'analysis_count' not in st.session_state:
            st.session_state.analysis_count = 0
        if 'last_analysis' not in st.session_state:
            st.session_state.last_analysis = datetime.now()
        if 'analysis_limit' not in st.session_state:
            st.session_state.analysis_limit = 15
        if 'models_used' not in st.session_state:
            st.session_state.models_used = {}
            
    def check_rate_limit(self):
        """Check if user has reached their analysis limit."""
        time_until_reset = timedelta(days=1) - (datetime.now() - st.session_state.last_analysis)
        hours, remainder = divmod(time_until_reset.seconds, 3600)
        minutes, _ = divmod(remainder, 60)
        
        if time_until_reset.days < 0:
            st.session_state.analysis_count = 0
            st.session_state.last_analysis = datetime.now()
            return True, None
        
        if st.session_state.analysis_count >= st.session_state.analysis_limit:
            error_msg = f"Daily limit reached. Reset in {hours}h {minutes}m"
            return False, error_msg
        return True, None

    def analyze_report(self, data, system_prompt, check_only=False, chat_history=None):
        """
        Analyze report data using Octochains parallel multi-agent reasoning.
        """
        can_analyze, error_msg = self.check_rate_limit()
        if not can_analyze:
            return {"success": False, "error": error_msg}
        
        if check_only:
            return can_analyze, error_msg
        
        processed_data = self._preprocess_data(data)
        
        # Build problem context
        symptoms_text = f"\n\nCurrent Symptoms:\n{processed_data['symptoms']}" if processed_data.get('symptoms') else ""
        problem_context = f"Patient Info: {processed_data['age']} years old, {processed_data['gender']}{symptoms_text}\n\nReport Text:\n{processed_data['report']}"
        
        # Initialize Octochains Engine with Parallel Agents
        engine = Engine(
            agents=[PathologyAgent(), DiagnosticAgent(), ClinicalDietitianAgent()],
            aggregator=ChiefMedicalOfficer()
        )
        
        try:
            logger.info("Starting Octochains parallel reasoning execution...")
            report = engine.run(
                problem_data=problem_context,
                show_log=False
            )
            
            # Update analytics
            self._update_analytics("groq/llama3-8b (Octochains)")
            
            return {
                "success": True,
                "content": report.consensus,
                "model_used": "groq/llama3-8b (Octochains)"
            }
        except Exception as e:
            logger.error(f"Octochains execution failed: {str(e)}")
            return {"success": False, "error": f"Analysis failed: {str(e)}"}
    
    def _update_analytics(self, model_used):
        """Update analytics after successful analysis."""
        st.session_state.analysis_count += 1
        st.session_state.last_analysis = datetime.now()
        
        if model_used in st.session_state.models_used:
            st.session_state.models_used[model_used] += 1
        else:
            st.session_state.models_used[model_used] = 1
    
    def _preprocess_data(self, data):
        """Pre-process data before sending to model."""
        if isinstance(data, dict):
            return {
                "patient_name": data.get("patient_name", ""),
                "age": data.get("age", ""),
                "gender": data.get("gender", ""),
                "symptoms": data.get("symptoms", ""),
                "report": data.get("report", "")
            }
        return data
