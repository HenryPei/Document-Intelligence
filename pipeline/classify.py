import yaml, re, datetime
from sqlalchemy import create_engine, text
import os
from pipeline.db import engine

def load_config(path:str) -> dict:
    with open(path) as f:
        return yaml.safe_load(f)

def classify_document(doc_id, conn, config) -> dict:
    rows = conn.execute(
        text("""
            SELECT text FROM pages 
            WHERE document_id = :doc_id 
            AND page_number <= 3
            ORDER BY page_number
        """),
        {"doc_id": doc_id}
    ).fetchall()

    combined = "\n".join(row.text for row in rows)

    for pattern in config["noise_patterns"]:
        combined = re.sub(pattern, "", combined, flags=re.MULTILINE)

    matched_company = None
    for company in config["companies"]:
        for variant in company["variants"]:
            if variant.lower() in combined.lower():
                matched_company = company["canonical"]
                break
        if matched_company:
            break

    matched_doc_type = None
    for doc_type, info in config["doc_types"].items():
        for keyword in info["keywords"]:
            if keyword.lower() in combined.lower():
                matched_doc_type = doc_type
                break
        if matched_doc_type:
            break

    title = None
    page1 = rows[0].text if rows else ""
    for line in page1.split("\n"):
        stripped = line.strip()
        if stripped and not re.match(r'^(ylno|esu|lanosrep|roF)$', stripped):
            title = stripped
            break

    matched_date = None
    for pattern in config["date_patterns"]:
        match = re.search(pattern, combined)
        if match:
            date_str = match.group()
            if re.match(r'(?:SFY|H[12]/)?FY\d{2}', date_str):
                continue
            for fmt in ["%d %B %Y", "%Y-%m-%d"]:
                try:
                    matched_date = datetime.datetime.strptime(date_str, fmt).date()
                    break
                except ValueError:
                    continue
            if matched_date:
                break

    conn.execute(
        text("""
            UPDATE documents
            SET doc_type = :doc_type, title = :title, doc_date = :doc_date, company = :company
            WHERE id = :doc_id
        """),
        {"doc_type": matched_doc_type, "title": title, "doc_date": matched_date, "company": matched_company, "doc_id": doc_id}
    )
    conn.commit()

    return {
        "doc_id": doc_id,
        "company": matched_company,
        "doc_type": matched_doc_type,
        "title": title,
        "doc_date": matched_date
    }




def classify_all(config_path: str):
    config = load_config(config_path)
    
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT id FROM documents WHERE doc_type IS NULL")
        ).fetchall()
        
        classified = 0
        for row in rows:
            result = classify_document(row.id, conn, config)
            if result["doc_type"] or result["company"]:
                classified += 1
        
        print(f"Classified {classified}/{len(rows)} documents. {len(rows) - classified} unmatched.")

if __name__ == "__main__":
    classify_all("config/presets/cedib_lithium.yaml")