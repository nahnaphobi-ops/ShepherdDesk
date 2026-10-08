import { NextResponse } from "next/server";
import {
  featuredDictionaryEntries,
  getDictionaryEntries,
  searchDictionaryEntries,
  warmDictionaryIndex,
} from "../../../lib/dictionary-index";

warmDictionaryIndex();

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();
  const mode = url.searchParams.get("mode") ?? "keyword";
  const featured = url.searchParams.get("featured") === "1";

  try {
    const entries = await getDictionaryEntries();

    if (featured) {
      return NextResponse.json({ results: featuredDictionaryEntries(entries), mode: "featured" });
    }

    if (!query) return NextResponse.json({ results: [], mode });

    const safeQuery = query.replace(/[%_(),]/g, " ").trim();
    if (!safeQuery) return NextResponse.json({ results: [], mode });

    const dictionaryResults = searchDictionaryEntries(entries, safeQuery);

    if (mode === "semantic") {
      return NextResponse.json({
        results: dictionaryResults,
        mode: "keyword",
        notice: "Semantic search needs indexed embeddings; showing keyword matches.",
      });
    }

    return NextResponse.json({ results: dictionaryResults, mode: "keyword" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
