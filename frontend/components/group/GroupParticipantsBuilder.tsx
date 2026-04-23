"use client";

import type { CreateGroupParticipantDraft } from "@/lib/group/types";

const inputCls =
  "w-full rounded-m-chip border border-surface-300 bg-surface-100 px-m-3 py-2 text-[13px] text-ink placeholder:text-ink-4";

function newParticipant(): CreateGroupParticipantDraft {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}-${Math.random()}`,
    displayName: "",
    email: "",
    role: "member",
  };
}

export function GroupParticipantsBuilder({
  participants,
  onChange,
}: {
  participants: CreateGroupParticipantDraft[];
  onChange: (next: CreateGroupParticipantDraft[]) => void;
}) {
  const add = () => onChange([...participants, newParticipant()]);
  const remove = (id: string) => onChange(participants.filter((p) => p.id !== id));
  const patch = (id: string, patch: Partial<CreateGroupParticipantDraft>) =>
    onChange(participants.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  return (
    <div className="space-y-m-4">
      <p className="text-[13px] leading-relaxed text-ink-3">
        Add people by name. Email is optional — we’ll use it if you want invite links later. You stay admin automatically.
      </p>
      <ul className="space-y-m-3">
        {participants.map((p) => (
          <li
            key={p.id}
            className="rounded-m-hero border border-surface-300 bg-bg2/60 p-m-3"
          >
            <div className="grid gap-m-2 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink/35">Name</span>
                <input
                  className={`${inputCls} mt-1`}
                  value={p.displayName}
                  onChange={(e) => patch(p.id, { displayName: e.target.value })}
                  placeholder="Friend’s name"
                />
              </label>
              <label>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink/35">
                  Email <span className="font-normal text-ink-4">(optional)</span>
                </span>
                <input
                  className={`${inputCls} mt-1`}
                  type="email"
                  value={p.email}
                  onChange={(e) => patch(p.id, { email: e.target.value })}
                  placeholder="name@email.com"
                  autoComplete="off"
                />
              </label>
              <label>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink/35">Role</span>
                <select
                  className={`${inputCls} mt-1`}
                  value={p.role}
                  onChange={(e) => patch(p.id, { role: e.target.value as "member" | "admin" })}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
            </div>
            <div className="mt-m-2 flex justify-end">
              <button
                type="button"
                className="text-[11px] font-semibold text-ink-4 transition-colors hover:text-urgency-high"
                onClick={() => remove(p.id)}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={add}
        className="w-full rounded-m-chip border border-dashed border-ctx-accent/40 bg-ctx-accent/[0.04] py-m-3 text-[12px] font-semibold text-ctx-accent transition-colors hover:bg-ctx-accent/[0.08]"
      >
        + Add someone
      </button>
    </div>
  );
}
