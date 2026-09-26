export const SAML_VERIFICATION_UNAVAILABLE =
  "SAML SSO is disabled until XML signature verification is implemented.";

export function requireVerifiedSamlSupport(): void {
  throw new Error(SAML_VERIFICATION_UNAVAILABLE);
}

export function resolveSafeRelayState(relayState: FormDataEntryValue | null, appOrigin: string | undefined): string {
  const fallback = `${normalizeOrigin(appOrigin)}/dashboard`;
  if (typeof relayState !== "string" || relayState.trim() === "") return fallback;

  try {
    const candidate = new URL(relayState, fallback);
    if (candidate.origin !== new URL(fallback).origin) return fallback;
    if (!candidate.pathname.startsWith("/")) return fallback;
    return candidate.toString();
  } catch {
    return fallback;
  }
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeOrigin(appOrigin: string | undefined): string {
  if (!appOrigin) return "http://localhost:5173";
  try {
    const parsed = new URL(appOrigin);
    return parsed.origin;
  } catch {
    return "http://localhost:5173";
  }
}
