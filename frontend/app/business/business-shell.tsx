"use client";

import { useEffect } from "react";

export function BusinessShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const prev = document.documentElement.getAttribute("data-context");
    document.documentElement.setAttribute("data-context", "business");
    return () => {
      document.documentElement.setAttribute("data-context", prev ?? "business");
    };
  }, []);
  return <>{children}</>;
}

