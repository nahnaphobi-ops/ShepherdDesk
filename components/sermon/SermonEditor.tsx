"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { bookSlug } from "../../lib/bible-books";
import { parsePassage } from "../../lib/passage";
import { downloadFile, sermonFileName, sermonMarkdown, sermonWordCount, sermonWordDocument } from "../../lib/sermon-export";
import { deleteSermon, emptyPoint, getSermon, toPoints, updateSermon, type SermonPoint, type SermonRecord } from "../../lib/sermon-store";
import type { WordStudy } from "../../lib/word-study-fixture";
import { loadWordStudy, renderTaggedText } from "../reader/tagged-text";
import { usePassageStudy, useVerseText } from "./passage-data";

type Sermon = SermonRecord;

function VerseChip({ reference, translationCode, onRemove }: { reference: string; translationCode: string; onRemove: () => void }) {
  const text = useVerseText(reference, translationCode);
  return (
    <li className="verse-chip">
      <div className="verse-chip-head">
        <strong>{reference}</strong>
        <button type="button" onClick={onRemove} aria-label={`Remove ${reference}`}>✕</button>
      </div>
      {text && <p>{text}</p>}
      {!text && !parsePassage(reference) && <p className="verse-chip-warning">Not a reference this desk recognises.</p>}
    </li>
  );
}

export function SermonEditor({ id }: { id: string }) {
  const [sermon, setSermon] = useState<Sermon | null>(null);
  const [points, setPoints] = useState<SermonPoint[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [saveStatus, setSaveStatus] = useState("");
  const [translationCode, setTranslationCode] = useState("BSB");
  const [focusedPoint, setFocusedPoint] = useState<string | null>(null);
  const [verseDrafts, setVerseDrafts] = useState<Record<string, string>>({});
  const [wordStudy, setWordStudy] = useState<WordStudy | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    function load() {
      const found = getSermon(id);
      if (!found) return setState("missing");
      setSermon(found);
      const loadedPoints = toPoints(found.key_points);
      setPoints(loadedPoints.length ? loadedPoints : [emptyPoint(), emptyPoint(), emptyPoint()]);
      setState("ready");
      // Skip the autosave that the initial load would otherwise trigger.
      window.setTimeout(() => { loaded.current = true; }, 0);
    }
    load();
  }, [id]);

  const study = usePassageStudy(sermon?.passage_label ?? "");

  const save = useCallback((next: Sermon, nextPoints: SermonPoint[]) => {
    const ok = updateSermon(id, {
      title: next.title,
      series: next.series,
      passage_label: next.passage_label,
      big_idea: next.big_idea,
      introduction: next.introduction,
      application: next.application,
      conclusion: next.conclusion,
      status: next.status,
      key_points: nextPoints,
    });
    setSaveStatus(ok ? "Saved in this browser" : "Could not save. This browser is blocking storage.");
  }, [id]);

  useEffect(() => {
    if (!sermon || !loaded.current) return;
    const timer = window.setTimeout(() => save(sermon, points), 900);
    return () => window.clearTimeout(timer);
  }, [sermon, points, save]);

  function update(patch: Partial<Sermon>) {
    setSermon((current) => (current ? { ...current, ...patch } : current));
  }
  function updatePoint(pointId: string, patch: Partial<SermonPoint> | ((point: SermonPoint) => Partial<SermonPoint>)) {
    setPoints((current) => current.map((point) => (point.id === pointId ? { ...point, ...(typeof patch === "function" ? patch(point) : patch) } : point)));
  }
  function movePoint(index: number, direction: -1 | 1) {
    setPoints((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[target]] = [copy[target]!, copy[index]!];
      return copy;
    });
  }
  function addVerse(pointId: string, reference: string) {
    const clean = reference.trim();
    if (!clean) return;
    updatePoint(pointId, (point) => ({ verses: point.verses.includes(clean) ? point.verses : [...point.verses, clean] }));
  }
  function addPassageVerse(verse: number) {
    if (!study || study === "loading") return;
    const target = points.find((point) => point.id === focusedPoint) ?? points[points.length - 1];
    if (!target) return;
    addVerse(target.id, `${study.ref.book} ${study.ref.chapter}:${verse}`);
    setFocusedPoint(target.id);
  }

  function remove() {
    if (!window.confirm("Delete this sermon? This cannot be undone.")) return;
    if (deleteSermon(id)) window.location.href = "/sermon-notes";
  }

  if (state === "loading") return <main className="workspace-shell"><p className="dictionary-empty">Loading sermon...</p></main>;
  if (state === "missing" || !sermon) return <main className="workspace-shell"><h1>Sermon not found</h1><p><Link href="/sermon-notes">Back to your sermons</Link></p></main>;

  const words = sermonWordCount(sermon, points);
  const ready = study && study !== "loading" ? study : null;
  const shown = ready ? ready.reading.translations.find((item) => item.code === translationCode) ?? ready.reading.translations[0] : undefined;
  const tags = ready ? ready.reading.wordTags[shown?.code ?? "BSB"] ?? ready.reading.wordTags.BSB ?? [] : [];
  const passageNotes = ready ? Object.entries(ready.notes).filter(([verse, text]) => text && shown?.verses.some(([number]) => number === Number(verse))) : [];
  const targetIndex = Math.max(0, points.findIndex((point) => point.id === focusedPoint));
  const targetNumber = focusedPoint && points.some((point) => point.id === focusedPoint) ? targetIndex + 1 : points.length;

  return (
    <main className="sermon-shell">
      <div className="sermon-topbar">
        <Link className="text-link" href="/sermon-notes">← All sermons</Link>
        <span className="sermon-meta">
          {words} words · about {Math.max(1, Math.round(words / 130))} min spoken · <span role="status">{saveStatus}</span>
        </span>
      </div>
      <div className="sermon-grid">
        <section className="sermon-editor">
          <input className="sermon-title" aria-label="Sermon title" value={sermon.title} onChange={(event) => update({ title: event.target.value })} />
          <div className="sermon-row">
            <label>Passage
              <input value={sermon.passage_label} onChange={(event) => update({ passage_label: event.target.value })} placeholder="John 3:1-21" />
            </label>
            <label>Status
              <select value={sermon.status} onChange={(event) => update({ status: event.target.value })}>
                <option value="draft">Draft</option>
                <option value="ready">Ready</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>
          <label className="sermon-field">Series
            <input value={sermon.series} onChange={(event) => update({ series: event.target.value })} placeholder="Optional, e.g. Psalms of Ascent" />
          </label>
          <label className="sermon-field">Big idea (one sentence the congregation should remember)
            <textarea rows={2} value={sermon.big_idea} onChange={(event) => update({ big_idea: event.target.value })} />
          </label>

          <h2>Introduction</h2>
          <textarea aria-label="Introduction" rows={4} value={sermon.introduction} onChange={(event) => update({ introduction: event.target.value })} placeholder="How will you open? A question, a story, the tension the passage answers..." />

          <h2>Outline</h2>
          {points.map((point, index) => (
            <div className={point.id === focusedPoint ? "outline-point focused" : "outline-point"} key={point.id} onFocusCapture={() => setFocusedPoint(point.id)}>
              <div className="outline-head">
                <span className="outline-number">{index + 1}</span>
                <input aria-label={`Point ${index + 1} heading`} value={point.heading} onChange={(event) => updatePoint(point.id, { heading: event.target.value })} placeholder="Main point" />
                <button type="button" onClick={() => movePoint(index, -1)} disabled={index === 0} aria-label="Move up">↑</button>
                <button type="button" onClick={() => movePoint(index, 1)} disabled={index === points.length - 1} aria-label="Move down">↓</button>
                <button type="button" onClick={() => setPoints((current) => current.filter((item) => item.id !== point.id))} aria-label="Remove point">✕</button>
              </div>

              {point.subpoints.length > 0 && (
                <ol className="subpoints">
                  {point.subpoints.map((subpoint, subIndex) => (
                    <li key={subIndex}>
                      <input
                        aria-label={`Point ${index + 1} sub-point ${subIndex + 1}`}
                        value={subpoint}
                        onChange={(event) => updatePoint(point.id, (current) => ({ subpoints: current.subpoints.map((item, i) => (i === subIndex ? event.target.value : item)) }))}
                        placeholder="Sub-point"
                      />
                      <button type="button" onClick={() => updatePoint(point.id, (current) => ({ subpoints: current.subpoints.filter((_, i) => i !== subIndex) }))} aria-label="Remove sub-point">✕</button>
                    </li>
                  ))}
                </ol>
              )}
              <button className="link-button" type="button" onClick={() => updatePoint(point.id, (current) => ({ subpoints: [...current.subpoints, ""] }))}>+ Sub-point</button>

              <textarea aria-label={`Point ${index + 1} notes`} rows={4} value={point.notes} onChange={(event) => updatePoint(point.id, { notes: event.target.value })} placeholder="Explanation and argument..." />
              <label className="point-label">Illustration
                <textarea rows={2} value={point.illustration} onChange={(event) => updatePoint(point.id, { illustration: event.target.value })} placeholder="A story, image, or example that makes this point land" />
              </label>

              <p className="point-label">Supporting scripture</p>
              {point.verses.length > 0 && (
                <ul className="verse-chips">
                  {point.verses.map((reference) => (
                    <VerseChip key={reference} reference={reference} translationCode={translationCode} onRemove={() => updatePoint(point.id, (current) => ({ verses: current.verses.filter((item) => item !== reference) }))} />
                  ))}
                </ul>
              )}
              <form className="verse-add" onSubmit={(event) => { event.preventDefault(); addVerse(point.id, verseDrafts[point.id] ?? ""); setVerseDrafts((current) => ({ ...current, [point.id]: "" })); }}>
                <input aria-label={`Add a verse to point ${index + 1}`} value={verseDrafts[point.id] ?? ""} onChange={(event) => setVerseDrafts((current) => ({ ...current, [point.id]: event.target.value }))} placeholder="Romans 8:28" />
                <button className="quiet-button" type="submit">Add</button>
              </form>
            </div>
          ))}
          <button className="quiet-button" type="button" onClick={() => setPoints((current) => [...current, emptyPoint()])}>+ Add point</button>

          <label className="sermon-field">Application
            <textarea rows={4} value={sermon.application} onChange={(event) => update({ application: event.target.value })} placeholder="What should people do or believe in response?" />
          </label>

          <h2>Conclusion</h2>
          <textarea aria-label="Conclusion" rows={4} value={sermon.conclusion} onChange={(event) => update({ conclusion: event.target.value })} placeholder="Restate the big idea, call to response, closing prayer..." />

          <div className="sermon-actions">
            <Link className="save-button" href={`/sermon-notes/${id}/preach`}>Preaching view</Link>
            <Link className="quiet-button" href={`/sermon-notes/${id}/preach?print=1`}>Print / PDF</Link>
            <button className="quiet-button" type="button" onClick={() => downloadFile(sermonWordDocument(sermon, points), "application/msword", sermonFileName(sermon, "doc"))}>Export Word</button>
            <button className="quiet-button" type="button" onClick={() => downloadFile(sermonMarkdown(sermon, points), "text/markdown", sermonFileName(sermon, "md"))}>Export Markdown</button>
            <button className="quiet-button danger" type="button" onClick={remove}>Delete sermon</button>
          </div>
        </section>

        <aside className="sermon-passage-panel">
          {wordStudy && (
            <section className="word-study" aria-labelledby="sermon-word-study">
              <div className="word-study-heading">
                <p className="section-kicker">Word study</p>
                <button className="close-word-study" type="button" onClick={() => setWordStudy(null)}>Close</button>
              </div>
              <h2 id="sermon-word-study">{wordStudy.surface}</h2>
              <p className="strongs-number">{wordStudy.strongsNumber} · {wordStudy.language}</p>
              {(wordStudy.transliteration || wordStudy.gloss) && <p className="word-meta"><em>{wordStudy.transliteration}</em> · {wordStudy.gloss}</p>}
              {wordStudy.definition && <p className="word-definition">{wordStudy.definition}</p>}
              {wordStudy.otherReferences.length > 0 && <p className="word-references"><strong>Also found in</strong> {wordStudy.otherReferences.join(" · ")}</p>}
            </section>
          )}
          <p className="section-kicker">Passage</p>
          {!parsePassage(sermon.passage_label) && <p className="dictionary-empty">Enter a passage like John 3:1-21 to see the text here.</p>}
          {study === "loading" && <p className="dictionary-empty">Loading passage...</p>}
          {ready && (
            <>
              <h2>{sermon.passage_label}</h2>
              <div className="translation-tabs compact">
                {ready.reading.translations.map((item) => (
                  <button key={item.code} type="button" className={item.code === shown?.code ? "translation-tab active" : "translation-tab"} onClick={() => setTranslationCode(item.code)}>{item.code}</button>
                ))}
              </div>
              <p className="panel-hint">Click a verse number to add it to point {targetNumber}. Underlined words open a word study.</p>
              <div className="passage-text sermon-passage-text">
                {shown?.verses.map(([verse, text]) => (
                  <span key={verse} className={ready.highlights[verse] ? "highlighted" : undefined}>
                    <button className="verse-number" type="button" onClick={() => addPassageVerse(verse)} aria-label={`Add verse ${verse} to point ${targetNumber}`}>{verse}</button>
                    {renderTaggedText(text, verse, tags, (tag) => void loadWordStudy(tag, setWordStudy))}
                    {ready.notes[verse] && <span className="note-mark" aria-label="Has note">•</span>}{" "}
                  </span>
                ))}
              </div>
              {passageNotes.length > 0 && (
                <section className="passage-notes">
                  <p className="section-kicker">Your margin notes</p>
                  {passageNotes.map(([verse, text]) => (
                    <p key={verse}><strong>v{verse}</strong> {text}</p>
                  ))}
                </section>
              )}
              <Link className="text-link" href={`/read/${bookSlug(ready.ref.book)}/${ready.ref.chapter}`}>Open in the reader →</Link>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
