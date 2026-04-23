/**
 * Shared visual tokens for the Group module — keeps surfaces, CTAs, and motion consistent.
 */

export const groupFocusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ctx-accent";

/** Primary filled CTA — group context */
export const groupBtnPrimary =
  `inline-flex min-h-[44px] items-center justify-center rounded-m-cta bg-gradient-to-br from-ctx-accent to-ctx-accent-end px-m-6 py-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-white shadow-[0_4px_20px_-8px_color-mix(in_srgb,var(--ctx-accent)_80%,transparent)] transition-[opacity,transform,box-shadow] duration-fast ease-standard hover:opacity-95 hover:shadow-[0_8px_28px_-10px_color-mix(in_srgb,var(--ctx-accent)_70%,transparent)] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40 ${groupFocusRing}`;

/** Secondary / outline CTA */
export const groupBtnSecondary =
  `inline-flex min-h-[44px] items-center justify-center rounded-m-cta border border-surface-300 bg-bg2 px-m-5 py-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink transition-[border-color,background-color,transform] duration-fast ease-standard hover:border-ctx-accent/40 hover:bg-surface-200/80 active:scale-[0.99] disabled:opacity-40 ${groupFocusRing}`;

/** Ghost text-style control in bars */
export const groupBtnGhost =
  `rounded-m-chip px-m-3 py-2.5 text-[11px] font-semibold text-ink-2 transition-[color,background-color] duration-fast ease-standard hover:bg-surface-200/60 hover:text-ink min-h-[40px] ${groupFocusRing}`;

/** Elevated card — hub list, member cards */
export const groupCardInteractive =
  "rounded-m-hero border border-surface-300/85 bg-surface-100/95 shadow-[0_1px_0_0_color-mix(in_srgb,var(--ctx-accent)_12%,transparent),0_10px_40px_-28px_rgba(0,0,0,0.55)] transition-[border-color,box-shadow,transform] duration-fast ease-standard hover:border-ctx-accent/28 hover:shadow-[0_14px_44px_-24px_rgba(0,0,0,0.55)]";

/** Hero / header strip */
export const groupHeroSurface =
  "relative overflow-hidden rounded-m-hero border border-surface-300/90 bg-gradient-to-br from-surface-100 via-bg2 to-surface-100 shadow-[0_1px_0_0_color-mix(in_srgb,var(--ctx-accent)_14%,transparent),0_20px_50px_-36px_rgba(0,0,0,0.5)]";

/** Section title (h2 level) */
export const groupSectionTitle = "text-lg font-semibold tracking-tight text-ink md:text-xl";

/** Eyebrow / kicker */
export const groupEyebrow =
  "text-[10px] font-semibold uppercase tracking-[0.2em] text-ctx-accent";

/** Stat / metric mini-card */
export const groupStatTile =
  "rounded-m-card border border-surface-300/80 bg-surface-100/90 px-m-4 py-m-3 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--ctx-accent)_8%,transparent)] transition-[border-color,box-shadow] duration-fast ease-standard hover:border-ctx-accent/22";

/** Empty state panel */
export const groupEmptyPanel =
  "rounded-m-hero border border-dashed border-surface-300/80 bg-bg2/40 px-m-6 py-m-8 text-center shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--ctx-accent)_6%,transparent)]";

/** Inline spinner wrapper */
export const groupSpinner =
  "h-9 w-9 animate-spin rounded-full border-2 border-ctx-accent/25 border-t-ctx-accent";

/** Compact elevated panel — sign-in gates, errors (pair with max-w-* on wrapper) */
export const groupPanelElevated =
  "rounded-m-hero border border-surface-300/90 bg-surface-100/95 shadow-[0_16px_48px_-32px_rgba(0,0,0,0.52)]";

/**
 * Secondary CTA — same visual priority as “Record payment” and hub card “Open group”.
 * Add `w-full justify-center` when full-width inside a card.
 */
export const groupBtnAccentOutline =
  `inline-flex min-h-[44px] items-center justify-center rounded-m-cta border-2 border-ctx-accent/35 bg-bg2 px-m-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-ctx-accent transition-[background-color,border-color,transform] duration-fast ease-standard hover:bg-ctx-accent/[0.08] active:scale-[0.99] ${groupFocusRing}`;

/** Back navigation chip — hub → detail */
export const groupBackChip =
  `inline-flex min-h-[44px] items-center gap-2 rounded-m-chip border border-surface-300/85 bg-bg2 px-m-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink transition-[border-color,background-color] duration-fast hover:border-ctx-accent/35 hover:bg-surface-200/40 ${groupFocusRing}`;

/** Text back link — create flow (no border) */
export const groupBackText =
  `inline-flex min-h-[44px] items-center text-[12px] font-semibold uppercase tracking-[0.1em] text-ctx-accent transition-colors duration-fast hover:text-ink ${groupFocusRing}`;
