export type VerseWordTag = {
  verse: number;
  position: number;
  surface: string;
  strongsNumber: string;
};

/** Psalm 23:1 word tags for the BSB translation (matches seed migration positions). */
export const psalm23WordTags: Record<string, VerseWordTag[]> = {
  BSB: [
    { verse: 1, position: 1, surface: "LORD", strongsNumber: "H3068" },
    { verse: 1, position: 4, surface: "shepherd", strongsNumber: "H7462" },
    { verse: 1, position: 8, surface: "want", strongsNumber: "H2637" },
  ],
};
