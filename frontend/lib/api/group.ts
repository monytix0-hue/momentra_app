import { getApiBaseUrl } from "@/lib/api/client";

async function headersJson(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  } as const;
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (text) {
      try {
        const json = JSON.parse(text) as Record<string, unknown>;
        if (typeof json.detail === "string") throw new Error(json.detail);
        if (typeof json.message === "string") throw new Error(json.message);
      } catch (e) {
        if (e instanceof Error && e.message !== text) throw e;
      }
    }
    throw new Error(text || `${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type GroupMomentSummary = {
  group_id: string;
  created_by: string;
  title: string;
  group_type: string;
  duration_type: string;
  cycle_type: string;
  funding_model: string;
  split_rule_type: string;
  target_amount: string | number | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type GroupSummaryBlock = {
  collected_amount: string | number;
  target_amount: string | number | null;
  pending_commitment_count: number;
  overdue_commitment_count: number;
  open_share_debt: string | number;
};

export type GroupParticipant = {
  participant_id: string;
  group_id: string;
  user_id: string | null;
  display_name: string;
  role: string;
  status: string;
  joined_at?: string | null;
  created_at?: string | null;
  invite_email?: string | null;
  invite_sent_at?: string | null;
};

export type GroupInvitePreview = {
  group_id: string;
  group_title: string;
  display_name: string;
};

export type GroupInviteSendResult = {
  join_url: string;
  email_sent: boolean;
  message?: string | null;
};

export type GroupCycle = {
  cycle_id: string;
  group_id: string;
  label: string;
  start_date: string;
  end_date: string;
  target_amount: string | number;
  collected_amount: string | number;
  status: string;
  created_at?: string | null;
};

export type GroupMomentDetail = GroupMomentSummary & {
  summary: GroupSummaryBlock;
  participants: GroupParticipant[];
  cycles: GroupCycle[];
  active_cycle: GroupCycle | null;
};

export type GroupHome = {
  trigger_message: string;
  trigger_severity: string | null;
  active_group_count: number;
  pending_commitment_count: number;
  overdue_commitment_count: number;
  groups: GroupMomentSummary[];
  pending_commitments: {
    commitment_id: string;
    group_id: string;
    group_title: string;
    participant_id: string;
    display_name: string;
    committed_amount: string | number;
    paid_amount: string | number;
    due_date: string | null;
    status: string;
  }[];
  recent_activity: {
    activity_id: string;
    group_id: string;
    cycle_id: string | null;
    actor_id: string | null;
    event_type: string;
    message: string;
    created_at?: string | null;
  }[];
  top_signals: {
    signal_id: string;
    group_id: string;
    cycle_id: string | null;
    signal_type: string;
    severity: string;
    message: string;
    resolved: boolean;
    created_at?: string | null;
  }[];
};

export type GroupCommitment = {
  commitment_id: string;
  group_id: string;
  cycle_id: string | null;
  participant_id: string;
  committed_amount: string | number;
  paid_amount: string | number;
  due_date: string | null;
  status: string;
  /** planned | active | final — mirrors DB when present */
  commitment_type?: string;
  /** auto_seeded | admin_set | expense_split | participant_set */
  source?: string;
  expense_id?: string | null;
};

export type GroupExpenseShare = {
  share_id: string;
  expense_id: string;
  participant_id: string;
  owed_amount: string | number;
  settled_amount: string | number;
  status: string;
};

export type GroupExpense = {
  expense_id: string;
  group_id: string;
  cycle_id: string | null;
  title: string;
  amount: string | number;
  paid_by_participant_id: string;
  category: string | null;
  description: string | null;
  expense_date: string;
  source_recurring_id?: string | null;
  shares: GroupExpenseShare[];
};

export type GroupRecurringExpense = {
  recurring_id: string;
  group_id: string;
  title: string;
  amount: string | number;
  paid_by_participant_id: string;
  category: string | null;
  description: string | null;
  split_rule: string;
  shares: { participant_id: string; owed_amount: string | number }[];
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type GroupRecurringApplyResult = {
  created_count: number;
  skipped_count: number;
};

export type GroupExpenseCreateBody = {
  title: string;
  amount: number;
  paid_by_participant_id: string;
  category?: string | null;
  description?: string | null;
  expense_date: string;
  cycle_id?: string | null;
  split_rule?: "equal" | "custom_amounts" | "percentages";
  shares?: { participant_id: string; owed_amount: number }[];
};

export async function fetchGroupHome(token: string): Promise<GroupHome> {
  const res = await fetch(`${getApiBaseUrl()}/group/home`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<GroupHome>(res);
}

export async function fetchGroupMoments(token: string): Promise<GroupMomentSummary[]> {
  const res = await fetch(`${getApiBaseUrl()}/group/moments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<GroupMomentSummary[]>(res);
}

export async function fetchGroupDetail(token: string, groupId: string): Promise<GroupMomentDetail> {
  const res = await fetch(`${getApiBaseUrl()}/group/moments/${groupId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<GroupMomentDetail>(res);
}

/** Permanently deletes the group and all related data (DB cascade). Admin only. */
export async function deleteGroupMoment(token: string, groupId: string): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/group/moments/${groupId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `${res.status}`);
  }
}

export async function createGroupMoment(
  token: string,
  body: {
    title: string;
    group_type: string;
    duration_type?: string | null;
    cycle_type?: string | null;
    funding_model?: string | null;
    split_rule_type?: string | null;
    target_amount?: number | null;
    start_date?: string | null;
    end_date?: string | null;
    description?: string | null;
    status?: string;
    participants?: {
      display_name: string;
      user_id?: string | null;
      role?: string;
      invite_email?: string | null;
    }[];
  },
): Promise<GroupMomentDetail> {
  const res = await fetch(`${getApiBaseUrl()}/group/moments`, {
    method: "POST",
    headers: await headersJson(token),
    body: JSON.stringify(body),
  });
  return parseJson<GroupMomentDetail>(res);
}

export async function fetchGroupCommitments(
  token: string,
  groupId: string,
  cycleId?: string | null,
): Promise<GroupCommitment[]> {
  const q = cycleId ? `?cycle_id=${encodeURIComponent(cycleId)}` : "";
  const res = await fetch(`${getApiBaseUrl()}/group/moments/${groupId}/commitments${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<GroupCommitment[]>(res);
}

export async function payCommitment(
  token: string,
  groupId: string,
  commitmentId: string,
  amount: number,
): Promise<GroupCommitment> {
  const res = await fetch(
    `${getApiBaseUrl()}/group/moments/${groupId}/commitments/${commitmentId}/pay`,
    {
      method: "POST",
      headers: await headersJson(token),
      body: JSON.stringify({ amount }),
    },
  );
  return parseJson<GroupCommitment>(res);
}

export async function fetchGroupExpenses(token: string, groupId: string): Promise<GroupExpense[]> {
  const res = await fetch(`${getApiBaseUrl()}/group/moments/${groupId}/expenses`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<GroupExpense[]>(res);
}

export async function createGroupExpense(
  token: string,
  groupId: string,
  body: GroupExpenseCreateBody,
): Promise<GroupExpense> {
  const res = await fetch(`${getApiBaseUrl()}/group/moments/${groupId}/expenses`, {
    method: "POST",
    headers: await headersJson(token),
    body: JSON.stringify(body),
  });
  return parseJson<GroupExpense>(res);
}

export async function fetchGroupActivity(token: string, groupId: string): Promise<GroupHome["recent_activity"]> {
  const res = await fetch(`${getApiBaseUrl()}/group/moments/${groupId}/activity`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<GroupHome["recent_activity"]>(res);
}

export async function fetchGroupInvitePreview(token: string): Promise<GroupInvitePreview> {
  const res = await fetch(
    `${getApiBaseUrl()}/group/invites/preview?token=${encodeURIComponent(token)}`,
  );
  return parseJson<GroupInvitePreview>(res);
}

export async function acceptGroupInvite(authToken: string, token: string): Promise<{ group_id: string }> {
  const res = await fetch(`${getApiBaseUrl()}/group/invites/accept`, {
    method: "POST",
    headers: await headersJson(authToken),
    body: JSON.stringify({ token }),
  });
  return parseJson<{ group_id: string }>(res);
}

export async function sendParticipantInvite(
  authToken: string,
  groupId: string,
  participantId: string,
  body?: { invite_email?: string | null },
): Promise<GroupInviteSendResult> {
  const res = await fetch(
    `${getApiBaseUrl()}/group/moments/${groupId}/participants/${participantId}/invite`,
    {
      method: "POST",
      headers: await headersJson(authToken),
      body: JSON.stringify(body ?? {}),
    },
  );
  return parseJson<GroupInviteSendResult>(res);
}

export async function addGroupParticipant(
  token: string,
  groupId: string,
  body: {
    display_name: string;
    role?: string;
    user_id?: string | null;
    invite_email?: string | null;
  },
): Promise<GroupParticipant> {
  const res = await fetch(`${getApiBaseUrl()}/group/moments/${groupId}/participants`, {
    method: "POST",
    headers: await headersJson(token),
    body: JSON.stringify(body),
  });
  return parseJson<GroupParticipant>(res);
}

export async function deleteGroupParticipant(
  token: string,
  groupId: string,
  participantId: string,
): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/group/moments/${groupId}/participants/${participantId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `${res.status}`);
  }
}

export async function updateGroupCommitment(
  token: string,
  groupId: string,
  commitmentId: string,
  body: { committed_amount?: number; due_date?: string | null },
): Promise<GroupCommitment> {
  const res = await fetch(
    `${getApiBaseUrl()}/group/moments/${groupId}/commitments/${commitmentId}`,
    {
      method: "PATCH",
      headers: await headersJson(token),
      body: JSON.stringify(body),
    },
  );
  return parseJson<GroupCommitment>(res);
}

export async function deleteGroupCommitment(
  token: string,
  groupId: string,
  commitmentId: string,
): Promise<void> {
  const res = await fetch(
    `${getApiBaseUrl()}/group/moments/${groupId}/commitments/${commitmentId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `${res.status}`);
  }
}

export async function fetchGroupRecurringExpenses(
  token: string,
  groupId: string,
): Promise<GroupRecurringExpense[]> {
  const res = await fetch(`${getApiBaseUrl()}/group/moments/${groupId}/recurring-expenses`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<GroupRecurringExpense[]>(res);
}

export async function createGroupRecurringExpense(
  token: string,
  groupId: string,
  body: {
    title: string;
    amount: number;
    paid_by_participant_id: string;
    category?: string | null;
    description?: string | null;
    split_rule?: "equal" | "custom_amounts" | "percentages";
    shares?: { participant_id: string; owed_amount: number }[];
    is_active?: boolean;
  },
): Promise<GroupRecurringExpense> {
  const res = await fetch(`${getApiBaseUrl()}/group/moments/${groupId}/recurring-expenses`, {
    method: "POST",
    headers: await headersJson(token),
    body: JSON.stringify(body),
  });
  return parseJson<GroupRecurringExpense>(res);
}

export async function patchGroupRecurringExpense(
  token: string,
  groupId: string,
  recurringId: string,
  body: { is_active?: boolean; title?: string; amount?: number },
): Promise<GroupRecurringExpense> {
  const res = await fetch(
    `${getApiBaseUrl()}/group/moments/${groupId}/recurring-expenses/${recurringId}`,
    {
      method: "PATCH",
      headers: await headersJson(token),
      body: JSON.stringify(body),
    },
  );
  return parseJson<GroupRecurringExpense>(res);
}

export async function deleteGroupRecurringExpense(
  token: string,
  groupId: string,
  recurringId: string,
): Promise<void> {
  const res = await fetch(
    `${getApiBaseUrl()}/group/moments/${groupId}/recurring-expenses/${recurringId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `${res.status}`);
  }
}

export async function applyGroupRecurringExpenses(
  token: string,
  groupId: string,
  body?: { cycle_id?: string | null },
): Promise<GroupRecurringApplyResult> {
  const res = await fetch(
    `${getApiBaseUrl()}/group/moments/${groupId}/recurring-expenses/apply`,
    {
      method: "POST",
      headers: await headersJson(token),
      body: JSON.stringify(body ?? {}),
    },
  );
  return parseJson<GroupRecurringApplyResult>(res);
}

export async function generateNextGroupCycle(token: string, groupId: string): Promise<GroupCycle> {
  const res = await fetch(`${getApiBaseUrl()}/group/moments/${groupId}/cycles/generate-next`, {
    method: "POST",
    headers: await headersJson(token),
  });
  return parseJson<GroupCycle>(res);
}

export type GroupPosition = {
  participant_id: string;
  display_name: string;
  planned_commitment: number;
  paid_contribution: number;
  net_position: number;
};

export type GroupMemberMoneySummaryRow = {
  participant_id: string;
  user_id: string | null;
  role: string;
  status: string;
  planned_contribution: string | number;
  contribution_paid: string | number;
  pending_contribution: string | number;
  extra_contribution: string | number;
  expenses_paid: string | number;
};

export type GroupMemberMoneySummaryResponse = {
  members: GroupMemberMoneySummaryRow[];
};

export async function fetchGroupMemberMoneySummary(
  token: string,
  groupId: string,
): Promise<GroupMemberMoneySummaryResponse> {
  const res = await fetch(`${getApiBaseUrl()}/group/moments/${groupId}/member-summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<GroupMemberMoneySummaryResponse>(res);
}

export async function fetchGroupPositions(token: string, groupId: string): Promise<GroupPosition[]> {
  const res = await fetch(`${getApiBaseUrl()}/group/moments/${groupId}/positions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson(res);
}

export async function postGroupReminder(
  token: string,
  groupId: string,
  body: {
    participant_id: string;
    reminder_type: string;
    message: string;
    cycle_id?: string | null;
  },
): Promise<{ reminder_id: string }> {
  const res = await fetch(`${getApiBaseUrl()}/group/moments/${groupId}/reminders`, {
    method: "POST",
    headers: await headersJson(token),
    body: JSON.stringify(body),
  });
  return parseJson(res);
}
