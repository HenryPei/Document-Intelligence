import { useState, useEffect } from "react";

function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploadResult, setUploadResult] = useState(null);

  useEffect(() => {
    if (page && page.scrollTo) {
      const el = document.getElementById(`page-${page.scrollTo}`);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, [page]);

  async function handleSearch(e) {
    e.preventDefault();
    const response = await fetch(`http://localhost:8000/search?q=${query}`);
    const data = await response.json();
    setResults(data);
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
    const response = await fetch("http://localhost:8000/uploadfile/", {method: "POST", body: formData});
    const data = await response.json();
    setUploadResult(data);
  }

  return (
    <div>
      <h1>CEDIB Document Search</h1>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search documents..."
        />
        <button type="submit">Search</button>
      </form>
      <form onSubmit={uploadFiles}>
        <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files))} />
        <button type="submit">Upload</button>
      </form>
      {uploadResult && (
        <p>Done: {uploadResult.done}, Duplicate: {uploadResult.duplicate}, Needs OCR: {uploadResult.needs_ocr}, Failed: {uploadResult.failed}</p>
      )}
      <ul>
        {results.map((r, i) => (
          <li key={i} onClick={() => loadPage(r.document_id, r.page_number)} style={{ cursor: "pointer" }}>
            <strong>{r.filename}</strong> — page {r.page_number}
            <p dangerouslySetInnerHTML={{ __html: r.snippet }} />
          </li>
        ))}
      </ul>
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