import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SourceEntry = { name: string; definitions: Array<{ text: string }>; scripture_refs?: Array<{ reference: string }> };
type Row = { term: string; source: string; body_text: string };

const dictionaries = [
  { dir: "easton", source: "Easton" },
  { dir: "smith", source: "Smith" },
] as const;

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  if (process.env.NODE_ENV === "production") throw new Error("Ingestion scripts must run locally.");
  const root = process.env.DICTIONARY_DIR ?? "data/dictionaries";
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  for (const { dir, source } of dictionaries) {
    const rows = new Map<string, Row>();
    for (const file of (await readdir(join(root, dir))).filter((name) => name.endsWith(".json") && name !== "_index.json")) {
      const entries = JSON.parse(await readFile(join(root, dir, file), "utf8")) as Record<string, SourceEntry>;
      for (const entry of Object.values(entries)) {
        const definition = entry.definitions.map((item) => item.text.trim()).filter(Boolean).join("\n\n");
        if (!definition) continue;
        const references = [...new Set((entry.scripture_refs ?? []).map((ref) => ref.reference))];
        const body = references.length ? `${definition}\n\nReferences: ${references.join("; ")}` : definition;
        rows.set(entry.name, { term: entry.name, source, body_text: body });
      }
    }
    const all = [...rows.values()];
    for (let index = 0; index < all.length; index += 200) {
      await upsertWithRetry(supabase, all.slice(index, index + 200));
      console.log(`${source}: ${Math.min(index + 200, all.length)} / ${all.length}`);
    }
  }
}

async function upsertWithRetry(supabase: SupabaseClient, rows: Row[]) {
  for (let attempt = 1; ; attempt += 1) {
    const { error } = await supabase.from("dictionary_entries").upsert(rows, { onConflict: "term,source" });
    if (!error) return;
    if (attempt >= 4) throw error;
    await new Promise((resolve) => setTimeout(resolve, attempt * 3000));
  }
}

void main();
