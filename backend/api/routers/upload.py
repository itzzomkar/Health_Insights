from fastapi import APIRouter, UploadFile, File, HTTPException
import fitz  # PyMuPDF
import easyocr

router = APIRouter()

# Initialize EasyOCR reader (loads model into memory)
# We set gpu=True, but it will automatically fall back to CPU if no GPU is available.
try:
    reader = easyocr.Reader(['en'], gpu=True)
except Exception as e:
    print(f"Warning: EasyOCR failed to initialize with GPU, falling back to CPU. {e}")
    reader = easyocr.Reader(['en'], gpu=False)

async def extract_text_from_image_bytes(image_bytes: bytes) -> str:
    """Uses EasyOCR to extract text from image bytes."""
    try:
        results = reader.readtext(image_bytes)
        extracted_text = "\n".join([text for (bbox, text, prob) in results])
        return extracted_text
    except Exception as e:
        print(f"OCR Error: {e}")
        return ""

@router.post("/")
async def upload_document(file: UploadFile = File(...)):
    try:
        content = await file.read()
        filename = file.filename.lower()
        
        extracted_text = ""
        
        # 1. Handle PDF (Local Extraction first)
        if filename.endswith(".pdf"):
            doc = fitz.open(stream=content, filetype="pdf")
            for page in doc:
                extracted_text += page.get_text() + "\n"
            
            # If the PDF is just an image (no text extracted), convert to image and use OCR
            if len(extracted_text.strip()) < 20:
                print("PDF seems to be a scanned image. Falling back to local OCR...")
                page = doc.load_page(0)
                pix = page.get_pixmap()
                img_data = pix.tobytes("png")
                
                extracted_text = await extract_text_from_image_bytes(img_data)
            
            doc.close()
            
        # 2. Handle Images (Local OCR)
        elif filename.endswith((".png", ".jpg", ".jpeg")):
            print("Image detected. Running local OCR...")
            extracted_text = await extract_text_from_image_bytes(content)
            
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF, JPG, or PNG.")
            
        return {"extracted_text": extracted_text.strip()}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
