"use client";

import { useCallback, useState } from "react";
import QRCode from "react-qr-code";
import { useAuth } from "@/contexts/auth-context";
import type { GroupCommitment, GroupParticipant } from "@/lib/api/group";
import { deleteGroupParticipant, sendParticipantInvite } from "@/lib/api/group";
import { GroupInvitePanel } from "@/components/group/group-invite-panel";
import { rollupsByParticipant } from "@/lib/group/group-detail-coordination";
import { formatDisplayDate } from "@/lib/format/display-date";
import { normalizeGroupJoinUrl } from "@/lib/group/join-url";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_STYLES = [
  "bg-[color-mix(in_srgb,var(--brand)_22%,transparent)] text-[#c4b5fd] border-[color-mix(in_srgb,var(--brand)_35%,transparent)]",
  "bg-[color-mix(in_srgb,var(--ctx-accent)_22%,transparent)] text-ctx-text border-[color-mix(in_srgb,var(--ctx-accent)_35%,transparent)]",
  "bg-surface-300/50 text-ink border-surface-300",
] as const;

const btnCoord =
  "rounded-m-chip border border-surface-300 bg-surface-100 px-m-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink transition-colors hover:border-ctx-accent/45 hover:text-ctx-accent";

const btnRemove =
  "rounded-m-chip border border-urgency-high/45 bg-bg2 px-m-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-urgency-high transition-colors hover:border-urgency-high hover:bg-urgency-high/10 disabled:opacity-40";

function money(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function statusPill(st: string) {
  const s = st.toLowerCase();
  if (s === "active") return "border-urgency-clear-value/30 bg-bg2 text-urgency-clear-value";
  if (s === "invited") return "border-status-pending-fg/35 bg-bg2 text-status-pending-fg";
  return "border-surface-300 bg-bg2 text-ink-3";
}

function commitmentStatusClass(st: string) {
  const s = st.toLowerCase();
  if (s === "overdue") return "text-status-overdue-fg";
  if (s === "fulfilled") return "text-status-paid-fg";
  return "text-status-pending-fg";
}

export function GroupCoordinationPeople({
  participants,
  commitments,
  groupId,
  groupTitle,
  isAdmin,
  onRefresh,
  onMarkPaid,
  onRemindParticipant,
  onViewCommitments,
}: {
  participants: GroupParticipant[];
  commitments: GroupCommitment[];
  groupId: string;
  groupTitle: string;
  isAdmin: boolean;
  onRefresh?: () => void | Promise<void>;
  onMarkPaid: (c: GroupCommitment) => void;
  onRemindParticipant: (participantId: string, message: string) => Promise<void>;
  onViewCommitments: () => void;
}) {
  const { user } = useAuth();
  const [linkById, setLinkById] = useState<Record<string, string>>({});
  const [qrForId, setQrForId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [remindBusy, setRemindBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<string | null>(null);
  const [removeBusyId, setRemoveBusyId] = useState<string | null>(null);

  const ids = participants.map((p) => p.participant_id);
  const rollups = rollupsByParticipant(commitments, ids);
  const activeAdminCount = participants.filter((p) => p.role === "admin" && p.status === "active").length;

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
        if (out.message?.trim()) setInviteInfo(out.message.trim());
        void onRefresh?.();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Invite failed");
      } finally {
        setBusyId(null);
      }
    },
    [user, groupId, onRefresh],
  );

  const copyLink = useCallback(
    async (participantId: string) => {
      const url = linkById[participantId];
      if (!url || typeof navigator === "undefined" || !navigator.clipboard) return;
      setErr(null);
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        setErr("Could not copy to clipboard");
      }
    },
    [linkById],
  );

  const onRemoveParticipant = async (p: GroupParticipant) => {
    if (!user) return;
    const label = p.display_name.trim() || "this member";
    const extra =
      p.status === "invited"
        ? " This cancels the pending invite."
        : " They will lose access to this group; commitment rows may need cleanup in the Commitments tab.";
    if (!window.confirm(`Remove ${label} from the group?${extra}`)) return;
    setErr(null);
    setRemoveBusyId(p.participant_id);
    try {
      const token = await user.getIdToken();
      await deleteGroupParticipant(token, groupId, p.participant_id);
      setLinkById((prev) => {
        const next = { ...prev };
        delete next[p.participant_id];
        return next;
      });
      if (qrForId === p.participant_id) setQrForId(null);
      await onRefresh?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not remove member";
      setErr(
        /last admin/i.test(msg)
          ? "You can’t remove the only admin — promote someone else first."
          : msg,
      );
    } finally {
      setRemoveBusyId(null);
    }
  };

  const onRemind = async (participantId: string) => {
    const msg = `Friendly reminder: your contribution for «${groupTitle}» is still open. Thanks!`;
    setRemindBusy(participantId);
    setErr(null);
    try {
      await onRemindParticipant(participantId, msg);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reminder failed");
    } finally {
      setRemindBusy(null);
    }
  };

  return (
    <div className="space-y-m-3">
      <GroupInvitePanel groupId={groupId} isAdmin={isAdmin} onCreated={() => void onRefresh?.()} />
      {err ? (
        <p className="rounded-m-chip border border-urgency-high/35 bg-bg2 px-m-3 py-m-2 text-[12px] text-urgency-high" role="alert">
          {err}
        </p>
      ) : null}
      {inviteInfo ? (
        <p className="rounded-m-chip border border-status-pending-fg/35 bg-bg2 px-m-3 py-m-2 text-[12px] text-ink-2" role="status">
          {inviteInfo}
        </p>
      ) : null}

      <div className="grid gap-m-3 sm:grid-cols-2">
        {participants.map((p, i) => {
          const r = rollups.get(p.participant_id);
          const open = r && r.remaining > 0.01;
          const isSoleActiveAdmin =
            p.role === "admin" && p.status === "active" && activeAdminCount <= 1 && Boolean(p.user_id);
          const showRemove =
            isAdmin &&
            (p.status === "active" || p.status === "invited") &&
            !(isSoleActiveAdmin && p.user_id === user?.uid);
          return (
            <div
              key={p.participant_id}
              className="rounded-m-hero border border-surface-300 bg-surface-100/90 p-m-4 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--ctx-accent)_10%,transparent)] transition-[border-color] hover:border-ctx-accent/25"
            >
              <div className="flex items-start gap-m-3">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${AVATAR_STYLES[i % AVATAR_STYLES.length]}`}
                >
                  {initials(p.display_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-m-2">
                    <p className="truncate font-semibold text-ctx-text">{p.display_name}</p>
                    <span className="rounded-m-cta border px-m-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-ink-3 capitalize">
                      {p.role}
                    </span>
                    <span
                      className={`rounded-m-cta border px-m-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${statusPill(p.status)}`}
                    >
                      {p.status === "invited" ? "Pending join" : p.status}
                    </span>
                    {showRemove ? (
                      <button
                        type="button"
                        className={btnRemove}
                        disabled={removeBusyId === p.participant_id}
                        title="Remove from group"
                        onClick={() => void onRemoveParticipant(p)}
                      >
                        {removeBusyId === p.participant_id ? "…" : "Remove"}
                      </button>
                    ) : null}
                  </div>
                  {isAdmin && isSoleActiveAdmin && p.user_id === user?.uid ? (
                    <p className="mt-1 text-[10px] text-ink-4">
                      Sole admin — add another admin before you can remove yourself.
                    </p>
                  ) : null}
                  {p.status === "invited" && p.invite_email ? (
                    <p className="mt-1 text-[11px] text-ink-3">{p.invite_email}</p>
                  ) : null}

                  {p.status === "active" && r ? (
                    <div className="mt-m-3 space-y-1 text-[12px] text-ink-2">
                      <div className="flex flex-wrap justify-between gap-2">
                        <span className="text-ink-4">Planned Commitment</span>
                        <span className="tabular-nums font-medium text-ink">{money(r.committed)}</span>
                      </div>
                      <div className="flex flex-wrap justify-between gap-2">
                        <span className="text-ink-4">Paid contribution</span>
                        <span className="tabular-nums font-medium text-ink">{money(r.paid)}</span>
                      </div>
                      <div className="flex flex-wrap justify-between gap-2">
                        <span className="text-ink-4">Remaining</span>
                        <span className="tabular-nums font-semibold text-status-pending-fg">{money(r.remaining)}</span>
                      </div>
                      {open ? (
                        <p className="pt-1 text-[11px]">
                          <span className={commitmentStatusClass(r.statusWorst)}>{r.statusWorst}</span>
                          {r.dueDate ? (
                            <>
                              <span className="text-ink-4"> · Due </span>
                              {formatDisplayDate(r.dueDate)}
                            </>
                          ) : null}
                        </p>
                      ) : r.committed > 0 ? (
                        <p className="pt-1 text-[11px] text-urgency-clear-value">Fulfilled for tracked commitments</p>
                      ) : (
                        <p className="pt-1 text-[11px] text-ink-4">No commitment line for this cycle yet</p>
                      )}
                    </div>
                  ) : null}

                  {p.status === "invited" && isAdmin && !p.user_id ? (
                    <div className="mt-m-3 space-y-m-2 rounded-m-card border border-ctx-border/30 bg-bg2/80 p-m-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-ctx-accent">
                        Join link & QR
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={btnCoord}
                          disabled={busyId === p.participant_id}
                          onClick={() => void sendOrResend(p.participant_id)}
                        >
                          {busyId === p.participant_id ? "…" : p.invite_sent_at ? "Regenerate link" : "Create link"}
                        </button>
                        {linkById[p.participant_id] ? (
                          <>
                            <button type="button" className={btnCoord} onClick={() => void copyLink(p.participant_id)}>
                              Copy link
                            </button>
                            <button
                              type="button"
                              className={btnCoord}
                              onClick={() => setQrForId((cur) => (cur === p.participant_id ? null : p.participant_id))}
                            >
                              {qrForId === p.participant_id ? "Hide QR" : "Show QR"}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  {qrForId === p.participant_id && linkById[p.participant_id] ? (
                    <div className="mt-m-2 rounded-m-chip border border-surface-300 bg-bg2 p-m-3">
                      <QRCode value={linkById[p.participant_id]} size={128} />
                    </div>
                  ) : null}

                  {p.status === "active" && open && r?.primaryCommitment ? (
                    <div className="mt-m-3 flex flex-wrap gap-m-2">
                      <button
                        type="button"
                        className={btnCoord}
                        disabled={remindBusy === p.participant_id}
                        onClick={() => void onRemind(p.participant_id)}
                      >
                        {remindBusy === p.participant_id ? "Sending…" : "Remind"}
                      </button>
                      <button type="button" className={btnCoord} onClick={() => onMarkPaid(r.primaryCommitment!)}>
                        Mark paid
                      </button>
                      <button type="button" className={btnCoord} onClick={onViewCommitments}>
                        Details
                      </button>
                    </div>
                  ) : p.status === "active" ? (
                    <div className="mt-m-3">
                      <button type="button" className={btnCoord} onClick={onViewCommitments}>
                        View commitments
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
