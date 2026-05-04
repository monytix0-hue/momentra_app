import { WorkspaceBusinessPayablesPage } from "@/components/business/workspace-business-secondary-pages";

export default async function Page({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  return <WorkspaceBusinessPayablesPage workspaceId={workspaceId} />;
}
