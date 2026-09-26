import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const acsSource = readFileSync("supabase/functions/saml-acs/index.ts", "utf8");
const securitySource = readFileSync("supabase/functions/saml-acs/saml-security.ts", "utf8");

test("SAML ACS fails closed before assertion parsing can issue a session", () => {
  const failClosedIndex = acsSource.indexOf("requireVerifiedSamlSupport();");
  const assertionParsingIndex = acsSource.indexOf("verifyAssertion(atob(samlB64), cfg)");
  const magicLinkIndex = acsSource.indexOf("sb.auth.admin.generateLink");

  assert.notEqual(failClosedIndex, -1, "ACS must call the fail-closed SAML guard.");
  assert.notEqual(assertionParsingIndex, -1, "ACS must still make the assertion parser location visible.");
  assert.notEqual(magicLinkIndex, -1, "ACS magic-link issuance location must remain visible to the guard.");
  assert.ok(failClosedIndex < assertionParsingIndex, "SAML guard must run before assertion parsing.");
  assert.ok(failClosedIndex < magicLinkIndex, "SAML guard must run before magic-link issuance.");
});

test("SAML fail-closed helper cannot silently allow login", () => {
  assert.match(
    securitySource,
    /export function requireVerifiedSamlSupport\(\): void \{\s*throw new Error\(SAML_VERIFICATION_UNAVAILABLE\);\s*\}/s,
    "SAML helper must throw until real XML signature verification is implemented.",
  );
});

test("SAML ACS does not pass raw RelayState to Supabase magic-link redirects", () => {
  assert.match(
    acsSource,
    /redirectTo: resolveSafeRelayState\(relayState, Deno\.env\.get\("APP_ORIGIN"\)\)/,
    "RelayState must be normalized before redirect use.",
  );
  assert.doesNotMatch(
    acsSource,
    /redirectTo:\s*String\(relayState/,
    "Raw RelayState must not be passed into magic-link redirects.",
  );
});

test("SSO error HTML escapes rendered messages", () => {
  assert.match(acsSource, /const safeMsg = escapeHtml\(msg\);/);
  assert.match(acsSource, /<p>\$\{safeMsg\}<\/p>/);
  assert.doesNotMatch(acsSource, /<p>\$\{msg\}<\/p>/);
});
