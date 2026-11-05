import pdfplumber

from pipeline.models import Page

def read_pdf(path: str) -> list[Page]:
    pages = []
    with pdfplumber.open(path) as pdf:
        for i, pdf_page in enumerate(pdf.pages, start=1):
            text = pdf_page.extract_text() or ""
            pages.append(Page(number=i, text=text, method="pdf_text"))
    return pages