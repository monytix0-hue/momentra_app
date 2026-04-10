"use client";

import { useEffect } from "react";
import { getFirebaseAnalytics } from "@/lib/firebase/client";

/**
 * Initializes Firebase Analytics in the browser (equivalent to getAnalytics(app)
 * in the Firebase web setup snippet). Safe for Next.js — no top-level analytics init.
 *
 * The SDK may log "Failed to fetch measurement ID" then fall back to local
 * NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID — common with ad blockers; events can still work.
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
