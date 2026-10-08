"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDeskSearch } from "../search/useDeskSearch";

type SearchMode = "keyword" | "semantic";

const suggestions = ["atonement", "shepherd", "covenant", "preaching"];

export function DictionaryWorkspace() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [mode, setMode] = useState<SearchMode>("keyword");
  const {
    query,
    setQuery,
    dictionaryResults,
    dictionaryBusy,
    searched,
    notice,
    runSearch,
    submitSearch,
  } = useDeskSearch({ initialQuery, mode });

  const hasResults = dictionaryResults.length > 0;

  return (
    <main className="dictionary-shell">
      <p className="eyebrow">Theological dictionary</p>
      <h1>Trace the word.</h1>
      <p className="dictionary-intro">Search the public-domain Bible dictionaries.</p>
      <form className="dictionary-search" onSubmit={submitSearch}>
        <label htmlFor="dictionary-query">Search entries</label>
        <div className="dictionary-mode">
          <label><input type="radio" name="mode" value="keyword" checked={mode === "keyword"} onChange={() => setMode("keyword")} /> Keyword</label>
          <label><input type="radio" name="mode" value="semantic" checked={mode === "semantic"} onChange={() => setMode("semantic")} /> Similar meaning</label>
        </div>
        <div className="dictionary-suggestions" aria-label="Suggested searches">
          {suggestions.map((term) => (
            <button className="suggestion-chip" key={term} type="button" onClick={() => void runSearch(term, mode)}>{term}</button>
          ))}
        </div>
        <div>
          <input id="dictionary-query" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="atonement, shepherd, preaching..." />
          <button className="save-button" disabled={dictionaryBusy} type="submit">{dictionaryBusy ? "Searching..." : "Search"}</button>
        </div>
      </form>
      {notice && <p className="dictionary-notice" role="status">{notice}</p>}

      <section className={`dictionary-results${dictionaryBusy ? " is-loading" : ""}`} aria-live="polite">
        {!searched && dictionaryResults.length > 0 && <p className="dictionary-kicker">Public dictionary</p>}
        {dictionaryBusy && dictionaryResults.length === 0 && searched && <p className="search-status">Searching dictionary…</p>}
        {searched && !hasResults && !dictionaryBusy && (
          <p className="dictionary-empty">No entries matched that search. Try a shorter keyword like grace, covenant, or preaching.</p>
        )}
        {dictionaryResults.length > 0 && searched && <h2 className="results-heading">Public dictionary</h2>}
        {dictionaryResults.map((result) => (
          <article className="dictionary-entry" key={result.id}>
            <div className="entry-meta"><h2>{result.term}</h2><span>{result.source}</span></div>
            <p>{result.body_text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
