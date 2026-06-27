from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx

router = APIRouter()

class LocationRequest(BaseModel):
    lat: float
    lon: float

@router.post("/clinics")
async def get_clinics(req: LocationRequest):
    """Proxies the request to Overpass API to avoid browser CORS issues on Vercel."""
    radius = 10000
    query = f"""
        [out:json];
        (
          node["amenity"="hospital"](around:{radius},{req.lat},{req.lon});
          node["amenity"="clinic"](around:{radius},{req.lat},{req.lon});
          node["amenity"="doctors"](around:{radius},{req.lat},{req.lon});
        );
        out body;
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # We use httpx to make the request from the Render server instead of the browser
            # Overpass API requires a custom User-Agent and data payload format or it returns 406 Not Acceptable
            response = await client.post(
                'https://overpass-api.de/api/interpreter',
                data={'data': query},
                headers={'User-Agent': 'HealthInsightsApp/1.0 (KaggleCapstone)'}
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        print(f"Overpass API Proxy Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch clinics from Overpass API")
