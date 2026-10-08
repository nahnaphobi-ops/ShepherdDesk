import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
import { psalm23WordStudies } from "../../../../lib/word-study-fixture";

type RouteProps = { params: Promise<{ strongsNumber: string }> };

export async function GET(_request: Request, { params }: RouteProps) {
  const { strongsNumber } = await params;
  const fallback = Object.values(psalm23WordStudies).find((word) => word.strongsNumber === strongsNumber);
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fallback ? NextResponse.json(fallback) : NextResponse.json({ error: "Word not found" }, { status: 404 });

  const { data: entry, error } = await supabase
    .from("strongs_entries")
    .select("id, strongs_number, language, transliteration, gloss, full_definition")
    .eq("strongs_number", strongsNumber)
    .maybeSingle();
  if (error || !entry) return fallback ? NextResponse.json(fallback) : NextResponse.json({ error: "Word not found" }, { status: 404 });

  const { data: occurrences } = await supabase
    .from("verse_word_tags")
    .select("verses!inner(scripture_references!inner(book, chapter, verse))")
    .eq("strongs_id", entry.id);

  const otherReferences = (occurrences ?? []).map((item: unknown) => {
    const reference = (item as { verses?: { scripture_references?: { book: string; chapter: number; verse: number } } }).verses?.scripture_references;
    return reference ? `${reference.book} ${reference.chapter}:${reference.verse}` : null;
  }).filter((reference: string | null): reference is string => Boolean(reference)).slice(0, 10);

  return NextResponse.json({
    surface: fallback?.surface ?? strongsNumber,
    strongsNumber: entry.strongs_number,
    language: entry.language === "hebrew" ? "Hebrew" : "Greek",
    transliteration: entry.transliteration ?? "",
    gloss: entry.gloss ?? "",
    definition: entry.full_definition ?? "",
    otherReferences,
  });
}
