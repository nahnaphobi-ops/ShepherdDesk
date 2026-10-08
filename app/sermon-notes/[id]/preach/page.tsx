import { PreachView } from "../../../../components/sermon/PreachView";

export default async function PreachPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PreachView id={id} />;
}
