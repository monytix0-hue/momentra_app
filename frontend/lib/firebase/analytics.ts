"use client";

import {
  getAnalytics,
  isSupported,
  logEvent,
  type Analytics,
} from "firebase/analytics";
import { getFirebaseApp, hasFirebaseConfig } from "./core";

/** Analytics only runs in the browser; call from client components after mount. */
export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") return null;
  if (!(await isSupported())) return null;
  return getAnalytics(getFirebaseApp());
}

export function logEventSafe(
  analytics: Analytics | null,
  name: string,
  params?: Record<string, string | number | boolean>,
): void {
  if (!analytics) return;
  logEvent(analytics, name, params);
}

/** Fire-and-forget analytics (loads `firebase/analytics` only when this runs). */
export function logAnalyticsEvent(
  name: string,
  params?: Record<string, string | number | boolean>,
): void {
  if (!hasFirebaseConfig()) return;
  void getFirebaseAnalytics().then((a) => logEventSafe(a, name, params));
}
