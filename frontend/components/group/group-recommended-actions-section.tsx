import Link from "next/link";
import type { RecommendedAction } from "@/lib/group/group-home-console";
import { ConsoleCard, ConsoleSectionTitle } from "@/components/group/group-console-shared";

function priorityDot(p: 1 | 2 | 3) {
  if (p === 1)
    return (
      <span
        className="h-2 w-2 rounded-full bg-urgency-high shadow-[0_0_10px_-2px_var(--urgency-high)]"
        title="High priority"
      />
    );
  if (p === 2) return <span className="h-2 w-2 rounded-full bg-urgency-medium/90" title="Medium priority" />;
  return <span className="h-2 w-2 rounded-full bg-ink-4/70" title="Low priority" />;
}

function GroupRecommendedActionCard({ action }: { action: RecommendedAction }) {
  return (
    <ConsoleCard className="group/card p-m-5 transition-[transform] duration-300 hover:-translate-y-0.5">
      <div className="flex gap-m-4">
        <div className="pt-1">{priorityDot(action.priority)}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-snug text-ctx-text">{action.title}</p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-3">{action.detail}</p>
          <Link
            href={action.href}
            className="mt-m-4 inline-flex text-[11px] font-semibold uppercase tracking-[0.12em] text-ctx-accent underline decoration-ctx-accent/35 underline-offset-4 transition-colors group-hover/card:decoration-ctx-accent"
          >
            {action.ctaLabel} →
          </Link>
        </div>
      </div>
    </ConsoleCard>
  );
}

export function GroupRecommendedActionsSection({ actions }: { actions: RecommendedAction[] }) {
  if (!actions.length) {
    return (
      <section className="min-w-0">
        <ConsoleSectionTitle
          eyebrow="Next steps"
          title="Recommended actions"
          subtitle="We’ll surface reminders and settlements here when something needs you."
        />
        <ConsoleCard className="p-m-6">
          <p className="text-[14px] text-ink-3">
            No urgent actions right now. Check back after expenses or new commitments roll in.
          </p>
        </ConsoleCard>
      </section>
    );
  }

  return (
    <section className="min-w-0">
      <ConsoleSectionTitle
        eyebrow="Next steps"
        title="Recommended actions"
        subtitle="Small moves that keep everyone aligned — tap through to the right group."
      />
      <div className="grid gap-m-3">
        {actions.map((a) => (
          <GroupRecommendedActionCard key={a.id} action={a} />
        ))}
      </div>
    </section>
  );
}
