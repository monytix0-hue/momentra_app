/**
 * Bridges backend (`frontend/lib/api/group.ts`) field names and shapes to UI view models.
 * UI components should depend on these helpers + `hub-selectors` / `selectors`, not raw JSON keys.
 */

import type { createGroupMoment } from "@/lib/api/group";
import type { GroupHome, GroupInvitePreview } from "@/lib/api/group";
import { buildHubViewModel } from "@/lib/group/hub-selectors";
import type { CreateGroupParticipantDraft, CreateGroupUiKind, GroupFundingModel } from "@/lib/group/types";

/** Exact body shape for `POST /group/moments` — matches `createGroupMoment` second argument. */
export type CreateGroupMomentRequestBody = Parameters<typeof createGroupMoment>[1];

/** Hub dashboard view model derived from `GET /group/home` (`GroupHome`). */
export function mapGroupHomeToHubViewModel(home: GroupHome) {
  return buildHubViewModel(home);
}

/** Maps wizard UI state → API request body for `createGroupMoment`. */
export function buildCreateGroupMomentBody(args: {
  uiKind: CreateGroupUiKind;
  fundingModel: GroupFundingModel;
  title: string;
  description: string;
  targetAmount: string;
  dueDate: string;
  monthlyRhythm: boolean;
  participants: CreateGroupParticipantDraft[];
}): CreateGroupMomentRequestBody {
  const {
    uiKind,
    fundingModel,
    title,
    description,
    targetAmount,
    dueDate,
    monthlyRhythm,
    participants,
  } = args;

  const group_type = mapUiKindToApiGroupType(uiKind);
  const ongoing = uiKind === "household" || monthlyRhythm;
  const duration_type = ongoing ? "ongoing" : "one_time";
  const cycle_type = ongoing ? "monthly" : "none";

  const tgtRaw = targetAmount.trim();
  const tgt = tgtRaw ? parseFloat(tgtRaw) : NaN;
  const target_amount = Number.isFinite(tgt) && tgt >= 0 ? tgt : null;

  const seeds = participants
    .filter((p) => p.displayName.trim())
    .map((p) => ({
      display_name: p.displayName.trim(),
      role: p.role,
      invite_email: p.email.trim() ? p.email.trim() : null,
    }));

  return {
    title: title.trim() || "Untitled group",
    group_type,
    funding_model: fundingModel,
    split_rule_type: "equal",
    duration_type,
    cycle_type,
    target_amount,
    end_date: dueDate.trim() || null,
    description: description.trim() || null,
    status: "active",
    participants: seeds,
  };
}

/** UI “Trip | Household | …” → API `group_type` enum. */
export function mapUiKindToApiGroupType(kind: CreateGroupUiKind): string {
  switch (kind) {
    case "trip":
      return "trip";
    case "household":
      return "roommates";
    case "event":
      return "event";
    default:
      return "custom";
  }
}

/** Invite preview (`GET /group/invites/preview`) → labels for join UI. */
export function mapInvitePreviewForJoinUi(preview: GroupInvitePreview) {
  return {
    groupId: preview.group_id,
    groupTitle: preview.group_title,
    inviteeDisplayName: preview.display_name,
  };
}

/** Review step: human-readable rhythm line (mirrors duration/cycle sent to API). */
export function describeRhythmForReview(uiKind: CreateGroupUiKind, monthlyRhythm: boolean): string {
  return uiKind === "household" || monthlyRhythm ? "Ongoing · monthly check-ins" : "One-time stretch";
}
