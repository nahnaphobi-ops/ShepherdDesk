import { resolveBook } from "./bible-books";

export type PassageRef = { book: string; chapter: number; from: number | null; to: number | null };

/** Parses labels such as "John 3:1-21", "1 John 2:1", or "Psalms 23". */
export function parsePassage(label: string): PassageRef | null {
  const match = label.trim().match(/^(.+?)\s+(\d+)(?::(\d+)(?:\s*[-–]\s*(\d+))?)?$/);
  if (!match) return null;
  const book = resolveBook(match[1]!);
  if (!book) return null;
  const chapter = Number(match[2]);
  if (chapter < 1 || chapter > book.chapters) return null;
  const from = match[3] ? Number(match[3]) : null;
  const to = match[4] ? Number(match[4]) : from;
  return { book: book.name, chapter, from, to };
}
