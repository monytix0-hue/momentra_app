"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { createGroupMoment } from "@/lib/api/group";
import { buildCreateGroupMomentBody } from "@/lib/group/api-adapters";
import type { CreateGroupParticipantDraft, CreateGroupUiKind, GroupFundingModel } from "@/lib/group/types";
import { FundingModelSelector } from "@/components/group/FundingModelSelector";
import { GroupBasicsForm } from "@/components/group/GroupBasicsForm";
import { GroupParticipantsBuilder } from "@/components/group/GroupParticipantsBuilder";
import { GroupReviewPanel } from "@/components/group/GroupReviewPanel";
import { GroupTypeSelector } from "@/components/group/GroupTypeSelector";
import { groupBackText, groupBtnPrimary, groupBtnSecondary, groupHeroSurface } from "@/lib/group/group-ui";

const STEPS = ["Kind", "Money", "Details", "People", "Review"] as const;

function newParticipant(): CreateGroupParticipantDraft {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}`,
    displayName: "",
    email: "",
    role: "member",
  };
}

export function GroupCreationStepper() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [uiKind, setUiKind] = useState<CreateGroupUiKind>("trip");
  const [fundingModel, setFundingModel] = useState<GroupFundingModel>("pooled");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [monthlyRhythm, setMonthlyRhythm] = useState(false);
  const [participants, setParticipants] = useState<CreateGroupParticipantDraft[]>(() => [newParticipant()]);

  const showMonthlyHint = uiKind === "household";

  const canContinue = useCallback(() => {
    if (step === 2) return title.trim().length > 0;
    return true;
  }, [step, title]);

  const submit = useCallback(async () => {
    if (!user) {
      setErr("Sign in to create a group.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const token = await user.getIdToken();
      const body = buildCreateGroupMomentBody({
        uiKind,
        fundingModel,
        title,
        description,
        targetAmount,
        dueDate,
        monthlyRhythm,
        participants,
      });
      const detail = await createGroupMoment(token, body);
      router.push(`/group/${detail.group_id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not create group");
    } finally {
      setBusy(false);
    }
  }, [user, title, uiKind, fundingModel, description, targetAmount, dueDate, monthlyRhythm, participants, router]);

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-m-5">
        <Link href="/group" className={groupBackText}>
          ← Groups
        </Link>
      </div>

      <div className="mb-m-8 md:mb-m-9">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ctx-accent">New group</p>
        <div className="mt-m-3 flex gap-1.5" aria-label="Creation progress">
          {STEPS.map((label, i) => (
            <div key={label} className="min-w-0 flex-1">
              <div
                className={`h-1 rounded-full transition-all duration-medium ease-standard ${
                  i < step ? "bg-ctx-accent/55" : i === step ? "bg-ctx-accent shadow-[0_0_12px_-2px_var(--ctx-accent)]" : "bg-surface-300/80"
                }`}
                title={label}
              />
            </div>
          ))}
        </div>
        <p className="mt-m-3 text-[13px] text-ink-3">
          Step <span className="font-semibold text-ink">{step + 1}</span> of {STEPS.length}
          <span className="text-ink-4"> · </span>
          {STEPS[step]}
        </p>
      </div>

      <div className={`${groupHeroSurface} p-m-6 md:p-m-8`}>
        {step === 0 && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">What kind of group is this?</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-3">Pick what fits — you can tune money on the next step.</p>
            <div className="mt-m-6">
              <GroupTypeSelector value={uiKind} onChange={setUiKind} />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">How should money work?</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-3">Plain language — no accounting degree required.</p>
            <div className="mt-m-6">
              <FundingModelSelector value={fundingModel} onChange={setFundingModel} />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Basics</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-3">Only the name is required — everything else helps your group feel clear.</p>
            <div className="mt-m-6">
              <GroupBasicsForm
                title={title}
                description={description}
                targetAmount={targetAmount}
                dueDate={dueDate}
                monthlyRhythm={monthlyRhythm}
                onTitle={setTitle}
                onDescription={setDescription}
                onTargetAmount={setTargetAmount}
                onDueDate={setDueDate}
                onMonthlyRhythm={setMonthlyRhythm}
                showMonthlyHint={showMonthlyHint}
              />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Who’s in?</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-3">Optional now — inviting later is always fine.</p>
            <div className="mt-m-6">
              <GroupParticipantsBuilder participants={participants} onChange={setParticipants} />
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Review</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-3">Looks good? Create when you’re ready.</p>
            <div className="mt-m-6">
              <GroupReviewPanel
                uiKind={uiKind}
                fundingModel={fundingModel}
                title={title}
                description={description}
                targetAmount={targetAmount}
                dueDate={dueDate}
                monthlyRhythm={monthlyRhythm}
                participants={participants}
              />
            </div>
          </>
        )}

        {err ? (
          <p className="mt-m-6 rounded-m-card border border-urgency-high/35 bg-bg2 px-m-3 py-m-2 text-[13px] text-urgency-high" role="alert">
            {err}
          </p>
        ) : null}

        <div className="mt-m-8 flex flex-wrap items-center gap-m-3 border-t border-rule/90 pt-m-6">
          {step > 0 ? (
            <button type="button" className={groupBtnSecondary} onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
          ) : null}
          {step < 4 ? (
            <button
              type="button"
              className={groupBtnPrimary}
              disabled={!canContinue()}
              onClick={() => setStep((s) => Math.min(4, s + 1))}
            >
              Continue
            </button>
          ) : (
            <button type="button" className={groupBtnPrimary} disabled={busy} onClick={() => void submit()}>
              {busy ? "Creating…" : "Create group"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
