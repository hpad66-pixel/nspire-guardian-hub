# Procore Lite — Browser Test Prompts

Single source-of-truth playbook for testing every feature shipped through Phase 4 + the G-series gap closures. Each block below is a self-contained prompt to paste into Claude in Chrome (one at a time). Claude operates the running app, records the result against the report template at the bottom, and at the end you compile the whole thing to PDF.
    
**Stacks assumed:** local dev server at `http://localhost:8080` (run `npm run dev`) backed by local Supabase at `http://127.0.0.1:54321` / Postgres `127.0.0.1:54322`. Swap to your staging URL if testing the deployed build.

**Prerequisite seeds you must have available** — record their UUIDs in the SETUP block:
- Two workspaces: `wsA` (paid plan with `subcontractor_portal` + `owner_portal` + `api_access`) and `wsB` (Starter plan, no portal/api features).
- Three users: `adminA` (admin in wsA), `subA` (subcontractor in wsA), `ownerA` (owner in wsA), `adminB` (admin in wsB).
- One project per workspace, with at least one RFI, one daily report, one document, one photo, one drawing markup.
- Service-role JWT for direct DB checks via Supabase Studio.

If any of those are missing, run the SETUP prompt first.

---

## Report template (Claude appends one of these per test)

```
### {{TEST_ID}} — {{TITLE}}
- Module: {{module}}
- Pre-conditions: {{...}}
- Steps: {{...}}
- Expected: {{...}}
- Observed: {{...}}
- Network: requests={{n}}, total_ms={{ms}}, max_ttfb_ms={{ms}}, errors={{count}}, 4xx={{n}}, 5xx={{n}}
- Console: errors={{n}}, warnings={{n}}, top_message="{{...}}"
- Screenshot: {{path or omitted}}
- Status: PASS | FAIL | BLOCKED
- Caveat: {{free text or "none"}}
```

---

## SETUP — environment recon + seed verification

```
You are testing the Procore Lite build at http://localhost:8080. The DB is at postgres://postgres:postgres@127.0.0.1:54322/postgres. Supabase Studio is at http://127.0.0.1:54323.

Step 1. Open the app, open DevTools, switch to the Network tab, enable "Preserve log" and "Disable cache" (testing mode only — note this in the report).
Step 2. Navigate to /. Confirm it redirects to /auth (guest) or /dashboard (logged in). If it shows a dark/gold landing page instead, mark this as a BLOCKER and stop — the PWA service worker cache fix has not yet propagated.
Step 3. Open Supabase Studio, run: SELECT id, name FROM workspaces; SELECT id, email FROM auth.users; SELECT id, name, workspace_id FROM projects;
Step 4. Record into a SETUP section of the report: build version (from <meta name="version"> or window.__BUILD_VERSION__ if present), service-worker registration status (navigator.serviceWorker.controller exists?), workspace IDs, user IDs, project IDs.
Step 5. If any seed is missing (no two workspaces with the plan distribution above, no portal-role users), STOP and tell me what to seed before continuing.

Output: SETUP section of the report, populated.
```

---

## T0 — Widget overview snapshot (paste at the top of the report)

```
Generate the widget at the top of the report, in this exact format:

┌──────────────────────────────────────────────────────────────┐
│ Procore Lite — Test Run YYYY-MM-DD HH:MM                     │
│ Build: {{commit_sha}}  Env: {{local|staging|prod}}           │
├────────────────────┬───────┬───────┬─────────┬───────────────┤
│ Section            │ Pass  │ Fail  │ Blocked │ Notes         │
├────────────────────┼───────┼───────┼─────────┼───────────────┤
│ G1 Tenant iso      │  /5   │       │         │               │
│ G2 Polymorphic FK  │  /6   │       │         │               │
│ G3 Portal auth     │  /5   │       │         │               │
│ G4 API + webhooks  │  /8   │       │         │               │
│ G5 Coverage gate   │  /1   │       │         │               │
│ G6 Docs conform    │  /1   │       │         │               │
│ PWA cache fix      │  /1   │       │         │               │
│ Auto-tenant (G1.1) │  /1   │       │         │               │
│ Perf metrics       │  /1   │       │         │               │
│ Caveats audit      │  —    │       │         │ {{n flagged}} │
└────────────────────┴───────┴───────┴─────────┴───────────────┘

Update the counts as tests complete. This widget is the first page of the PDF.
```

---

## G1 — Tenant isolation hardening (5 tests, T1–T5)

### T1 — Cross-tenant SELECT rejected on every patched table

```
Goal: confirm tenant A's session cannot SELECT rows in any of the 15 G1-patched tables when those rows belong to tenant B.

Tables to iterate: rfi_responses, rfi_attachments, daily_weather, daily_manpower, daily_equipment, daily_deliveries, daily_safety_violations, daily_accidents, daily_quantities, daily_productivity, daily_visitors, daily_calls, daily_notes, daily_dumpster, daily_scheduled_work.

Steps:
1. Sign in as adminA. From DevTools console, run for each table:
   const { data, error, count } = await window.__supabase.from('<table>').select('*', { count: 'exact' });
   Record (count, error). Capture network request: status, latency, response size.
2. From the service-role JWT in Supabase Studio, count the same table for tenant_id = wsB. Confirm wsB has rows.
3. Sign out, sign in as adminB. Re-run the same query. Confirm count > 0 for wsB rows.
4. Sign out, sign in as adminA again. Re-run. Confirm wsA sees 0 of wsB's rows.

Pass criteria: every iteration of step 1 returns 0 rows belonging to wsB. Service-role count != 0 in step 2 (sanity).
Append T1 row per table (15 rows) to the report.
```

### T2 — Cross-tenant INSERT rejected via RLS WITH CHECK

```
Goal: an authenticated user from tenant A cannot insert into any patched table with tenant_id = wsB.

Steps for each of the 15 tables:
1. Logged in as adminA, in DevTools console:
   await window.__supabase.from('<table>').insert({ tenant_id: '<wsB_uuid>', /* minimal valid columns + a parent FK in wsA */ });
2. Capture the response: must be a PostgREST error with code 42501 or 23502 (RLS check failed).
3. Confirm via Supabase Studio that the row was NOT inserted into wsB.

Pass criteria: every insert rejected at the RLS layer.
Append T2 row.
```

### T3 — Cross-tenant UPDATE rejected

```
Goal: tenant A cannot UPDATE a row in tenant B (regardless of whether they have the row's UUID).

Steps:
1. Service-role: pick one wsB row in rfi_responses; record its id.
2. Logged in as adminA: await window.__supabase.from('rfi_responses').update({ body: 'pwned' }).eq('id', '<wsB_row_id>');
3. Confirm response shows 0 rows updated and no policy violation (RLS hides the row from the UPDATE's filter).
4. Confirm via service-role read that body is unchanged.

Pass criteria: 0 rows affected; original body preserved.
Append T3 row.
```

### T4 — Cross-tenant DELETE rejected

```
Same shape as T3 but with .delete(). Confirm the row in wsB still exists after the call.
Append T4 row.
```

### T5 — Super-admin can read across tenants

```
Pre: a user flagged via public.is_super_admin().

Steps:
1. Sign in as the super-admin.
2. await window.__supabase.from('rfi_responses').select('id, tenant_id', { count: 'exact' });
3. Confirm rows from BOTH wsA and wsB are returned.

Pass criteria: response contains rows whose tenant_id is wsA AND rows whose tenant_id is wsB.
If no super-admin user is seeded, mark BLOCKED with the seed gap as the caveat.
Append T5 row.
```

---

## G2 — RFI attachment polymorphic FK boundary (6 tests, T6–T11)

### T6 — Cross-tenant document_id rejected

```
Pre: wsA has at least one project_rfi (rfi_A1) and one pl_documents row (doc_A1). wsB has at least one pl_documents row (doc_B1).

Steps:
1. As adminA, in DevTools console:
   await window.__supabase.from('rfi_attachments').insert({ rfi_id: '<rfi_A1>', document_id: '<doc_B1>' });
2. Expect: 42501 ("rfi_attachment tenant mismatch") or RLS rejection.

Pass: insert rejected. Record the exact error message into the report.
Append T6 row.
```

### T7 — Same-tenant document_id succeeds

```
Same as T6 but document_id = doc_A1. Expect insert succeeds, row visible to adminA.
Append T7 row.
```

### T8 — UPDATE to swap to cross-tenant document_id rejected

```
Pre: an existing rfi_attachment with document_id = doc_A1.

Steps:
1. As adminA: await window.__supabase.from('rfi_attachments').update({ document_id: '<doc_B1>' }).eq('id', '<attachment_id>');
2. Expect rejection.

Pass: row's document_id unchanged after the call.
Append T8 row.
```

### T9 — All three FK columns null violates CHECK

```
As adminA: await window.__supabase.from('rfi_attachments').insert({ rfi_id: '<rfi_A1>' });
Expect: 23514 / "rfi_attachments_one_parent_chk" violation.
Append T9 row.
```

### T10 — Two FK columns set violates CHECK

```
As adminA: insert with both document_id = doc_A1 AND photo_id set. Expect 23514.
Append T10 row.
```

### T11 — Same matrix passes for photo_id and drawing_markup_id

```
Repeat T6+T7 twice more, with photo_id (using a wsB photo) and drawing_markup_id (using a wsB drawing markup). Expect cross-tenant rejection in both, same-tenant success in both. Record one report row per parent type (T11a, T11b, T11c).
```

---

## G3 — Portal authentication middleware (5 tests, T12–T16)

### T12 — Unauthenticated user redirected to /login

```
Steps:
1. Sign out completely. Verify session is gone via window.__supabase.auth.getSession().
2. Navigate directly to /portal/sub/commitments.
3. Capture: final URL, redirect chain (Network tab → Doc requests).

Expected final URL: /login?next=%2Fportal%2Fsub%2Fcommitments.
Append T12 row.
```

### T13 — Wrong-role redirect + toast

```
Pre: user 'pmA' is a project manager in wsA (NOT subcontractor, NOT owner).

Steps:
1. Sign in as pmA.
2. Navigate to /portal/sub/commitments.
3. Capture: final URL, presence of the error toast text "You don't have access to that portal.".

Expected: redirected to /dashboard, toast visible for ≥3s.
Append T13 row.
```

### T14 — Plan-locked → upgrade page in place

```
Pre: subcontractor user on a workspace whose plan does NOT include the subcontractor_portal feature.

Steps:
1. Sign in.
2. Navigate to /portal/sub/commitments.
3. Capture: URL stays at /portal/sub/commitments, the page rendered is UpgradeRequired (look for data-testid="upgrade-required" or the upgrade CTA copy).
4. Confirm no redirect away from the URL.

Expected: in-place upgrade page, URL preserved.
Append T14 row.
```

### T15 — Sub user with plan: lands on portal

```
Sign in as subA on wsA (paid plan). Navigate to /portal/sub/commitments. Expect the SubCommitmentsPage actually renders (data table or empty-state copy).
Append T15 row.
```

### T16 — Same matrix for owner portal

```
Repeat T12, T13, T14, T15 against /portal/owner/* using ownerA and the owner_portal feature key. Append four rows: T16a–T16d.
```

---

## G4 — API clients + webhooks (8 tests, T17–T24)

### T17 — Admin creates an API client; secret revealed once

```
Pre: adminA, plan includes api_access.

Steps:
1. Navigate /settings/api/clients. Click "Create API Client".
2. Fill name="Test Client", scopes=["api:read"]. Submit.
3. Capture the RevealSecretOnceDialog: the displayed plaintext key matches the regex /^pl_[A-Za-z0-9]{32}$/.
4. Copy the key value to the report (mask middle chars: pl_abcd…wxyz).
5. Close the dialog. Reopen the page. Confirm the key is no longer visible — only key_id prefix.

Pass: secret shown exactly once; reload shows masked id only.
Append T17 row.
```

### T18 — Non-admin sees disabled / 403

```
Sign in as a non-admin user in wsA. Navigate /settings/api/clients. Confirm either the page renders an empty/forbidden state OR the create button is disabled. If a 403 is returned, capture the network status.
Append T18 row.
```

### T19 — Starter-plan workspace sees upgrade page

```
Sign in as adminB (Starter plan, no api_access). Navigate /settings/api/clients. Expect UpgradeRequired in place, URL preserved.
Append T19 row.
```

### T20 — Webhook create with event types + secret reveal

```
Pre: adminA on wsA paid plan.

Steps:
1. Navigate /settings/api/webhooks. Click "Create Webhook".
2. URL = https://example.test/webhooks/in, event_types = ["rfi.created","submittal.responded"]. Submit.
3. Confirm the signing secret revealed once and matches /^whsec_[A-Za-z0-9]{32}$/.
4. Reload page; confirm secret no longer visible.

Append T20 row.
```

### T21 — Rotate webhook signing secret

```
Steps:
1. From the webhook list, open the row created in T20. Click "Rotate Secret".
2. Confirm a new whsec_… plaintext is shown once, distinct from T20's value.
3. From Supabase Studio, query: SELECT secret_hash FROM webhook_subscriptions WHERE id = '<id>'; confirm the hash differs from before. Also check secret column is empty string ('') per the G4 migration's intent.

Append T21 row.
```

### T22 — Delivery log + redeliver

```
Pre: at least one delivery exists for the webhook from T20 (trigger one by creating an RFI in wsA).

Steps:
1. Navigate /settings/api/webhooks/<id>/deliveries.
2. Confirm the table lists at least one row with status_code, latency, event_type.
3. Click "Redeliver" on the row. Confirm a NEW delivery row appears (different attempted_at).
4. Capture the network call to webhook-redeliver: method, status, latency.

Append T22 row.
```

### T23 — Revoke API client is non-destructive

```
Steps:
1. From T17, click "Revoke" on the test client.
2. Confirm the row remains visible but disabled (visually), and revoked_at is now set in the DB (Supabase Studio query).
3. Attempt to call any /functions/v1/* edge function with that key as Authorization header. Expect 401.

Append T23 row.
```

### T24 — RLS isolation regression on api_clients / webhooks / webhook_deliveries

```
As adminB, attempt SELECT on api_clients / webhooks / webhook_deliveries — confirm 0 rows from wsA. As adminA, confirm only wsA rows. Append T24 row.
```

---

## G5 — Coverage gate (1 test, T25)

```
Run from the terminal (record the output as the test "Observed"):

  npm run test -- --coverage 2>&1 | tail -30

Expected: "Statements" coverage on src/hooks/ is ≥ 70%. If the coverage reporter doesn't print per-directory totals, also run:

  npm run test -- --coverage --reporter=verbose

Pass: ≥70% on src/hooks/, ≥80% on src/lib/workflow/ and src/lib/billing/.
Append T25 row with raw coverage table.
```

---

## G6 — CLAUDE.md documentation conformance (1 test, T26)

```
Open CLAUDE.md and confirm:
  1. Section "Non-negotiable rules" contains rules numbered 8, 9, 10 with the titles "Polymorphic FKs need a tenant-boundary trigger", "Portals are role + plan gated", "Secrets are revealed once".
  2. Section "Phase sign-off checklist" exists with subsections: Foundation hygiene, Shared services, Portals, Secrets, Routing, Tests.
  3. "Companion artifacts" list contains "Procore_Lite_Gap_Closure_Prompts.md".
  4. Footer ends with "v1.1" and "2026-04-26" (or later).

Pass: all four points present. Append T26 row.
```

---

## T27 — PWA service-worker cache fix verification

```
Goal: confirm the workbox change (skipWaiting + clientsClaim) prevents the dark-landing flash.

Steps:
1. Run a fresh production build: npm run build && npm run preview. Note the preview URL.
2. In Chrome, with DevTools → Application → Service Workers, hard-reload once. Confirm a new SW is "activated and is running".
3. Without a hard reload, sign in. Confirm the post-login page is the white/blue Build OS dashboard, NOT a dark/gold landing.
4. From DevTools → Application → Cache Storage, list the cache names. Confirm cleanupOutdatedCaches removed any pre-fix caches (no caches with old workbox revision IDs).

Pass: SW activates immediately on update; no dark landing flash.
Append T27 row.
```

---

## T28 — G1.1 auto-tenant trigger smoke

```
Goal: confirm the new BEFORE INSERT trigger restores the pre-G1 client behavior — clients can insert without setting tenant_id.

Steps:
1. As adminA, in DevTools console, attempt the rfi_responses insert that would have failed pre-G1.1:
   await window.__supabase.from('rfi_responses').insert({ rfi_id: '<rfi_A1>', body: 'auto-fill smoke test', is_official: false }).select().single();
2. Confirm the response data has tenant_id = wsA (auto-filled).
3. Repeat for one of the daily_* children, e.g. daily_weather.

Pass: insert succeeds; tenant_id is populated by the trigger.
Append T28 row.
```

---

## T29 — Network/performance metrics roll-up

```
Goal: capture per-page network metrics for the protected surface.

For each route below, navigate fresh (close tab and reopen to clear in-memory cache; SW cache is OK):
  /dashboard
  /projects
  /projects/<id>
  /projects/<id>/financials/budget
  /projects/<id>/daily-log
  /portal/sub
  /portal/owner
  /settings/api/clients
  /settings/api/webhooks
  /reports/procore

For each, record from the Network tab:
  - Total requests
  - Total transferred bytes
  - DOMContentLoaded ms (window.performance.timing)
  - Load ms
  - Largest contentful paint (Performance panel)
  - Slowest single request (URL + ms)
  - Any 4xx / 5xx (URL + status)

Output: a 10-row table appended to the report.
Append T29 as a single row with overall pass/fail (FAIL if any page > 3s LCP or any 5xx).
```

---

## T30 — Caveats audit (claims-vs-reality pass)

```
Goal: identify discrepancies between what the spec promised vs what the build does.

Walk through each item and either confirm or flag:

1. G3 prompt requires literal RBAC keys 'portal:sub:access' / 'portal:owner:access'. Run:
   grep -r "portal:sub:access\|portal:owner:access" src/lib/rbac/
   Expect: zero matches today (the build maps to existing 'sub_portal' / 'owner_portal' Module + 'view' action). Flag as DEVIATION (intentional, documented in the component header).

2. G4 webhook_subscriptions.secret column is still readable as plaintext post-G4. Confirm:
   docker exec -i supabase_db_<ref> psql -U postgres -d postgres -c "\d webhook_subscriptions" | grep secret
   Flag if the secret column still exists with text type — slated for removal in a follow-up after webhook-dispatch switches to secret_hash for HMAC.

3. G2 trigger fires only on rfi_attachments. The same polymorphic-FK pattern may exist on other tables. Run:
   grep -r "polymorphic\|one_parent_chk" supabase/migrations/
   Flag any other table with a polymorphic FK that does NOT have its own boundary trigger.

4. G5 prompt names useDirectCosts.test.ts, useBudget.test.ts, useSchedule.test.ts. Confirm:
   ls src/hooks/__tests__/use{DirectCosts,Budget,Schedule}.test.ts
   Pass if all three exist.

5. The auto-tenant migration 20260428120300_g1_auto_tenant_triggers.sql is uncommitted. Confirm git status shows it as untracked.

6. The vite.config.ts SW change (skipWaiting/clientsClaim) is uncommitted. Confirm via git diff.

7. PWA manifest theme_color is "#1e2d4f" (dark navy) but the app palette is warm cream + sapphire. Flag as design inconsistency for the install prompt / splash screen.

8. PortalProtectedRoute auth-redirect target is /login per the prompt, but the rest of the app redirects unauth'd users to /auth (see ProtectedRoute.tsx). Confirm /login is mounted (or that it redirects to /auth). If neither, this is a real bug.

For each item: record as PASS / DEVIATION / BUG with one-sentence note. This becomes the "Caveats" section of the report.
```

---

## T31 — Compile the PDF

```
Once every test row is appended:

1. Render the report Markdown to HTML with a sane stylesheet (Pandoc or VS Code's "Markdown PDF" extension).
2. Page 1: the widget overview from T0. Pages 2..N: each test in order.
3. Append a final "Environment" page with: build commit, node version, supabase CLI version, browser user-agent, timestamp.
4. Save as Procore_Lite_Test_Run_<YYYYMMDD-HHMM>.pdf in the repo root.
5. Print the file size and the path back to me.

Done.
```

---

## Appendix A — Caveats already known (seed for T30)

These are flagged by me before testing starts. T30 should re-confirm each in the live build:

- **C1.** G3 RBAC keys renamed. Maps `portal:sub:access` → `sub_portal:view` (and same for owner). No literal-key registration. Documented in `PortalProtectedRoute.tsx` header. Severity: low.
- **C2.** `webhook_subscriptions.secret` plaintext column still exists. Slated for drop after `webhook-dispatch` switches to `secret_hash` for HMAC. Severity: medium.
- **C3.** New migration `20260428120300_g1_auto_tenant_triggers.sql` uncommitted — required for client-side inserts not to break post-G1. Severity: blocker until committed and shipped.
- **C4.** PWA fix in `vite.config.ts` uncommitted — without it, users keep seeing the dark-landing flash on soft reload. Severity: high.
- **C5.** PWA `manifest.theme_color` = `#1e2d4f` and `background_color` = `#0f1624` don't match the Build OS warm-cream + sapphire palette. Splash + install prompt look off-brand. Severity: low.
- **C6.** Two skipped Vitest cases in `useSpecifications.test.ts` — confirm they're intentional (`test.skip` is fine, `it.todo` is not).
- **C7.** PortalProtectedRoute redirects unauth'd users to `/login`, but the app's other guard (`ProtectedRoute`) uses `/auth`. Confirm `/login` either exists as a mounted route or redirects to `/auth`; otherwise this is a 404 trap.

---

## Appendix B — Widget snippet (HTML, drop into the PDF cover page)

```html
<table style="border-collapse:collapse; font-family:'DM Sans', sans-serif; width:680px;">
  <tr style="background:#1A1714; color:#FAF8F4;">
    <th colspan="5" style="padding:14px; text-align:left;">
      Procore Lite — Test Run <span id="run-ts"></span>
    </th>
  </tr>
  <tr style="background:#FAF8F4;">
    <th style="padding:8px;border:1px solid #E5E1D8;">Section</th>
    <th style="padding:8px;border:1px solid #E5E1D8;">Pass</th>
    <th style="padding:8px;border:1px solid #E5E1D8;">Fail</th>
    <th style="padding:8px;border:1px solid #E5E1D8;">Blocked</th>
    <th style="padding:8px;border:1px solid #E5E1D8;">Notes</th>
  </tr>
  <!-- one <tr> per section, populated by Claude during the run -->
</table>
```

---

*Run order: SETUP → T0 → T1…T29 → T30 → T31. Total ~31 prompts, ~50 individual test cells.*
