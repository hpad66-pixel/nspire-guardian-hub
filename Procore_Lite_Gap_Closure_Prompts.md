# Procore Lite — G-Series Gap Closure Prompts

These six prompts close the gaps identified in the 2026-04-26 audit and take the build from **78/100 → 100/100**. Run them in order. Each prompt is fully self-contained and follows the standard six-section format (GOAL · TABLES · COMPONENTS · ROUTES · BUSINESS RULES · ACCEPTANCE TESTS).

| # | Prompt | Score impact |
|---|--------|--------------|
| G1 | Tenant isolation hardening (RFI + Daily Log children) | +7 (cross-cutting compliance) |
| G2 | RFI attachment cross-tenant FK validator | +2 (data integrity) |
| G3 | Portal authentication middleware | +3 (security) |
| G4 | API Clients + Webhooks functional implementation | +5 (functionality) |
| G5 | Hook unit-test backfill (coverage gate) | +4 (tests) |
| G6 | CLAUDE.md update — G-series conventions | +1 (documentation) |
| | **Total** | **+22 → 100/100** |

Branch naming: `feature/G1-tenant-isolation`, `feature/G2-rfi-attachment-fk`, etc.

---

## Prompt G1 — Tenant Isolation Hardening (RFI + Daily Log child tables)

**GOAL**

Patch the multi-tenant isolation gap in the RFI and Daily Log modules. The audit found that several child tables — `rfi_responses`, `rfi_attachments`, and the Daily Log entry sub-tables — were created in earlier migrations without `tenant_id` columns or RLS policies. This violates Rule 1 of CLAUDE.md (every user-data table must have `tenant_id` + RLS using `public.current_tenant_id()`). Write a NEW migration (do NOT edit the merged ones) that adds the column, backfills it from parent rows, marks it `NOT NULL`, and installs the standard RLS policy.

**TABLES** (alter, not create — verify each exists in the corresponding C1 / C4 migration before referencing)

- `public.rfi_responses` — add `tenant_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE`
- `public.rfi_attachments` — same
- `public.daily_log_labor` — same
- `public.daily_log_equipment` — same
- `public.daily_log_materials` — same
- `public.daily_log_visitors` — same
- `public.daily_log_deliveries` — same
- `public.daily_log_safety_incidents` — same
- `public.daily_log_quality_observations` — same

**COMPONENTS**

- `supabase/migrations/<timestamp>_g1_tenant_isolation_rfi_daily_log.sql`

**ROUTES**

None.

**BUSINESS RULES**

- For each table: `ALTER TABLE ... ADD COLUMN tenant_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;`
- Backfill from the parent row: `UPDATE public.rfi_responses r SET tenant_id = (SELECT tenant_id FROM public.rfis WHERE id = r.rfi_id);` and equivalent joins for the daily log children (parent is `public.daily_logs`).
- After backfill: `ALTER TABLE ... ALTER COLUMN tenant_id SET NOT NULL;`
- Drop any pre-existing permissive policies that don't enforce tenant isolation, then create:
  ```sql
  CREATE POLICY <table>_tenant_isolation ON <table>
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());
  ```
- Add `CREATE INDEX <table>_tenant_id_idx ON <table>(tenant_id);` for each.
- The migration must be idempotent — wrap in `DO $$ BEGIN ... END $$;` blocks that check `information_schema.columns` so re-running on dev doesn't error.

**ACCEPTANCE TESTS** (`e2e/G1.spec.ts`)

- A user from tenant A cannot SELECT, INSERT, UPDATE, or DELETE rows in any patched table belonging to tenant B (one test per table × 4 ops).
- An RFI response created by tenant A is invisible to tenant B even when tenant B knows the RFI ID.
- A Daily Log labor entry created by tenant A is invisible to tenant B.
- The super admin can see all rows across tenants.
- `supabase db push --dry-run` succeeds against a fresh DB.

---

## Prompt G2 — RFI Attachment Polymorphic FK Tenant Boundary

**GOAL**

Close the polymorphic-FK tenant boundary on `rfi_attachments`. The table can reference one of three parents (`documents`, `photos`, `drawing_markups`) and currently has no constraint preventing cross-tenant references — a tenant A RFI could in principle link to a tenant B document. RLS prevents reading the foreign row but doesn't prevent the insert. Install a `BEFORE INSERT OR UPDATE` trigger that validates parent-tenant alignment, plus a CHECK constraint enforcing exactly-one-of-N nullable FKs.

**TABLES** (alter only)

- `public.rfi_attachments`

**COMPONENTS**

- `supabase/migrations/<timestamp>_g2_rfi_attachment_tenant_boundary.sql`

**ROUTES**

None.

**BUSINESS RULES**

- Add CHECK constraint (or replace existing) so that exactly one of `document_id`, `photo_id`, `drawing_markup_id` is non-null:
  ```sql
  ALTER TABLE public.rfi_attachments ADD CONSTRAINT rfi_attachments_one_parent_chk
    CHECK ((document_id IS NOT NULL)::int + (photo_id IS NOT NULL)::int + (drawing_markup_id IS NOT NULL)::int = 1);
  ```
- Create function `public.check_rfi_attachment_tenant()`:
  - `SECURITY DEFINER`, `SET search_path = public`.
  - Looks up the parent record's `tenant_id` based on whichever FK column is set.
  - Raises `EXCEPTION 'rfi_attachment tenant mismatch: parent tenant=% attachment tenant=%'` if they differ.
  - Returns NEW.
- Attach as `BEFORE INSERT OR UPDATE` trigger on `public.rfi_attachments`.
- Function and trigger must be re-runnable (use `CREATE OR REPLACE FUNCTION` and `DROP TRIGGER IF EXISTS`).

**ACCEPTANCE TESTS** (`e2e/G2.spec.ts`)

- Inserting an `rfi_attachment` referencing a document in a different tenant raises and is rejected.
- Inserting an `rfi_attachment` referencing a document in the same tenant succeeds.
- Updating an existing `rfi_attachment` to point to a different-tenant document raises.
- Inserting with all three FK columns null violates the CHECK constraint.
- Inserting with two FK columns set violates the CHECK constraint.
- Same tests pass for `photo_id` and `drawing_markup_id`.

---

## Prompt G3 — Portal Authentication Middleware

**GOAL**

Add role-aware route protection to the subcontractor and owner portals. Today, `/portal/sub/*` and `/portal/owner/*` rely only on Supabase auth — a logged-in user with the wrong role can browse another role's portal. Wrap these routes with a `PortalProtectedRoute` component that enforces (1) auth, (2) the correct portal role for the current project via `can()`, and (3) the workspace plan has the matching feature enabled via `canUseFeature()`.

**TABLES**

None (no schema change).

**COMPONENTS**

- `src/components/portal/PortalProtectedRoute.tsx`
- `src/components/portal/__tests__/PortalProtectedRoute.test.tsx`
- `src/components/portal/UpgradeRequired.tsx` (if it doesn't already exist; otherwise reuse)
- `src/lib/rbac/permissions.ts` — register two new permission keys: `portal:sub:access`, `portal:owner:access`
- `src/App.tsx` — modify ONLY the route mounts under `/portal/sub` and `/portal/owner` to wrap them in `<PortalProtectedRoute>`

**ROUTES** (no new routes, only wrap existing)

- `/portal/sub/*` → wrapped with `<PortalProtectedRoute role="subcontractor" feature="sub_portal" />`
- `/portal/owner/*` → wrapped with `<PortalProtectedRoute role="owner" feature="owner_portal" />`

**BUSINESS RULES**

- Component signature: `<PortalProtectedRoute role={'subcontractor' | 'owner'} feature={'sub_portal' | 'owner_portal'} />` — renders an `<Outlet />` when all checks pass.
- Auth check: if no session, redirect to `/login?next=<encoded current path>`.
- Role check: call `can(user, 'portal:sub:access' | 'portal:owner:access', currentProject)`. If false, redirect to `/dashboard` and call `toast.error("You don't have access to that portal.")`.
- Plan check: call `canUseFeature(workspace, feature)`. If false, render `<UpgradeRequired feature={feature} />` (do NOT redirect — show the upgrade page in place so the URL is preserved for the eventual upgrade-and-return flow).
- The two new permission keys are registered in the RBAC template registry with default mappings: `subcontractor` role grants `portal:sub:access` on projects they're a member of; `owner` role grants `portal:owner:access` on owner projects.

**ACCEPTANCE TESTS** (`e2e/G3.spec.ts`)

- Unauthenticated user hitting `/portal/sub/commitments` is redirected to `/login?next=/portal/sub/commitments`.
- A logged-in user with role `pm` hitting `/portal/sub/commitments` is redirected to `/dashboard` and the error toast appears.
- A user with role `subcontractor` on a workspace whose plan does NOT include `sub_portal` sees the upgrade page, and the URL stays at `/portal/sub/commitments`.
- A user with role `subcontractor` on a workspace whose plan includes `sub_portal` lands on the sub portal page.
- Same matrix for the owner portal.

---

## Prompt G4 — API Clients + Webhooks Functional Implementation

**GOAL**

Finish the F3 Public API + Webhooks management UI. The pages render but have no mutation hooks — buttons are inert. Wire full CRUD: API client create/rotate/revoke (with secret shown once), webhook create/edit/delete with signing-secret rotation, and a delivery-log viewer with manual redelivery.

**TABLES** (already created in `20260421200004` — verify column shape, add only if missing)

- `public.api_clients (id, tenant_id, name, key_id, key_hash, scopes jsonb, last_used_at, revoked_at, created_at, created_by)`
- `public.webhooks (id, tenant_id, url, event_types text[], signing_secret_hash, active bool, created_at)`
- `public.webhook_deliveries (id, tenant_id, webhook_id, event_type, payload jsonb, status_code int, response_body text, attempted_at, succeeded_at)`

**COMPONENTS**

- `src/hooks/useApiClients.ts`
- `src/hooks/__tests__/useApiClients.test.ts`
- `src/hooks/useWebhooks.ts`
- `src/hooks/__tests__/useWebhooks.test.ts`
- `src/hooks/useWebhookDeliveries.ts`
- `src/hooks/__tests__/useWebhookDeliveries.test.ts`
- `src/pages/settings/api/ApiClientsPage.tsx` — replace placeholder logic
- `src/pages/settings/api/WebhooksPage.tsx` — replace placeholder logic
- `src/pages/settings/api/WebhookDeliveriesPage.tsx` — new page
- `src/components/settings/api/CreateApiClientDialog.tsx`
- `src/components/settings/api/RevealSecretOnceDialog.tsx`
- `src/components/settings/api/CreateWebhookDialog.tsx`
- `src/components/settings/api/RotateSecretDialog.tsx`
- `supabase/functions/api-key-mint/index.ts` — issues plaintext key once, stores hash
- `supabase/functions/webhook-secret-rotate/index.ts` — rotates and returns plaintext once
- `supabase/functions/webhook-redeliver/index.ts` — calls existing `webhook-dispatch` for a stored payload

**ROUTES**

- `/settings/api/clients` — already mounted, replace handler
- `/settings/api/webhooks` — already mounted, replace handler
- `/settings/api/webhooks/:id/deliveries` — new (mount in `App.tsx`)

**BUSINESS RULES**

- API client secret format: `pl_<32 random base62 chars>`. Generated server-side in `api-key-mint`. Plaintext returned in the response body exactly once and never persisted; only `key_hash` (argon2id, time=2, memory=64MB, parallelism=1) is stored.
- Revoke is non-destructive — set `revoked_at`, do not delete. UI displays revoked clients as disabled rows.
- Webhook signing secret is `whsec_<32 base62 chars>`, same once-only-reveal pattern.
- Plan gate: if `canUseFeature(workspace, 'api_access')` is false, render `<UpgradeRequired feature="api_access" />` instead of the page body.
- Permission gate: `can(user, 'api_client:manage', workspace)` — typically restricted to workspace admins. Register the permission in the RBAC template if absent.
- Webhook delivery log: paginated, last 100 attempts per webhook by default. Each row shows status code, latency (`succeeded_at - attempted_at`), event type, and a "Redeliver" button calling `webhook-redeliver` with the stored payload.
- All hooks follow the standard pattern: `queryKey: ['api-clients', workspaceId]`, optimistic updates on revoke, full invalidation on create/rotate.

**ACCEPTANCE TESTS** (`e2e/G4.spec.ts`)

- Admin creates an API client. Plaintext key is shown once in the `RevealSecretOnceDialog`. Closing and reopening the page does not re-show it; only the `key_id` prefix is visible.
- Non-admin user attempting create sees a 403 / disabled button (depending on UI).
- Workspace on Starter plan (no `api_access`) sees the upgrade page instead of the form.
- Admin creates a webhook with `event_types: ['rfi.created', 'submittal.responded']` and the signing secret is revealed once.
- Admin rotates the webhook signing secret; new plaintext is shown once; old hash is overwritten.
- Admin views the delivery log for a webhook with a failed delivery and clicks "Redeliver"; the `webhook-redeliver` edge function is invoked and a new delivery row is created.
- Revoking an API client sets `revoked_at`; the row remains visible but disabled and any subsequent API call with that key returns 401 (covered by an integration test).
- All RLS policies on `api_clients`, `webhooks`, `webhook_deliveries` enforce tenant isolation (regression test).

---

## Prompt G5 — Hook Unit Test Backfill (Coverage Gate)

**GOAL**

Backfill Vitest unit tests for the major Phase 2 and Phase 3 resource hooks so the `src/hooks/` coverage gate (≥70% per CLAUDE.md) clears in CI. Today only 7 of 100+ hook files have tests — `npm run test` passes but the coverage gate will fail. This prompt adds tests only — no source hooks are modified.

**TABLES**

None.

**COMPONENTS** (tests only — do not touch source hook files)

- `src/test/fixtures/supabase.ts` (create if missing — mock `supabase` client)
- `src/test/utils.tsx` (create if missing — `renderWithQueryClient` helper)
- `src/hooks/__tests__/useCommitments.test.ts`
- `src/hooks/__tests__/useChangeOrders.test.ts`
- `src/hooks/__tests__/useChangeEvents.test.ts`
- `src/hooks/__tests__/useDirectCosts.test.ts`
- `src/hooks/__tests__/useBudget.test.ts`
- `src/hooks/__tests__/usePunchItems.test.ts`
- `src/hooks/__tests__/useSubmittals.test.ts`
- `src/hooks/__tests__/useDailyLog.test.ts`
- `src/hooks/__tests__/useMeetings.test.ts`
- `src/hooks/__tests__/useSchedule.test.ts`
- `src/hooks/__tests__/useIncidents.test.ts`
- `src/hooks/__tests__/useDrawings.test.ts`
- `src/hooks/__tests__/useSpecifications.test.ts`
- `src/hooks/__tests__/usePhotos.test.ts`
- `src/hooks/__tests__/useDocuments.test.ts`

**ROUTES**

None.

**BUSINESS RULES**

- Each test file covers, at minimum, three paths:
  1. **Happy path** — `list` returns data, `create` mutates and invalidates the query.
  2. **Validation path** — `create` called with a payload that fails the zod schema; mutation rejects, no Supabase call made.
  3. **Permission path** — `can()` returns false; mutation rejects with `ForbiddenError` and no Supabase call made.
- Mock `@/lib/supabase` via `vi.mock` in the test file or globally in the fixture.
- Mock `@/lib/rbac` so `can` can be toggled per test.
- Use `renderHook` from `@testing-library/react` wrapped in the `QueryClientProvider` from `src/test/utils.tsx`.
- Each test file must run in under 500ms (no live network).
- No source hook in `src/hooks/` may be modified — diff in `src/hooks/` shows only new files in `__tests__/`.

**ACCEPTANCE TESTS**

- `npm run test` passes with all new files.
- `npm run test -- --coverage` reports ≥70% statement coverage for `src/hooks/`.
- `npm run typecheck` passes — test files are strictly typed.
- CI's coverage gate (set per CLAUDE.md) clears on the PR.

---

## Prompt G6 — CLAUDE.md Update (G-Series Conventions)

**GOAL**

Update `CLAUDE.md` to document the new conventions introduced by G1–G5: polymorphic-FK tenant-boundary triggers, portal route protection, the once-only-reveal secret pattern, and the phase sign-off checklist. Also update the companion-artifacts list.

> **Note:** This update has already been applied during the audit-response session. This prompt exists as a record so that if future work re-runs the G-series from scratch, the documentation step is captured. Verify the rules and checklist are present before closing the PR.

**COMPONENTS**

- `/Users/apas/Documents/GitHub/nspire-guardian-hub/CLAUDE.md` — update only

**ACCEPTANCE TESTS**

- CLAUDE.md "Non-negotiable rules" section contains:
  - Rule 8: Polymorphic FKs need a tenant-boundary trigger.
  - Rule 9: Portals are role + plan gated, not just auth gated.
  - Rule 10: Secrets are revealed once, never stored.
- CLAUDE.md contains a "Phase sign-off checklist" section with foundation hygiene, shared services, portals, secrets, routing, and tests subsections.
- CLAUDE.md "Companion artifacts" list includes `Procore_Lite_Gap_Closure_Prompts.md`.
- CLAUDE.md footer is bumped to v1.1 with the 2026-04-26 date.

---

*Generated 2026-04-26 in response to the Phase 4 audit. Run G1 → G2 → G3 → G4 → G5 → G6 in order; tag the repo `v0.5-100of100` after G6 merges.*
