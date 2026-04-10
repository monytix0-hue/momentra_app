import { Suspense } from "react";
import { BusinessWorkspacePage } from "@/components/business/business-workspace-page";

export const runtime = "edge";

export default async function BusinessWorkspaceRoute({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-6xl px-m-4 py-m-8 pb-m-16 lg:px-m-8 lg:py-m-10">
        <Suspense
          fallback={
            <div className="flex min-h-[40vh] items-center justify-center">
              <div className="h-8 w-8 animate-pulse rounded-full border-2 border-ctx-accent/30 border-t-ctx-accent" />
            </div>
          }
        >
          <BusinessWorkspacePage workspaceId={workspaceId} />
        </Suspense>
      </div>
    </div>
  );
}

