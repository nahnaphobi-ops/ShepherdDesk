import { createClient } from "@supabase/supabase-js";
import { createSupabaseServiceClient } from "./supabase/service";

export type DictionaryEntry = {
  id: string;
  term: string;
  source: string;
  body_text: string;
};

const featuredTerms = ["Shepherd", "Covenant", "Atonement", "throne of grace"];

let cachedEntries: DictionaryEntry[] | null = null;
let loadingPromise: Promise<DictionaryEntry[]> | null = null;

export async function getDictionaryEntries(): Promise<DictionaryEntry[]> {
  if (cachedEntries) return cachedEntries;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    // Hosted deployments don't carry the service-role key; dictionary_entries has a
    // public read policy (migration 0009), so the anon key works there.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabase =
      createSupabaseServiceClient() ??
      (url && anonKey
        ? createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
        : null);
    if (!supabase) {
      throw new Error("Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    }

    // PostgREST caps each response (1,000 rows by default), so page through the table.
    const pageSize = 1000;
    const loaded: DictionaryEntry[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("dictionary_entries")
        .select("id, term, source, body_text")
        .not("term", "like", "ISBE Volume%")
        .order("term", { ascending: true })
        .order("id", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) throw error;
      loaded.push(...(data ?? []));
      if (!data || data.length < pageSize) break;
    }
    cachedEntries = loaded;
    return cachedEntries;
  })();

  try {
    return await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

function scoreEntry(entry: DictionaryEntry, query: string): number {
  const term = entry.term.toLowerCase();
  const body = entry.body_text.toLowerCase();
  if (term === query) return 100;
  if (term.startsWith(query)) return 80;
  if (term.includes(query)) return 60;
  if (body.includes(query)) return 30;
  return 0;
}

export function searchDictionaryEntries(entries: DictionaryEntry[], rawQuery: string, limit = 20): DictionaryEntry[] {
  const query = rawQuery.toLowerCase().trim();
  if (!query) return [];

  return entries
    .map((entry) => ({ entry, score: scoreEntry(entry, query) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.entry.term.localeCompare(right.entry.term))
    .slice(0, limit)
    .map(({ entry }) => entry);
}

export function featuredDictionaryEntries(entries: DictionaryEntry[]): DictionaryEntry[] {
  const lookup = new Map(entries.map((entry) => [entry.term.toLowerCase(), entry]));
  return featuredTerms
    .map((term) => lookup.get(term.toLowerCase()))
    .filter((entry): entry is DictionaryEntry => Boolean(entry));
}

export function warmDictionaryIndex(): void {
  getDictionaryEntries().catch(() => {});
}
