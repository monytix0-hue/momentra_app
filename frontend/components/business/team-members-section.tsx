"use client";

import type { BusinessMember, BusinessMemberInvite, BusinessUnit } from "@/lib/api/business";
import { shortUserId } from "@/lib/business/format";

const memberRoleOptions = ["admin", "manager", "approver", "member", "viewer"] as const;

export function TeamMembersSection({
  members,
  invites,
  units,
  busy,
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  inviteUnitId,
  setInviteUnitId,
  inviteUserId,
  setInviteUserId,
  onInviteByEmail,
  onAddMember,
  onUpdateMember,
  emailInviteNotice,
  onCopyInviteLink,
}: {
  members: BusinessMember[];
  invites: BusinessMemberInvite[];
  units: BusinessUnit[];
  busy: boolean;
  inviteEmail: string;
  setInviteEmail: (v: string) => void;
  inviteRole: string;
  setInviteRole: (v: string) => void;
  inviteUnitId: string;
  setInviteUnitId: (v: string) => void;
  inviteUserId: string;
  setInviteUserId: (v: string) => void;
  onInviteByEmail: (e: React.FormEvent) => void;
  onAddMember: (e: React.FormEvent) => void;
  onUpdateMember: (memberId: string, role: string, unitId: string) => void;
  emailInviteNotice: { sent: boolean; join_url: string; message?: string | null } | null;
  onCopyInviteLink: () => void;
}) {
  const unitName = (id: string | null) => (id ? (units.find((u) => u.unit_id === id)?.name ?? "") : "");

  return (
    <section id="business-section-team" className="scroll-mt-24 space-y-m-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ctx-accent">Team console</p>
        <h2 className="mt-1 text-[18px] font-semibold text-ink">Who runs this workspace</h2>
        <p className="mt-1 text-[13px] text-ink-3">Roster first — invites and assignments follow.</p>
      </div>

      <div className="space-y-m-2">
        {!members.length ? (
          <p className="text-[13px] text-ink-4">No members yet beyond you.</p>
        ) : (
          members.map((m, i) => {
            const un = unitName(m.unit_id);
            return (
              <div
                key={m.member_id}
                className="flex flex-col gap-m-2 rounded-m-card border border-surface-300/75 bg-bg2/80 p-m-3 transition-colors duration-300 hover:border-ctx-accent/20 sm:flex-row sm:items-center sm:justify-between"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-[13px] font-semibold text-ink">{shortUserId(m.user_id)}</p>
                  <p className="mt-0.5 text-[12px] capitalize text-ink-3">
                    <span className="font-medium text-ctx-accent">{m.role}</span>
                    {un ? (
                      <>
                        {" "}
                        · <span className="text-ink-2">{un}</span>
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:w-[min(100%,280px)]">
                  <select
                    className="rounded-m-chip border border-surface-300 bg-surface-100 px-m-2 py-2 text-[11px] text-ink"
                    value={m.role}
                    onChange={(e) => void onUpdateMember(m.member_id, e.target.value, m.unit_id || "")}
                    disabled={busy}
                  >
                    {memberRoleOptions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded-m-chip border border-surface-300 bg-surface-100 px-m-2 py-2 text-[11px] text-ink"
                    value={m.unit_id || ""}
                    onChange={(e) => void onUpdateMember(m.member_id, m.role, e.target.value)}
                    disabled={busy}
                  >
                    <option value="">All units</option>
                    {units.map((u) => (
                      <option key={u.unit_id} value={u.unit_id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="rounded-m-card border border-surface-300/80 bg-surface-100/80 p-m-4">
        <p className="mb-m-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-4">Invite by email</p>
        <form className="space-y-m-2" onSubmit={onInviteByEmail}>
          <input
            className="w-full rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-2.5 text-[13px] text-ink"
            placeholder="teammate@company.com"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              className="rounded-m-chip border border-surface-300 bg-bg2 px-m-2 py-2 text-[12px] text-ink"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
            >
              {memberRoleOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select
              className="rounded-m-chip border border-surface-300 bg-bg2 px-m-2 py-2 text-[12px] text-ink"
              value={inviteUnitId}
              onChange={(e) => setInviteUnitId(e.target.value)}
            >
              <option value="">Unit (optional)</option>
              {units.map((u) => (
                <option key={u.unit_id} value={u.unit_id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-m-chip border border-ctx-accent/40 bg-[color-mix(in_srgb,var(--ctx-accent)_12%,transparent)] py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ctx-accent transition-colors hover:bg-[color-mix(in_srgb,var(--ctx-accent)_20%,transparent)] disabled:opacity-50"
          >
            Send invite
          </button>
        </form>
        {emailInviteNotice ? (
          <div
            className={`mt-m-3 rounded-m-chip border px-m-3 py-m-2 text-[12px] ${
              emailInviteNotice.sent
                ? "border-urgency-clear-value/35 text-ink"
                : "border-status-pending-fg/40 text-ink-2"
            }`}
          >
            <p>
              {emailInviteNotice.sent
                ? "Invitation emailed."
                : emailInviteNotice.message?.trim() || "Invite ready — share the link."}
            </p>
            <button type="button" className="mt-2 text-[10px] font-bold uppercase tracking-[0.1em] text-ctx-accent" onClick={onCopyInviteLink}>
              Copy invite link
            </button>
          </div>
        ) : null}

        <div className="my-m-4 border-t border-surface-300/60" />

        <p className="mb-m-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-4">Add existing Firebase user</p>
        <form className="space-y-m-2" onSubmit={onAddMember}>
          <input
            className="w-full rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-2.5 font-mono text-[12px] text-ink"
            placeholder="Firebase uid"
            value={inviteUserId}
            onChange={(e) => setInviteUserId(e.target.value)}
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-m-chip border border-surface-300 bg-bg2 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink hover:border-ctx-accent/35 disabled:opacity-50"
          >
            Add member
          </button>
        </form>

        {invites.length ? (
          <div className="mt-m-3 rounded-m-chip border border-surface-300/50 bg-surface-200/20 p-m-2">
            <p className="mb-1 text-[10px] uppercase tracking-[0.1em] text-ink-4">Pending invites</p>
            <ul className="space-y-1">
              {invites.slice(0, 8).map((inv) => (
                <li key={inv.invite_id} className="truncate text-[11px] text-ink-3">
                  {inv.email} · {inv.role}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
