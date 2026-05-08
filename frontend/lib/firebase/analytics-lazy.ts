"use client";

/**
 * Keeps `firebase/analytics` out of the main auth/layout Worker chunks (Cloudflare 3 MiB limit).
 * Loads the analytics module only when an event is logged.
 */
export function logAnalyticsEvent(
  name: string,
  params?: Record<string, string | number | boolean>,
): void {
  void import("./analytics").then((m) => m.logAnalyticsEvent(name, params));
}
