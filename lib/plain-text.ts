const entities: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
};

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&([a-z]+);/gi, (_, name: string) => entities[name.toLowerCase()] ?? " ")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

export function plainExcerpt(text: string, query: string, radius = 220, length = 500): string {
  const plain = htmlToPlainText(text);
  if (!query) return plain.slice(0, length);
  const index = plain.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return "";
  const start = Math.max(0, index - radius);
  const end = Math.min(plain.length, index + length);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < plain.length ? "…" : "";
  return `${prefix}${plain.slice(start, end).trim()}${suffix}`;
}
