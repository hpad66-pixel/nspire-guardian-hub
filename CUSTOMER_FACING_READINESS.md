# Customer-facing readiness checklist

Status as of this session. Three columns: **state**, **owner**, **time**.

## What's been fixed in code this session

| Fix | File | Status |
|---|---|---|
| Activity Log Radix `<Select.Item value="">` crash | `src/pages/settings/ActivityLogPage.tsx` | Fixed |
| Profile save PGRST116 (UPDATE → UPSERT) | `src/hooks/useMyProfile.ts` | Fixed |
| Portal protected route hangs on RPC errors | `src/components/portal/PortalProtectedRoute.tsx` | Fixed (try/catch wrap + super-admin bypass) |
| `/portal/sub/*` and `/portal/owner/*` colliding with legacy `/portal/:slug` | `src/App.tsx` (renamed to `/sub-portal/*` and `/owner-portal/*`) | Fixed |
| API mint button no-op (inline form not wired to edge function) | `src/pages/settings/api/ApiClientsPage.tsx` (replaced with G4 dialog) | Fixed |
| Webhook subscribe button no-op | `src/pages/settings/api/WebhooksPage.tsx` (replaced with G4 dialog) | Fixed |
| `is_super_admin()` reading wrong JWT field | DB function | Fixed in earlier session |
| `/reports/new` Radix Select.Item crash | `ReportBuilderPage.tsx` | Fixed in earlier session |

## What you must run before re-testing

### 1. SQL: Re-align hardeep's tenant claim + seed Pro plan + project
Already in your hands — the DO $$ block from the previous message. Confirm `tenant_subscriptions` has a row for hardeep's actual workspace (`e9ab4fd9-...`).

### 2. CLI: Deploy edge functions
```bash
supabase functions deploy api-key-mint
supabase functions deploy webhook-secret-rotate
supabase functions deploy webhook-redeliver
supabase functions deploy stripe-webhook
supabase functions deploy oauth-token
```

### 3. Sign out / sign in as hardeep
JWT must refresh to pick up the corrected `app_metadata.tenant_id` and the `is_super_admin()` patch.

### 4. Local typecheck + dev server
```bash
npm run typecheck && npm run dev
```

## CRITICAL launch blockers — multi-tenant signup

### Signup currently routes every new user to one shared workspace

The DB trigger `public.handle_new_user()` (migration `20260218204340`) assigns
every signup to `00000000-0000-0000-0000-000000000001` if no workspace_id
is in the user metadata. **Opening signup to the public right now would put
every customer in the same tenant.**

**Two ways to fix:**

**Option A — Create a workspace per signup (proper SaaS).** Update the trigger
so a new signup without a `workspace_id` in metadata creates its own workspace,
makes the user the owner, and assigns admin role. ~30 minutes of SQL + a small
edge function (or pure SQL trigger).

**Option B — Invite-only beta launch.** Disable the public signup form on
`/auth`, only let users in via the invitation flow. The invite carries the
target workspace_id in metadata; the trigger picks it up correctly. ~15
minutes of UI work.

I recommend Option B for the first 5–10 customers (less code, less risk),
then build Option A before opening to public signup.

## Things only you can do (infrastructure / config / business)

### Stripe
- Create a Stripe production account (if not already)
- Add live secret key to Supabase Edge Function secrets: `STRIPE_SECRET_KEY`
- Add live webhook signing secret: `STRIPE_WEBHOOK_SECRET`
- In Stripe Dashboard → Webhooks → Add endpoint:
  URL: `https://xlfwzqpixlrnntzqhvcm.supabase.co/functions/v1/stripe-webhook`
  Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
- Create live products + prices that match the three plans (Starter/Pro/Enterprise)
- Update `plans.stripe_price_id` rows in DB with live price IDs
- Test purchase end-to-end with a real card before opening to customers

### Email deliverability (Resend)
- Verify the `mail.apas.ai` (or whichever subdomain) is showing as Verified in Resend
- Add SPF, DKIM, and DMARC records to the apas.ai DNS — DMARC especially or Gmail will spam-folder everything
- Test with mail-tester.com (target score: 9.5+/10)
- Set up monitoring for delivery failures in Resend dashboard

### Domain + SSL
- Point apas.ai DNS A/CNAME records to your hosting (Vercel / Netlify / your server)
- SSL certificate live (Let's Encrypt via your host, usually automatic)
- 404 page is branded
- Marketing landing page exists at `/` (RootRedirect bounces auth'd users to /dashboard, that's fine)

### Legal pages (US B2B SaaS minimum)
- Terms of Service (Termly or Iubenda templates work)
- Privacy Policy
- Cookie policy banner if you have EU users
- DPA template available on request
- Add ToS-acceptance checkbox on signup form
- Footer links to ToS + Privacy on every public page

### Observability
- Sign up for Sentry (free tier covers 5K events/month)
- Add `@sentry/react` to the app, wrap App.tsx in Sentry.ErrorBoundary
- Add Sentry to edge functions (or use Supabase native log alerts)
- Set up an uptime monitor (Better Stack, BetterUptime — free tier)

### Backups
- Verify Supabase project's automatic backup is enabled (default yes)
- Confirm retention is at least 7 days (default)
- For paying customers: consider PITR (Point-in-Time Recovery) — extra cost but worth it

### Security review
- Confirm RLS is enabled on every user-data table (the G1 migration covered most; the audit checklist in CLAUDE.md verifies)
- No service-role keys in client-side bundle (`grep -r SUPABASE_SERVICE_ROLE_KEY src/` should be empty)
- Stripe webhook signatures verified in `stripe-webhook/index.ts` (already done in code; just confirm `STRIPE_WEBHOOK_SECRET` is set in production)
- Password policy: min 8 chars, no common-password block (Supabase default is acceptable)
- Rate limiting on `/auth` (Supabase has default; consider tightening for production)

## Things I can fix when you give the go-ahead

### Bugs / polish (1–2 hours total)
- `/inspections` route shows Client Portals UI (`A12` minor) — likely a `ModuleProvider` feature-flag intercept; need to investigate which module flag controls it
- Role pill on `/dashboard` shows "USER" then re-renders to "ADMIN" on navigation (`A1.3b`) — hydration timing issue in the user role context
- `/admin/cost-codes/editor` shows "no libraries" while landing shows CSI MasterFormat (`A7.2`) — RLS or query mismatch between two views
- Workspace Profile save requires Company Name (`A2.2`) — UX-only, allow saving description without it
- The 6 known empty-state pages need CTAs ("No dashboards yet" → add a "Create dashboard" button) — `/admin/permission-templates`, `/admin/workflows`, `/dashboards/procore`, `/reports/procore`, `/admin/cost-codes` (when empty)

### Feature builds (multi-session)
- Onboarding wizard for fresh signups (Option A in the multi-tenant section above)
- Plan-upgrade flow E2E test (need Stripe test mode set up, then I can validate)
- Trial-expiry banner + soft-lock when trial expires
- Per-feature "feature flag" override for super admins
- Import-from-CSV for cost codes, projects, contacts
- Audit log for sensitive admin actions (some events are logged; needs UI viewer)

## Recommended path to first customer

| Day | Task | Owner |
|---|---|---|
| 1 | Run the SQL fix + edge function deploys + sign-out/in. Re-run QA prompt. | You |
| 1 | I patch any remaining FAILs from re-run | Me |
| 2 | Stripe test mode setup. Live a test purchase end-to-end. | You |
| 2 | Resend DMARC + test invitation email lands in real inbox | You |
| 3 | Decide Option A vs Option B for signup (recommend B). | You |
| 3 | If Option B: I disable signup form, lock to invite-only. ~15 min. | Me |
| 4 | Legal pages (ToS, Privacy) — paste templates | You |
| 4 | Sentry setup for error tracking | Me |
| 5 | Beta-customer #1 invited via real flow. Watch their session. | Both |
| 7 | Beta customer #2 + #3 | Both |
| 14 | Real feedback in hand → next priorities clear | Both |

## How to use this document

Treat it as a punch list. Each item has either:
- `[Code]` — I can fix in a session
- `[Config]` — you do it in Stripe / Resend / DNS / Supabase dashboard
- `[Business]` — legal, branding, support process

Anything marked `[Critical]` blocks customer-facing launch. Everything else
is polish for after the first 3 customers are using the app.

The G-series work (tenant isolation, portal gating, secret reveal, hook
tests) is shipped. The remaining work is plumbing + polish + business setup.
