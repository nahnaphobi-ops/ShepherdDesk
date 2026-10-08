import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";

const execFileAsync = promisify(execFile);
// The pre-Next.js app's data files only exist in git history; override with LEGACY_REF if needed.
const ref = process.env.LEGACY_REF ?? "9e80dc8";

type AnnotatedEntry = { name?: string; category?: string; pronunciation?: string; etymology?: string; summary?: string; details?: string; references?: string[]; relatedTerms?: string[] };
type ConceptEntry = { term?: string; category?: string; definition?: string; biblicalFoundation?: string[]; theologicalSignificance?: string; historicalInterpretation?: string; practicalApplication?: string; relatedTerms?: string[]; crossReferences?: string[] };
type Row = { term: string; source: string; body_text: string };

const list = (label: string, items?: string[]) => (items?.length ? `${label}: ${items.join(label === "Related terms" ? ", " : "; ")}` : "");
const section = (label: string, text?: string) => (text ? `${label}\n${text}` : "");

async function readJson<T>(path: string): Promise<T> {
  const { stdout } = await execFileAsync("git", ["show", `${ref}:${path}`], { maxBuffer: 50 * 1024 * 1024 });
  return JSON.parse(stdout) as T;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  if (process.env.NODE_ENV === "production") throw new Error("Ingestion scripts must run locally.");
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const rows = new Map<string, Row>();

  const people = await readJson<{ entries: Record<string, AnnotatedEntry> }>("api/data/bible-dictionary.json");
  for (const [key, entry] of Object.entries(people.entries)) {
    const term = entry.name ?? key.replace(/-/g, " ");
    const body = [
      [entry.category, entry.pronunciation && `Pronounced ${entry.pronunciation}`].filter(Boolean).join(" · "),
      entry.etymology && `Etymology: ${entry.etymology}`,
      entry.summary,
      entry.details,
      list("References", entry.references),
      list("Related terms", entry.relatedTerms),
    ].filter(Boolean).join("\n\n");
    if (body) rows.set(term, { term, source: "Shepherd", body_text: body });
  }

  const concepts = await readJson<{ entries: Record<string, ConceptEntry> }>("api/data/dictionary.json");
  for (const [key, entry] of Object.entries(concepts.entries)) {
    const term = entry.term ?? key.replace(/-/g, " ");
    if (rows.has(term)) continue;
    const body = [
      entry.category,
      entry.definition,
      list("Biblical foundation", entry.biblicalFoundation),
      section("Theological significance", entry.theologicalSignificance),
      section("Historical interpretation", entry.historicalInterpretation),
      section("Practical application", entry.practicalApplication),
      list("Related terms", entry.relatedTerms),
      list("Cross references", entry.crossReferences),
    ].filter(Boolean).join("\n\n");
    if (body) rows.set(term, { term, source: "Shepherd", body_text: body });
  }

  const all = [...rows.values()];
  for (let index = 0; index < all.length; index += 200) {
    const { error } = await supabase.from("dictionary_entries").upsert(all.slice(index, index + 200), { onConflict: "term,source" });
    if (error) throw error;
    console.log(`Shepherd: ${Math.min(index + 200, all.length)} / ${all.length}`);
  }
}

void main();
