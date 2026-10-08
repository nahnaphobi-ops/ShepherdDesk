"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

export type DictionaryResult = { id: string; term: string; source: string; body_text: string };
type SearchMode = "keyword" | "semantic";

type DeskSearchOptions = {
  initialQuery?: string;
  mode?: SearchMode;
};

export function useDeskSearch({ initialQuery = "", mode = "keyword" }: DeskSearchOptions = {}) {
  const [query, setQuery] = useState(initialQuery);
  const [dictionaryResults, setDictionaryResults] = useState<DictionaryResult[]>([]);
  const [dictionaryBusy, setDictionaryBusy] = useState(false);
  const [searched, setSearched] = useState(Boolean(initialQuery.trim()));
  const [notice, setNotice] = useState("");
  const requestId = useRef(0);

  const loadFeatured = useCallback(async () => {
    const current = ++requestId.current;
    setDictionaryBusy(true);
    const dictionaryResponse = await fetch("/api/dictionary-search?featured=1&include=dictionary");
    if (current !== requestId.current) return;
    if (dictionaryResponse.ok) {
      const payload = (await dictionaryResponse.json()) as { results: DictionaryResult[] };
      setDictionaryResults(payload.results);
    }
    setDictionaryBusy(false);
  }, []);

  const runSearch = useCallback(async (term: string, searchMode = mode) => {
    const trimmed = term.trim();
    if (!trimmed) {
      setSearched(false);
      await loadFeatured();
      return;
    }

    const current = ++requestId.current;
    setQuery(trimmed);
    setSearched(true);
    setNotice("");

    setDictionaryBusy(true);

    const dictionaryPromise = fetch(
      `/api/dictionary-search?q=${encodeURIComponent(trimmed)}&mode=${searchMode}&include=dictionary`,
    ).then(async (response) => (response.ok ? (await response.json()) as { results: DictionaryResult[]; notice?: string; mode?: SearchMode } : null));

    const dictionaryPayload = await dictionaryPromise;
    if (current !== requestId.current) return;
    if (dictionaryPayload) {
      setDictionaryResults(dictionaryPayload.results);
      setNotice(dictionaryPayload.notice ?? "");
    } else {
      setDictionaryResults([]);
      setNotice("Dictionary search failed. Try again.");
    }
    setDictionaryBusy(false);
  }, [loadFeatured, mode]);

  useEffect(() => {
    if (initialQuery.trim()) void runSearch(initialQuery);
    else void loadFeatured();
  }, [initialQuery, loadFeatured, runSearch]);

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runSearch(query);
  }

  return {
    query,
    setQuery,
    dictionaryResults,
    dictionaryBusy,
    busy: dictionaryBusy,
    searched,
    notice,
    runSearch,
    submitSearch,
    loadFeatured,
  };
}
