"use client";

import { useCallback, useState } from "react";
import QRCode from "react-qr-code";
import { useAuth } from "@/contexts/auth-context";
import type { GroupParticipant } from "@/lib/api/group";
import { sendParticipantInvite } from "@/lib/api/group";
import { normalizeGroupJoinUrl } from "@/lib/group/join-url";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    const w = parts[0];
    return w.slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_STYLES = [
  "bg-[color-mix(in_srgb,var(--brand)_22%,transparent)] text-[#c4b5fd] border-[color-mix(in_srgb,var(--brand)_35%,transparent)]",
  "bg-[color-mix(in_srgb,var(--ctx-accent)_22%,transparent)] text-ctx-text border-[color-mix(in_srgb,var(--ctx-accent)_35%,transparent)]",
  "bg-surface-300/50 text-ink border-surface-300",
] as const;

const btnMini =
  "rounded-m-chip border border-surface-300 bg-bg2 px-m-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink transition-[border-color,background-color] duration-fast hover:border-ctx-border/50 hover:bg-surface-200";

function statusPill(st: string) {
  const s = st.toLowerCase();
  if (s === "active")
    return "border-urgency-clear-value/30 bg-bg2 text-urgency-clear-value";
  if (s === "invited") return "border-status-pending-fg/35 bg-bg2 text-status-pending-fg";
  return "border-surface-300 bg-bg2 text-ink-3";
}

export function ParticipantTable({
  participants,
  groupId,
  isAdmin,
  onRefresh,
}: {
  participants: GroupParticipant[];
  groupId: string;
  isAdmin: boolean;
  onRefresh?: () => void | Promise<void>;
}) {
  const { user } = useAuth();
  const [linkById, setLinkById] = useState<Record<string, string>>({});
  const [qrForId, setQrForId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<string | null>(null);

  const sendOrResend = useCallback(
    async (participantId: string) => {
      if (!user) return;
      setErr(null);
      setInviteInfo(null);
      setBusyId(participantId);
      try {
        const token = await user.getIdToken();
        const out = await sendParticipantInvite(token, groupId, participantId, {});
        setLinkById((prev) => ({
          ...prev,
          [participantId]: normalizeGroupJoinUrl(out.join_url),
        }));
        if (out.message?.trim()) {
          setInviteInfo(out.message.trim());
        }
        void onRefresh?.();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Invite failed");
      } finally {
        setBusyId(null);
      }
    },
    [user, groupId, onRefresh],
  );

  const copyLink = useCallback(async (participantId: string) => {
    const url = linkById[participantId];
    if (!url || typeof navigator === "undefined" || !navigator.clipboard) return;
    setErr(null);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      setErr("Could not copy to clipboard");
    }
  }, [linkById]);

  const showInviteCol = isAdmin;

  return (
    <div className="space-y-m-2">
      {err ? (
        <p className="rounded-m-chip border border-urgency-high/35 bg-bg2 px-m-3 py-m-2 text-[12px] text-urgency-high" role="alert">
          {err}
        </p>
      ) : null}
      {inviteInfo ? (
        <p
          className="rounded-m-chip border border-status-pending-fg/35 bg-bg2 px-m-3 py-m-2 text-[12px] text-ink-2"
          role="status"
        >
          {inviteInfo} Use <span className="font-medium text-ink">Copy link</span> to share the invite.
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-m-chip border border-surface-300">
        <table className="w-full min-w-[min(100%,360px)] text-left text-[13px]">
          <thead className="border-b border-surface-300 bg-surface-200/60 text-[10px] uppercase tracking-wider text-ink-2">
            <tr>
              <th className="px-m-3 py-2.5 font-semibold">Person</th>
              <th className="px-m-3 py-2.5 font-semibold">Role</th>
              <th className="px-m-3 py-2.5 font-semibold">Status</th>
              {showInviteCol ? (
                <th className="px-m-3 py-2.5 font-semibold">Invite</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {participants.map((p, i) => (
              <tr key={p.participant_id} className="border-b border-surface-300/80 align-top last:border-0">
                <td className="px-m-3 py-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex min-w-0 items-center gap-m-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${AVATAR_STYLES[i % AVATAR_STYLES.length]}`}
                      >
                        {initials(p.display_name)}
                      </span>
                      <span className="min-w-0 truncate font-medium text-ink">{p.display_name}</span>
                    </div>
                    {p.status === "invited" && p.invite_email ? (
                      <span className="pl-12 text-[11px] text-ink-3">{p.invite_email}</span>
                    ) : null}
                  </div>
                </td>
                <td className="px-m-3 py-3 capitalize text-ink-2">{p.role}</td>
                <td className="px-m-3 py-3">
                  <span
                    className={`inline-flex rounded-m-cta border px-m-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusPill(p.status)}`}
                  >
                    {p.status === "invited" ? "Pending" : p.status}
                  </span>
                  {p.status === "invited" && p.invite_sent_at ? (
                    <span className="mt-1 block text-[10px] text-ink-4">Emailed</span>
                  ) : null}
                </td>
                {showInviteCol ? (
                  <td className="px-m-3 py-3">
                    {p.status === "invited" && !p.user_id ? (
                      <div className="flex flex-col gap-m-2">
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            className={btnMini}
                            disabled={busyId === p.participant_id}
                            onClick={() => void sendOrResend(p.participant_id)}
                          >
                            {busyId === p.participant_id ? "…" : p.invite_sent_at ? "Resend" : "Send"}
                          </button>
                          {linkById[p.participant_id] ? (
                            <>
                              <button
                                type="button"
                                className={btnMini}
                                onClick={() => void copyLink(p.participant_id)}
                              >
                                Copy link
                              </button>
                              <button
                                type="button"
                                className={btnMini}
                                onClick={() =>
                                  setQrForId((cur) => (cur === p.participant_id ? null : p.participant_id))
                                }
                              >
                                {qrForId === p.participant_id ? "Hide QR" : "QR"}
                              </button>
                            </>
                          ) : null}
                        </div>
                        {qrForId === p.participant_id && linkById[p.participant_id] ? (
                          <div className="rounded-m-chip border border-surface-300 bg-bg2 p-m-2">
                            <QRCode value={linkById[p.participant_id]} size={120} />
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-[11px] text-ink-4">—</span>
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
