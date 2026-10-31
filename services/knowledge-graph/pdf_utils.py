import io
from typing import Optional
import pypdf

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract plain text from PDF bytes using pypdf."""
    reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
    extracted_pages = []
    for idx, page in enumerate(reader.pages):
        page_text = page.extract_text() or ""
        if page_text.strip():
            extracted_pages.append(f"--- Page {idx + 1} ---\n{page_text}")
    return "\n\n".join(extracted_pages)
