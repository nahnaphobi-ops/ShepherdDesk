import type { SermonPoint, SermonRecord } from "./sermon-store";

export function sermonFileName(sermon: SermonRecord, extension: string): string {
  return `${(sermon.title || "sermon").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${extension}`;
}

export function sermonWordCount(sermon: SermonRecord, points: SermonPoint[]): number {
  return [
    sermon.big_idea, sermon.introduction, sermon.application, sermon.conclusion,
    ...points.flatMap((point) => [point.heading, point.notes, point.illustration, ...point.subpoints]),
  ].join(" ").split(/\s+/).filter(Boolean).length;
}

export function sermonMarkdown(sermon: SermonRecord, points: SermonPoint[]): string {
  const outline = points.map((point, index) => [
    `### ${index + 1}. ${point.heading || "Untitled point"}`,
    point.subpoints.filter(Boolean).map((item) => `- ${item}`).join("\n"),
    point.notes,
    point.illustration && `> **Illustration:** ${point.illustration}`,
    point.verses.length ? `*Scripture:* ${point.verses.join("; ")}` : "",
  ].filter(Boolean).join("\n\n")).join("\n\n");
  return [
    `# ${sermon.title}`,
    sermon.series && `**Series:** ${sermon.series}`,
    sermon.passage_label && `**Passage:** ${sermon.passage_label}`,
    sermon.big_idea && `## Big idea\n\n${sermon.big_idea}`,
    sermon.introduction && `## Introduction\n\n${sermon.introduction}`,
    outline && `## Outline\n\n${outline}`,
    sermon.application && `## Application\n\n${sermon.application}`,
    sermon.conclusion && `## Conclusion\n\n${sermon.conclusion}`,
  ].filter(Boolean).join("\n\n") + "\n";
}

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const paragraphs = (value: string) => value.split(/\n{2,}/).filter((item) => item.trim()).map((item) => `<p>${escapeHtml(item).replace(/\n/g, "<br>")}</p>`).join("");

/** An HTML document Word opens directly as a .doc file, so no extra library is needed. */
export function sermonWordDocument(sermon: SermonRecord, points: SermonPoint[]): string {
  const section = (heading: string, body: string) => (body.trim() ? `<h2>${heading}</h2>${paragraphs(body)}` : "");
  const outline = points.map((point, index) => [
    `<h3>${index + 1}. ${escapeHtml(point.heading || "Untitled point")}</h3>`,
    point.subpoints.some(Boolean) ? `<ul>${point.subpoints.filter(Boolean).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "",
    paragraphs(point.notes),
    point.illustration ? `<p><b>Illustration:</b> ${escapeHtml(point.illustration)}</p>` : "",
    point.verses.length ? `<p><i>Scripture: ${escapeHtml(point.verses.join("; "))}</i></p>` : "",
  ].join("")).join("");
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${escapeHtml(sermon.title)}</title>
<style>body{font-family:Georgia,serif;font-size:12pt;line-height:1.5}h1{font-size:22pt}h2{font-size:15pt;margin-top:18pt}h3{font-size:13pt}</style></head><body>
<h1>${escapeHtml(sermon.title)}</h1>
${sermon.series ? `<p><b>Series:</b> ${escapeHtml(sermon.series)}</p>` : ""}${sermon.passage_label ? `<p><b>Passage:</b> ${escapeHtml(sermon.passage_label)}</p>` : ""}
${section("Big idea", sermon.big_idea)}${section("Introduction", sermon.introduction)}${outline ? `<h2>Outline</h2>${outline}` : ""}${section("Application", sermon.application)}${section("Conclusion", sermon.conclusion)}
</body></html>`;
}

export function downloadFile(content: string, type: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
