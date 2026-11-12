from fastapi import FastAPI, UploadFile, HTTPException
from sqlalchemy import text
from pipeline.db import engine
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from pipeline.ingest import ingest_file
import traceback
import os

UPLOADS = Path("data/uploads")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/search")
def search(q: str):
    with engine.connect() as conn:
        rows = conn.execute(
            text("""
                SELECT d.original_filename, p.page_number, p.document_id,
                       ts_headline('simple', p.text, q, 'MaxWords=40, MinWords=20, MaxFragments=3') AS snippet
                FROM pages p
                JOIN documents d ON d.id = p.document_id,
                     plainto_tsquery('simple', :q) q
                WHERE p.search_vector @@ q
                ORDER BY ts_rank(p.search_vector, q) DESC
                LIMIT 50
            """),
            {"q": q},
        ).fetchall()

        return [
            {
                "filename": row.original_filename,
                "page_number": row.page_number,
                "snippet": row.snippet,
                "document_id": row.document_id
            }
            for row in rows
        ]

@app.get("/documents/{doc_id}/pages/{page_num}")
def get_page(doc_id: int, page_num: int):
    with engine.connect() as conn:
        row = conn.execute(
            text("""
                SELECT p.text, d.original_filename
                    FROM pages p
                JOIN documents d ON d.id = p.document_id
                WHERE p.document_id = :doc_id AND p.page_number = :page_num
            """),
            {"doc_id": doc_id, "page_num": page_num},
        ).first()

    return {
        "filename": row.original_filename,
        "page_number": page_num,
        "text": row.text,
    }

@app.get("/documents/{doc_id}/pages")
def get_all_pages(doc_id: int):
    with engine.connect() as conn:
        rows = conn.execute(
            text("""
                SELECT p.page_number, p.text, d.original_filename
                    FROM pages p
                JOIN documents d ON d.id = p.document_id
                WHERE p.document_id = :doc_id
                ORDER BY p.page_number
            """),
            {"doc_id": doc_id},
        ).fetchall()

    return {
        "filename": rows[0].original_filename if rows else "",
        "pages": [
            {"page_number": row.page_number, "text": row.text}
            for row in rows
        ],
    }

@app.post("/uploadfile")
async def upload_file_batch(files: list[UploadFile]):
    UPLOADS.mkdir(parents=True, exist_ok=True)
    counts = {"done": 0, "needs_ocr": 0, "failed": 0, "duplicate": 0}

    for file in files:
        content = await file.read()
        path = UPLOADS / file.filename
        open(path, "wb").write(content)
        try:
            status = ingest_file(path)
            counts[status] += 1
        except Exception as e:
            counts["failed"] += 1
            print(path, e)
            traceback.print_exc()

    return counts

@app.delete("/documents/{doc_id}")
async def delete_document(doc_id: int):
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                DELETE from documents WHERE id = :doc_id
                RETURNING stored_path
            """),
            {"doc_id":doc_id}
        )
        row = result.fetchone()
        conn.commit()
        if not row:
            raise HTTPException(status_code=404, detail="Document not found")
        try:
            os.remove(row.stored_path)
        except Exception as e:
            pass