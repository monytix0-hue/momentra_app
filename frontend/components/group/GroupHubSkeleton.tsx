"use client";

/** Loading placeholder aligned with hub layout — shimmer preserves structure, reduces layout jump. */
export function GroupHubSkeleton() {
  return (
    <div className="space-y-m-8 md:space-y-m-10" aria-busy aria-label="Loading groups">
      <div className="group-skeleton-bar h-44 rounded-m-hero md:h-48" />
      <div className="grid grid-cols-2 gap-m-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="group-skeleton-bar h-[5.5rem] rounded-m-card" />
        ))}
      </div>
      <div className="space-y-m-3">
        <div className="group-skeleton-bar h-3 w-36 rounded" />
        <div className="group-skeleton-bar h-[4.5rem] rounded-m-hero" />
        <div className="group-skeleton-bar h-[4.5rem] rounded-m-hero" />
      </div>
      <div>
        <div className="group-skeleton-bar mb-m-4 h-5 w-40 rounded" />
        <div className="grid gap-m-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="group-skeleton-bar h-56 rounded-m-hero" />
          ))}
        </div>
      </div>
    </div>
  );
}
