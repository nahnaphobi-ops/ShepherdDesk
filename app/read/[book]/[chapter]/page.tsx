import { ReadingWorkspace } from "../../../../components/reader/ReadingWorkspace";
import { getReading } from "../../../../lib/reading-data";

type ReaderPageProps = { params: Promise<{ book: string; chapter: string }> };

export default async function ReaderPage({ params }: ReaderPageProps) {
  const { book, chapter } = await params;

  const reading = await getReading(book, Number(chapter));
  if (reading) return <ReadingWorkspace reading={reading} />;

  return (
    <main className="shell">
      <p className="eyebrow">Reading Pane</p>
      <h1>{book} {chapter}</h1>
      <p className="lede">
        The reading experience is ready for scripture ingestion and translation
        tabs in the next slice.
      </p>
    </main>
  );
}
