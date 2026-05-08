"use client";

import { groupBtnAccentOutline, groupBtnGhost, groupBtnPrimary } from "@/lib/group/group-ui";

export function GroupActionBar({
  onAddExpense,
  onRecordPayment,
  onInvite,
  onSendReminder,
  onSettle,
  showInvite,
  showSettle,
}: {
  onAddExpense: () => void;
  onRecordPayment: () => void;
  onInvite: () => void;
  onSendReminder: () => void;
  onSettle: () => void;
  showInvite: boolean;
  showSettle: boolean;
}) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-m-2"
      role="navigation"
      aria-label="Quick actions"
    >
      <div className="pointer-events-auto mx-m-3 flex w-full max-w-lg flex-col gap-m-2 rounded-m-hero border border-surface-300/90 bg-surface-100/92 p-m-2 shadow-[0_-12px_40px_-16px_rgba(0,0,0,0.55)] backdrop-blur-md md:mx-0 md:max-w-2xl md:flex-row md:items-stretch md:justify-between md:gap-m-3 md:p-m-3">
        <div className="flex gap-m-2">
          <button type="button" onClick={onAddExpense} className={`${groupBtnPrimary} min-h-[46px] flex-1 px-m-4 md:flex-initial`}>
            Add expense
          </button>
          <button type="button" onClick={onRecordPayment} className={`${groupBtnAccentOutline} min-h-[46px] flex-1 px-m-4 md:flex-initial`}>
            Record payment
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-0.5 border-t border-rule/90 pt-m-2 md:border-t-0 md:border-l md:border-rule/90 md:pt-0 md:pl-m-3">
          {showInvite ? (
            <button type="button" onClick={onInvite} className={groupBtnGhost}>
              Invite
            </button>
          ) : null}
          <button type="button" onClick={onSendReminder} className={groupBtnGhost}>
            Remind
          </button>
          {showSettle ? (
            <button type="button" onClick={onSettle} className={groupBtnGhost}>
              Settle
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
