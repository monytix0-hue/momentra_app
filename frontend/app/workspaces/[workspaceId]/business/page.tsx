import { Suspense } from "react";
import { WorkspaceBusinessDashboard } from "@/components/business/workspace-business-dashboard";

export default async function WorkspaceBusinessPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-ctx-accent/30 border-t-ctx-accent" />
        </div>
      }
    >
      <WorkspaceBusinessDashboard workspaceId={workspaceId} />
    </Suspense>
  );
}
