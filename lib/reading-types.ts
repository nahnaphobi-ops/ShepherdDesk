export type ReadingTranslation = {
  code: string;
  name: string;
  attribution: string;
  verses: [number, string][];
};

export type VerseWordTag = {
  verse: number;
  position: number;
  surface: string;
  strongsNumber: string;
};

export type Reading = {
  book: string;
  chapter: number;
  translations: ReadingTranslation[];
  referenceIds: Record<number, string>;
  wordTags: Record<string, VerseWordTag[]>;
};

export function passageTitle(book: string, chapter: number): string {
  if (book === "Psalms" && chapter === 23) return "The Shepherd Psalm";
  return `${book} ${chapter}`;
}
