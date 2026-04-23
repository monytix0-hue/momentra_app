"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

/** Strip stray backslashes / whitespace from hosting .env (causes "Illegal url for new iframe" / %5C in auth URL). */
function sanitizeFirebaseEnvVar(value: string | undefined): string | undefined {
  if (value == null) return undefined;
  let s = value.trim();
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, "");
  s = s.replace(/\\/g, "");
  return s || undefined;
}

/** GA4 IDs are `G-` + alphanumeric; hosting env often has trailing `\\` or junk after paste. */
function sanitizeMeasurementId(value: string | undefined): string | undefined {
  const cleaned = sanitizeFirebaseEnvVar(value);
  if (!cleaned) return undefined;
  const m = cleaned.match(/^(G-[A-Z0-9]+)/i);
  return m ? m[1] : cleaned;
}

const firebaseConfig = {
  apiKey: sanitizeFirebaseEnvVar(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: sanitizeFirebaseEnvVar(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: sanitizeFirebaseEnvVar(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: sanitizeFirebaseEnvVar(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: sanitizeFirebaseEnvVar(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: sanitizeFirebaseEnvVar(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
  measurementId: sanitizeMeasurementId(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID),
};

export function hasFirebaseConfig(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId,
  );
}

let app: FirebaseApp | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (!hasFirebaseConfig()) {
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
