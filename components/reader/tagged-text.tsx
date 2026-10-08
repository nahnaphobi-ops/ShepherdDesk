import { Fragment, type ReactNode } from "react";
import { psalm23WordStudies, type WordStudy } from "../../lib/word-study-fixture";
import type { VerseWordTag } from "../../lib/word-tags-fixture";

/** Renders a verse with its Strong's-tagged words as buttons. Shared by the reader and the sermon builder. */
export function renderTaggedText(text: string, verse: number, tags: VerseWordTag[], onWord: (tag: VerseWordTag) => void): ReactNode[] {
  const verseTags = tags.filter((tag) => tag.verse === verse);
  const byPosition = new Map(verseTags.map((tag) => [tag.position, tag]));
  const bySurface = new Map(verseTags.map((tag) => [tag.surface.toLowerCase().replace(/[^a-z]/g, ""), tag]));
  let wordIndex = 0;

  return text.split(/(<i>.*?<\/i>)/).flatMap((segment, segmentIndex) => {
    const italic = segment.startsWith("<i>");
    const content = italic ? segment.slice(3, -4) : segment;
    const nodes: ReactNode[] = [];
    let run = "";
    const flush = (key: string) => {
      if (!run) return;
      nodes.push(italic ? <em key={key}>{run}</em> : <Fragment key={key}>{run}</Fragment>);
      run = "";
    };
    content.split(/(\s+)/).filter(Boolean).forEach((part, index) => {
      if (/^\s+$/.test(part)) { run += part; return; }
      wordIndex += 1;
      const clean = part.replace(/[^a-zA-Z]/g, "");
      const tag = byPosition.get(wordIndex) ?? bySurface.get(clean.toLowerCase());
      if (!tag) { run += part; return; }
      flush(`${segmentIndex}-r${index}`);
      const button = <button className="word-button" key={`${segmentIndex}-${index}`} type="button" onClick={(event) => { event.stopPropagation(); onWord(tag); }}>{part}</button>;
      nodes.push(italic ? <em key={`${segmentIndex}-${index}`}>{button}</em> : button);
    });
    flush(`${segmentIndex}-end`);
    return nodes;
  });
}

/** Shows the fixture entry immediately, then swaps in the full entry from the API. */
export async function loadWordStudy(tag: VerseWordTag, show: (study: WordStudy) => void) {
  show(psalm23WordStudies[tag.surface.toLowerCase()] ?? {
    surface: tag.surface,
    strongsNumber: tag.strongsNumber,
    language: tag.strongsNumber.startsWith("H") ? "Hebrew" : "Greek",
    transliteration: "",
    gloss: "",
    definition: "",
    otherReferences: [],
  });
  try {
    const response = await fetch(`/api/word-study/${tag.strongsNumber}`);
    if (response.ok) show((await response.json()) as WordStudy);
  } catch {
    // The fixture remains visible when the API is unavailable.
  }
}
