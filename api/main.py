from fastapi import FastAPI
from sqlalchemy import text
from pipeline.db import engine

app = FastAPI()


@app.get("/search")
def search(q: str):
    with engine.connect() as conn:
        rows = conn.execute(
            text("""
                SELECT d.original_filename, p.page_number,
                       ts_headline('simple', p.text, q) AS snippet
                FROM pages p
                JOIN documents d ON d.id = p.document_id,
                     plainto_tsquery('simple', :q) q
                WHERE p.search_vector @@ q
                ORDER BY ts_rank(p.search_vector, q) DESC
                LIMIT 20
            """),
            {"q": q},
        ).fetchall()

        results = [
            {
                "filename": row.original_filename,
                "page_number": row.page_number,
                "snippet": row.snippet,
            }
            for row in rows
        ]

    return results