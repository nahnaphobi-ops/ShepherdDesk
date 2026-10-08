"use client";

import { FormEvent, useEffect, useState } from "react";
import { newId, readJson, STORAGE_PREFIX, writeJson } from "../../lib/local-store";
import { parsePassage } from "../../lib/passage";

type MemoryVerse = { id: string; reference: string; translation: string; text: string; week_of: string };
type PassageTranslation = { code: string; name: string; verses: Array<[number, string]> };

const storageKey = `${STORAGE_PREFIX}memory-verses`;

export default function MemoryPage() {
  const [reference, setReference] = useState("Psalms 23:1");
  const [translations, setTranslations] = useState<PassageTranslation[]>([]);
  const [translationCode, setTranslationCode] = useState("BSB");
  const [verses, setVerses] = useState<MemoryVerse[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => { setVerses(readJson<MemoryVerse[]>(storageKey, [])); }, []);

  useEffect(() => {
    const ref = parsePassage(reference);
    if (!ref) { setTranslations([]); return; }
    const query = new URLSearchParams({ book: ref.book, chapter: String(ref.chapter), from: String(ref.from ?? 1), to: String(ref.to ?? ref.from ?? 1) });
    const timer = window.setTimeout(() => {
      void fetch(`/api/passage?${query}`)
        .then((response) => response.json() as Promise<{ translations?: PassageTranslation[] }>)
        .then((result) => setTranslations(result.translations ?? []))
        .catch(() => setTranslations([]));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [reference]);

  const shown = translations.find((item) => item.code === translationCode) ?? translations[0];
  const text = shown?.verses.map(([, value]) => value).join(" ") ?? "";

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!shown || !text) return;
    const next = [{ id: newId(), reference: reference.trim(), translation: shown.code, text, week_of: new Date().toISOString().slice(0, 10) }, ...verses];
    if (!writeJson(storageKey, next)) { setMessage("This browser is blocking storage."); return; }
    setVerses(next);
    setMessage("Memory verse saved in this browser");
  }

  function remove(id: string) {
    const next = verses.filter((item) => item.id !== id);
    if (writeJson(storageKey, next)) setVerses(next);
  }

  return (
    <main className="workspace-shell">
      <p className="eyebrow">Practice</p>
      <h1>Carry a verse.</h1>
      <p className="workspace-intro">Choose a reference and translation for this week&apos;s memory verse.</p>
      <form className="workspace-form" onSubmit={save}>
        <label htmlFor="memory-reference">Reference</label>
        <input id="memory-reference" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="John 3:16" />
        <label htmlFor="memory-translation">Translation</label>
        <select id="memory-translation" value={shown?.code ?? ""} onChange={(event) => setTranslationCode(event.target.value)} disabled={!translations.length}>
          {translations.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.name}</option>)}
        </select>
        {text && <blockquote className="memory-preview">{text}</blockquote>}
        {!text && reference.trim() && <p className="dictionary-empty">{parsePassage(reference) ? "Looking up the verse..." : "Use a reference like John 3:16."}</p>}
        <button className="save-button" type="submit" disabled={!text}>Save memory verse</button>
      </form>
      <p className="workspace-message" role="status">{message}</p>
      <section className="workspace-items" aria-live="polite">
        <h2>Your memory verses</h2>
        {verses.length === 0 && <p className="dictionary-empty">No memory verses yet.</p>}
        {verses.map((item) => (
          <article className="workspace-item" key={item.id}>
            <p><strong>{item.reference}</strong> ({item.translation}) {item.text}</p>
            <button type="button" onClick={() => remove(item.id)}>Remove</button>
          </article>
        ))}
      </section>
    </main>
  );
}
