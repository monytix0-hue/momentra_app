import { Suspense } from "react";
import { PersonalDashboard } from "@/components/personal/personal-dashboard";

export default function PersonalPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center bg-bg">
          <div className="h-8 w-8 animate-pulse rounded-full border-2 border-ctx-accent/30 border-t-ctx-accent" />
        </div>
      }
    >
      <PersonalDashboard />
    </Suspense>
  );
}
