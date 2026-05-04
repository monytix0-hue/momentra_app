import type { CSSProperties, ReactNode } from "react";

export function ConsoleSectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-m-5">
      {eyebrow ? <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/35">{eyebrow}</p> : null}
      <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.02em] text-ctx-text lg:text-[22px]">{title}</h2>
      {subtitle ? <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-3">{subtitle}</p> : null}
    </div>
  );
}

export function ConsoleCard({
  children,
  className = "",
  style,
  glow = true,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  glow?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-m-hero border border-surface-300 bg-surface-100 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--ctx-accent)_18%,transparent)] ${className}`}
      style={style}
    >
      {glow ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
          style={{
            background: "linear-gradient(90deg, transparent, var(--ctx-accent), transparent)",
          }}
        />
      ) : null}
      {children}
    </div>
  );
}

export function severityAccentVar(sev: string): string {
  if (sev === "high") return "var(--urgency-high-label)";
  if (sev === "medium") return "var(--urgency-medium-label)";
  if (sev === "low") return "var(--status-info-fg)";
  if (sev === "calm") return "var(--urgency-clear-label)";
  return "var(--ctx-accent)";
}
