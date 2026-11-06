import hashlib
import sys
import traceback
import shutil
from pathlib import Path

from sqlalchemy import text

from pipeline.db import engine
from pipeline.adapters.pdf import read_pdf
from pipeline.models import Page

ORIGINALS = Path("data/originals")

def file_sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def already_ingested(sha: str) -> bool:
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT 1 from documents WHERE sha256 = :sha"),
            {"sha": sha},
        ).first()
    return row is not None

def ingest_file(path: Path) -> str:
    sha = file_sha256(path)
    if already_ingested(sha):
        return "duplicate"

    ORIGINALS.mkdir(parents=True, exist_ok=True)
    stored = ORIGINALS / f"{sha}.pdf"
    shutil.copy2(path, stored)

    pages = read_pdf(str(path))
    has_text = any(p.text.strip() for p in pages)
    status = "done" if has_text else "needs_ocr"

    with engine.begin() as conn:
        doc_id = conn.execute(
            text("""
                INSERT INTO documents
                    (sha256, original_filename, stored_path, file_type, page_count, status)
                VALUES (:sha, :name, :stored, 'pdf', :count, :status)
                RETURNING id
            """),
            {
                "sha": sha,
                "name": path.name,
                "stored": str(stored),
                "count": len(pages),
                "status": status,
            },
        ).scalar_one()

        for page in pages:
            conn.execute(
                text("""
                    INSERT INTO pages
                        (document_id, page_number, text, extraction_method)
                    VALUES (:document_id, :page_number, :text, :method)
                """),
                {
                    "document_id": doc_id,
                    "page_number": page.number,
                    "text": page.text,
                    "method": page.method,
                }
            )
    return status

def ingest_folder(path: Path):
    counts = {"done": 0, "needs_ocr": 0, "failed": 0, "duplicate": 0}

    for pdf in path.glob("*.pdf"):
        try:
            status = ingest_file(pdf)
            counts[status] += 1
        except Exception as e:
            counts["failed"] += 1
            print(pdf, e)
            traceback.print_exc()

    print(counts)

if __name__ == "__main__":
    ingest_folder(Path(sys.argv[1]))