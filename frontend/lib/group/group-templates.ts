/**
 * Quick-start presets for Group creation (₹ amounts optional).
 * Same idea as Personal budget templates: pick one, then edit any field before continuing.
 */

export const GROUP_TEMPLATE_CUSTOM = "__custom__";

export type GroupTemplate = {
  id: string;
  name: string;
  blurb: string;
  group_type: "trip" | "roommates" | "event" | "family" | "couple" | "custom";
  duration_type: "one_time" | "ongoing";
  title: string;
  description: string;
  /** Suggested pool target; null = leave funding step blank */
  target_amount: number | null;
  /** Prefill for participants textarea (comma-separated) */
  participant_names: string;
};

export const GROUP_TEMPLATES: GroupTemplate[] = [
  {
    id: "weekend-trip",
    name: "Weekend trip",
    blurb: "One-time pool for transport, stay, and food — split evenly after.",
    group_type: "trip",
    duration_type: "one_time",
    title: "Weekend getaway",
    description: "Shared pot for travel, stay, and meals. Settle extras on the trip page.",
    target_amount: 35000,
    participant_names: "",
  },
  {
    id: "flat-share",
    name: "Flat / roommates",
    blurb: "Ongoing monthly rhythm—rent, utilities, or a jar—with full split options per expense.",
    group_type: "roommates",
    duration_type: "ongoing",
    title: "Flat shared pot",
    description: "Monthly pooled target for rent, utilities, and shared supplies.",
    target_amount: 65000,
    participant_names: "",
  },
  {
    id: "single-event",
    name: "One-off event",
    blurb: "Wedding, reunion, or party — collect once, spend from the pool.",
    group_type: "event",
    duration_type: "one_time",
    title: "Event pool",
    description: "Single pool for venue, catering, or gifts — everyone chips in once.",
    target_amount: 50000,
    participant_names: "",
  },
  {
    id: "family-pot",
    name: "Family pot",
    blurb: "Shared monthly pot—log spending as you go; new expenses default to equal shares (optional custom splits).",
    group_type: "family",
    duration_type: "ongoing",
    title: "Family shared fund",
    description:
      "Recurring contributions for parents, kids’ activities, or emergencies. The pool tracks funding; each expense can split evenly or be adjusted when needed.",
    target_amount: null,
    participant_names: "",
  },
  {
    id: "couple-goal",
    name: "Couple goal",
    blurb: "Save together for a trip, deposit, or big purchase—expenses default to equal splits unless you open advanced.",
    group_type: "couple",
    duration_type: "ongoing",
    title: "Our shared goal",
    description: "Joint pool with a target date — track who paid and what’s left. Log costs from the pot with simple equal splits by default.",
    target_amount: 200000,
    participant_names: "",
  },
  {
    id: "dinner-split",
    name: "Dinner / small split",
    blurb: "Lightweight group for occasional bills — low or no pool target.",
    group_type: "custom",
    duration_type: "one_time",
    title: "Dinner & outings",
    description: "Split bills as you go; optional small float for the group.",
    target_amount: 5000,
    participant_names: "",
  },
];

export type GroupFormPreset = {
  group_type: string;
  duration_type: "one_time" | "ongoing";
  title: string;
  description: string;
  target_amount: string;
  participant_names: string;
};

export function applyGroupTemplate(t: GroupTemplate): GroupFormPreset {
  return {
    group_type: t.group_type,
    duration_type: t.duration_type,
    title: t.title,
    description: t.description,
    target_amount: t.target_amount != null ? String(t.target_amount) : "",
    participant_names: t.participant_names,
  };
}
