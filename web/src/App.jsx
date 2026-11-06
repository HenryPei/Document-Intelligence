import { useState } from "react";

function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  async function handleSearch(e) {
    e.preventDefault();
    const response = await fetch(`http://localhost:8000/search?q=${query}`);
    const data = await response.json();
    setResults(data);
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
          <li key={i}>
            <strong>{r.filename}</strong> — page {r.page_number}
            <p dangerouslySetInnerHTML={{ __html: r.snippet }} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;