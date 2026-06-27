from fastapi import APIRouter, UploadFile, File, HTTPException
import pdfplumber
import base64
import os
from groq import Groq
import io

router = APIRouter()

def get_groq_client():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is not set")
    return Groq(api_key=api_key)

async def extract_text_from_image_bytes(image_bytes: bytes) -> str:
    """Uses OCR.space free API to extract text from image bytes."""
    try:
        import requests
        from PIL import Image
        
        # 1. Compress image to guarantee it's under OCR.space's 1MB limit
        img = Image.open(io.BytesIO(image_bytes))
        if img.mode != 'RGB':
            img = img.convert('RGB')
            
        max_size = 1024
        if img.width > max_size or img.height > max_size:
            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=75)
        optimized_bytes = buffer.getvalue()
        
        # 2. Base64 encode for OCR.space
        base64_image = "data:image/jpeg;base64," + base64.b64encode(optimized_bytes).decode('utf-8')
        
        # 3. Request OCR.space API (helloworld is the public free tier key)
        resp = requests.post(
            "https://api.ocr.space/parse/image",
            data={
                "base64image": base64_image,
                "language": "eng",
                "isTable": "true",
                "scale": "true"
            },
            headers={"apikey": "helloworld"}
        )
        
        result = resp.json()
        
        if result.get("IsErroredOnProcessing"):
            print(f"OCR.space Error: {result.get('ErrorMessage')}")
            return "The document text could not be extracted. Please upload a clear medical PDF instead."
            
        parsed_results = result.get("ParsedResults", [])
        if not parsed_results:
            return "No text could be found in this image."
            
        text = parsed_results[0].get("ParsedText", "")
        if not text or len(text.strip()) < 5:
            return "No legible text was found in this image. Please upload a clearer image or a PDF."
            
        return text
    except Exception as e:
        print(f"Vision OCR Error: {e}")
        return "The document text could not be extracted due to low image quality."


@router.post("/")
async def upload_document(file: UploadFile = File(...)):
    try:
        content = await file.read()
        filename = file.filename.lower()
        
        extracted_text = ""
        
        # 1. Handle PDF
        if filename.endswith(".pdf"):
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        extracted_text += page_text + "\n"
            
            if len(extracted_text.strip()) < 20:
                return {"extracted_text": "PDF appears to be a scanned image. Please upload as JPG/PNG to use Vision OCR."}
                
        # 2. Handle Images (Cloud Vision OCR)
        elif filename.endswith((".png", ".jpg", ".jpeg")):
            print("Image detected. Running Cloud Vision OCR...")
            extracted_text = await extract_text_from_image_bytes(content)
            
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF, JPG, or PNG.")
            
        return {"extracted_text": extracted_text.strip()}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
