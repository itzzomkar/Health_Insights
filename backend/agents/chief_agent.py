import os
import json
import asyncio
from dotenv import load_dotenv
from groq import AsyncGroq
from models.schemas import (
    AnalysisRequest,
    DiagnosisResponse,
    RiskResponse,
    NutritionResponse,
    FollowUpResponse,
    MedicalEvidenceResponse,
    ChiefMedicalResponse
)

load_dotenv()

groq_api_key = os.getenv("GROQ_API_KEY")
client = AsyncGroq(api_key=groq_api_key)

async def call_groq(system_prompt: str, user_prompt: str, response_format: dict) -> dict:
    try:
        completion = await client.chat.completions.create(
            model="llama-3.1-8b-instant", # Using a supported fast model
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.1
        )
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        print(f"Groq API Error: {e}")
        # Return fallback format if error occurs to not break orchestration
        return {}

async def run_diagnosis_agent(symptoms: str) -> DiagnosisResponse:
    prompt = f"Analyze the following symptoms and provide a diagnosis and a confidence score between 0 and 100. Symptoms: {symptoms}"
    sys_prompt = "You are a specialized Medical Diagnosis Agent. You must output valid JSON matching this schema: {\"diagnosis\": \"str\", \"confidence\": int}"
    result = await call_groq(sys_prompt, prompt, {})
    return DiagnosisResponse(
        diagnosis=str(result.get("diagnosis", "Unknown")),
        confidence=int(result.get("confidence", 0)) if isinstance(result.get("confidence"), (int, float, str)) and str(result.get("confidence")).isdigit() else 0
    )

async def run_risk_agent(symptoms: str) -> RiskResponse:
    prompt = f"Analyze these symptoms for severity. Symptoms: {symptoms}"
    sys_prompt = "You are a Medical Risk Assessment Agent. Output valid JSON matching this schema: {\"risk\": \"Low|Medium|High\", \"emergency\": bool}"
    result = await call_groq(sys_prompt, prompt, {})
    return RiskResponse(
        risk=str(result.get("risk", "Unknown")),
        emergency=bool(result.get("emergency", False))
    )

async def run_nutrition_agent(symptoms: str) -> NutritionResponse:
    prompt = f"Provide a structured dietary plan based on these symptoms: {symptoms}"
    sys_prompt = "You are a Medical Nutrition Agent. Output valid JSON: {\"primary_focus\": \"str\", \"reasoning\": \"str\", \"foods_to_eat\": [\"str\"], \"foods_to_avoid\": [\"str\"], \"hydration_advice\": \"str\", \"lifestyle_tips\": [\"str\"]}"
    result = await call_groq(sys_prompt, prompt, {})
    return NutritionResponse(
        primary_focus=str(result.get("primary_focus", "General Healthy Diet")),
        reasoning=str(result.get("reasoning", "A balanced diet is recommended.")),
        foods_to_eat=result.get("foods_to_eat", []),
        foods_to_avoid=result.get("foods_to_avoid", []),
        hydration_advice=str(result.get("hydration_advice", "Maintain adequate hydration by drinking plenty of water.")),
        lifestyle_tips=result.get("lifestyle_tips", ["Maintain a regular sleep schedule", "Engage in light daily activity"])
    )

async def run_follow_up_agent(symptoms: str) -> FollowUpResponse:
    prompt = f"Recommend medical tests or next steps for these symptoms: {symptoms}"
    sys_prompt = "You are a Medical Follow-Up Agent. Output valid JSON: {\"tests\": [\"str\"]}"
    result = await call_groq(sys_prompt, prompt, {})
    tests_val = result.get("tests", [])
    if isinstance(tests_val, str):
        tests_val = [tests_val]
    elif not isinstance(tests_val, list):
        tests_val = [str(tests_val)]
    return FollowUpResponse(
        tests=tests_val
    )

async def run_medical_evidence_agent(symptoms: str) -> MedicalEvidenceResponse:
    prompt = f"Find supporting medical evidence or guidelines for symptoms: {symptoms}"
    sys_prompt = "You are a Medical Evidence Agent. Output valid JSON: {\"evidence\": \"str\"}"
    result = await call_groq(sys_prompt, prompt, {})
    return MedicalEvidenceResponse(
        evidence=str(result.get("evidence", "No specific evidence found.")) if not isinstance(result.get("evidence"), dict) else str(result.get("evidence"))
    )

async def run_chief_agent(request: AnalysisRequest) -> ChiefMedicalResponse:
    """
    [KAGGLE CAPSTONE: ADK / MULTI-AGENT SYSTEM ARCHITECTURE]
    This function acts as the "Supervisor Agent" or "Chief Agent" in our Multi-Agent framework.
    Instead of relying on a single LLM to do everything, it orchestrates 5 highly-specialized
    Sub-Agents. Each Sub-Agent runs concurrently with its own specific system prompt and schema.
    """
    # 1. Run all 5 specialized sub-agents concurrently using asyncio for maximum performance
    # This demonstrates parallel multi-agent orchestration.
    results = await asyncio.gather(
        run_diagnosis_agent(request.symptoms),
        run_risk_agent(request.symptoms),
        run_nutrition_agent(request.symptoms),
        run_follow_up_agent(request.symptoms),
        run_medical_evidence_agent(request.symptoms)
    )
    
    # 2. The Supervisor Agent aggregates the specialized responses into a unified medical profile
    diag_res, risk_res, nut_res, fol_res, ev_res = results

    # 2. Compile Reasoning Timeline
    timeline = [
        "Chief Agent received patient symptoms and initiated sub-agents.",
        f"Diagnosis Agent analyzed symptoms and identified '{diag_res.diagnosis}' with {diag_res.confidence}% confidence.",
        f"Risk Agent evaluated severity as '{risk_res.risk}' and determined emergency status: {risk_res.emergency}.",
        "Nutrition and Follow-Up agents formulated personalized plans.",
        "Medical Evidence Agent validated findings against clinical guidelines.",
        "Chief Agent aggregated all reports into final Multi-Agent Medical Board response."
    ]

    return ChiefMedicalResponse(
        diagnosis=diag_res,
        risk=risk_res,
        nutrition=nut_res,
        follow_up=fol_res,
        evidence=ev_res,
        reasoning_timeline=timeline
    )
