# Auth0 Universal Login — setup and cutover runbook

Auth0 is the single front door for signup and signin across every APAS product.
One tenant, one identity per person, one place where "this person came from
ProjOS" is recorded — so marketing and the CRM read one identity graph instead
of reconciling several.

## Why Auth0 sits *in front of* Supabase Auth, not instead of it

ProjOS is built on Supabase Auth far more deeply than a login form:

- 190 foreign keys reference `auth.users(id)`.
- 1,200+ RLS policies call `auth.uid()`.
- `public.current_tenant_id()` resolves the workspace from the Supabase JWT.
- `handle_new_user` provisions or joins a workspace when an `auth.users` row is
  inserted.

Supabase's *third-party auth* mode — where Auth0 issues the JWT the database
trusts directly — makes `auth.uid()` return the Auth0 subject (`auth0|64f…`,
not a UUID) and stops creating `auth.users` rows at all. Every one of those
foreign keys and policies would have to be rewritten.

So Auth0 authenticates, and a bridge mints a **real Supabase session** for the
matching `auth.users` row. Existing users keep their user id, their workspace,
their roles, and every row they own.

```
Browser → auth0-authorize ──▶ Auth0 Universal Login
                                     │
                              (code + state)
                                     ▼
          auth0-callback: verify ID token → resolve auth.users row
                          → mint Supabase session
                                     ▼
                     /auth/callback#access_token=… → app
```

| Piece | Location |
|---|---|
| Shared OIDC/PKCE helpers | `supabase/functions/_shared/auth0.ts` |
| Start the round trip | `supabase/functions/auth0-authorize/index.ts` |
| Finish it, mint the session | `supabase/functions/auth0-callback/index.ts` |
| Bridge tables | `supabase/migrations/20260907120000_auth0_universal_login.sql` |
| Product tagging Action | `auth0/actions/post-login-product-tag.js` |
| Client helpers | `src/lib/auth/auth0.ts` |
| Landing page | `src/pages/auth/Auth0CallbackPage.tsx` |
| Bulk import | `scripts/auth0-bulk-import.mjs` |

---

## 1. Auth0 tenant

Use **one tenant for all APAS products**, with **one Application per product**.
The application (its `client_id`) is what distinguishes a ProjOS signup from any
other product's.

Create a **Regular Web Application** named `ProjOS`. It is confidential — the
client secret lives only in Supabase edge-function secrets — and the code
exchange happens server-side.

Settings → **Application URIs**:

| Field | Value |
|---|---|
| Allowed Callback URLs | `https://<project-ref>.supabase.co/functions/v1/auth0-callback` |
| Allowed Logout URLs | `https://projos.ai/auth`, `http://localhost:5173/auth` |
| Allowed Web Origins | `https://projos.ai`, `http://localhost:5173` |

Advanced Settings → Grant Types: **Authorization Code** and **Refresh Token**.

Under **Authentication → Database**, keep the default
`Username-Password-Authentication` connection and enable it for this
application. Add social connections (Google, Microsoft) on the same connection
list if you want them; they arrive at the bridge already email-verified.

## 2. Deploy the product-tagging Action

Dashboard → **Actions → Library → Build Custom → Login / Post Login**. Paste
`auth0/actions/post-login-product-tag.js`, fill in `PRODUCTS_BY_CLIENT_ID` with
this application's client id, **Deploy**, then drag it into the Login flow.

It writes, on the user's first ever login:

```json
{
  "signup_product": "projos",
  "signup_client_id": "…",
  "signup_at": "2026-09-07T…Z",
  "signup_utm": { "utm_source": "…", "utm_campaign": "…" },
  "products": ["projos"]
}
```

`signup_product` is written once and never rewritten, so attribution survives
the user later adopting other products. `products` accumulates every product the
identity has signed in to — that array is the cross-sell signal.

Marketing and the CRM read these from the Management API
(`GET /api/v2/users?q=app_metadata.signup_product:"projos"`) or from an Auth0
log stream. Nothing needs to ask ProjOS.

UTM capture: send campaign parameters through to `/authorize` prefixed with
`ext-` (`ext-utm_source=…`). Auth0 forwards only `ext-`-prefixed custom
parameters, which is also how the bridge passes `ext-product`.

## 3. Configure ProjOS

Edge-function secrets (never `VITE_*` — the client secret must not ship in the
bundle):

```bash
supabase secrets set \
  AUTH0_DOMAIN=<tenant>.us.auth0.com \
  AUTH0_CLIENT_ID=<client-id> \
  AUTH0_CLIENT_SECRET=<client-secret> \
  AUTH0_PRODUCT_SLUG=projos \
  APP_ORIGIN=https://projos.ai
```

Frontend build variables (public, and required for sign-out to end the Auth0
session as well as the Supabase one):

```
VITE_AUTH0_ENABLED=true
VITE_AUTH0_DOMAIN=<tenant>.us.auth0.com
VITE_AUTH0_CLIENT_ID=<client-id>
```

Then:

```bash
supabase db push
supabase functions deploy auth0-authorize
supabase functions deploy auth0-callback
```

`VITE_AUTH0_ENABLED=false` (the default) leaves the app exactly as it is today:
email/password only, no Auth0 buttons. Deploy the backend first, flip the flag
second.

## 4. Migrate existing users

Supabase stores bcrypt password hashes, and Auth0 imports bcrypt directly, so
existing users keep the password they already have.

```sql
-- Supabase SQL editor. Save the result as supabase-users.json.
SELECT json_agg(row_to_json(u)) FROM (
  SELECT u.id, u.email, u.encrypted_password, u.email_confirmed_at, p.full_name
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE u.deleted_at IS NULL
    AND u.email IS NOT NULL
    AND COALESCE(u.is_anonymous, false) = false
) u;
```

```bash
node scripts/auth0-bulk-import.mjs --input supabase-users.json \
  --out auth0-users.json --product projos
```

Import `auth0-users.json` through Dashboard → **User Management → Import Users**
(or `POST /api/v2/jobs/users-imports`) into the database connection. Then delete
the file — it contains password hashes.

Imported users are stamped `signup_product: "projos"` and
`migrated_from: "supabase"`, so pre-Auth0 accounts are still attributable and
still distinguishable from organic signups.

**How a migrated user lands on their existing account:** the first time they
sign in through Auth0 the bridge finds no `auth0_identities` row for their
subject, falls back to matching a *verified* email against `public.profiles`,
and links. Their Supabase user id never changes.

Users whose hash is missing or is not bcrypt import without a password and must
use Auth0's password reset once. The script reports that count.

## 5. Cutover

1. Deploy the migration and both functions with `VITE_AUTH0_ENABLED=false`.
2. Run the bulk import.
3. Flip `VITE_AUTH0_ENABLED=true` and redeploy the frontend.
4. Verify each path in the table below.
5. Once traffic has moved, disable signups on the Supabase database connection
   and remove the password fallback from `AuthPage`/`AcceptInvitePage`.

The password form stays available behind "Use an email and password instead"
throughout, so a problem in step 3 is a flag flip away from being reverted.

### What to verify

| Path | Expected |
|---|---|
| Self-serve signup | New Auth0 user → new `auth.users` row → fresh workspace, creator is its admin |
| Returning user | Lands on their existing user id, workspace, and roles |
| Migrated user, first Auth0 login | Same — linked by verified email, id unchanged |
| Invitation acceptance | Joins the invited workspace with the invited property scope; invitation marked accepted |
| Invitation, wrong email | Refused: "Sign in with the email address the invitation was sent to" |
| Deactivated user | Refused: "This account has been deactivated" |
| Sign out | Supabase session cleared *and* Auth0 session ended |

## Security notes

- **PKCE (S256)**, and the verifier never leaves the server.
- **Single-use state.** `auth0_login_states` rows are claimed with
  `consumed_at IS NULL`, so an authorization code cannot be replayed.
- **Full ID-token verification** — signature against Auth0's JWKS, plus issuer,
  audience, expiry, and the nonce planted before the redirect.
- **Verified email required to link.** Linking an unverified Auth0 identity to
  an existing account by email address would be account takeover. The one
  exception is an invitation, where the signed single-use token already proves
  control of that exact address — and the bridge checks the addresses match.
- **No token is ever persisted.** The session is minted in memory and handed
  back in a URL fragment, which the callback page scrubs from history.
- **Deactivation is honoured.** Banned `auth.users` rows and non-active
  `profiles` are refused at the bridge, not just at the password form.
- **Service-role-only tables.** Both bridge tables have RLS enabled; the only
  policy is a user reading their own linkage.

These properties are pinned by `src/lib/__tests__/auth0-bridge.test.ts`.
