from fastapi import APIRouter, HTTPException
from models.schemas import AnalysisRequest, ChiefMedicalResponse
from agents.chief_agent import run_chief_agent

router = APIRouter()

@router.post("/", response_model=ChiefMedicalResponse)
async def analyze_symptoms(request: AnalysisRequest):
    try:
        response = await run_chief_agent(request)
        return response
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
