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
    """Uses Groq Vision model to extract text from image bytes."""
    try:
        from PIL import Image
        
        # 1. Open the image with PIL
        img = Image.open(io.BytesIO(image_bytes))
        
        # 2. Convert to RGB (in case it's RGBA/PNG)
        if img.mode != 'RGB':
            img = img.convert('RGB')
            
        # 3. Resize if too large (Groq has limits)
        max_size = 1024
        if img.width > max_size or img.height > max_size:
            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            
        # 4. Save as heavily compressed JPEG to guarantee it fits under Groq's 4MB limit
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=75)
        optimized_bytes = buffer.getvalue()
        
        # 5. Base64 encode the guaranteed valid JPEG
        base64_image = base64.b64encode(optimized_bytes).decode('utf-8')
        
        client = get_groq_client()
        
        response = client.chat.completions.create(
            model="llama-3.2-90b-vision-preview",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Extract all the text from this medical document/image. Output ONLY the raw text exactly as it appears. Do not add any conversational filler. If the image is blurry, extract whatever you can see."},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                    ]
                }
            ],
            max_tokens=2048,
            temperature=0.0
        )
        text = response.choices[0].message.content
        if not text or len(text.strip()) < 5:
            return "Vision AI could not read this document."
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
