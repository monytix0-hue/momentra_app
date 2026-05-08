"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { createGroupMoment } from "@/lib/api/group";
import {
  applyGroupTemplate,
  GROUP_TEMPLATE_CUSTOM,
  GROUP_TEMPLATES,
  type GroupTemplate,
} from "@/lib/group/group-templates";
import { getGroupUxProfile, inferDefaultFundingModel } from "@/lib/group/group-ux-profile";

const STEP_LABELS = [
  "Type",
  "Duration",
  "Basics",
  "People",
  "Funding",
  "Review",
] as const;

const inputCls =
  "w-full rounded-m-chip border border-surface-300 bg-bg2 px-m-3 py-2.5 text-[13px] text-ink placeholder:text-ink-4 transition-[border-color,box-shadow] duration-fast ease-standard focus:border-ctx-accent focus:outline-none focus:ring-1 focus:ring-ctx-accent/35";

const btnPrimary =
  "inline-flex min-h-[44px] min-w-[140px] touch-manipulation items-center justify-center rounded-m-cta bg-gradient-to-br from-ctx-accent to-ctx-accent-end px-m-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ctx-hero shadow-[0_0_24px_-8px_var(--ctx-accent)] transition-[opacity,transform] duration-fast ease-standard hover:opacity-95 active:scale-[0.99] disabled:opacity-40";

/** Outline secondary — full pill width, never collapses to a circle. */
const btnBack =
  "inline-flex min-h-[44px] shrink-0 items-center justify-center gap-m-2 rounded-m-chip border-2 border-surface-300 bg-bg2 px-m-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink shadow-none transition-[border-color,background-color,color,box-shadow] duration-fast ease-standard hover:border-ctx-border/50 hover:bg-surface-200 hover:text-ink";

const types = ["trip", "roommates", "event", "family", "couple", "custom"] as const;

type Step = 0 | 1 | 2 | 3 | 4 | 5;

function WizardCard({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-m-hero border border-surface-300 bg-surface-100 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--ctx-accent)_20%,transparent)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
        style={{
          background: "linear-gradient(90deg, transparent, var(--ctx-accent), transparent)",
        }}
      />
      <div className="p-m-6 md:p-m-8">{children}</div>
    </div>
  );
}

function StepProgress({ step }: { step: Step }) {
  return (
    <div className="mb-m-8">
      <div className="mb-m-3 flex items-center justify-between gap-m-2">
        <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-ctx-accent">
          New group
        </span>
        <span className="text-[10px] tabular-nums text-ink-4">
          Step {step + 1} of {STEP_LABELS.length}
        </span>
      </div>
      <div className="flex gap-1.5" role="list" aria-label="Wizard progress">
        {STEP_LABELS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <div
              key={label}
              role="listitem"
              className="min-w-0 flex-1"
              title={label}
            >
              <div
                className={`h-1 rounded-m-cta transition-[background-color] duration-normal ease-standard ${
                  current
                    ? "bg-ctx-accent shadow-[0_0_12px_-4px_var(--ctx-accent)]"
                    : done
                      ? "bg-ctx-accent/45"
                      : "bg-surface-300"
                }`}
              />
            </div>
          );
        })}
      </div>
      <p className="mt-m-2 text-[11px] text-ink-4">
        <span className="text-ctx-accent">{STEP_LABELS[step]}</span>
        {" · "}
        {step === 0 && "Choose what you are coordinating."}
        {step === 1 && "One-off or recurring money rhythm."}
        {step === 2 && "Name it and add context."}
        {step === 3 && "Who is in — you stay admin."}
        {step === 4 && "Optional moment budget (pool target) in ₹."}
        {step === 5 && "Confirm and create."}
      </p>
    </div>
  );
}

function StepHeading({ kicker, title, hint }: { kicker: string; title: string; hint?: string }) {
  return (
    <header className="mb-m-6 border-b border-rule pb-m-6">
      <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-ctx-accent">{kicker}</p>
      <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-ctx-text md:text-3xl">{title}</h1>
      {hint ? <p className="mt-m-3 max-w-xl text-[14px] leading-relaxed text-ink-3">{hint}</p> : null}
    </header>
  );
}

export function GroupCreationWizard() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [groupType, setGroupType] = useState<string>("trip");
  const [durationType, setDurationType] = useState<"one_time" | "ongoing">("one_time");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [participantNames, setParticipantNames] = useState("");
  const [templateId, setTemplateId] = useState<string>(GROUP_TEMPLATE_CUSTOM);

  const applyTemplate = useCallback((t: GroupTemplate) => {
    const p = applyGroupTemplate(t);
    setGroupType(p.group_type);
    setDurationType(p.duration_type);
    setTitle(p.title);
    setDescription(p.description);
    setTargetAmount(p.target_amount);
    setParticipantNames(p.participant_names);
    setTemplateId(t.id);
  }, []);

  const applyCustomScratch = useCallback(() => {
    setGroupType("trip");
    setDurationType("one_time");
    setTitle("");
    setDescription("");
    setTargetAmount("");
    setParticipantNames("");
    setTemplateId(GROUP_TEMPLATE_CUSTOM);
  }, []);

  const reviewUx = useMemo(
    () => getGroupUxProfile({ group_type: groupType, funding_model: inferDefaultFundingModel(groupType) }),
    [groupType],
  );

  const next = useCallback(() => setStep((s) => Math.min(5, s + 1) as Step), []);
  const back = useCallback(() => setStep((s) => Math.max(0, s - 1) as Step), []);

  const submit = useCallback(async () => {
    if (!user) {
      setErr("Sign in to create a group.");
      return;
    }
    const token = await user.getIdToken();
    const names = participantNames
      .split(/[,\n]/)
      .map((x) => x.trim())
      .filter(Boolean);
    const participants = names.map((display_name) => ({ display_name, role: "member" as const }));
    setBusy(true);
    setErr(null);
    try {
      const tgt = targetAmount.trim() ? parseFloat(targetAmount) : null;
      const detail = await createGroupMoment(token, {
        title: title.trim() || "Untitled group",
        group_type: groupType,
        duration_type: durationType,
        description: description.trim() || null,
        target_amount: tgt != null && !Number.isNaN(tgt) ? tgt : null,
        participants,
      });
      router.push(`/group/${detail.group_id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not create group");
    } finally {
      setBusy(false);
    }
  }, [user, title, groupType, durationType, description, targetAmount, participantNames, router]);

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-m-8 flex flex-wrap items-center justify-between gap-m-3">
        <Link
          href="/group"
          className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ctx-accent transition-colors duration-fast hover:text-ctx-accent-end"
        >
          ← Group home
        </Link>
      </div>

      <StepProgress step={step} />

      <WizardCard>
        {step === 0 && (
          <div>
            <StepHeading
              kicker="Group type"
              title="What kind of group?"
              hint="Start from a template (like Personal quick setup) or pick a type below—everything stays editable on the next steps."
            />

            <div className="mb-m-8">
              <div className="mb-m-4 flex items-center gap-m-3">
                <h2 className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.18em] text-ctx-accent">
                  Quick start
                </h2>
                <div className="h-px flex-1 bg-rule" />
              </div>
              <p className="mb-m-4 text-[12px] leading-relaxed text-ink-4">
                Choose a preset to fill title, duration, and optional pool target. Adjust anything before you create.
              </p>
              <div className="grid grid-cols-1 gap-m-3 sm:grid-cols-2">
                {GROUP_TEMPLATES.map((t) => {
                  const selected = templateId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => applyTemplate(t)}
                      className={`rounded-m-card border p-m-4 text-left transition-[border-color,background-color,box-shadow] duration-fast ease-standard ${
                        selected
                          ? "border-ctx-accent bg-ctx-tab-bg/90 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--ctx-accent)_20%,transparent)]"
                          : "border-surface-300 bg-bg2 hover:border-ctx-border/40 hover:bg-surface-100"
                      }`}
                    >
                      <p className="text-[13px] font-semibold text-ink">{t.name}</p>
                      <p className="mt-m-2 text-[11px] leading-relaxed text-ink-3">{t.blurb}</p>
                      <p className="mt-m-2 text-[10px] uppercase tracking-wider text-ink-4">
                        {t.group_type} · {t.duration_type === "one_time" ? "one-time" : "ongoing"}
                        {t.target_amount != null ? ` · ~₹${t.target_amount.toLocaleString("en-IN")}` : ""}
                      </p>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={applyCustomScratch}
                  className={`rounded-m-card border p-m-4 text-left transition-[border-color,background-color] duration-fast ease-standard ${
                    templateId === GROUP_TEMPLATE_CUSTOM
                      ? "border-ctx-accent bg-ctx-tab-bg/90 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--ctx-accent)_20%,transparent)]"
                      : "border-dashed border-surface-300 bg-surface-100/50 hover:border-ctx-border/35 hover:bg-bg2"
                  }`}
                >
                  <p className="text-[13px] font-semibold text-ink">Custom</p>
                  <p className="mt-m-2 text-[11px] leading-relaxed text-ink-3">
                    Empty fields—pick type and details yourself from scratch.
                  </p>
                </button>
              </div>
            </div>

            <div className="mb-m-4 flex items-center gap-m-3">
              <h2 className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.18em] text-ctx-accent">
                Or choose type
              </h2>
              <div className="h-px flex-1 bg-rule" />
            </div>
            <div className="grid grid-cols-2 gap-m-3 sm:grid-cols-3">
              {types.map((t) => {
                const selected = groupType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setGroupType(t);
                      setTemplateId(GROUP_TEMPLATE_CUSTOM);
                    }}
                    className={`min-h-[52px] rounded-m-card border px-m-2 py-m-3 text-center text-[12px] font-medium capitalize transition-[border-color,background-color,box-shadow,color] duration-fast ease-standard ${
                      selected
                        ? "border-ctx-accent bg-ctx-tab-bg text-ctx-text shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--ctx-accent)_22%,transparent),0_0_20px_-12px_var(--ctx-accent)]"
                        : "border-surface-300 bg-bg2 text-ink-3 hover:border-ctx-border/40 hover:bg-surface-100 hover:text-ink-2"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <StepHeading
              kicker="Duration"
              title="How long does it run?"
              hint="One-time fits trips and single events. Ongoing fits roommates and monthly pools."
            />
            <div className="flex flex-col gap-m-3">
              {(
                [
                  ["one_time", "One-time", "Trip, weekend, single bill split"],
                  ["ongoing", "Ongoing", "Roommates, subscriptions, monthly rhythm"],
                ] as const
              ).map(([v, head, sub]) => (
                <label
                  key={v}
                  className={`flex cursor-pointer items-start gap-m-4 rounded-m-card border p-m-4 transition-[border-color,background-color] duration-fast ease-standard ${
                    durationType === v
                      ? "border-ctx-accent bg-ctx-tab-bg/80 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--ctx-accent)_18%,transparent)]"
                      : "border-surface-300 bg-bg2 hover:border-ctx-border/35"
                  }`}
                >
                  <input
                    type="radio"
                    name="dur"
                    checked={durationType === v}
                    onChange={() => {
                      setTemplateId(GROUP_TEMPLATE_CUSTOM);
                      setDurationType(v);
                    }}
                    className="mt-1 h-4 w-4 shrink-0 accent-ctx-accent"
                  />
                  <span className="min-w-0">
                    <span className="block text-[14px] font-medium text-ink">{head}</span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-3">{sub}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <StepHeading kicker="Basics" title="Name and describe" />
            <div className="space-y-m-5">
              <label className="block">
                <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-4">Title</span>
                <input
                  className={`${inputCls} mt-m-2`}
                  value={title}
                  onChange={(e) => {
                    setTemplateId(GROUP_TEMPLATE_CUSTOM);
                    setTitle(e.target.value);
                  }}
                  placeholder="Goa trip, Flat 4B, …"
                />
              </label>
              <label className="block">
                <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-4">
                  Description <span className="font-normal normal-case tracking-normal text-ink-4">(optional)</span>
                </span>
                <textarea
                  className={`${inputCls} mt-m-2 min-h-[100px] resize-y`}
                  value={description}
                  onChange={(e) => {
                    setTemplateId(GROUP_TEMPLATE_CUSTOM);
                    setDescription(e.target.value);
                  }}
                />
              </label>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <StepHeading
              kicker="Participants"
              title="Who else is in?"
              hint="Separate names with commas or new lines. You are added automatically as admin."
            />
            <textarea
              className={`${inputCls} min-h-[140px] resize-y`}
              value={participantNames}
              onChange={(e) => {
                setTemplateId(GROUP_TEMPLATE_CUSTOM);
                setParticipantNames(e.target.value);
              }}
              placeholder="Alex, Sam, Jordan"
            />
          </div>
        )}

        {step === 4 && (
          <div>
            <StepHeading
              kicker="Funding"
              title="Moment budget"
              hint="Optional total planned spend (pool target) in ₹ for pooled groups. Leave blank to skip; type-based defaults still apply."
            />
            <label className="block">
              <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-4">Amount</span>
              <input
                className={`${inputCls} mt-m-2`}
                inputMode="decimal"
                value={targetAmount}
                onChange={(e) => {
                  setTemplateId(GROUP_TEMPLATE_CUSTOM);
                  setTargetAmount(e.target.value);
                }}
                placeholder="e.g. 50000"
              />
            </label>
          </div>
        )}

        {step === 5 && (
          <div>
            <StepHeading kicker="Review" title="Ready to create" />
            <dl className="space-y-0 divide-y divide-rule rounded-m-card border border-surface-300 bg-bg2/50">
              {(
                [
                  ["Type", groupType],
                  ["Duration", durationType === "one_time" ? "One-time" : "Ongoing"],
                  ["Title", title.trim() || "Untitled group"],
                  ["Moment budget", targetAmount.trim() || "—"],
                  ["Money style", reviewUx.wizardReviewMoneyLine],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex flex-col gap-0.5 px-m-4 py-m-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-m-4">
                  <dt className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-4">{k}</dt>
                  <dd
                    className={`text-[13px] sm:text-right ${k === "Money style" ? "text-ink leading-snug" : "capitalize text-ink"}`}
                  >
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {err ? (
          <p className="mt-m-6 rounded-m-chip border border-urgency-high/40 bg-bg2 px-m-3 py-m-2 text-[13px] text-urgency-high" role="alert">
            {err}
          </p>
        ) : null}

        <div className="mt-m-8 flex flex-wrap items-center gap-m-3 border-t border-rule pt-m-6">
          {step > 0 ? (
            <button type="button" className={btnBack} onClick={back}>
              <span className="text-[15px] font-normal leading-none text-ctx-accent" aria-hidden>
                ←
              </span>
              Back
            </button>
          ) : null}
          {step < 5 ? (
            <button type="button" className={btnPrimary} onClick={next}>
              Continue
            </button>
          ) : (
            <button type="button" className={btnPrimary} disabled={busy} onClick={() => void submit()}>
              {busy ? "Creating…" : "Create group"}
            </button>
          )}
        </div>
      </WizardCard>
    </div>
  );
}
