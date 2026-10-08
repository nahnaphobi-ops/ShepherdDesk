import { Suspense } from "react";
import { DictionaryWorkspace } from "../../components/dictionary/DictionaryWorkspace";

export default function DictionaryPage() {
  return (
    <Suspense fallback={<main className="dictionary-shell"><p className="eyebrow">Theological dictionary</p><h1>Trace the word.</h1></main>}>
      <DictionaryWorkspace />
    </Suspense>
  );
}
