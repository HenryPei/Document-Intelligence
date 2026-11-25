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
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [selectedDocs, setSelectedDocs] = useState(new Set());
  const [apiKey, setApiKey] = useState(localStorage.getItem("apiKey") || "");
  const [loggedIn, setLoggedIn] = useState(localStorage.getItem("apiKey"));

  function authFetch(url, options = {}) {
    return fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${apiKey}` },
    });
  }

  useEffect(() => {
    if (loggedIn) authFetch("http://localhost:8000/projects").then(r => r.json()).then(setProjects);
  }, [loggedIn]);

  useEffect(() => {
    if (loggedIn) authFetch("http://localhost:8000/filters").then(r => r.json()).then(setFilters);
  }, [loggedIn]);

  useEffect(() => {
    if (loggedIn) loadDocuments();
  }, [loggedIn, selectedCompany, selectedDocType, dateFrom, dateTo, selectedProject]);

  useEffect(() => {
    if (loggedIn && query) {
      handleSearch({ preventDefault: () => {} });
    }
  }, [loggedIn, selectedCompany, selectedDocType, dateFrom, dateTo]);

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
  if (selectedProject) params.append("project_id", selectedProject);
  const response = await authFetch(`http://localhost:8000/search?${params}`);
  const data = await response.json();
  setResults(data);
}

async function loadDocuments() {
    const params = new URLSearchParams();
    if (selectedCompany) params.append("company", selectedCompany);
    if (selectedDocType) params.append("doc_type", selectedDocType);
    if (dateFrom) params.append("date_from", dateFrom);
    if (dateTo) params.append("date_to", dateTo);
    if (selectedProject) params.append("project_id", selectedProject);
    const paramStr = params.toString();
    const response = await authFetch(`http://localhost:8000/documents${paramStr ? `?${paramStr}` : ""}`);
    const data = await response.json();
    setDocuments(data);
}

  async function loadPage(docId, pageNum) {
    const response = await authFetch(`http://localhost:8000/documents/${docId}/pages`);
    const data = await response.json();
    setPage({ ...data, scrollTo: pageNum });
  }

  async function uploadFiles(e) {
    e.preventDefault();
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file)
    }
    const response = await authFetch(`http://localhost:8000/uploadfile/`, {method: "POST", body: formData});
    const data = await response.json();
    setUploadResult(data);
  }

  async function handleDelete(docId) {
    if (!window.confirm("Delete this document?")) return;
    await authFetch (`http://localhost:8000/documents/${docId}`, {method: "DELETE"});
    setResults(prev => prev.filter(r => r.document_id !== docId));
    setPage(null);
  }

  const isSearching = results.length > 0 || query.length > 0;
if (!loggedIn) return (
    <div>
        <h1>CEDIB Login</h1>
        <input type="password" placeholder="Password" onChange={e => setApiKey(e.target.value)} />
        <button onClick={async () => {
          const r = await fetch("http://localhost:8000/filters", {
            headers: { Authorization: `Bearer ${apiKey}` }
          });
          if (r.ok) {
            localStorage.setItem("apiKey", apiKey);
            setLoggedIn(true);
          } else {
            alert("Wrong password");
          }
        }}>Enter</button>
    </div>
);

else return (
    <div style={{ display: "flex" }}>
      <div style={{ width: "220px", borderRight: "1px solid #ccc", padding: "16px", minHeight: "100vh" }}>
        <h3>Projects</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li onClick={() => setSelectedProject(null)} style={{ cursor: "pointer", fontWeight: !selectedProject ? "bold" : "normal", marginBottom: "4px" }}>
            All Documents
          </li>
          {projects.map(p => (
            <li key={p.id} onClick={() => setSelectedProject(p.id)} style={{ cursor: "pointer", fontWeight: selectedProject === p.id ? "bold" : "normal", marginBottom: "4px" }}>
              {p.name} ({p.doc_count})
            </li>
          ))}
        </ul>
        <div style={{ marginTop: "12px" }}>
          <input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="New project..." style={{ width: "140px" }} />
          <button onClick={async () => {
            if (!newProjectName) return;
            await authFetch(`http://localhost:8000/projects?name=${encodeURIComponent(newProjectName)}`, { method: "POST" });
            setNewProjectName("");
            const r = await authFetch("http://localhost:8000/projects"); setProjects(await r.json());
          }}>+</button>
        </div>
      </div>
      <div style={{ flex: 1, padding: "16px" }}>
        <h1>CEDIB Document Search</h1>
        <button onClick={() => { localStorage.removeItem("apiKey"); setLoggedIn(false); }}>Logout</button>
        <form onSubmit={handleSearch}>
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); if (e.target.value === "") setResults([]); }}
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
          <>
          <button onClick={() => {
          if (selectedDocs.size === documents.length) {
            setSelectedDocs(new Set());
          } else {
            setSelectedDocs(new Set(documents.map(d => d.document_id)));
          }
          }}>
          {selectedDocs.size === documents.length ? "Deselect all" : "Select all"}
          </button>
            {selectedDocs.size > 0 && (
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                <span>{selectedDocs.size} selected</span>
                <select id="bulk-project">
                  <option value="">No project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button onClick={async () => {
                  const pid = document.getElementById("bulk-project").value || null;
                  for (const docId of selectedDocs) {
                    await authFetch(`http://localhost:8000/documents/${docId}/project?project_id=${pid}`, { method: "PUT" });
                  }
                  setSelectedDocs(new Set());
                  loadDocuments();
                  const r = await authFetch("http://localhost:8000/projects"); setProjects(await r.json());
                }}>Move</button>
                <button onClick={async () => {
                  if (!window.confirm(`Delete ${selectedDocs.size} documents?`)) return;
                  for (const docId of selectedDocs) {
                    await authFetch(`http://localhost:8000/documents/${docId}`, { method: "DELETE" });
                  }
                  setSelectedDocs(new Set());
                  loadDocuments();
                  const r = await authFetch("http://localhost:8000/projects"); setProjects(await r.json());
                }}>Delete</button>
                <button onClick={() => setSelectedDocs(new Set())}>Cancel</button>
              </div>
            )}
            <ul style={{ listStyle: "none", padding: 0 }}>
              {documents.map((doc) => (
                <li key={doc.document_id} onClick={() => loadPage(doc.document_id, 1)} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    checked={selectedDocs.has(doc.document_id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const next = new Set(selectedDocs);
                      e.target.checked ? next.add(doc.document_id) : next.delete(doc.document_id);
                      setSelectedDocs(next);
                    }}
                  />
                  <span>
                    <strong>{doc.title || doc.filename}</strong> — {doc.doc_date && `${doc.doc_date} · `}{doc.page_count} pages
                  </span>
                </li>
              ))}
            </ul>
          </>
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
      </div>
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