"use client";

import { useEffect, useState } from "react";
import { bookSlug } from "../../lib/bible-books";
import { parsePassage, type PassageRef } from "../../lib/passage";
import type { Reading } from "../../lib/reading-types";
import { readJson, STORAGE_PREFIX } from "../../lib/local-store";

export type PassageStudy = {
  ref: PassageRef;
  reading: Reading;
  notes: Record<number, string>;
  highlights: Record<number, boolean>;
};

const readingCache = new Map<string, Promise<Reading | null>>();

function fetchReading(book: string, chapter: number): Promise<Reading | null> {
  const key = `${book}:${chapter}`;
  if (!readingCache.has(key)) {
    readingCache.set(key, fetch(`/api/reading/${bookSlug(book)}/${chapter}`)
      .then((response) => (response.ok ? (response.json() as Promise<Reading>) : null))
      .catch(() => null)
      .then((reading) => {
        if (!reading) readingCache.delete(key);
        return reading;
      }));
  }
  return readingCache.get(key)!;
}

/** Your margin notes and highlights for a chapter (same browser keys the reader uses). */
function loadAnnotations(reading: Reading) {
  const key = `${STORAGE_PREFIX}notes:${reading.book.toLowerCase()}-${reading.chapter}`;
  return {
    notes: readJson<Record<number, string>>(key, {}),
    highlights: readJson<Record<number, boolean>>(`${key}:highlights`, {}),
  };
}

export function usePassageStudy(label: string): PassageStudy | null | "loading" {
  const [study, setStudy] = useState<PassageStudy | null | "loading">(null);
  useEffect(() => {
    const ref = parsePassage(label);
    if (!ref) { setStudy(null); return; }
    setStudy("loading");
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const reading = await fetchReading(ref.book, ref.chapter);
      if (cancelled) return;
      if (!reading) { setStudy(null); return; }
      const from = ref.from ?? 1;
      const to = ref.to ?? Number.MAX_SAFE_INTEGER;
      const inRange = ([verse]: [number, string]) => verse >= from && verse <= to;
      const trimmed: Reading = { ...reading, translations: reading.translations.map((item) => ({ ...item, verses: item.verses.filter(inRange) })) };
      setStudy({ ref, reading: trimmed, ...loadAnnotations(reading) });
    }, 400);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [label]);
  return study;
}

type PassageTranslation = { code: string; name: string; verses: Array<[number, string]> };
const verseTextCache = new Map<string, Promise<PassageTranslation[]>>();

/** Text of a short reference like "Romans 8:28" for showing inline under an outline point. */
export function useVerseText(reference: string, translationCode: string): string | null {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const ref = parsePassage(reference);
    if (!ref) { setText(null); return; }
    const query = new URLSearchParams({ book: ref.book, chapter: String(ref.chapter), from: String(ref.from ?? 1), to: String(ref.to ?? ref.from ?? 1) });
    const key = query.toString();
    if (!verseTextCache.has(key)) {
      verseTextCache.set(key, fetch(`/api/passage?${query}`)
        .then((response) => response.json() as Promise<{ translations?: PassageTranslation[] }>)
        .then((result) => result.translations ?? [])
        .catch(() => {
          // Don't remember a failed lookup; the next render retries it.
          verseTextCache.delete(key);
          return [];
        }));
    }
    let cancelled = false;
    void verseTextCache.get(key)!.then((translations) => {
      if (cancelled) return;
      const shown = translations.find((item) => item.code === translationCode) ?? translations[0];
      setText(shown ? shown.verses.map(([, value]) => value.replace(/<\/?i>/g, "")).join(" ") : null);
    });
    return () => { cancelled = true; };
  }, [reference, translationCode]);
  return text;
}
