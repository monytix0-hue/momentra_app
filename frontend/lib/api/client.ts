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
    const text = await res.text();
    throw new Error(text || `Sync failed (${res.status})`);
  }
}

export async function fetchUserProfile(idToken: string): Promise<ProfileDto> {
  const res = await fetch(`${getApiBaseUrl()}/users/profile`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Profile fetch failed (${res.status})`);
  }
  return res.json() as Promise<ProfileDto>;
}
