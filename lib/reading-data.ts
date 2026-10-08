import { createSupabaseServerClient } from "./supabase/server";
import { resolveBook } from "./bible-books";
import { psalm23 } from "./reading-fixture";
import type { Reading, ReadingTranslation } from "./reading-types";
import { psalm23WordTags, type VerseWordTag } from "./word-tags-fixture";

export type { Reading, ReadingTranslation } from "./reading-types";

type VerseRow = {
  id: string;
  text: string;
  reference_id: string;
  scripture_references: { verse: number; book: string; chapter: number };
  translations: { code: string; name: string; attribution_text: string | null; license_tier: string };
};

const TRANSLATION_ORDER = ["BSB", "KJV", "WEB", "ASV", "YLT", "WBT", "BBE", "DRA", "TYN", "WNT"];
const translationRank = (code: string) => {
  const index = TRANSLATION_ORDER.indexOf(code);
  return index === -1 ? TRANSLATION_ORDER.length : index;
};

export async function getReading(book: string, chapter: number): Promise<Reading | null> {
  const canonicalBook = resolveBook(book)?.name ?? book;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return getFixture(canonicalBook, chapter);

  // Resolve the chapter's reference ids first, then fetch verses by indexed reference_id.
  // A single join filtered on scripture_references hits the statement timeout on large tables.
  const { data: refs, error: refsError } = await supabase
    .from("scripture_references")
    .select("id, verse")
    .eq("book", canonicalBook)
    .eq("chapter", chapter);
  if (refsError) console.error("getReading references failed:", refsError);
  if (!refs?.length) return getFixture(canonicalBook, chapter, supabase);

  const verseByReference = new Map<string, number>(refs.map((ref: { id: string; verse: number }) => [ref.id, ref.verse]));

  const { data: verseRows, error } = await supabase
    .from("verses")
    .select("id, reference_id, text, translations!inner(code, name, attribution_text, enabled, license_tier)")
    .in("reference_id", [...verseByReference.keys()])
    .eq("translations.enabled", true);
  if (error) console.error("getReading verses failed:", error);

  const data = ((verseRows ?? []) as unknown as Array<Omit<VerseRow, "scripture_references">>)
    .map((row) => ({ ...row, scripture_references: { verse: verseByReference.get(row.reference_id) ?? 0, book: canonicalBook, chapter } }))
    .sort((left, right) => left.scripture_references.verse - right.scripture_references.verse);

  if (error || !data.length) return getFixture(canonicalBook, chapter, supabase);

  const rows = data as unknown as VerseRow[];
  const grouped = new Map<string, ReadingTranslation>();
  const referenceIds: Record<number, string> = {};
  const verseMeta = new Map<string, { translationCode: string; verse: number }>();

  for (const row of rows) {
    const translation = row.translations;
    // Open-source build: only public-domain text is ever served.
    if (translation.license_tier !== "public_domain") continue;

    referenceIds[row.scripture_references.verse] = row.reference_id;
    verseMeta.set(row.id, { translationCode: translation.code, verse: row.scripture_references.verse });

    const current = grouped.get(translation.code) ?? {
      code: translation.code,
      name: translation.name,
      attribution: translation.attribution_text ?? "",
      verses: [],
    };
    current.verses.push([row.scripture_references.verse, row.text]);
    grouped.set(translation.code, current);
  }

  if (!grouped.size) return getFixture(canonicalBook, chapter, supabase);

  const wordTags = await loadWordTags(supabase, [...verseMeta.keys()], verseMeta);

  return {
    book: canonicalBook,
    chapter,
    translations: [...grouped.values()].sort((a, b) => translationRank(a.code) - translationRank(b.code)),
    referenceIds,
    wordTags,
  };
}

async function loadWordTags(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  verseIds: string[],
  verseMeta: Map<string, { translationCode: string; verse: number }>,
): Promise<Record<string, VerseWordTag[]>> {
  if (!verseIds.length) return {};

  const { data: tags } = await supabase
    .from("verse_word_tags")
    .select("verse_id, word_position, surface_text, strongs_entries(strongs_number)")
    .in("verse_id", verseIds);

  const grouped: Record<string, VerseWordTag[]> = {};
  for (const tag of tags ?? []) {
    const meta = verseMeta.get(tag.verse_id);
    const strongsNumber = (tag.strongs_entries as unknown as { strongs_number: string } | null)?.strongs_number;
    if (!meta || !strongsNumber) continue;

    const entry: VerseWordTag = {
      verse: meta.verse,
      position: tag.word_position,
      surface: tag.surface_text,
      strongsNumber,
    };
    grouped[meta.translationCode] ??= [];
    grouped[meta.translationCode]!.push(entry);
  }
  return grouped;
}

async function getFixture(
  book: string,
  chapter: number,
  supabase?: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<Reading | null> {
  if (book.toLowerCase() !== "psalm" && book.toLowerCase() !== "psalms") return null;
  if (chapter !== 23) return null;

  let referenceIds: Record<number, string> = {};
  if (supabase) {
    const { data } = await supabase
      .from("scripture_references")
      .select("id, verse")
      .eq("book", "Psalms")
      .eq("chapter", 23);
    if (data?.length) {
      referenceIds = Object.fromEntries(data.map((row: { verse: number; id: string }) => [row.verse, row.id]));
    }
  }

  return {
    ...psalm23,
    referenceIds,
    wordTags: psalm23WordTags,
  };
}
