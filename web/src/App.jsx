import { useState, useEffect } from "react";

function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploadResult, setUploadResult] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [filters, setFilters] = useState({ companies: [], doc_types: [] });
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedDocType, setSelectedDocType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    fetch("http://localhost:8000/filters").then(r => r.json()).then(setFilters);
  }, []);

  useEffect(() => {
    if (query) {
      handleSearch({ preventDefault: () => {} });
    }
  }, [selectedCompany, selectedDocType, dateFrom, dateTo]);

  useEffect(() => { loadDocuments(); }, [selectedCompany, selectedDocType, dateFrom, dateTo]);

  useEffect(() => {
    if (page && page.scrollTo) {
      const el = document.getElementById(`page-${page.scrollTo}`);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, [page]);

async function handleSearch(e) {
  e.preventDefault();
  const params = new URLSearchParams({ q: query });
  if (selectedCompany) params.append("company", selectedCompany);
  if (selectedDocType) params.append("doc_type", selectedDocType);
  if (dateFrom) params.append("date_from", dateFrom);
  if (dateTo) params.append("date_to", dateTo);
  const response = await fetch(`http://localhost:8000/search?${params}`);
  const data = await response.json();
  setResults(data);
}

async function loadDocuments() {
    const params = new URLSearchParams();
    if (selectedCompany) params.append("company", selectedCompany);
    if (selectedDocType) params.append("doc_type", selectedDocType);
    if (dateFrom) params.append("date_from", dateFrom);
    if (dateTo) params.append("date_to", dateTo);
    const response = await fetch(`http://localhost:8000/documents/?${params}`);
    const data = await response.json();
    setDocuments(data);
}

  async function loadPage(docId, pageNum) {
    const response = await fetch(`http://localhost:8000/documents/${docId}/pages`);
    const data = await response.json();
    setPage({ ...data, scrollTo: pageNum });
  }

  async function uploadFiles(e) {
    e.preventDefault();
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file)
    }
    const response = await fetch(`http://localhost:8000/uploadfile/`, {method: "POST", body: formData});
    const data = await response.json();
    setUploadResult(data);
  }

  async function handleDelete(docId) {
    if (!window.confirm("Delete this document?")) return;
    await fetch (`http://localhost:8000/documents/${docId}`, {method: "DELETE"});
    setResults(prev => prev.filter(r => r.document_id !== docId));
    setPage(null);
  }

  const isSearching = results.length > 0 || query.length > 0;

  return (
    <div>
      <h1>CEDIB Document Search</h1>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value === "") setResults([]);
          }}
          placeholder="Search documents..."
        />
        <button type="submit">Search</button>
        {isSearching && (
          <button type="button" onClick={() => { setQuery(""); setResults([]); }}>Clear</button>
        )}
      </form>
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}>
          <option value="">All companies</option>
          {filters.companies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={selectedDocType} onChange={e => setSelectedDocType(e.target.value)}>
          <option value="">All types</option>
          {filters.doc_types.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
      </div>
      <form onSubmit={uploadFiles}>
        <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files))} />
        <button type="submit">Upload</button>
      </form>
      {uploadResult && (
        <p>Done: {uploadResult.done}, Duplicate: {uploadResult.duplicate}, Needs OCR: {uploadResult.needs_ocr}, Failed: {uploadResult.failed}</p>
      )}
      {!isSearching && (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {documents.map((doc) => (
            <li key={doc.document_id} onClick={() => loadPage(doc.document_id, 1)} style={{ cursor: "pointer" }}>
              <strong>{doc.title || doc.filename}</strong> — {doc.company && `${doc.company} · `}{doc.doc_type && `${doc.doc_type} · `}{doc.page_count} pages
            </li>
          ))}
        </ul>
      )}
      {isSearching && (
        <ul>
          {results.map((r, i) => (
            <li key={i} onClick={() => loadPage(r.document_id, r.page_number)} style={{ cursor: "pointer" }}>
              <strong>{r.title || r.filename}</strong> — {r.company && `${r.company} · `}{r.doc_type && `${r.doc_type} · `}{r.doc_date || `page ${r.page_number}`}
              <p dangerouslySetInnerHTML={{ __html: r.snippet }} />
            </li>
          ))}
        </ul>
      )}
      {page && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
        }} onClick={() => setPage(null)}>
          <div style={{
            backgroundColor: "white",
            width: "80%",
            maxHeight: "80%",
            overflow: "auto",
            padding: "20px",
            borderRadius: "8px",
          }} onClick={(e) => e.stopPropagation()}>
            <h2>{page.filename}</h2>
            <button onClick={() => setPage(null)}>✕ Close</button>
            <button onClick={() => handleDelete(page.document_id)}>🗑 Delete</button>
            {page.pages.map((p) => (
              <div key={p.page_number} id={`page-${p.page_number}`} style={{
                borderTop: "1px solid #ccc",
                marginTop: "16px",
                paddingTop: "16px",
              }}>
                <h3>Page {p.page_number}</h3>
                <pre style={{ whiteSpace: "pre-wrap" }}>{p.text}</pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;