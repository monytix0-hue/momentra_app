"use client";

import type { MomentraContext } from "./context-switcher";

const FAB_STYLES: Record<MomentraContext, { accent: string; accentEnd: string }> = {
  personal: { accent: "var(--p-acc)", accentEnd: "var(--p-acc-e)" },
  group: { accent: "var(--g-acc)", accentEnd: "var(--g-acc-e)" },
  business: { accent: "var(--b-acc)", accentEnd: "var(--b-acc-e)" },
  circle: { accent: "var(--c-acc)", accentEnd: "var(--c-acc-e)" },
};

type FloatingAddButtonProps = {
  context: MomentraContext;
  onTap: () => void;
};

export function FloatingAddButton({ context, onTap }: FloatingAddButtonProps) {
  const styles = FAB_STYLES[context];
  return (
    <button
      type="button"
      onClick={onTap}
      className="fixed z-40 bottom-[72px] right-m-8 flex items-center gap-m-2 rounded-full px-[18px] py-[10px] text-[13px] font-semibold text-white shadow-lg transition-transform duration-fast active:scale-[0.97] hover:opacity-95"
      style={{
        background: `linear-gradient(135deg, ${styles.accent}, ${styles.accentEnd})`,
      }}
    >
      <span className="text-[16px] leading-none">+</span>
      <span>Add</span>
    </button>
  );
}
