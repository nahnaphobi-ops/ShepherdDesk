"use client";

/**
 * Everything personal in Shepherd's Desk (notes, highlights, sermons, journal,
 * prayer, memory verses, reading plan, review) lives in this browser's
 * localStorage under one prefix. There are no accounts and no server copy, so
 * backup/restore below is how people move or protect their data.
 */

export const STORAGE_PREFIX = "shepherds-desk:";

export function readJson<T>(key: string, fallback: T): T {
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Returns false when the browser refuses to store (private mode, full quota, blocked site data). */
export function writeJson(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const newId = () => Math.random().toString(36).slice(2, 10);

export type ListItem = { id: string; text: string; created_at: string };

/** Simple dated lists: journal, prayer, reading plan, review. */
export function readList(name: string): ListItem[] {
  const items = readJson<unknown>(`${STORAGE_PREFIX}list:${name}`, []);
  return Array.isArray(items) ? (items as ListItem[]) : [];
}

export function writeList(name: string, items: ListItem[]): boolean {
  return writeJson(`${STORAGE_PREFIX}list:${name}`, items);
}

export type Backup = { app: "shepherds-desk"; version: 1; exportedAt: string; data: Record<string, unknown> };

export function exportBackup(): Backup {
  const data: Record<string, unknown> = {};
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(STORAGE_PREFIX)) continue;
      const raw = window.localStorage.getItem(key);
      try {
        data[key] = raw ? JSON.parse(raw) : null;
      } catch {
        data[key] = raw;
      }
    }
  } catch {
    // Storage unavailable: export whatever was collected (possibly nothing).
  }
  return { app: "shepherds-desk", version: 1, exportedAt: new Date().toISOString(), data };
}

/** Restores a backup over the current data. Only keys under our prefix are written. */
export function importBackup(backup: unknown): { restored: number; error?: string } {
  const candidate = backup as Partial<Backup> | null;
  if (!candidate || candidate.app !== "shepherds-desk" || typeof candidate.data !== "object" || !candidate.data) {
    return { restored: 0, error: "That file isn't a Shepherd's Desk backup." };
  }
  let restored = 0;
  for (const [key, value] of Object.entries(candidate.data)) {
    if (!key.startsWith(STORAGE_PREFIX)) continue;
    if (!writeJson(key, value)) return { restored, error: "This browser stopped accepting data partway through. Check storage settings." };
    restored += 1;
  }
  return { restored };
}
