from PyPDF2 import PdfReader

RESUME_KEYWORDS = [
    "education",
    "experience",
    "skills",
    "projects",
    "internship",
    "certification"
]


def extract_text_from_pdf(file) -> str:
    reader = PdfReader(file)
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text.lower()


def is_valid_resume(file):
    """
    Validate resume PDF and return extracted text
    """
    try:
        text = extract_text_from_pdf(file)

        if len(text.strip()) < 300:
            return False, "Resume content is too short."

        hits = sum(1 for k in RESUME_KEYWORDS if k in text)
        if hits < 2:
            return False, "Document does not appear to be a valid resume."

        return True, text

    except Exception:
        return False, "Unable to read resume file."
