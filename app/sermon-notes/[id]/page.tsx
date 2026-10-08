import { SermonEditor } from "../../../components/sermon/SermonEditor";

export default async function SermonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SermonEditor id={id} />;
}
