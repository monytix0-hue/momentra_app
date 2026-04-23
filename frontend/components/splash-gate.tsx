"use client";

import { useCallback, useLayoutEffect, useState } from "react";
import { SplashScreen } from "./splash-screen";

/** One splash per browser tab session; cleared when the tab closes. */
export const SPLASH_SEEN_SESSION_KEY = "momentra_splash_seen";

type SplashGateProps = {
  children: React.ReactNode;
  /** Set false to skip splash (e.g. after first visit). */
  enabled?: boolean;
};

export function SplashGate({ children, enabled = true }: SplashGateProps) {
  const [done, setDone] = useState(!enabled);

  useLayoutEffect(() => {
    if (!enabled) return;
    try {
      if (sessionStorage.getItem(SPLASH_SEEN_SESSION_KEY) === "1") {
        queueMicrotask(() => setDone(true));
      }
    } catch {
      /* storage blocked (private mode, etc.) — show splash once per mount */
    }
  }, [enabled]);

  const finish = useCallback(() => {
    try {
      sessionStorage.setItem(SPLASH_SEEN_SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    setDone(true);
  }, []);

  return (
    <>
      {children}
      {!done ? <SplashScreen onFinish={finish} /> : null}
    </>
  );
}
