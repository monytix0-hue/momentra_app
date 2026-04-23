/**
 * Backend builds join URLs with `app_public_url` (often API origin). In dev the app runs on
 * another port — rewrite to this browser origin so `/group/join` loads the Next.js page.
 */
export function normalizeGroupJoinUrl(joinUrlFromApi: string): string {
  if (typeof window === "undefined") return joinUrlFromApi;
  let token: string | null = null;
  try {
    const u = new URL(joinUrlFromApi);
    token = u.searchParams.get("token");
  } catch {
    const m = joinUrlFromApi.match(/[?&]token=([^&]+)/);
    token = m ? decodeURIComponent(m[1]) : null;
  }
  if (!token) return joinUrlFromApi;
  return `${window.location.origin}/group/join?token=${encodeURIComponent(token)}`;
}
