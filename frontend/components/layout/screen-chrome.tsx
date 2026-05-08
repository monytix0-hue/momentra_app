"use client";

import type { ReactNode } from "react";
import type { MomentraContext } from "./context-switcher";

const HEADER_STYLES: Record<MomentraContext, { cover: string; accent: string; orbOpacity: number }> = {
  personal: { cover: "var(--p-cover)", accent: "var(--p-acc)", orbOpacity: 0.25 },
  group: { cover: "var(--g-cover)", accent: "var(--g-acc)", orbOpacity: 0.30 },
  business: { cover: "var(--b-cover)", accent: "var(--b-acc)", orbOpacity: 0.25 },
  circle: { cover: "var(--c-cover)", accent: "var(--c-acc)", orbOpacity: 0.25 },
};

type ScreenChromeProps = {
  context: MomentraContext;
  children: ReactNode;
  headerHeight?: number;
};

export function ScreenChrome({ context, children, headerHeight = 160 }: ScreenChromeProps) {
  const styles = HEADER_STYLES[context];
  return (
    <div className="relative min-h-screen bg-bg">
      {/* Header gradient */}
      <div
        className="pointer-events-none fixed top-0 left-0 right-0 z-0"
        style={{
          height: `${headerHeight}px`,
          background: `linear-gradient(180deg, ${styles.cover} 0%, var(--bg) 100%)`,
        }}
      />

      {/* Orb */}
      <div
        className="pointer-events-none fixed z-0"
        style={{
          width: "360px",
          height: "360px",
          borderRadius: "50%",
          background: `radial-gradient(circle, color-mix(in srgb, ${styles.accent} ${styles.orbOpacity * 100 + 2}%, transparent) 0%, transparent 70%)`,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          marginTop: "-178px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {children}
      </div>
    </div>
  );
}
