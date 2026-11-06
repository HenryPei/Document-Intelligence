import { useState } from "react";

function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(null);

  async function handleSearch(e) {
    e.preventDefault();
    const response = await fetch(`http://localhost:8000/search?q=${query}`);
    const data = await response.json();
    setResults(data);
  }

  async function loadPage(docId, pageNum) {
    const response = await fetch(`http://localhost:8000/documents/${docId}/pages/${pageNum}`);
    const data = await response.json();
    setPage(data);
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
                <h2>{page.filename} — page {page.page_number}</h2>
                <button onClick={() => setPage(null)}>✕ Close</button>
                <pre style={{ whiteSpace: "pre-wrap" }}>{page.text}</pre>
            </div>
        </div>
    )}

    </div>
  );
}

export default App;