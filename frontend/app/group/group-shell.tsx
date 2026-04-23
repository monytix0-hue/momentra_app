"use client";

import { useEffect } from "react";

export function GroupShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const prev = document.documentElement.getAttribute("data-context");
    document.documentElement.setAttribute("data-context", "group");
    return () => {
      document.documentElement.setAttribute("data-context", prev ?? "business");
    };
  }, []);
  return <>{children}</>;
}
