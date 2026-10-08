import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

type TagRecord = { book: string; chapter: number; verse: number; word_position: number; surface_text: string; strongs_number: string; language: "hebrew" | "greek"; transliteration?: string; gloss?: string; full_definition?: string };

async function main() {
  const sourceFile = process.env.STEPBIBLE_SOURCE_FILE;
  const translationCode = process.env.STEPBIBLE_TRANSLATION_CODE;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sourceFile || !translationCode || !supabaseUrl || !serviceRoleKey) throw new Error("Set STEP-BIBLE_SOURCE_FILE, STEPBIBLE_TRANSLATION_CODE, NEXT_PUBLIC_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY.");
  if (process.env.NODE_ENV === "production") throw new Error("Ingestion scripts must run locally.");

  const records = JSON.parse(await readFile(sourceFile, "utf8")) as TagRecord[];
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const strongs = [...new Map(records.map((record) => [record.strongs_number, record])).values()];
  const { data: entries, error: entryError } = await supabase.from("strongs_entries").upsert(strongs.map((record) => ({ strongs_number: record.strongs_number, language: record.language, transliteration: record.transliteration, gloss: record.gloss, full_definition: record.full_definition })), { onConflict: "strongs_number" }).select("id, strongs_number");
  if (entryError || !entries) throw entryError ?? new Error("Strong's entries were not created");
  const entryIds = new Map(entries.map((entry) => [entry.strongs_number, entry.id]));

  for (let index = 0; index < records.length; index += 500) {
    const batch = records.slice(index, index + 500);
    const references = [...new Map(batch.map((record) => [`${record.book}:${record.chapter}:${record.verse}`, record])).values()];
    const { data: referenceRows, error: referenceError } = await supabase.from("scripture_references").upsert(references.map(({ book, chapter, verse }) => ({ book, chapter, verse })), { onConflict: "book,chapter,verse" }).select("id, book, chapter, verse");
    if (referenceError || !referenceRows) throw referenceError ?? new Error("References were not created");
    const referenceIds = new Map(referenceRows.map((reference) => [`${reference.book}:${reference.chapter}:${reference.verse}`, reference.id]));
    const { data: verseRows, error: verseError } = await supabase.from("verses").select("id, reference_id, translations!inner(code)").eq("translations.code", translationCode).in("reference_id", [...referenceIds.values()]);
    if (verseError || !verseRows) throw verseError ?? new Error("Verse rows were not found; ingest the translation first.");
    const verseIds = new Map(verseRows.map((verse) => [verse.reference_id, verse.id]));
    const tags = batch.map((record) => ({ verse_id: verseIds.get(referenceIds.get(`${record.book}:${record.chapter}:${record.verse}`) ?? ""), word_position: record.word_position, surface_text: record.surface_text, strongs_id: entryIds.get(record.strongs_number) })).filter((tag): tag is { verse_id: string; word_position: number; surface_text: string; strongs_id: string } => Boolean(tag.verse_id && tag.strongs_id));
    const { error: tagError } = await supabase.from("verse_word_tags").upsert(tags, { onConflict: "verse_id,word_position" });
    if (tagError) throw tagError;
    console.log(`Ingested ${Math.min(index + 500, records.length)} / ${records.length}`);
  }
}

void main();
