"use client";

/** Matches invite card silhouette while preview loads. */
export function GroupJoinSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-md overflow-hidden rounded-m-hero border border-surface-300/90 bg-surface-100/95 shadow-[0_16px_48px_-28px_rgba(0,0,0,0.55)]"
      aria-busy
      aria-label="Loading invite"
    >
      <div className="group-skeleton-bar h-24" />
      <div className="space-y-m-4 px-m-6 pb-m-8 pt-m-4">
        <div className="group-skeleton-bar h-3 w-28 rounded" />
        <div className="group-skeleton-bar h-8 w-[85%] max-w-xs rounded" />
        <div className="group-skeleton-bar h-16 w-full rounded-m-card" />
        <div className="group-skeleton-bar h-12 w-full rounded-m-cta" />
      </div>
    </div>
  );
}
