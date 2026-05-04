"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { logAnalyticsEvent } from "@/lib/firebase/analytics-lazy";
import { getFirebaseAuth } from "@/lib/firebase/core";
import { syncUserProfile } from "@/lib/api/client";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  profileSynced: boolean;
  syncError: string | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function pushProfileToBackend(user: User) {
  const token = await user.getIdToken();
  await syncUserProfile(token, {
    display_name: user.displayName,
    photo_url: user.photoURL,
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const firebaseConfigured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => firebaseConfigured);
  const [profileSynced, setProfileSynced] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseConfigured) return;
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, async (next) => {
      setUser(next);
      setProfileSynced(false);
      setSyncError(null);
      if (next) {
        try {
          await pushProfileToBackend(next);
          setProfileSynced(true);
        } catch (e) {
          setProfileSynced(false);
          setSyncError(e instanceof Error ? e.message : "Could not sync profile to server");
        }
      }
      setLoading(false);
    });
  }, [firebaseConfigured]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    await signInWithEmailAndPassword(auth, email, password);
    logAnalyticsEvent("login", { method: "email" });
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName: string) => {
      const auth = getFirebaseAuth();
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName.trim()) {
        await updateProfile(cred.user, { displayName: displayName.trim() });
      }
      logAnalyticsEvent("sign_up", { method: "email" });
    },
    [],
  );

  const signInWithGoogle = useCallback(async () => {
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const cred = await signInWithPopup(auth, provider);
    const info = getAdditionalUserInfo(cred);
    if (info?.isNewUser) {
      logAnalyticsEvent("sign_up", { method: "google" });
    } else {
      logAnalyticsEvent("login", { method: "google" });
    }
  }, []);

  const signOutUser = useCallback(async () => {
    const auth = getFirebaseAuth();
    await signOut(auth);
    logAnalyticsEvent("logout");
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      profileSynced,
      syncError,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOutUser,
    }),
    [
      user,
      loading,
      profileSynced,
      syncError,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOutUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
