import re
from config.app_config import MAX_UPLOAD_SIZE_MB

def validate_password(password):
    """Validate password meets security requirements."""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number"
    return True, None

def validate_email(email):
    """Validate email format."""
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return bool(re.match(pattern, email))

def validate_signup_fields(name, email, password, confirm_password):
    """Validate all signup form fields."""
    if not all([name, email, password, confirm_password]):
        return False, "Please fill in all fields"
        
    if not validate_email(email):
        return False, "Please enter a valid email address"
        
    if password != confirm_password:
        return False, "Passwords do not match"
        
    is_valid, error_msg = validate_password(password)
    if not is_valid:
        return False, error_msg
        
    return True, None

def validate_pdf_file(file):
    """Validate PDF file size and type."""
    if not file:
        return False, "No file uploaded"
        
    # Check file size
    file_size_mb = file.size / (1024 * 1024)
    if file_size_mb > MAX_UPLOAD_SIZE_MB:
        return False, f"File size ({file_size_mb:.1f}MB) exceeds the {MAX_UPLOAD_SIZE_MB}MB limit"
        
    # Check file type
    if file.type != 'application/pdf':
        return False, "Invalid file type. Please upload a PDF file"
        
    return True, None

def validate_pdf_content(text):
    """Validate if the content appears to be a medical report or symptom description."""
    # Common medical report indicators and general symptoms
    medical_terms = [
        'blood', 'test', 'report', 'laboratory', 'lab', 'patient', 'specimen',
        'reference range', 'analysis', 'results', 'medical', 'diagnostic',
        'hemoglobin', 'wbc', 'rbc', 'platelet', 'glucose', 'creatinine',
        'symptom', 'pain', 'fever', 'headache', 'dizzy', 'fatigue', 'nausea',
        'scan', 'xray', 'x-ray', 'mri', 'ct', 'biopsy', 'diagnosis', 'doctor'
    ]
    
    # Validate minimum text length - lowered to 10 for short manual text like "I feel dizzy"
    if len(text.strip()) < 10:
        return False, "Input text is too short. Please provide more details about your symptoms or medical report."
    
    # Check for medical terms
    text_lower = text.lower()
    term_matches = sum(1 for term in medical_terms if term in text_lower)
    
    # Relaxed threshold to 1 match for short symptom inputs
    if term_matches < 1:
        return False, "The input doesn't appear to contain any medical keywords or common symptoms. Please provide valid health information."
    
    return True, None