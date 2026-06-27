from pydantic import BaseModel
from typing import List

class AnalysisRequest(BaseModel):
    symptoms: str
    patient_name: str
    patient_age: int

class DiagnosisResponse(BaseModel):
    diagnosis: str
    confidence: int

class RiskResponse(BaseModel):
    risk: str
    emergency: bool

class NutritionResponse(BaseModel):
    primary_focus: str
    reasoning: str
    foods_to_eat: List[str]
    foods_to_avoid: List[str]
    hydration_advice: str
    lifestyle_tips: List[str]

class FollowUpResponse(BaseModel):
    tests: List[str]

class MedicalEvidenceResponse(BaseModel):
    evidence: str

class ChiefMedicalResponse(BaseModel):
    diagnosis: DiagnosisResponse
    risk: RiskResponse
    nutrition: NutritionResponse
    follow_up: FollowUpResponse
    evidence: MedicalEvidenceResponse
    reasoning_timeline: List[str]

class ChatMessage(BaseModel):
    role: str
    text: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    context: str | None = None
