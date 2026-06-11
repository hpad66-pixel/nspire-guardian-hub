# CLAUDE.md — nspire-guardian-hub-staging

> Standing context for every Claude Code session in this repo.
> Read this before you touch code. Re-read it when a prompt conflicts with it.
    
---

## What this project is

**Procore Lite** — a multi-tenant construction-management SaaS built on top of the existing `nspire-guardian-hub-staging` application. Target users: general contractors, subcontractors, and project owners. Target market: production B2B SaaS (not internal tooling, not single-tenant).

The build is sequenced through four phases, each composed of numbered prompts that you will receive one at a time. Prompts are copy-pasted from `Procore_Lite_Lovable_Prompts.html` (a local artifact — the user will paste them into chat). Every prompt has six sections: **GOAL**, **TABLES**, **COMPONENTS**, **ROUTES**, **BUSINESS RULES**, **ACCEPTANCE TESTS**. Treat the prompt itself as the spec. Treat ACCEPTANCE TESTS as the contract.

---

## Stack

- **Frontend:** Vite · React 18 · TypeScript (strict mode) · shadcn/ui · Tailwind CSS
- **State/Data:** TanStack Query v5 · React Router v6 · react-hook-form · zod
- **Backend:** Supabase (Postgres + Row-Level Security + Storage + Edge Functions)
- **PDF/Export:** jspdf · html2canvas · SheetJS (xlsx)
- **Billing:** Stripe (Phase 1 prompt A6)
- **Auth:** Supabase Auth + SAML 2.0 SSO + SCIM 2.0 (Phase 1 prompt A7)
- **Testing:** Vitest (unit/hooks) · Playwright (e2e)
- **CI:** GitHub Actions (typecheck + tests + migration dry-run on every PR)

Do not introduce new libraries without explicit approval. If a prompt's requirement can be met with the stack above, use the stack above.

---

## Directory conventions

```
src/
  pages/
    projects/
      financial/       ← Phase 3 modules (prime contract, commitments, COs, budget…)
      field/           ← RFIs, submittals, punch, daily log, meetings
      schedule/
      safety/
    portal/
      sub/             ← Phase 4 subcontractor portal
      owner/           ← Phase 4 owner portal
    reports/
    dashboards/
    settings/
      api/             ← Phase 4 API client management
  components/
    ui/                ← shadcn primitives — DO NOT MODIFY
    financial/
    field/
    portal/
    workflow/          ← Ball-in-Court UI (A4)
    reports/
  hooks/
    __tests__/         ← Vitest unit tests colocated here
  lib/
    workflow/          ← Ball-in-Court engine service (A4)
    distribution/      ← Distribution Lists service (A3)
    rbac/              ← Permission template engine (A2)
    billing/           ← Stripe feature-gating (A6)
    pdf/               ← Shared PDF export helpers
supabase/
  migrations/          ← Numbered SQL files, never edit a merged migration
  functions/           ← Edge functions (oauth-token, webhook-dispatch, run-report, etc.)
  seed/                ← Demo data SQL (per-phase seed scripts)
e2e/                   ← Playwright specs, one file per prompt-id
```

- **Page components** are PascalCase and end in `Page.tsx`. URLs are kebab-case.
- **Hooks** are named `use<Resource>.ts` and return `{ data, isLoading, error, create, update, delete }`.
- **Migrations** are timestamped and descriptive: `20260501_prime_contract.sql`.

---

## Non-negotiable rules

These rules apply to every prompt. If a prompt conflicts, the prompt loses — flag it and ask.

### 1. Multi-tenant isolation is absolute

**Naming note:** in this codebase the SaaS tenant concept is `public.workspaces`. The table `public.tenants` is the *residential-leasing* table (occupants of rental units, unrelated). Every Procore Lite `tenant_id` column therefore references `workspaces(id)`, not `tenants(id)` — the prompts in `Procore_Lite_Lovable_Prompts.html` use `tenants(id)` in their DDL; translate to `workspaces(id)` on ingest.

Every user-data table has:
```sql
tenant_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE
```
…and an RLS policy (uses helper `public.current_tenant_id()` from A1):
```sql
CREATE POLICY <table>_tenant_isolation ON <table>
FOR ALL TO authenticated
USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());
```
No exceptions. Not for lookup tables that reference tenant data. Not for "read-only" tables. If it has anything tenant-scoped in it, it gets `tenant_id` + RLS.

### 2. The financial cascade is cost-code-keyed
Every row in the financial modules (prime contract SOV, commitments SOV, change orders, direct costs, budget lines) carries `cost_code_id UUID REFERENCES cost_codes(id)`. The Budget matrix view (D6) aggregates by `cost_code_id` — break the convention and Budget breaks.

### 3. Ball-in-Court is a service, not re-implemented per module
Every workflow-bearing module (RFIs, submittals, punch, pay apps, commitments, change orders) uses the A4 engine:
```ts
import { createWorkflowInstance, advanceWorkflow } from '@/lib/workflow'
```
Do not invent per-module state machines. If the prompt describes a new state flow, it configures the engine — it does not bypass it.

### 4. Distribution lists are shared
Every module that emails a named group pulls from the A3 `distribution_lists` table. No hard-coded recipient arrays. No per-module contact lists.

### 5. Permissions go through templates
Role checks use the A2 permission template engine:
```ts
if (!can(user, 'commitment:create', project)) throw new ForbiddenError()
```
No `if (user.role === 'pm')` anywhere.

### 6. Feature gating goes through Stripe plan
Plan-gated features use A6:
```ts
if (!canUseFeature(tenant, 'api_access')) throw new PlanLimitError()
```

### 7. Only touch files in COMPONENTS
When a prompt lists a `COMPONENTS:` block, those are the only files you create or modify. If a dependency forces a change elsewhere, flag it in the PR description — do not silently refactor adjacent code.

### 8. Polymorphic FKs need a tenant-boundary trigger
Any table that can reference one of N parent tables via nullable FKs (e.g. `rfi_attachments` referencing one of `documents | photos | drawing_markups`) must enforce same-tenant linkage with a `BEFORE INSERT OR UPDATE` trigger. RLS alone is not enough — RLS prevents reading the foreign row, but a malicious or buggy insert can still write a UUID belonging to another tenant. The trigger function:
- Looks up the parent row's `tenant_id`.
- Compares to `NEW.tenant_id`.
- Raises if they differ.
- Is `SECURITY DEFINER` with `SET search_path = public`.

Also enforce that exactly one of the polymorphic FK columns is non-null via a CHECK constraint or the same trigger.

### 9. Portals are role + plan gated, not just auth gated
The subcontractor portal (`/sub-portal/*`) and owner portal (`/owner-portal/*`) wrap their routes with `<PortalProtectedRoute role="..." feature="..." />` (`src/components/portal/PortalProtectedRoute.tsx`). The component checks (a) auth, (b) RBAC role for the active project via `can()`, and (c) plan feature via `canUseFeature()`. Plan-locked workspaces see an upgrade page, wrong-role users get redirected to `/dashboard` with a toast, unauthenticated users get redirected to `/login?next=...`. Never mount a portal route without this wrapper. **Path prefix note:** `/sub-portal/*` and `/owner-portal/*` are intentional — they avoid colliding with the legacy customer-facing `/portal/:slug` magic-link routes (`PortalLoginPage`), which catches anything under `/portal/*` and renders "Portal unavailable" if the slug doesn't match a portal row.

### 10. Secrets are revealed once, never stored
API keys, webhook signing secrets, OAuth client secrets, and any other generated credential follow the same pattern:
- Generated server-side in an edge function (e.g. `supabase/functions/api-key-mint/`).
- Plaintext returned to the client exactly once in the response body.
- Only the hash is persisted (`bcrypt` or `argon2id`) in a `*_hash` column.
- Revocation is non-destructive — set `revoked_at`, never `DELETE`.
- The UI shows the plaintext in a `RevealSecretOnceDialog`; reload and it's gone.

---

## Coding conventions

### Hooks
```ts
// src/hooks/useRfis.ts
export function useRfis(projectId: string) {
  const qc = useQueryClient()
  const list = useQuery({
    queryKey: ['rfis', projectId],
    queryFn: () => supabase.from('rfis').select('*').eq('project_id', projectId),
  })
  const create = useMutation({ /* … */ })
  return { ...list, create }
}
```
- `queryKey` always starts with the resource name, includes `projectId` when scoped, never includes `tenantId` (RLS handles that).
- Mutations use optimistic updates where the UX demands it; otherwise invalidate the query on settle.

### Forms
- `react-hook-form` with `zodResolver`. Schema lives in the same file as the form.
- No uncontrolled inputs. No `useState` for form fields.

### RLS policy naming
```
<table>_<scope>_<op>
```
Examples: `commitments_tenant_select`, `rfis_project_member_update`, `pay_apps_owner_portal_select`.

### Migrations
- One concern per migration file. Don't stuff "add table + alter other table + seed" into one migration.
- RLS policies live in the same migration as the `CREATE TABLE`.
- Never edit a migration that has been merged to `main`. Write a new one.

---

## Git workflow

- **One branch per prompt.** Branch name: `feature/<prompt-id>-<slug>`, e.g. `feature/A1-multi-tenant`, `feature/D4-change-orders`.
- **Conventional commits.** `feat(rfis): add RFI create flow` · `fix(budget): correct pending exposure join`.
- **PR title = prompt id + title.** E.g. `D2 Commitments (Subcontracts + POs)`.
- **PR description** has three sections: What (one sentence), Tests (list of new spec files), Out of Spec (anything touched beyond `COMPONENTS:`).
- **No direct pushes to `main`.**
- **Tag at phase boundaries:** `v0.1-phase1`, `v0.2-phase2`, `v0.3-phase3`, `v0.4-phase4`.

---

## Testing conventions

Every prompt ships tests. No exceptions.

- **Vitest unit tests** live in `src/hooks/__tests__/use<Resource>.test.ts`. Test the happy path, the validation path, and the permission path.
- **Playwright e2e specs** live in `e2e/<prompt-id>.spec.ts` — one file per prompt. Each `ACCEPTANCE TEST` bullet becomes a `test(...)` block.
- **Coverage gate:** 70% on `src/hooks/`. Lower on UI is fine; higher on `src/lib/workflow/` and the financial services is required (80%+).
- **Run before commit:** `npm run typecheck && npm run test` must pass.
- **Run before merge:** CI runs both + Playwright + `supabase db push --dry-run`.

---

## Build / run commands

```bash
npm run dev              # Vite dev server
npm run typecheck        # tsc --noEmit (must pass before commit)
npm run test             # Vitest
npm run test:watch       # Vitest watch mode
npm run test:e2e         # Playwright
npm run build            # production build
npm run lint             # ESLint

supabase start           # local Supabase
supabase db push         # apply migrations to dev project
supabase functions serve # local edge functions
```

Environment variables live in `.env.local` (gitignored). Reference `.env.example` for required keys.

---

## Build OS design tokens (UI)

**Source of truth:** `src/index.css`. The table below is just a reference — if it ever drifts from the CSS file, trust the CSS.

The app uses a warm cream light palette with blue + gold accents (the Build OS brand). NOT the "gold on obsidian" AURUM palette older versions of this doc claimed.

| Token / CSS var | Value | Use |
|-----------------|-------|-----|
| `--background` | `#FDFCF9` (warm cream) | Page background |
| `--foreground` | `#1A1714` (warm near-black) | Body text |
| `--card` | `#FAF8F4` | Card background |
| `--primary` | `#1A1714` | CTA buttons, active states |
| `--accent` | `#C4A35A` (warm gold) | Secondary accent, hover highlights |
| `--apas-sapphire` | `#1D6FE8` | Brand blue — "Start Free Trial" buttons, link text, gradient headings |
| `--apas-emerald` | `#10B981` | Success states |
| `--apas-amber` | `#F59E0B` | Warnings |
| `--apas-rose` | `#F43F5E` | Errors / overdue |
| `--muted-foreground` | `#878581` | Secondary text |

Use Tailwind utility classes (`bg-background`, `text-foreground`, `bg-primary`, `text-accent-foreground`, etc.) rather than hex values. The `--apas-*` variables are available as Tailwind arbitrary values (`bg-[var(--apas-sapphire)]`) when you need the brand blue for marketing / CTA work.

**Typography:**
- Display / headings: `Playfair Display` (weights 700, 900)
- Body / UI: `DM Sans` (weights 400, 500, 700)
- Code / monospace / data: `JetBrains Mono` (weights 400, 500, 700)

---

## Phase sign-off checklist

Before tagging a phase complete, every item below must be green. This is the rubric the audit uses.

**Foundation hygiene**
- [ ] Every new table has `tenant_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE`.
- [ ] Every new table has an RLS policy using `public.current_tenant_id()`.
- [ ] Polymorphic-FK tables have a `BEFORE INSERT OR UPDATE` tenant-boundary trigger.
- [ ] No migration references `public.tenants(id)` for SaaS tenancy — only `public.workspaces(id)`.

**Shared services**
- [ ] No hand-rolled state machines — all workflow modules call `createWorkflowInstance` / `advanceWorkflow`.
- [ ] No hardcoded recipient arrays — all email goes through `resolveDistribution()`.
- [ ] No `user.role === '...'` checks — all permission gates go through `can()`.
- [ ] All plan-gated features call `canUseFeature()`; non-passing tenants see the upgrade page, not a 403.
- [ ] All financial tables carry `cost_code_id` so the D6 Budget matrix aggregates correctly.

**Portals**
- [ ] Every `/portal/sub/*` and `/portal/owner/*` route is wrapped in `<PortalProtectedRoute>`.

**Secrets**
- [ ] No plaintext secret is persisted anywhere — only `*_hash` columns.
- [ ] Every secret-issuing flow uses an edge function and the once-only-reveal dialog.

**Routing**
- [ ] Every page in `src/pages/` is either mounted in `App.tsx` or is a sub-component used by a routed parent.
- [ ] No 404 routes pointing to missing components.

**Tests**
- [ ] One `e2e/<prompt-id>.spec.ts` per prompt, covering each ACCEPTANCE TEST bullet.
- [ ] Each `use<Resource>` hook has a Vitest file in `src/hooks/__tests__/` covering happy / validation / permission paths.
- [ ] `npm run test -- --coverage` reports ≥70% on `src/hooks/`, ≥80% on `src/lib/workflow/` and the financial services.

---

## When you finish a prompt

1. `npm run typecheck && npm run test` — must be green.
2. `git add -A && git commit -m "feat(<area>): <prompt-id> <title>"`.
3. Push branch, open PR, title = prompt id + title.
4. In PR description, call out anything modified outside `COMPONENTS:`.
5. Run `/review` on the PR.
6. When CI is green and review passes, merge to `main`.
7. At phase boundaries, tag: `git tag -a v0.X-phase<N> -m "Phase <N> complete"`.

---

## When a prompt conflicts with this file

Stop. Ask. Don't silently deviate.

This file wins over a prompt when:
- A prompt omits `tenant_id` or RLS on a new table
- A prompt invents a state machine instead of configuring the A4 engine
- A prompt hardcodes recipients instead of using A3 distribution lists
- A prompt skips tests

This file **loses** to a prompt when:
- A prompt introduces a new convention and explicitly calls it out (e.g., "this module uses a ledger pattern — document it in CLAUDE.md")

If the prompt wins, update CLAUDE.md in the same PR.

---

## Companion artifacts

- `Procore_Lite_Gap_Analysis.html` — Phase 1 deliverable, gap map
- `Procore_Lite_Module_Specs.html` — 29 PRD-style specs
- `Procore_Lite_Lovable_Prompts.html` — 30 copy-paste prompts (the source of all work)
- `Procore_Lite_ClaudeCode_Primer.md` — how to run those prompts through Claude Code
- `Procore_Lite_Gap_Closure_Prompts.md` — G-series gap-closure prompts (G1–G6) bringing the build from the Phase 4 audit score to 100/100

---

*Last updated: 2026-04-26 · v1.1 (added rules 8–10, phase sign-off checklist, G-series companion artifact)*
