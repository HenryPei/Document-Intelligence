from fastapi import FastAPI
from sqlalchemy import text
from pipeline.db import engine
from fastapi.middleware.cors import CORSMiddleware

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
            """),
            {"q": q},
        ).fetchall()

        results = [
            {
                "filename": row.original_filename,
                "page_number": row.page_number,
                "snippet": row.snippet,
                "document_id": row.document_id
            }
            for row in rows
        ]

    return results

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