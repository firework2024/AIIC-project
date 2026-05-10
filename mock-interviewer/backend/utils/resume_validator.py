from PyPDF2 import PdfReader

RESUME_KEYWORDS = [
    "education",
    "experience",
    "skills",
    "projects",
    "internship",
    "certification",
    "教育",
    "经历",
    "实习",
    "项目",
    "技能",
    "证书",
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
        compact_text = text.replace(" ", "")

        if len(text.strip()) < 300:
            return False, "简历内容太短，无法有效解析。"

        hits = sum(1 for k in RESUME_KEYWORDS if k in text or k in compact_text)
        if hits < 2:
            return False, "该文件看起来不像有效简历。"

        return True, text

    except Exception:
        return False, "无法读取简历文件。"
