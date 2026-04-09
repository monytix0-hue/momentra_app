"use client";

import { useState } from "react";
import QRCode from "react-qr-code";
import { useAuth } from "@/contexts/auth-context";
import { addGroupParticipant, sendParticipantInvite } from "@/lib/api/group";
import { normalizeGroupJoinUrl } from "@/lib/group/join-url";

const inputCls =
  "w-full rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-2.5 text-[13px] text-ink placeholder:text-ink-4 focus:border-ctx-accent focus:outline-none focus:ring-1 focus:ring-ctx-accent/35";

const btnPrimary =
  "rounded-m-chip bg-gradient-to-br from-ctx-accent to-ctx-accent-end px-m-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-95 disabled:opacity-40";

const btnGhost =
  "rounded-m-chip border border-ctx-border/60 bg-bg2/90 px-m-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-ctx-accent transition-colors hover:border-ctx-accent disabled:opacity-40";

export function GroupInvitePanel({
  groupId,
  isAdmin,
  onCreated,
}: {
  groupId: string;
  isAdmin: boolean;
  onCreated: () => void | Promise<void>;
}) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div className="rounded-m-card border border-surface-300 bg-surface-100/80 px-m-4 py-m-3 text-[12px] leading-relaxed text-ink-3">
        Only a group <span className="font-medium text-ink">admin</span> can add invitees and generate join links.
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const dn = name.trim();
    if (!dn) {
      setErr("Enter a name for the person you’re inviting.");
      return;
    }
    setBusy(true);
    setErr(null);
    setInfo(null);
    setJoinUrl(null);
    try {
      const token = await user.getIdToken();
      const em = email.trim() || null;
      const created = await addGroupParticipant(token, groupId, {
        display_name: dn,
        role: "member",
        invite_email: em,
      });
      const out = await sendParticipantInvite(token, groupId, created.participant_id, em ? { invite_email: em } : {});
      const url = normalizeGroupJoinUrl(out.join_url);
      setJoinUrl(url);
      if (out.message?.trim()) setInfo(out.message.trim());
      setName("");
      setEmail("");
      await onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not create invite");
    } finally {
      setBusy(false);
    }
  }

  async function copyUrl() {
    if (!joinUrl || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setInfo("Link copied to clipboard.");
    } catch {
      setErr("Could not copy to clipboard");
    }
  }

  return (
    <div className="rounded-m-hero border border-ctx-border/40 bg-ctx-hero/45 px-m-4 py-m-5 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--ctx-accent)_14%,transparent)]">
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-ctx-accent">Invite someone</p>
      <p className="mt-2 max-w-xl text-[12px] leading-relaxed text-ink-3">
        Add a placeholder member, then we mint a join link that opens this app (same origin as your browser — fixes
        dev links pointing at the API host).
      </p>

      <form onSubmit={(e) => void onSubmit(e)} className="mt-m-4 grid gap-m-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
        <div className="sm:col-span-1 lg:col-span-5">
          <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wider text-ink-4">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            placeholder="e.g. Priya"
            autoComplete="name"
          />
        </div>
        <div className="sm:col-span-1 lg:col-span-5">
          <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wider text-ink-4">
            Email (optional)
          </label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            placeholder="For Resend email, if configured"
            type="email"
            autoComplete="email"
          />
        </div>
        <div className="lg:col-span-2">
          <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>
            {busy ? "…" : "Add & create link"}
          </button>
        </div>
      </form>

      {err ? (
        <p className="mt-m-3 rounded-m-chip border border-urgency-high/35 bg-bg2 px-m-3 py-m-2 text-[12px] text-urgency-high">
          {err}
        </p>
      ) : null}
      {info ? (
        <p className="mt-m-3 rounded-m-chip border border-status-pending-fg/30 bg-bg2 px-m-3 py-m-2 text-[12px] text-ink-2">
          {info}
        </p>
      ) : null}

      {joinUrl ? (
        <div className="mt-m-5 flex flex-col gap-m-4 border-t border-ctx-border/25 pt-m-5 sm:flex-row sm:items-start">
          <div className="rounded-m-chip border border-surface-300 bg-bg2 p-m-3">
            <QRCode value={joinUrl} size={128} />
          </div>
          <div className="min-w-0 flex-1 space-y-m-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-4">Join link</p>
            <p className="break-all font-mono text-[11px] leading-relaxed text-ctx-text">{joinUrl}</p>
            <button type="button" className={btnGhost} onClick={() => void copyUrl()}>
              Copy link
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
