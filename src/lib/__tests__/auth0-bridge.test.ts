import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The Auth0 bridge runs in Deno edge functions and Postgres, neither of which
// the Vitest suite can execute. These are source invariants: each one pins a
// security property that a well-meaning refactor could quietly drop.

const shared = readFileSync('supabase/functions/_shared/auth0.ts', 'utf8');
const authorize = readFileSync('supabase/functions/auth0-authorize/index.ts', 'utf8');
const callback = readFileSync('supabase/functions/auth0-callback/index.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20260907120000_auth0_universal_login.sql', 'utf8');
const config = readFileSync('supabase/config.toml', 'utf8');
const action = readFileSync('auth0/actions/post-login-product-tag.js', 'utf8');

describe('Auth0 Universal Login bridge', () => {
  it('keeps the PKCE verifier server-side and uses S256', () => {
    expect(authorize).toContain('codeChallengeS256');
    expect(shared).toContain('code_challenge_method');
    expect(shared).toContain('S256');
    // The verifier is persisted, never returned to the browser.
    expect(authorize).toMatch(/code_verifier:\s*codeVerifier/);
    expect(authorize).not.toMatch(/json\(\{[^}]*codeVerifier/);
  });

  it('consumes the login state exactly once', () => {
    expect(callback).toContain('.is("consumed_at", null)');
    expect(callback).toContain('.gt("expires_at"');
    expect(callback).toMatch(/update\(\{\s*consumed_at/);
  });

  it('verifies the Auth0 ID token signature, issuer, audience and nonce', () => {
    expect(shared).toContain('createRemoteJWKSet');
    expect(shared).toContain('jwtVerify');
    expect(shared).toMatch(/issuer:\s*cfg\.issuer/);
    expect(shared).toMatch(/audience:\s*cfg\.clientId/);
    expect(shared).toContain('nonce_mismatch');
    expect(callback).toMatch(/verifyIdToken\(cfg, tokens\.id_token, state\.nonce\)/);
  });

  it('requires a verified email before linking to or creating an account', () => {
    // Linking an unverified Auth0 identity to an existing account by email is
    // account takeover; both the link path and the self-serve create path guard.
    expect(callback.match(/emailVerified/g)?.length).toBeGreaterThanOrEqual(2);
    expect(callback).toContain('email_unverified');
  });

  it('accepts an unverified email only for the exact invited address', () => {
    expect(callback).toContain('invitation_email_mismatch');
    expect(callback).toMatch(/invitation\.email[\s\S]{0,80}toLowerCase\(\)\s*!==\s*profile\.email/);
    expect(callback).toContain('invitation_invalid');
  });

  it('matches the account email exactly, not as a LIKE pattern', () => {
    // `_` is legal in an email and is a single-character wildcard to ILIKE, so
    // an unescaped lookup could resolve to a different person's profile.
    expect(callback).toContain('escapeLikePattern');
    expect(callback).toMatch(/ilike\("email", escapeLikePattern\(email\)\)/);
    // And the authoritative address on auth.users is re-checked either way.
    expect(callback).toMatch(/data\.user\.email[\s\S]{0,40}toLowerCase\(\)\s*!==\s*email/);
  });

  it('refuses banned and deactivated accounts', () => {
    expect(callback).toContain('banned_until');
    expect(callback).toContain('account_deactivated');
    expect(callback).toMatch(/profileStatus\s*!==\s*"active"/);
  });

  it('never persists a session token', () => {
    expect(migration).not.toMatch(/access_token|refresh_token/);
    // Tokens leave in the redirect fragment; nothing writes them to a table.
    expect(callback).not.toMatch(/insert\([\s\S]{0,200}access_token/);
  });

  it('hands the session back in a fragment, not a query string', () => {
    expect(callback).toMatch(/APP_ORIGIN \+ "\/auth\/callback#"/);
  });

  it('resolves an existing user before creating one, so migrated ids survive', () => {
    // Order matters: sub match, then verified-email match, then create.
    const subIndex = callback.indexOf('auth0_identities');
    const emailIndex = callback.indexOf('findUserByEmail(admin, profile.email)');
    const createIndex = callback.indexOf('// 4. Brand-new self-serve signup.');
    expect(subIndex).toBeGreaterThan(-1);
    expect(subIndex).toBeLessThan(emailIndex);
    expect(emailIndex).toBeLessThan(createIndex);
  });

  it('lets the database trigger decide between joining and provisioning', () => {
    // handle_new_user reads user_metadata: an invitation_token joins the invited
    // workspace, its absence provisions a new one. The bridge must not bypass it.
    expect(callback).toContain('invitation_token: state.invitation_token');
    expect(callback).toContain('company_name: state.company_name');
    expect(callback).not.toMatch(/from\("workspaces"\)[\s\S]{0,80}insert/);
  });

  it('keeps the Auth0 subject in protected app_metadata', () => {
    expect(callback).toMatch(/app_metadata:\s*\{\s*auth0_sub/);
    expect(callback).toContain('signup_product');
  });

  it('locks the bridge tables to the service role', () => {
    expect(migration).toMatch(/ALTER TABLE public\.auth0_login_states ENABLE ROW LEVEL SECURITY/);
    expect(migration).toMatch(/ALTER TABLE public\.auth0_identities ENABLE ROW LEVEL SECURITY/);
    expect(migration).toMatch(/REVOKE ALL ON public\.auth0_login_states FROM anon, authenticated/);
    expect(migration).toMatch(/REVOKE INSERT, UPDATE, DELETE ON public\.auth0_identities FROM anon, authenticated/);
    // The only policy is a read of your own linkage.
    expect(migration).toMatch(/auth0_identities_own_select[\s\S]{0,160}FOR SELECT/);
  });

  it('exposes both bridge functions without a JWT gate, by design', () => {
    expect(config).toMatch(/\[functions\.auth0-authorize\]\s*\nverify_jwt = false/);
    expect(config).toMatch(/\[functions\.auth0-callback\]\s*\nverify_jwt = false/);
    // …which is why each enforces its own origin allowlist.
    expect(authorize).toContain('Origin is not allowed');
  });

  it('stamps the signup product once and never rewrites it', () => {
    expect(action).toContain('signup_product');
    expect(action).toMatch(/if \(!appMetadata\.signup_product\)/);
    expect(action).toContain("setAppMetadata('products'");
    // Auth0 strips non-namespaced custom claims.
    expect(action).toContain("NAMESPACE + 'signup_product'");
  });
});
