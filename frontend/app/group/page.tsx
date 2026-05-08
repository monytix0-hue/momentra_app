import { Suspense } from "react";
import { GroupHubExperience } from "@/components/group/group-hub-experience";
import { GroupHubSkeleton } from "@/components/group/GroupHubSkeleton";

export default function GroupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg">
          <div className="mx-auto max-w-6xl px-m-4 py-m-6 pb-m-16 lg:px-m-8 lg:py-m-10">
            <GroupHubSkeleton />
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-bg">
        <div className="mx-auto max-w-6xl px-m-4 py-m-6 pb-m-16 lg:px-m-8 lg:py-m-10">
          <GroupHubExperience />
        </div>
      </div>
    </Suspense>
  );
}
