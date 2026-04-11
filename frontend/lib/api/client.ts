const defaultBase = "http://127.0.0.1:6000";

export function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? defaultBase).replace(/\/$/, "");
}

export type ProfileDto = {
  id: string;
  email: string | null;
  display_name: string | null;
  photo_url: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

/** Extract a human-readable message from a FastAPI/JSON error response body. */
async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  const text = await res.text().catch(() => "");
  if (!text) return fallback;
  try {
    const json = JSON.parse(text) as Record<string, unknown>;
    if (typeof json.detail === "string") return json.detail;
    if (typeof json.message === "string") return json.message;
  } catch {
    // not JSON — return raw text
  }
  return text;
}

export async function syncUserProfile(
  idToken: string,
  body?: { display_name?: string | null; photo_url?: string | null },
): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/users/sync`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      display_name: body?.display_name ?? undefined,
      photo_url: body?.photo_url ?? undefined,
    }),
  });
  if (!res.ok) {
    const msg = await extractErrorMessage(res, `Sync failed (${res.status})`);
    throw new Error(msg);
  }
}

export async function fetchUserProfile(idToken: string): Promise<ProfileDto> {
  const res = await fetch(`${getApiBaseUrl()}/users/profile`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) {
    const msg = await extractErrorMessage(res, `Profile fetch failed (${res.status})`);
    throw new Error(msg);
  }
  return res.json() as Promise<ProfileDto>;
}
