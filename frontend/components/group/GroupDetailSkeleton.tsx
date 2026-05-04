"use client";

/** Mirrors detail layout: hero band + metric strip + sections. */
export function GroupDetailSkeleton() {
  return (
    <div aria-busy aria-label="Loading group">
      <div className={`group-skeleton-bar mb-m-6 h-11 w-36 rounded-m-chip`} />
      <div className="group-skeleton-bar mb-m-8 h-48 rounded-m-hero md:h-56" />
      <div className="mb-m-8 grid grid-cols-2 gap-m-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="group-skeleton-bar h-20 rounded-m-card" />
        ))}
      </div>
      <div className="group-skeleton-bar mb-m-3 h-6 w-48 rounded" />
      <div className="mb-m-10 grid gap-m-3 sm:grid-cols-2">
        <div className="group-skeleton-bar h-36 rounded-m-hero" />
        <div className="group-skeleton-bar h-36 rounded-m-hero" />
      </div>
      <div className="group-skeleton-bar mb-m-3 h-6 w-40 rounded" />
      <div className="group-skeleton-bar h-28 rounded-m-card" />
    </div>
  );
}
