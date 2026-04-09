"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/contexts/auth-context";
import { AppHeader } from "@/components/app-header";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AppHeader />
      {children}
    </AuthProvider>
  );
}
