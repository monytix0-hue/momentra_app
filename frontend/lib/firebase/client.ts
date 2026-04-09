"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  getAnalytics,
  isSupported,
  logEvent,
  type Analytics,
} from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

function hasConfig(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId,
  );
}

let app: FirebaseApp | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (!hasConfig()) {
    throw new Error("Missing NEXT_PUBLIC_FIREBASE_* env vars");
  }
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

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

/** Fire-and-forget analytics (safe when Analytics is unsupported or env missing). */
export function logAnalyticsEvent(
  name: string,
  params?: Record<string, string | number | boolean>,
): void {
  if (!hasConfig()) return;
  void getFirebaseAnalytics().then((a) => logEventSafe(a, name, params));
}
