"use client";

/**
 * Prefer importing from `core` / `analytics-lazy` / `analytics` directly in hot paths.
 * This barrel is for convenience; `logAnalyticsEvent` here is the lazy (smaller) variant.
 */

export { getFirebaseApp, getFirebaseAuth, hasFirebaseConfig } from "./core";
export { getFirebaseAnalytics, logEventSafe } from "./analytics";
export { logAnalyticsEvent } from "./analytics-lazy";
