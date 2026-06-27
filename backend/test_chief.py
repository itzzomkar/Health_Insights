import asyncio
import json
import sys
from models.schemas import AnalysisRequest
from agents.chief_agent import run_chief_agent

async def main():
    symptoms = "Patient presents with a 3-day history of sharp, intermittent lower right quadrant abdominal pain, progressively worsening over the last 12 hours. Reports associated nausea, one episode of vomiting, and a complete loss of appetite. Vitals show a low-grade fever with a temperature of 101.2°F (38.4°C) and a slightly elevated heart rate of 98 bpm. Physical examination reveals guarding and severe rebound tenderness at McBurney's point. Recent STAT blood work indicates leukocytosis with a white blood cell count (WBC) of 14,500/mcL and a left shift. No history of previous abdominal surgeries or known drug allergies."
    req = AnalysisRequest(symptoms=symptoms, patient_name="Robert Chen", patient_age=45)
    try:
        res = await run_chief_agent(req)
        print(res)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
