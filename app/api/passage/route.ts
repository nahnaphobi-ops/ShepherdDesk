import { NextResponse } from "next/server";
import { resolveBook } from "../../../lib/bible-books";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

type Row = { text: string; scripture_references: { verse: number }; translations: { code: string; name: string } };

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const book = resolveBook(params.get("book") ?? "");
  const chapter = Number(params.get("chapter"));
  if (!book || !Number.isInteger(chapter) || chapter < 1) return NextResponse.json({ error: "Unknown passage" }, { status: 400 });
  const from = Number(params.get("from")) || 1;
  const to = Number(params.get("to")) || 999;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ translations: [] });
  const { data, error } = await supabase
    .from("verses")
    .select("text, scripture_references!inner(verse, book, chapter), translations!inner(code, name, enabled, license_tier)")
    .eq("scripture_references.book", book.name)
    .eq("scripture_references.chapter", chapter)
    .gte("scripture_references.verse", from)
    .lte("scripture_references.verse", to)
    .eq("translations.enabled", true)
    .eq("translations.license_tier", "public_domain");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const grouped = new Map<string, { code: string; name: string; verses: Array<[number, string]> }>();
  for (const row of (data ?? []) as unknown as Row[]) {
    const entry = grouped.get(row.translations.code) ?? { code: row.translations.code, name: row.translations.name, verses: [] };
    entry.verses.push([row.scripture_references.verse, row.text.replace(/<\/?i>/g, "")]);
    grouped.set(row.translations.code, entry);
  }
  const translations = [...grouped.values()].map((item) => ({ ...item, verses: item.verses.sort((a, b) => a[0] - b[0]) }));
  return NextResponse.json({ book: book.name, chapter, translations });
}
