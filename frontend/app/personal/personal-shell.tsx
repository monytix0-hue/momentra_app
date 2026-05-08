"use client";

import { useEffect } from "react";

export function PersonalShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const prev = document.documentElement.getAttribute("data-context");
    document.documentElement.setAttribute("data-context", "personal");
    return () => {
      document.documentElement.setAttribute("data-context", prev ?? "business");
    };
  }, []);
  return <>{children}</>;
}
