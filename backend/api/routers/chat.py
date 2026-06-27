import json
from fastapi import APIRouter, HTTPException
from models.schemas import ChatRequest
from agents.chief_agent import client

router = APIRouter()

# --- AGENT SKILL (TOOL) DEFINITION ---
def calculate_health_metrics(weight_kg: float, height_cm: float) -> str:
    """Agent Skill: Calculates BMI and health category based on real data."""
    try:
        bmi = round(weight_kg / ((height_cm / 100) ** 2), 2)
        category = "Normal weight"
        if bmi < 18.5: category = "Underweight"
        elif bmi >= 25 and bmi < 30: category = "Overweight"
        elif bmi >= 30: category = "Obese"
        
        ideal_weight_low = round(18.5 * ((height_cm / 100) ** 2), 1)
        ideal_weight_high = round(24.9 * ((height_cm / 100) ** 2), 1)
        
        return f"BMI is {bmi} ({category}). Ideal weight range is {ideal_weight_low}kg - {ideal_weight_high}kg."
    except Exception as e:
        return f"Error calculating metrics: {str(e)}"

# Define the Tool Schema for Groq
health_metrics_tool = {
    "type": "function",
    "function": {
        "name": "calculate_health_metrics",
        "description": "Calculate BMI (Body Mass Index) and provide ideal weight ranges given a weight and height.",
        "parameters": {
            "type": "object",
            "properties": {
                "weight_kg": {"type": "number", "description": "Weight in kilograms"},
                "height_cm": {"type": "number", "description": "Height in centimeters"}
            },
            "required": ["weight_kg", "height_cm"]
        }
    }
}

@router.post("/")
async def chat_message(request: ChatRequest):
    try:
        # Build the system prompt with context if available
        system_msg = "You are the Health Insights Chat Assistant, a highly intelligent and empathetic medical AI. You have a skill/tool called 'calculate_health_metrics'. If the user provides weight and height, ALWAYS use this tool to calculate their metrics."
        if request.context:
            system_msg += f"\n\nThe user recently received the following Multi-Agent Medical Analysis. Use this context to answer their questions:\n{request.context}"
        
        # Convert Pydantic messages to Groq format
        groq_messages = [{"role": "system", "content": system_msg}]
        for msg in request.messages:
            groq_role = "assistant" if msg.role == "agent" else msg.role
            groq_messages.append({"role": groq_role, "content": msg.text})
            
        # First Agent Call (With Tool provided)
        completion = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=groq_messages,
            tools=[health_metrics_tool],
            tool_choice="auto",
            temperature=0.5
        )
        
        message = completion.choices[0].message
        
        # Check if the Agent decided to use its Skill (Tool Call)
        if message.tool_calls:
            # 1. Append the Agent's tool call request to history
            groq_messages.append(message)
            
            # 2. Execute the Skill in Python
            for tool_call in message.tool_calls:
                if tool_call.function.name == "calculate_health_metrics":
                    args = json.loads(tool_call.function.arguments)
                    result = calculate_health_metrics(args.get("weight_kg", 0), args.get("height_cm", 0))
                    
                    # 3. Append the Skill's result to history
                    groq_messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "name": tool_call.function.name,
                        "content": result
                    })
            
            # 4. Second Agent Call (To formulate the final answer using the skill result)
            final_completion = await client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=groq_messages,
                temperature=0.5
            )
            reply = final_completion.choices[0].message.content
        else:
            reply = message.content
            
        return {"reply": reply}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
