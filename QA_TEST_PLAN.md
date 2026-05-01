# QA Test Plan — actual deployed routes

This plan reflects the routes that are actually mounted in `src/App.tsx`
as of the post-G-series push. Previous QA runs failed on routes from
the aspirational spec that were never deployed; this plan only lists
URLs that resolve.

Paste the prompt block below into Claude in Chrome.

---

```
You are doing a complete end-to-end QA pass on the Build OS / nspire-
guardian-hub application as a super admin user. Exercise every deployed
module, document each step with a screenshot, and produce a final
PASS/FAIL matrix.

==============================================================
ENVIRONMENT
==============================================================
BASE_URL:      <PASTE YOUR APP URL>
PROJECT_ID:    <PASTE qa-test-project's UUID>
USER:          hardeep@apas.ai (super admin)
WEBHOOK_SITE:  <PASTE A FRESH webhook.site URL>

==============================================================
RULES
==============================================================
1. Take a labeled screenshot at every numbered step.
   Filename: <section>-<step>-<outcome>.png
2. If a step deviates, mark FAIL with one-line reason and KEEP GOING.
3. Anything you create must use prefix `qa-` for cleanup.
4. Capture the full text of any unexpected error toast or console error.
5. After each section, write: "Section N summary: X PASS / Y FAIL".
6. At the end, output one markdown table:
   | Section | # | Case | Result | Notes | Screenshot |
   plus three categorized fail lists (CRITICAL / MAJOR / MINOR).

==============================================================
SECTION 0 -- AUTH SURFACE
==============================================================
0.1 /auth as guest renders sign-in form
0.2 /dashboard as guest -> redirect to /auth
0.3 Wrong-password -> inline error, no redirect
0.4 Sign in as hardeep@apas.ai -> /dashboard
0.5 Sign-out -> /dashboard bounces to /auth
0.6 Sign back in for the rest of the run

==============================================================
SECTION 1 -- LEGACY SURFACE (smoke only)
==============================================================
For each path, confirm the page renders without console errors:

  /properties           /units                /assets
  /issues               /work-orders          /documents
  /people               /organizations        /messages
  /reports              /occupancy            /qr-scanner
  /training             /contacts             /voice-agent
  /inspections          /permits              /portals
  /credentials          /safety               /equipment

NOTE: do NOT test /workorders (wrong path), /qr (wrong path),
/mailbox (renamed to /inbox), /crm/contacts (renamed to /contacts).
These were spec typos in the previous test plan.

==============================================================
SECTION 2 -- ADMIN / SETTINGS (Phase 1)
==============================================================
2.1 /admin/permission-templates -- list of system templates renders
2.2 /admin/permission-templates/<id> -- detail page (click any row)
2.3 /settings/distribution-lists -- create qa-distlist-1 with 2 members
2.4 /admin/workflows -- module/version dropdowns + steps list
2.5 /admin/cost-codes -- "CSI MasterFormat 2018" library shown
2.6 /admin/cost-codes/editor -- inline editor with rows
2.7 /admin/billing -- shows Pro plan card (NOT "No active subscription")
2.8 /pricing -- public page with three tiers
2.9 /admin/sso -- SAML 2.0 SSO config screen
2.10 /admin/scim -- SCIM provisioning screen
2.11 /admin/registry -- feature registry
2.12 /admin/schools -- school management

==============================================================
SECTION 3 -- PROJECT FIELD MODULES (Phase 2)
==============================================================
Use PROJECT_ID throughout (the qa-test-project seeded earlier).

3.1  /projects -- ProjectsDashboard renders, qa-test-project listed
3.2  /projects/<id> -- project detail page renders
3.3  /projects/<id>/directory
3.4  /projects/<id>/drawings
3.5  /projects/<id>/specifications
3.6  /projects/<id>/photos -- upload qa-photo.png
3.7  /projects/<id>/documents -- upload qa-doc.pdf
3.8  /projects/<id>/transmittals
3.9  /projects/<id>/punch -- create qa-punch-1
3.10 /projects/<id>/daily-log -- today's report + manpower row
3.11 /projects/<id>/meetings -- create qa-meeting-1
3.12 /projects/<id>/meetings/templates
3.13 /projects/<id>/schedule
3.14 /projects/<id>/incidents -- create qa-incident-1
3.15 /projects/<id>/cost-codes
3.16 /projects/<id>/submittals/packages -- create qa-package-1
3.17 /projects/<id>/submittals/register

NOTE: there is no top-level /rfis, /submittals, etc. -- all field
modules are project-scoped. RFIs live in the registers under
/projects/<id>/submittals/register etc., or via project navigation.

==============================================================
SECTION 4 -- FINANCIAL CASCADE (Phase 3)
==============================================================
All financial routes are project-scoped under
/projects/<id>/financials/*. Pick one cost_code_id (from the seeded
CSI MasterFormat library) and reuse it in 4.2 / 4.3 / 4.5.

4.1 /projects/<id>/financials/prime-contract -- editor + SOV table
4.2 /projects/<id>/financials/commitments -- create qa-commit-1 (subcontract, 2 SOV lines)
4.3 /projects/<id>/financials/change-events -- create qa-ce-1 ($5000) -> Promote PCO -> OCO
4.4 /projects/<id>/financials/change-orders -- new OCO appears + execute it
4.5 /projects/<id>/financials/direct-costs -- create qa-dc-1
4.6 /projects/<id>/financials/budget -- matrix row for the cost code shows:
       committed_cost > 0
       executed_cco   > 0
       direct_cost    > 0
    Click a cell -- drill-down lists source rows.
4.7 /projects/<id>/financials/commitments/<commitmentId> -- detail page
4.8 /projects/<id>/financials/change-events/<eventId> -- detail page
4.9 /projects/<id>/financials/cos/<coId> -- detail page

==============================================================
SECTION 5 -- REPORTS / DASHBOARDS / API DOCS (Phase 4)
==============================================================
5.1 /reports/procore -- template list
5.2 /reports/new -- builder loads (NOTE: known Radix Select.Item
    crash bug logged separately; if it crashes, screenshot and FAIL)
5.3 /dashboards/procore -- dashboard list
5.4 /dashboards/<id> -- skip if no presets seeded
5.5 /developer/api -- public API docs (Redoc)

==============================================================
SECTION 6 -- PORTAL ACCESS (G3) -- new route prefixes
==============================================================
NOTE: the portals are at /sub-portal/* and /owner-portal/*. The old
/portal/sub and /portal/owner paths conflict with the legacy
customer-portal slug system and must NOT be used.

6.1 /sub-portal -- subcontractor dashboard renders for super admin
6.2 /sub-portal/commitments
6.3 /sub-portal/rfis
6.4 /sub-portal/submittals
6.5 /owner-portal -- owner dashboard
6.6 /owner-portal/contract
6.7 /owner-portal/schedule
6.8 /owner-portal/reports

For each: confirm the page actually renders (no "Portal unavailable"
fallback, no infinite spinner). Super admin should have access to
both portals because the can() function has an OR is_super_admin()
clause and is_super_admin() now reads from app_metadata.

==============================================================
SECTION 7 -- API CLIENT MINT (CRITICAL)
==============================================================
7.1 /settings/api/clients -- header "API Clients" + "Create client" button
    visible (the inline form was replaced with a dialog)
7.2 Click "Create client" -> dialog opens
    Name = qa-apikey-1
    Scopes = [read:projects, read:rfis]
    Click "Create client" in the dialog
7.3 RevealSecretOnceDialog appears with:
    - client_id starting with `pl_`
    - client_secret starting with `pl_`
    - copy-to-clipboard button
    - "shown only once" warning
    Two screenshots: dialog open + after copy.
7.4 Close the dialog. Reload the page. Plaintext is NOT redisplayed;
    only the client_id prefix shows in the row list.
7.5 DevTools -> Application -> IndexedDB / localStorage. Plaintext NOT cached.
7.6 Revoke qa-apikey-1. Row stays visible but disabled; revoked_at
    timestamp appears.

==============================================================
SECTION 8 -- WEBHOOK FLOW (CRITICAL)
==============================================================
8.1 /settings/api/webhooks -- header "Webhooks" + "Add webhook" button
8.2 Click "Add webhook" -> dialog opens
    URL = WEBHOOK_SITE (your webhook.site URL)
    Events = [rfi.created, rfi.responded]
    Name = qa-webhook-1
    Click "Create webhook"
8.3 Row appears in the list. Webhook signing secret is NOT shown
    inline (it was generated client-side at creation; the rotate
    flow below proves the once-only-reveal pattern).
8.4 In a separate browser tab, trigger an RFI event in
    qa-test-project. Within 30 seconds webhook.site shows a POST
    with the rfi.created or rfi.responded payload + an
    `x-signature` header.
8.5 Click "Deliveries" on the webhook row -> navigates to
    /settings/api/webhooks/<id>/deliveries. The log shows the
    delivery row with status 200 + latency in ms.
8.6 Click "Redeliver". A new delivery row appears AND webhook.site
    receives a second hit.
8.7 Back on /settings/api/webhooks, click the rotate-key icon on
    qa-webhook-1. Confirm:
    - confirmation alert dialog appears
    - on confirm, RevealSecretOnceDialog shows new whsec_<32> secret
8.8 Reload the page; the new secret is NOT redisplayed.

==============================================================
SECTION 9 -- (skipped this run -- requires non-super-admin user)
==============================================================
Portal role-gate matrix and plan-gate matrix require a workspace
on the Starter plan and a non-super-admin user. Tracked separately
for the next QA pass.

==============================================================
CLEANUP
==============================================================
Leave all qa-* data in place. SQL DELETE will clean up after.

==============================================================
FINAL OUTPUT
==============================================================
## QA Run -- <date>
Environment: <BASE_URL>
User: hardeep@apas.ai (super admin)
Total: <pass> PASS / <fail> FAIL

### Detailed results
| Section | Step | Case | Result | Notes | Screenshot |

### CRITICAL FAILS (Sections 7, 8)
- ...

### MAJOR FAILS (Sections 0, 2, 3, 4, 5, 6)
- ...

### MINOR / cosmetic (Section 1)
- ...

### Sign-off
If CRITICAL FAILS == 0 AND MAJOR FAILS == 0:
  "App functions as intended for super-admin scope. Cleared."
Otherwise:
  "App has <N> blocking issues. NOT cleared."

Begin Section 0 now.
```

---

## What changed from the previous test plan

| Previous path | Corrected path |
|---|---|
| `/workorders` | `/work-orders` |
| `/qr` | `/qr-scanner` |
| `/mailbox` | `/inbox` |
| `/crm/contacts` | `/contacts` |
| `/settings/distribution` | `/settings/distribution-lists` |
| `/financials/*` (global) | `/projects/:projectId/financials/*` |
| `/portal/sub/*` | `/sub-portal/*` |
| `/portal/owner/*` | `/owner-portal/*` |
| RFIs / submittals / punch / daily-log / meetings / schedule / incidents at top level | All under `/projects/:projectId/` |

## Why the path renames

The G3 portals were originally mounted at `/portal/sub/*` and
`/portal/owner/*`, which collided with the legacy customer-facing
`/portal/:slug` magic-link login route. React Router matched the
slug route first, so `<PortalLoginPage>` rendered "Portal unavailable"
for every G3 portal request. Renaming to `/sub-portal/*` and
`/owner-portal/*` unblocks the G3 routes without breaking the
existing customer portal URLs.

CLAUDE.md Rule 9 was updated in the same patch.
