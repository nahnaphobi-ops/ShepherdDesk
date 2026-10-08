export type WordStudy = {
  surface: string;
  strongsNumber: string;
  language: "Hebrew" | "Greek";
  transliteration: string;
  gloss: string;
  definition: string;
  otherReferences: string[];
};

export const psalm23WordStudies: Record<string, WordStudy> = {
  shepherd: {
    surface: "shepherd",
    strongsNumber: "H7462",
    language: "Hebrew",
    transliteration: "ra'ah",
    gloss: "to tend, pasture, shepherd",
    definition: "To care for and guide a flock; used here as a picture of the LORD's attentive care.",
    otherReferences: ["Genesis 48:15", "Isaiah 40:11", "Ezekiel 34:11"],
  },
  lord: {
    surface: "LORD",
    strongsNumber: "H3068",
    language: "Hebrew",
    transliteration: "YHWH",
    gloss: "the proper name of the God of Israel",
    definition: "The covenant name of God, represented in many English translations by LORD in small capitals.",
    otherReferences: ["Exodus 3:15", "Psalm 103:1", "Isaiah 6:3"],
  },
  want: {
    surface: "want",
    strongsNumber: "H2637",
    language: "Hebrew",
    transliteration: "chaser",
    gloss: "to lack, be diminished",
    definition: "To be without what is needed; the psalmist describes complete provision under God's care.",
    otherReferences: ["Deuteronomy 8:9", "Psalm 34:10", "Proverbs 13:25"],
  },
};
