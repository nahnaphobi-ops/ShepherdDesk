import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

type VerseRecord = { book: string; chapter: number; verse: number; text: string };
type SourceBible = { books: Array<{ name: string; chapters: Array<{ chapter: number; verses: Array<{ verse: number; text: string }> }> }> };

async function main() {
const sourceFile = process.env.BIBLE_SOURCE_FILE;
const sourceUrl = process.env.BIBLE_SOURCE_URL;
const translationCode = process.env.BIBLE_TRANSLATION_CODE;
const translationName = process.env.BIBLE_TRANSLATION_NAME;
const licenseTier = process.env.BIBLE_LICENSE_TIER ?? "public_domain";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if ((!sourceFile && !sourceUrl) || !translationCode || !translationName || !supabaseUrl || !serviceRoleKey) {
  throw new Error("Set BIBLE_SOURCE_FILE or BIBLE_SOURCE_URL, BIBLE_TRANSLATION_CODE, BIBLE_TRANSLATION_NAME, NEXT_PUBLIC_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY.");
}
if (process.env.NODE_ENV === "production") throw new Error("Ingestion scripts must run locally.");

const raw = sourceUrl ? await (await fetch(sourceUrl)).json() as SourceBible : JSON.parse(await readFile(sourceFile!, "utf8"));
const verses = Array.isArray(raw) ? raw as VerseRecord[] : (raw as SourceBible).books.flatMap((book) => book.chapters.flatMap((chapter) => chapter.verses.map((verse) => ({ book: book.name, chapter: chapter.chapter, verse: verse.verse, text: verse.text }))));
const supabase = createClient(supabaseUrl, serviceRoleKey);
const { data: translation, error: translationError } = await supabase.from("translations").upsert({ code: translationCode, name: translationName, license_tier: licenseTier, enabled: true }, { onConflict: "code" }).select("id").single();
if (translationError || !translation) throw translationError ?? new Error("Translation was not created");

for (let index = 0; index < verses.length; index += 500) {
  const batch = verses.slice(index, index + 500);
  const { data: references, error: referenceError } = await supabase.from("scripture_references").upsert(batch.map(({ book, chapter, verse }) => ({ book, chapter, verse })), { onConflict: "book,chapter,verse" }).select("id, book, chapter, verse");
  if (referenceError || !references) throw referenceError ?? new Error("References were not created");
  const referenceIds = new Map(references.map((reference) => [`${reference.book}:${reference.chapter}:${reference.verse}`, reference.id]));
  const rows = batch.map((verse) => ({ reference_id: referenceIds.get(`${verse.book}:${verse.chapter}:${verse.verse}`), translation_id: translation.id, text: verse.text })).filter((row): row is { reference_id: string; translation_id: string; text: string } => Boolean(row.reference_id));
  const { error } = await supabase.from("verses").upsert(rows, { onConflict: "reference_id,translation_id" });
  if (error) throw error;
  console.log(`Ingested ${Math.min(index + 500, verses.length)} / ${verses.length}`);
}
}

void main();
