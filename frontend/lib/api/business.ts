import { getApiBaseUrl } from "@/lib/api/client";

async function headersJson(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  } as const;
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const t = await res.text();
    try {
      const j = JSON.parse(t) as { detail?: string };
      throw new Error((j.detail || "").trim() || t || `${res.status}`);
    } catch {
      throw new Error(t || `${res.status}`);
    }
  }
  return res.json() as Promise<T>;
}

export type BusinessWorkspace = {
  workspace_id: string;
  title: string;
  business_type: string;
  total_budget: string | number | null;
  currency: string;
  created_by: string;
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BusinessUnit = {
  unit_id: string;
  workspace_id: string;
  name: string;
  unit_type: string;
  location: string | null;
  manager_user_id: string | null;
  budget_limit: string | number | null;
  status: string;
  created_at?: string | null;
};

export type BusinessCostCenter = {
  cost_center_id: string;
  workspace_id: string;
  name: string;
  budget_limit: string | number | null;
  created_at?: string | null;
};

export type BusinessMember = {
  member_id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  unit_id: string | null;
  created_at?: string | null;
};

export type BusinessMemberInvite = {
  invite_id: string;
  workspace_id: string;
  email: string;
  role: string;
  unit_id: string | null;
  accepted_at?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
};

export type BusinessInvitePreview = {
  workspace_id: string;
  workspace_title: string;
  email: string;
  role: string;
  unit_id: string | null;
  unit_name?: string | null;
};

export type BusinessVendor = {
  vendor_id: string;
  workspace_id: string;
  name: string;
  vendor_type: string;
  contact_info: string | null;
  created_at?: string | null;
};

export type BusinessSpend = {
  spend_id: string;
  workspace_id: string;
  unit_id: string;
  title: string;
  amount: string | number;
  price_per_unit?: string | number | null;
  quantity?: string | number | null;
  measurement_unit?: string | null;
  spend_type: string;
  cost_center_id: string | null;
  vendor_id: string | null;
  status: "pending" | "approved" | "rejected" | string;
  submitted_by: string;
  approved_by: string | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  created_at?: string | null;
};

export type BusinessSignal = {
  signal_id: string;
  workspace_id: string;
  unit_id: string | null;
  signal_type: string;
  severity: "info" | "warning" | "critical" | string;
  message: string;
  resolved: boolean;
  created_at?: string | null;
};

export type BusinessActivity = {
  activity_id: string;
  workspace_id: string;
  unit_id: string | null;
  spend_id: string | null;
  actor_id: string | null;
  event_type: string;
  message: string;
  created_at?: string | null;
};

export type BusinessDashboard = {
  summary: {
    total_budget: string | number | null;
    total_spent: string | number;
    pending_amount: string | number;
    remaining: string | number | null;
  };
  pending_approvals: BusinessSpend[];
  approved_spends: BusinessSpend[];
  cost_center_breakdown: {
    key: string;
    label: string;
    amount: string | number;
    budget_limit: string | number | null;
    utilization_ratio: number | null;
  }[];
  unit_breakdown: {
    key: string;
    label: string;
    amount: string | number;
    budget_limit: string | number | null;
    utilization_ratio: number | null;
  }[];
  signals: BusinessSignal[];
  activity: BusinessActivity[];
};

export async function fetchBusinessWorkspaces(
  token: string,
  includeArchived = false,
): Promise<BusinessWorkspace[]> {
  const q = includeArchived ? "?include_archived=true" : "";
  const res = await fetch(`${getApiBaseUrl()}/business/workspaces${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<BusinessWorkspace[]>(res);
}

export async function createBusinessWorkspace(
  token: string,
  body: {
    title: string;
    business_type: string;
    total_budget?: number | null;
    currency?: string;
  },
): Promise<BusinessWorkspace> {
  const res = await fetch(`${getApiBaseUrl()}/business/workspaces`, {
    method: "POST",
    headers: await headersJson(token),
    body: JSON.stringify(body),
  });
  return parseJson<BusinessWorkspace>(res);
}

export async function fetchBusinessWorkspace(
  token: string,
  workspaceId: string,
): Promise<BusinessWorkspace> {
  const res = await fetch(`${getApiBaseUrl()}/business/workspaces/${workspaceId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<BusinessWorkspace>(res);
}

export async function fetchBusinessUnits(token: string, workspaceId: string): Promise<BusinessUnit[]> {
  const res = await fetch(`${getApiBaseUrl()}/business/workspaces/${workspaceId}/units`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<BusinessUnit[]>(res);
}

export async function createBusinessUnit(
  token: string,
  workspaceId: string,
  body: {
    name: string;
    unit_type: string;
    location?: string | null;
    manager_user_id?: string | null;
    budget_limit?: number | null;
  },
): Promise<BusinessUnit> {
  const res = await fetch(`${getApiBaseUrl()}/business/workspaces/${workspaceId}/units`, {
    method: "POST",
    headers: await headersJson(token),
    body: JSON.stringify(body),
  });
  return parseJson<BusinessUnit>(res);
}

export async function fetchBusinessMembers(token: string, workspaceId: string): Promise<BusinessMember[]> {
  const res = await fetch(`${getApiBaseUrl()}/business/workspaces/${workspaceId}/members`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<BusinessMember[]>(res);
}

export async function createBusinessMember(
  token: string,
  workspaceId: string,
  body: {
    user_id: string;
    role: string;
    unit_id?: string | null;
  },
): Promise<BusinessMember> {
  const res = await fetch(`${getApiBaseUrl()}/business/workspaces/${workspaceId}/members`, {
    method: "POST",
    headers: await headersJson(token),
    body: JSON.stringify(body),
  });
  return parseJson<BusinessMember>(res);
}

export async function updateBusinessMember(
  token: string,
  workspaceId: string,
  memberId: string,
  body: {
    role?: string;
    unit_id?: string | null;
  },
): Promise<BusinessMember> {
  const res = await fetch(`${getApiBaseUrl()}/business/workspaces/${workspaceId}/members/${memberId}`, {
    method: "PATCH",
    headers: await headersJson(token),
    body: JSON.stringify(body),
  });
  return parseJson<BusinessMember>(res);
}

export async function inviteBusinessMemberByEmail(
  token: string,
  workspaceId: string,
  body: { email: string; role: string; unit_id?: string | null },
): Promise<{
  invite_id: string;
  workspace_id: string;
  email: string;
  role: string;
  unit_id: string | null;
  token?: string | null;
  join_url: string;
  sent: boolean;
  message?: string | null;
}> {
  const res = await fetch(`${getApiBaseUrl()}/business/workspaces/${workspaceId}/invites`, {
    method: "POST",
    headers: await headersJson(token),
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export async function fetchBusinessMemberInvites(
  token: string,
  workspaceId: string,
): Promise<BusinessMemberInvite[]> {
  const res = await fetch(`${getApiBaseUrl()}/business/workspaces/${workspaceId}/invites`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<BusinessMemberInvite[]>(res);
}

export async function fetchBusinessInvitePreview(token: string): Promise<BusinessInvitePreview> {
  const res = await fetch(`${getApiBaseUrl()}/business/invites/preview?token=${encodeURIComponent(token)}`);
  return parseJson<BusinessInvitePreview>(res);
}

export async function acceptBusinessInvite(
  authToken: string,
  token: string,
): Promise<{ workspace_id: string; member_id: string; role: string; unit_id: string | null }> {
  const res = await fetch(`${getApiBaseUrl()}/business/invites/accept`, {
    method: "POST",
    headers: await headersJson(authToken),
    body: JSON.stringify({ token }),
  });
  return parseJson(res);
}

export async function fetchBusinessCostCenters(
  token: string,
  workspaceId: string,
): Promise<BusinessCostCenter[]> {
  const res = await fetch(`${getApiBaseUrl()}/business/workspaces/${workspaceId}/cost-centers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<BusinessCostCenter[]>(res);
}

export async function createBusinessCostCenter(
  token: string,
  workspaceId: string,
  body: { name: string; budget_limit?: number | null },
): Promise<BusinessCostCenter> {
  const res = await fetch(`${getApiBaseUrl()}/business/workspaces/${workspaceId}/cost-centers`, {
    method: "POST",
    headers: await headersJson(token),
    body: JSON.stringify(body),
  });
  return parseJson<BusinessCostCenter>(res);
}

export async function fetchBusinessVendors(token: string, workspaceId: string): Promise<BusinessVendor[]> {
  const res = await fetch(`${getApiBaseUrl()}/business/workspaces/${workspaceId}/vendors`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<BusinessVendor[]>(res);
}

export async function createBusinessVendor(
  token: string,
  workspaceId: string,
  body: { name: string; vendor_type: string; contact_info?: string | null },
): Promise<BusinessVendor> {
  const res = await fetch(`${getApiBaseUrl()}/business/workspaces/${workspaceId}/vendors`, {
    method: "POST",
    headers: await headersJson(token),
    body: JSON.stringify(body),
  });
  return parseJson<BusinessVendor>(res);
}

export async function fetchBusinessSpends(token: string, workspaceId: string): Promise<BusinessSpend[]> {
  const res = await fetch(`${getApiBaseUrl()}/business/workspaces/${workspaceId}/spends`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<BusinessSpend[]>(res);
}

export async function submitBusinessSpend(
  token: string,
  workspaceId: string,
  body: {
    unit_id: string;
    title: string;
    amount?: number;
    price_per_unit?: number;
    quantity?: number;
    measurement_unit?: string | null;
    spend_type?: string;
    cost_center_id?: string | null;
    vendor_id?: string | null;
  },
): Promise<BusinessSpend> {
  const res = await fetch(`${getApiBaseUrl()}/business/workspaces/${workspaceId}/spends`, {
    method: "POST",
    headers: await headersJson(token),
    body: JSON.stringify(body),
  });
  return parseJson<BusinessSpend>(res);
}

export async function approveBusinessSpend(token: string, spendId: string): Promise<BusinessSpend> {
  const res = await fetch(`${getApiBaseUrl()}/business/spends/${spendId}/approve`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<BusinessSpend>(res);
}

export async function rejectBusinessSpend(
  token: string,
  spendId: string,
  reason: string,
): Promise<BusinessSpend> {
  const res = await fetch(`${getApiBaseUrl()}/business/spends/${spendId}/reject`, {
    method: "POST",
    headers: await headersJson(token),
    body: JSON.stringify({ reason }),
  });
  return parseJson<BusinessSpend>(res);
}

export async function fetchBusinessDashboard(
  token: string,
  workspaceId: string,
): Promise<BusinessDashboard> {
  const res = await fetch(`${getApiBaseUrl()}/business/workspaces/${workspaceId}/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<BusinessDashboard>(res);
}

export async function fetchBusinessSignals(token: string, workspaceId: string): Promise<BusinessSignal[]> {
  const res = await fetch(`${getApiBaseUrl()}/business/workspaces/${workspaceId}/signals`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<BusinessSignal[]>(res);
}

