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
                SELECT d.original_filename, p.page_number,
                       ts_headline('simple', p.text, q, 'MaxWords=60, MinWords=20, MaxFragments=3') AS snippet
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