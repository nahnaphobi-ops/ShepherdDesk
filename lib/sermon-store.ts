"use client";

import { newId, readJson, STORAGE_PREFIX, writeJson } from "./local-store";
import { parsePassage } from "./passage";

/** Sermons are saved in this browser's localStorage; see lib/local-store.ts for backup/restore. */

export type SermonRecord = {
  id: string;
  title: string;
  series: string;
  passage_label: string;
  big_idea: string;
  introduction: string;
  application: string;
  conclusion: string;
  status: string;
  key_points: unknown;
  created_at: string;
  updated_at: string;
};

export type SermonPoint = {
  id: string;
  heading: string;
  notes: string;
  subpoints: string[];
  illustration: string;
  verses: string[];
};

const storageKey = `${STORAGE_PREFIX}sermons`;

export { newId };
export const emptyPoint = (): SermonPoint => ({ id: newId(), heading: "", notes: "", subpoints: [], illustration: "", verses: [] });

const strings = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : []);

/** Accepts every shape key_points has had: plain strings, {heading, notes}, and the full point. */
export function toPoints(raw: unknown): SermonPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === "string") return { ...emptyPoint(), heading: item };
    const point = item as Partial<SermonPoint>;
    return {
      id: String(point.id ?? newId()),
      heading: String(point.heading ?? ""),
      notes: String(point.notes ?? ""),
      subpoints: strings(point.subpoints),
      illustration: String(point.illustration ?? ""),
      verses: strings(point.verses),
    };
  });
}

function readAll(): SermonRecord[] {
  const saved = readJson<unknown>(storageKey, []);
  return Array.isArray(saved) ? (saved as SermonRecord[]).map(withDefaults) : [];
}

function withDefaults(sermon: Partial<SermonRecord> & { id: string }): SermonRecord {
  return {
    title: "", series: "", passage_label: "", big_idea: "", introduction: "", application: "", conclusion: "",
    status: "draft", key_points: [], created_at: "", updated_at: "",
    ...sermon,
  } as SermonRecord;
}

export function listSermons(): SermonRecord[] {
  return readAll().sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getSermon(id: string): SermonRecord | null {
  return readAll().find((item) => item.id === id) ?? null;
}

export function createSermon(title: string, passageLabel: string, series = ""): { id?: string; error?: string } {
  if (passageLabel && !parsePassage(passageLabel)) return { error: "Use a reference like John 3:1-21 or Psalms 23" };
  const now = new Date().toISOString();
  const sermon = withDefaults({
    id: newId(), title: title.trim(), passage_label: passageLabel.trim(), series: series.trim(),
    key_points: [emptyPoint(), emptyPoint(), emptyPoint()], created_at: now, updated_at: now,
  });
  if (!writeJson(storageKey, [sermon, ...readAll()])) return { error: "This browser blocked saving. Check your privacy settings." };
  return { id: sermon.id };
}

export function updateSermon(id: string, patch: Partial<SermonRecord>): boolean {
  const updated_at = new Date().toISOString();
  return writeJson(storageKey, readAll().map((item) => (item.id === id ? { ...item, ...patch, updated_at } : item)));
}

export function deleteSermon(id: string): boolean {
  return writeJson(storageKey, readAll().filter((item) => item.id !== id));
}

/** Adds a verse reference to a sermon's last outline point (or a new point if it has none). */
export function addVerseToSermon(sermon: SermonRecord, reference: string): boolean {
  const points = toPoints(sermon.key_points);
  if (!points.length) points.push(emptyPoint());
  const last = points[points.length - 1]!;
  if (!last.verses.includes(reference)) last.verses.push(reference);
  return updateSermon(sermon.id, { key_points: points });
}
