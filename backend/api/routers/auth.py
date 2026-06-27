from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def auth_status():
    return {"status": "Auth endpoint active"}
