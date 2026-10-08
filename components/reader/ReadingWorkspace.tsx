"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type TouchEvent } from "react";
import type { Reading } from "../../lib/reading-types";
import { adjacentChapters, BIBLE_BOOKS, bookSlug, resolveBook } from "../../lib/bible-books";
import { passageTitle } from "../../lib/reading-types";
import { readJson, readList, writeJson } from "../../lib/local-store";
import { parsePassage } from "../../lib/passage";
import type { WordStudy } from "../../lib/word-study-fixture";
import type { VerseWordTag } from "../../lib/word-tags-fixture";
import { loadWordStudy, renderTaggedText } from "./tagged-text";
import { addVerseToSermon, listSermons, type SermonRecord } from "../../lib/sermon-store";

type Target = { book: string; chapter: number; href: string; label: string };
type Direction = "next" | "prev";

const FLIP_MS = 620;

// Chapters fetched in the background so a page turn never waits on the network.
const readingCache = new Map<string, Promise<Reading | null>>();
const readingKey = (book: string, chapter: number) => `${bookSlug(book)}/${chapter}`;

function loadReading(book: string, chapter: number): Promise<Reading | null> {
  const key = readingKey(book, chapter);
  let pending = readingCache.get(key);
  if (!pending) {
    pending = fetch(`/api/reading/${key}`)
      .then((response) => (response.ok ? (response.json() as Promise<Reading>) : null))
      .catch(() => null);
    void pending.then((result) => { if (!result) readingCache.delete(key); });
    readingCache.set(key, pending);
  }
  return pending;
}

const bookIndex = (name: string) => BIBLE_BOOKS.findIndex((item) => item.name === name);

export function ReadingWorkspace({ reading: initialReading }: { reading: Reading }) {
  const router = useRouter();
  const [reading, setReading] = useState(initialReading);
  const noteKey = `shepherds-desk:notes:${reading.book.toLowerCase()}-${reading.chapter}`;
  const [translation, setTranslation] = useState("BSB");
  const [selectedVerse, setSelectedVerse] = useState(1);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const [wordStudy, setWordStudy] = useState<WordStudy | null>(null);
  const [highlights, setHighlights] = useState<Record<number, boolean>>({});
  const [sermons, setSermons] = useState<SermonRecord[]>([]);
  const [sermonTarget, setSermonTarget] = useState("");
  const [sermonStatus, setSermonStatus] = useState("");
  const [flip, setFlip] = useState<Direction | null>(null);
  const [turningTo, setTurningTo] = useState<string | null>(null);
  const busy = useRef(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const ghostHostRef = useRef<HTMLDivElement>(null);
  const pendingGhost = useRef<HTMLElement | null>(null);

  // Server navigations (back/forward, links) hand us a new chapter through props.
  const lastInitial = useRef(initialReading);
  useEffect(() => {
    if (lastInitial.current === initialReading) return;
    lastInitial.current = initialReading;
    readingCache.set(readingKey(initialReading.book, initialReading.chapter), Promise.resolve(initialReading));
    showReading(initialReading);
  }, [initialReading]);

  // Notes and highlights live in this browser, keyed by chapter.
  useEffect(() => {
    const saved = readJson<Record<number, string>>(noteKey, {});
    setNotes(saved);
    setDraft(saved[selectedVerse] ?? "");
  }, [noteKey]);

  useEffect(() => {
    setHighlights(readJson<Record<number, boolean>>(`${noteKey}:highlights`, {}));
  }, [noteKey]);

  useEffect(() => {
    const open = listSermons().filter((item) => item.status !== "archived");
    setSermons(open);
    setSermonTarget((current) => current || open[0]?.id || "");
  }, []);

  function addToSermon() {
    const sermon = sermons.find((item) => item.id === sermonTarget);
    if (!sermon) return;
    const reference = `${reading.book} ${reading.chapter}:${selectedVerse}`;
    const ok = addVerseToSermon(sermon, reference);
    setSermonStatus(ok ? `Added ${reference} to “${sermon.title}”.` : "Could not add the verse.");
    if (ok) setSermons(listSermons().filter((item) => item.status !== "archived"));
  }

  function toggleHighlight(verse: number) {
    const next = { ...highlights, [verse]: !highlights[verse] };
    setHighlights(next);
    writeJson(`${noteKey}:highlights`, next);
  }

  const adjacent = adjacentChapters(reading.book, reading.chapter);

  useEffect(() => {
    readingCache.set(readingKey(initialReading.book, initialReading.chapter), Promise.resolve(initialReading));
  }, []);

  // Warm the neighbouring chapters as soon as a page settles.
  const nextHref = adjacent.next?.href;
  const prevHref = adjacent.prev?.href;
  useEffect(() => {
    const around = adjacentChapters(reading.book, reading.chapter);
    const timer = window.setTimeout(() => {
      if (around.next) void loadReading(around.next.book, around.next.chapter);
      if (around.prev) void loadReading(around.prev.book, around.prev.chapter);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [reading.book, reading.chapter, nextHref, prevHref]);

  function showReading(next: Reading) {
    setReading(next);
    setSelectedVerse(1);
    setDraft("");
    setNotes({});
    setHighlights({});
    setWordStudy(null);
    setStatus("");
  }

  // Page turn: swap the chapter client-side and animate a leaf hinged on the spine.
  // The outgoing page is a DOM snapshot, so React only renders the incoming chapter.
  // Next: the old page lifts away to reveal the new one. Previous: the earlier page swings back over.
  const turnPage = useCallback(async (target: Target, direction: Direction, push = true) => {
    if (busy.current) return;
    busy.current = true;
    const slow = window.setTimeout(() => setTurningTo(target.label), 120);
    const next = await loadReading(target.book, target.chapter);
    window.clearTimeout(slow);
    setTurningTo(null);

    if (!next) {
      busy.current = false;
      router.push(target.href);
      return;
    }

    if (push) window.history.pushState(null, "", target.href);
    const stageTop = stageRef.current ? stageRef.current.getBoundingClientRect().top + window.scrollY - 16 : 0;
    if (window.scrollY > stageTop) window.scrollTo({ top: stageTop, behavior: "smooth" });

    const oldPage = stageRef.current?.querySelector<HTMLElement>(":scope > .page");
    if (!oldPage || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      showReading(next);
      busy.current = false;
      return;
    }

    const ghost = oldPage.cloneNode(true) as HTMLElement;
    ghost.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
    ghost.removeAttribute("aria-labelledby");
    ghost.setAttribute("aria-hidden", "true");
    ghost.classList.add("page-ghost", direction === "next" ? "flip-next" : "page-covered");
    pendingGhost.current = ghost;

    setFlip(direction);
    showReading(next);
    window.setTimeout(() => {
      ghostHostRef.current?.replaceChildren();
      setFlip(null);
      busy.current = false;
    }, FLIP_MS + 40);
  }, [router]);

  // Mount the snapshot in the same frame as the new chapter so nothing flashes.
  useLayoutEffect(() => {
    if (!flip || !pendingGhost.current) return;
    ghostHostRef.current?.replaceChildren(pendingGhost.current);
    pendingGhost.current = null;
  }, [flip]);

  function jumpTo(book: string, chapter: number, push = true) {
    if (book === reading.book && chapter === reading.chapter) return;
    const direction = bookIndex(book) < bookIndex(reading.book) || (book === reading.book && chapter < reading.chapter) ? "prev" : "next";
    void turnPage({ book, chapter, href: `/read/${bookSlug(book)}/${chapter}`, label: `${book} ${chapter}` }, direction, push);
  }

  const turnRef = useRef({ turnPage, adjacent, jumpTo });
  turnRef.current = { turnPage, adjacent, jumpTo };

  // Back/forward between chapters we swapped in client-side: turn the page the matching way.
  useEffect(() => {
    function onPopState() {
      const match = window.location.pathname.match(/^\/read\/([^/]+)\/(\d+)/);
      const book = match ? resolveBook(match[1]!)?.name : undefined;
      if (book) turnRef.current.jumpTo(book, Number(match![2]), false);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const { turnPage: turn, adjacent: around } = turnRef.current;
      if (event.key === "ArrowRight" && around.next) void turn(around.next, "next");
      if (event.key === "ArrowLeft" && around.prev) void turn(around.prev, "prev");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onTouchStart(event: TouchEvent) {
    const touch = event.touches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function onTouchEnd(event: TouchEvent) {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch || window.getSelection()?.toString()) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 70 || Math.abs(dy) > 60) return;
    if (dx < 0 && adjacent.next) void turnPage(adjacent.next, "next");
    if (dx > 0 && adjacent.prev) void turnPage(adjacent.prev, "prev");
  }

  const currentBook = BIBLE_BOOKS.find((item) => item.name === reading.book);
  const current = reading.translations.find((item) => item.code === translation) ?? reading.translations[0]!;
  const activeTags = reading.wordTags[translation] ?? reading.wordTags.BSB ?? [];

  function selectVerse(verse: number) {
    setSelectedVerse(verse);
    setDraft(notes[verse] ?? "");
  }

  function jumpToVerse(verse: number) {
    selectVerse(verse);
    document.getElementById(`verse-${verse}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function studyWord(tag: VerseWordTag) {
    void loadWordStudy(tag, setWordStudy);
  }

  function renderVerseText(text: string, verse: number) {
    return renderTaggedText(text, verse, activeTags, studyWord);
  }

  function renderPage() {
    const flipClass = flip === "next" ? " page-revealed" : flip === "prev" ? " flip-prev" : "";
    return (
      <section
        key={`${reading.book}-${reading.chapter}`}
        className={`passage page${flipClass}`}
        aria-labelledby="passage-heading"
        inert={Boolean(flip)}
      >
        <div className="passage-heading">
          <div>
            <p className="section-kicker">{current.name}</p>
            <h2 id="passage-heading">{passageTitle(reading.book, reading.chapter)}</h2>
          </div>
          <span className="license-note">{current.attribution}</span>
        </div>
        <div className="passage-text">
          {current.verses.map(([verse, text]) => (
            <span
              className={`${verse === selectedVerse ? "verse selected" : "verse"}${highlights[verse] ? " highlighted" : ""}`}
              key={verse}
              id={`verse-${verse}`}
              onClick={() => selectVerse(verse)}
            >
              <button className="verse-number" type="button" onClick={() => selectVerse(verse)} aria-label={`Select ${reading.book} ${reading.chapter}:${verse}`}>{verse}</button>
              {renderVerseText(text, verse)}
              {notes[verse] && <span className="note-mark" aria-label="Has note">•</span>}{" "}
            </span>
          ))}
        </div>
      </section>
    );
  }

  function saveNote() {
    const next = { ...notes, [selectedVerse]: draft.trim() };
    setNotes(next);
    setStatus(writeJson(noteKey, next) ? "Saved in this browser" : "This browser is blocking storage");
  }

  // Opens the newest reading-plan entry that names a passage, else the plan itself.
  function openTodaysReading() {
    for (const entry of readList("reading-plan")) {
      const ref = parsePassage(entry.text);
      if (ref) {
        router.push(`/read/${bookSlug(ref.book)}/${ref.chapter}`);
        return;
      }
    }
    router.push("/reading-plan");
  }

  return (
    <main className="reader-shell">
      <header className="reader-header">
        <div>
          <p className="eyebrow">Reading desk</p>
          <h1>{reading.book} {reading.chapter}</h1>
        </div>
        <button className="quiet-button" type="button" onClick={openTodaysReading}>Today&apos;s reading</button>
      </header>

      <div className="passage-picker">
        <button className="quiet-button" type="button" disabled={!adjacent.prev} onClick={() => adjacent.prev && void turnPage(adjacent.prev, "prev")} aria-label={adjacent.prev ? `Previous: ${adjacent.prev.label}` : "No previous chapter"}>← Previous</button>
        <label className="sr-only" htmlFor="book-select">Book</label>
        <select id="book-select" value={reading.book} onChange={(event) => jumpTo(event.target.value, 1)}>
          {BIBLE_BOOKS.map((book) => <option key={book.name} value={book.name}>{book.name}</option>)}
        </select>
        <label className="sr-only" htmlFor="chapter-select">Chapter</label>
        <select id="chapter-select" value={reading.chapter} onChange={(event) => jumpTo(reading.book, Number(event.target.value))}>
          {Array.from({ length: currentBook?.chapters ?? reading.chapter }, (_, index) => index + 1).map((number) => <option key={number} value={number}>Chapter {number}</option>)}
        </select>
        <label className="sr-only" htmlFor="translation-select">Translation</label>
        <select id="translation-select" className="translation-select" value={current.code} onChange={(event) => setTranslation(event.target.value)}>
          {reading.translations.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.name}</option>)}
        </select>
        <label className="sr-only" htmlFor="verse-select">Verse</label>
        <select id="verse-select" value={selectedVerse} onChange={(event) => jumpToVerse(Number(event.target.value))}>
          {current.verses.map(([verse]) => <option key={verse} value={verse}>Verse {verse}</option>)}
        </select>
        <button className="quiet-button" type="button" disabled={!adjacent.next} onClick={() => adjacent.next && void turnPage(adjacent.next, "next")} aria-label={adjacent.next ? `Next: ${adjacent.next.label}` : "No next chapter"}>Next →</button>
        {turningTo && <span className="turning-note" role="status">Turning to {turningTo}…</span>}
      </div>


      <div className="reader-grid">
        <div className="page-stage" ref={stageRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {renderPage()}
          <div className={`page-ghost-host${flip ? ` ghost-${flip}` : ""}`} ref={ghostHostRef} aria-hidden="true" />
        </div>

        <aside className="margin" aria-labelledby="margin-heading">
          {wordStudy && <section className="word-study" aria-labelledby="word-study-heading">
            <div className="word-study-heading">
              <p className="section-kicker">Word study</p>
              <button className="close-word-study" type="button" onClick={() => setWordStudy(null)}>Close</button>
            </div>
            <h2 id="word-study-heading">{wordStudy.surface}</h2>
            <p className="strongs-number">{wordStudy.strongsNumber} · {wordStudy.language}</p>
            <p className="word-meta"><em>{wordStudy.transliteration}</em> · {wordStudy.gloss}</p>
            <p className="word-definition">{wordStudy.definition}</p>
            <p className="word-references"><strong>Also found in</strong> {wordStudy.otherReferences.join(" · ") || "—"}</p>
          </section>}
          <div className="margin-title">
            <div>
              <p className="section-kicker">Lamplight Margin</p>
              <h2 id="margin-heading">Verse {selectedVerse}</h2>
            </div>
            <span className="pin">{notes[selectedVerse] ? "Pinned" : "Open"}</span>
          </div>
          <button className="quiet-button highlight-toggle" type="button" aria-pressed={Boolean(highlights[selectedVerse])} onClick={() => toggleHighlight(selectedVerse)}>{highlights[selectedVerse] ? "Remove highlight" : "Highlight verse"}</button>
          {sermons.length > 0 && (
            <div className="add-to-sermon">
              <label className="sr-only" htmlFor="sermon-target">Sermon</label>
              <select id="sermon-target" value={sermonTarget} onChange={(event) => setSermonTarget(event.target.value)}>
                {sermons.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
              <button className="quiet-button" type="button" onClick={addToSermon}>Add verse to sermon</button>
              {sermonStatus && <p className="margin-help" role="status">{sermonStatus}</p>}
            </div>
          )}
          <label className="note-label" htmlFor="margin-note">Your note</label>
          <textarea
            id="margin-note"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="What are you noticing here?"
            rows={8}
          />
          <button className="save-button" type="button" onClick={saveNote}>Save note</button>
          <p className="margin-help">Notes are anchored to {reading.book} {reading.chapter}:{selectedVerse}. {status}</p>
        </aside>
      </div>
    </main>
  );
}
