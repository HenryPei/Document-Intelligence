# Document Intelligence Pipeline

A full-stack platform for extracting structured, source-linked findings from different documents and file formats. Built for investigative research where every claim must trace to its source.

## Problem

Investigative researchers working with hundreds of PDFs in multiple languages spend hours manually finding, reading, and transcribing data into spreadsheets. Files are scattered, work is duplicated, and nothing is reusable.

## Approach

Ingest documents into a central searchable database with page-level granularity. Every extracted value links to its exact source page. The system is designed to be trustworthy by construction: no value can exist that isn't literally in a document.

### Current capabilities
- PDF ingestion with deduplication (sha256)
- Full-text search in Spanish and English with ranked results and highlighted snippets
- Page-level source linking with full-document popup
- Batch upload via browser or CLI
- REST API with auto-generated documentation
- Document deletion with file cleanup

### Roadmap
- Document classification and cards (type, title, date, key entities)
- Rule-based extraction: amounts, dates, organizations, linked to page and character span
- Entity profiles with confirmed findings, connections, and data gaps
- Relationship mapping between entities (built on FollowTheMoney schema)
- Configurable per-domain presets (finance, biotech, legal)
- Evaluation framework: precision and recall per document type against labeled test set

## Stack

Python · FastAPI · React · PostgreSQL (full-text search) · Docker Compose · Alembic · pdfplumber

## Design principles

- **Traceable:** every value links to a source page and character span
- **Measured:** extraction accuracy evaluated per document type
- **No hallucination by design:** the system locates text, it does not generate it
- **Configurable:** domain-specific entity types, relationship types, and keywords live in config, not code
- **Sustainable:** runs on one machine with one command, minimal dependencies

## Setup

```bash
cp .env.example .env  # fill in values
docker compose up -d
pip install -r requirements.txt
alembic upgrade head
python -m pipeline.ingest <folder>
uvicorn api.main:app --reload
```

## Architecture

PDF / Word / scan
→ adapters → pages (one row per page, with search vector)
→ extraction rules → findings (value, type, page, span)
→ entity resolution → relationship graph
→ templates → entity summaries and reports


## Status

MVP complete. Actively developing extraction and entity layers.