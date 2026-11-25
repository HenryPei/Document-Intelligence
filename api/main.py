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

@app.post("/projects")
def create_project(name: str):
    with engine.connect() as conn:
        row = conn.execute(
            text("INSERT INTO projects (name) VALUES (:name) RETURNING id, name, created_at"),
            {"name": name},
        ).first()
        conn.commit()
    return {"id": row.id, "name": row.name, "created_at": row.created_at}

@app.get("/projects")
def list_projects():
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT p.id, p.name, p.created_at, COUNT(d.id) as doc_count
            FROM projects p
            LEFT JOIN documents d ON d.project_id = p.id
            GROUP BY p.id
            ORDER BY p.created_at DESC
        """)).fetchall()
    return [{"id": r.id, "name": r.name, "created_at": r.created_at, "doc_count": r.doc_count} for r in rows]

@app.put("/documents/{doc_id}/project")
def assign_project(doc_id: int, project_id: int = None):
    with engine.connect() as conn:
        conn.execute(
            text("UPDATE documents SET project_id = :project_id WHERE id = :doc_id"),
            {"project_id": project_id, "doc_id": doc_id},
        )
        conn.commit()
    return {"ok": True}

@app.get("/search")
def search(q: str, company: str = None, doc_type: str = None, date_from: str = None, date_to: str = None, project_id: int = None):
    with engine.connect() as conn:
        conditions = ["p.search_vector @@ tsq"]
        params = {"q": q}

        if company:
            conditions.append("d.company = :company")
            params["company"] = company
        if doc_type:
            conditions.append("d.doc_type = :doc_type")
            params["doc_type"] = doc_type
        if date_from:
            conditions.append("d.doc_date >= :date_from")
            params["date_from"] = date_from
        if date_to:
            conditions.append("d.doc_date <= :date_to")
            params["date_to"] = date_to
        if project_id:
            conditions.append("d.project_id = :project_id")
            params["project_id"] = project_id

        where = " AND ".join(conditions)

        rows = conn.execute(
            text(f"""
                SELECT d.original_filename, p.page_number, p.document_id, d.doc_type, d.title, d.doc_date, d.company,
                       ts_headline('simple', p.text, tsq, 'MaxWords=40, MinWords=20, MaxFragments=3') AS snippet
                FROM pages p
                JOIN documents d ON d.id = p.document_id,
                     plainto_tsquery('simple', :q) tsq
                WHERE {where}
                ORDER BY ts_rank(p.search_vector, tsq) DESC
                LIMIT 50
            """),
            params,
        ).fetchall()

        return [
            {
                "filename": row.original_filename,
                "page_number": row.page_number,
                "snippet": row.snippet,
                "document_id": row.document_id,
                "doc_type": row.doc_type,
                "title": row.title,
                "doc_date": str(row.doc_date) if row.doc_date else None,
                "company": row.company
            }
            for row in rows
        ]

@app.get("/filters")
def get_filters():
    with engine.connect() as conn:
        companies = conn.execute(text("SELECT DISTINCT company FROM documents WHERE company IS NOT NULL")).fetchall()
        doc_types = conn.execute(text("SELECT DISTINCT doc_type FROM documents WHERE doc_type IS NOT NULL")).fetchall()
        return {
            "companies": [r.company for r in companies],
            "doc_types": [r.doc_type for r in doc_types]
        }

@app.get("/documents")
async def get_documents(company: str = None, doc_type: str = None, date_from: str = None, date_to: str = None, project_id: int = None):
    with engine.connect() as conn:
        conditions = []
        params = {}
        if company:
            conditions.append("d.company = :company")
            params["company"] = company
        if doc_type:
            conditions.append("d.doc_type = :doc_type")
            params["doc_type"] = doc_type
        if date_from:
            conditions.append("d.doc_date >= :date_from")
            params["date_from"] = date_from
        if date_to:
            conditions.append("d.doc_date <= :date_to")
            params["date_to"] = date_to
        if project_id:
            conditions.append("d.project_id = :project_id")
            params["project_id"] = project_id

        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        rows = conn.execute(
            text(f"""
                SELECT d.id, d.original_filename, d.page_count, d.created_at,
                       d.doc_type, d.title, d.doc_date, d.company, d.project_id
                FROM documents d
                {where}
                ORDER BY created_at DESC
                LIMIT 100
            """),
            params,
        ).fetchall()

    return [
        {
            "document_id": row.id,
            "filename": row.original_filename,
            "page_count": row.page_count,
            "created_at": row.created_at,
            "doc_type": row.doc_type,
            "title": row.title,
            "doc_date": row.doc_date,
            "company": row.company,
            "project_id": row.project_id,
        }
        for row in rows
    ]

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
        "document_id": doc_id,
        "pages": [
            {"page_number": row.page_number, "text": row.text}
            for row in rows
        ],
    }

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