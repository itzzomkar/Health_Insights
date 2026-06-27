import asyncio
import os
from dotenv import load_dotenv
from groq import AsyncGroq

load_dotenv()
client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

async def list_models():
    models = await client.models.list()
    for m in models.data:
        print(m.id)

asyncio.run(list_models())
