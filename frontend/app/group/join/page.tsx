"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { acceptGroupInvite, fetchGroupInvitePreview } from "@/lib/api/group";

const card =
  "mx-auto max-w-md rounded-m-hero border border-surface-300 bg-surface-100 p-m-6 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--ctx-accent)_20%,transparent)]";

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") ?? "").trim();
  const { user, loading: authLoading } = useAuth();
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof fetchGroupInvitePreview>> | null>(null);
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [acceptErr, setAcceptErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token || token.length < 8) {
      setPreviewErr("Missing or invalid invite link.");
      return;
    }
    let cancelled = false;
    setPreviewErr(null);
    void (async () => {
      try {
        const p = await fetchGroupInvitePreview(token);
        if (!cancelled) setPreview(p);
      } catch (e) {
        if (!cancelled) setPreviewErr(e instanceof Error ? e.message : "Invite not found");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onAccept = useCallback(async () => {
    if (!user || !token) return;
    setAcceptErr(null);
    setBusy(true);
    try {
      const authToken = await user.getIdToken();
      const { group_id: gid } = await acceptGroupInvite(authToken, token);
      await router.push(`/group/${gid}`);
    } catch (e) {
      setAcceptErr(e instanceof Error ? e.message : "Could not join");
    } finally {
      setBusy(false);
    }
  }, [user, token, router]);

  if (!token || token.length < 8) {
    return (
      <div className={card}>
        <h1 className="text-[18px] font-semibold text-ink">Invalid link</h1>
        <p className="mt-m-2 text-[14px] text-ink-3">Open the invite link from your email or message.</p>
        <Link href="/" className="mt-m-4 inline-block text-[13px] font-medium text-ctx-accent underline">
          Home
        </Link>
      </div>
    );
  }

  if (previewErr) {
    return (
      <div className={card}>
        <h1 className="text-[18px] font-semibold text-ink">Invite unavailable</h1>
        <p className="mt-m-2 text-[14px] text-ink-3">{previewErr}</p>
        <Link href="/" className="mt-m-4 inline-block text-[13px] font-medium text-ctx-accent underline">
          Home
        </Link>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className={card}>
        <p className="text-[14px] text-ink-3">Loading invite…</p>
      </div>
    );
  }

  return (
    <div className={card}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ctx-accent">Group invite</p>
      <h1 className="mt-m-2 text-[20px] font-semibold text-ink">{preview.group_title}</h1>
      <p className="mt-m-2 text-[14px] text-ink-3">
        You&apos;re invited as <span className="font-medium text-ink">{preview.display_name}</span>.
      </p>

      {acceptErr ? (
        <p className="mt-m-4 rounded-m-chip border border-urgency-high/35 bg-bg2 px-m-3 py-m-2 text-[13px] text-urgency-high">
          {acceptErr}
        </p>
      ) : null}

      {authLoading ? (
        <p className="mt-m-6 text-[13px] text-ink-3">Checking sign-in…</p>
      ) : user ? (
        <button
          type="button"
          className="mt-m-6 w-full rounded-m-chip bg-gradient-to-br from-ctx-accent to-ctx-accent-end py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-50"
          disabled={busy}
          onClick={() => void onAccept()}
        >
          {busy ? "Joining…" : "Accept & open group"}
        </button>
      ) : (
        <div className="mt-m-6 space-y-m-3">
          <p className="text-[13px] text-ink-3">Sign in to accept this invitation.</p>
          <Link
            href={`/login?next=${encodeURIComponent(`/group/join?token=${encodeURIComponent(token)}`)}`}
            className="block w-full rounded-m-chip border-2 border-ctx-border bg-bg2 py-3 text-center text-[12px] font-semibold uppercase tracking-[0.12em] text-ctx-text"
          >
            Sign in
          </Link>
        </div>
      )}

      <Link href="/" className="mt-m-6 inline-block text-[12px] text-ink-4 underline">
        Back to home
      </Link>
    </div>
  );
}

export default function GroupJoinPage() {
  return (
    <main className="min-h-[70vh] px-m-4 py-m-10">
      <Suspense
        fallback={
          <div className={card}>
            <p className="text-[14px] text-ink-3">Loading…</p>
          </div>
        }
      >
        <JoinContent />
      </Suspense>
    </main>
  );
}
