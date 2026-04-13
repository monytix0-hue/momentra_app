import { WorkspaceBusinessSubnav } from "@/components/business/workspace-business-subnav";

export default async function WorkspaceBusinessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  return (
    <div className="space-y-m-4">
      <WorkspaceBusinessSubnav workspaceId={workspaceId} />
      {children}
    </div>
  );
}
