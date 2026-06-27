import asyncio
import base64
import os
from dotenv import load_dotenv
from groq import AsyncGroq

load_dotenv()
client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

async def test_vision():
    # Create a tiny 1x1 black jpeg in base64
    base64_img = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="
    
    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "What is this?"
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{base64_img}"
                    }
                }
            ]
        }
    ]
    try:
        completion = await client.chat.completions.create(
            model="llama-3.2-90b-vision-preview",
            messages=messages,
            temperature=0.2
        )
        print("SUCCESS:", completion.choices[0].message.content)
    except Exception as e:
        print("ERROR:", str(e))

asyncio.run(test_vision())
