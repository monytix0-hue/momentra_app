"use client";

import Link from "next/link";
import type { TodayGroupItem } from "@/lib/group/group-home-console";
import { ConsoleCard, ConsoleSectionTitle, severityAccentVar } from "@/components/group/group-console-shared";

function TodayGroupSignalCard({ item }: { item: TodayGroupItem }) {
  const border = severityAccentVar(item.severity);
  return (
    <ConsoleCard
      className="border-l-[3px] pl-0 transition-[transform,box-shadow] duration-300 ease-standard hover:shadow-[0_0_28px_-12px_color-mix(in_srgb,var(--ctx-accent)_45%,transparent)]"
      style={{ borderLeftColor: border }}
      glow={false}
    >
      <div className="flex flex-col gap-m-4 p-m-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 flex-1 font-serif text-[17px] leading-snug text-ctx-text md:text-[18px]">{item.headline}</p>
        <Link
          href={item.href}
          className="inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-m-cta border border-ctx-accent/50 bg-gradient-to-br from-ctx-accent/20 to-transparent px-m-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ctx-accent transition-[transform,opacity] duration-fast hover:border-ctx-accent hover:opacity-95 active:scale-[0.99]"
        >
          {item.ctaLabel}
        </Link>
      </div>
    </ConsoleCard>
  );
}

export function TodayGroupsSection({ items }: { items: TodayGroupItem[] }) {
  return (
    <section className="min-w-0">
      <ConsoleSectionTitle
        eyebrow="Daily pulse"
        title="Today in your groups"
        subtitle="What changed, who’s waiting, and the one tap that moves things forward."
      />
      <div className="space-y-m-3">
        {items.map((item) => (
          <TodayGroupSignalCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
