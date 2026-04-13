/** Local dev default; production must set NEXT_PUBLIC_API_URL in the frontend host (e.g. Vercel env vars). */
const defaultBase = "http://127.0.0.1:8002";

export function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? defaultBase).replace(/\/$/, "");
}

/** Turn low-level fetch failures into actionable copy for production misconfig (CORS / API URL). */
export function humanizeApiNetworkError(e: unknown): string {
  if (e instanceof Error) {
    const m = e.message;
    if (
      m === "Failed to fetch" ||
      m.includes("NetworkError") ||
      m.includes("Load failed") ||
      m.includes("network")
    ) {
      return (
        "Could not reach the API. Set NEXT_PUBLIC_API_URL (not URI) to your backend HTTPS URL in your Vercel project, " +
        "then trigger a new production deploy — Next.js bakes this in at build time. DNS at Hostinger should point the " +
        "domain to Vercel; if the domain still serves another host, that build’s env (not Vercel’s) applies. On the API, " +
        "add this site’s origin to CORS_ORIGINS (e.g. https://momentra.tech). HTTPS sites cannot call HTTP APIs (mixed content)."
      );
    }
    return m;
  }
  return "Something went wrong";
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
