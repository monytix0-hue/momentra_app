import { Suspense } from "react";
import { GroupHomeDashboard } from "@/components/group/group-home-dashboard";

export default function GroupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center bg-bg">
          <div className="h-8 w-8 animate-pulse rounded-full border-2 border-ctx-accent/30 border-t-ctx-accent" />
        </div>
      }
    >
      <GroupHomeDashboard />
    </Suspense>
  );
}
