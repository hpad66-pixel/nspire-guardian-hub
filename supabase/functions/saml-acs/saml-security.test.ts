import {
  escapeHtml,
  requireVerifiedSamlSupport,
  resolveSafeRelayState,
  SAML_VERIFICATION_UNAVAILABLE,
} from "./saml-security.ts";

Deno.test("SAML support fails closed until XML signature verification is implemented", () => {
  let rejected = false;
  try {
    requireVerifiedSamlSupport();
  } catch (err) {
    rejected = true;
    if ((err as Error).message !== SAML_VERIFICATION_UNAVAILABLE) {
      throw new Error("Unexpected SAML fail-closed message.");
    }
  }

  if (!rejected) throw new Error("SAML support did not fail closed.");
});

Deno.test("RelayState falls back when it is missing, cross-origin, or malformed", () => {
  const origin = "https://projos.ai";
  const fallback = "https://projos.ai/dashboard";

  if (resolveSafeRelayState(null, origin) !== fallback) {
    throw new Error("Missing RelayState did not use the dashboard fallback.");
  }

  if (resolveSafeRelayState("https://evil.example/phish", origin) !== fallback) {
    throw new Error("Cross-origin RelayState was accepted.");
  }

  if (resolveSafeRelayState("https://[bad-url", origin) !== fallback) {
    throw new Error("Malformed RelayState was accepted.");
  }
});

Deno.test("RelayState keeps same-origin relative and absolute app paths", () => {
  if (
    resolveSafeRelayState("/dashboard?from=sso", "https://projos.ai") !==
      "https://projos.ai/dashboard?from=sso"
  ) {
    throw new Error("Same-origin relative RelayState was not preserved.");
  }

  if (
    resolveSafeRelayState("https://projos.ai/projects/123", "https://projos.ai") !==
      "https://projos.ai/projects/123"
  ) {
    throw new Error("Same-origin absolute RelayState was not preserved.");
  }
});

Deno.test("SSO error copy is escaped before rendering HTML", () => {
  const escaped = escapeHtml(`<script>alert("x")</script>`);
  if (escaped.includes("<script>") || escaped.includes('"x"')) {
    throw new Error("HTML escaping left executable-looking markup in the response.");
  }
});
