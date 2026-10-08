import { NextResponse } from "next/server";
import { getReading } from "../../../../../lib/reading-data";

type RouteProps = { params: Promise<{ book: string; chapter: string }> };

// Used by the reader to prefetch neighbouring chapters so page turns are instant.
export async function GET(_request: Request, { params }: RouteProps) {
  const { book, chapter } = await params;
  const reading = await getReading(book, Number(chapter));
  if (!reading) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  return NextResponse.json(reading, { headers: { "Cache-Control": "public, max-age=600" } });
}
