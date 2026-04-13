"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { acceptGroupInvite, fetchGroupInvitePreview } from "@/lib/api/group";
import { GroupJoinErrorCard, GroupJoinInviteCard } from "@/components/group/GroupJoinInviteCard";
import { GroupJoinSkeleton } from "@/components/group/GroupJoinSkeleton";
import { groupBtnPrimary } from "@/lib/group/group-ui";

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
      setPreviewErr("This link looks incomplete. Ask your organizer for a fresh invite.");
      return;
    }
    let cancelled = false;
    setPreviewErr(null);
    void (async () => {
      try {
        const p = await fetchGroupInvitePreview(token);
        if (!cancelled) setPreview(p);
      } catch (e) {
        if (!cancelled) setPreviewErr(e instanceof Error ? e.message : "We couldn’t open this invite.");
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
      setAcceptErr(e instanceof Error ? e.message : "Something went wrong — try again in a moment.");
    } finally {
      setBusy(false);
    }
  }, [user, token, router]);

  if (!token || token.length < 8) {
    return (
      <GroupJoinErrorCard
        title="This link needs a refresh"
        message="Open the invite from your message or email, or ask whoever invited you to send a new link."
      />
    );
  }

  if (previewErr) {
    return (
      <GroupJoinErrorCard
        title="We can’t open this invite"
        message={
          previewErr.includes("not found") || previewErr.includes("404")
            ? "It may have expired or been replaced. Ask your organizer for a new invite."
            : previewErr
        }
      />
    );
  }

  if (!preview) {
    return <GroupJoinSkeleton />;
  }

  return (
    <GroupJoinInviteCard preview={preview}>
      {acceptErr ? (
        <p className="mb-m-4 rounded-m-card border border-urgency-high/28 bg-bg2 px-m-3 py-m-2 text-[13px] leading-relaxed text-urgency-high" role="alert">
          {acceptErr}
        </p>
      ) : null}
      {authLoading ? (
        <p className="text-[14px] text-ink-3">Checking your sign-in…</p>
      ) : user ? (
        <button type="button" className={`${groupBtnPrimary} w-full`} disabled={busy} onClick={() => void onAccept()}>
          {busy ? "Joining…" : "Join this group"}
        </button>
      ) : (
        <div className="space-y-m-4">
          <p className="text-[14px] leading-relaxed text-ink-3">
            Sign in with the Momentra account you use day to day — then you can join in one tap.
          </p>
          <Link
            href={`/login?next=${encodeURIComponent(`/group/join?token=${encodeURIComponent(token)}`)}`}
            className={`${groupBtnPrimary} w-full text-center`}
          >
            Sign in to continue
          </Link>
        </div>
      )}
    </GroupJoinInviteCard>
  );
}

export default function GroupJoinPage() {
  return (
    <main className="min-h-[75vh] bg-bg px-m-4 py-m-10 md:py-m-12">
      <Suspense fallback={<GroupJoinSkeleton />}>
        <JoinContent />
      </Suspense>
    </main>
  );
}
