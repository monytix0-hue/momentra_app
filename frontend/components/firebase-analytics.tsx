"use client";

import { useEffect } from "react";
import { getFirebaseAnalytics } from "@/lib/firebase/client";

/**
 * Initializes Firebase Analytics in the browser (equivalent to getAnalytics(app)
 * in the Firebase web setup snippet). Safe for Next.js — no top-level analytics init.
 */
export function FirebaseAnalytics() {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) return;
    void getFirebaseAnalytics().catch(() => {
      /* missing/invalid config or analytics unsupported */
    });
  }, []);
  return null;
}
