import { WorkspaceList } from "../../components/workspace/WorkspaceList";

export default function ReviewPage() {
  return <WorkspaceList list="review" title="Needed to review" description="Keep passages and notes that deserve another quiet look." placeholder="Add a review reminder" />;
}
