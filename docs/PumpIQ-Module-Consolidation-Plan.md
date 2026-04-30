# PumpIQ Module Consolidation & Feature Registry — Execution Plan

**Owner:** Hardeep Anand (CEO, APAS.AI)
**Status:** Ready to execute
**Date:** 2026-04-17
**Target executor:** Claude Code (bulk transformation) + Lovable (UI polish)
**Codebase:** `ghost-mirror-clone-Staging` (PumpIQ / SmartCover++ / RegOS)

---

## 1. Why this plan exists

PumpIQ currently ships with 10 top-level modules and 232 routes. Roughly 40% of those routes are genuine LIVE product (what keeps Opa-Locka running), 30% are promising but unfinished (PREVIEW), and 30% are exploration, dictionary, internal scratchpads, or dead ends (LAB-candidates).

A visitor, a utility buyer, or a new engineer cannot tell which is which. That is the problem. It makes the product look unfocused to the outside world and makes the builder (Hardeep) lose signal on what to ship next.

This plan does three things:

1. Defines a five-state lifecycle for every route and module.
2. Introduces a single source of truth — the `feature_registry` table and `/admin/registry` page — that the builder can **see**, filter, and act on.
3. Collapses the 10-module IA into a 5-module LIVE surface with a visible `/lab/*` namespace for everything else. **No code is deleted.**

**Guiding principle:** For a builder, the only archive that counts is the one you can see.

---

## 2. The five lifecycle states

Every route, page, module, and edge function gets exactly one state.

| State | Visible to | Meaning | Rules |
|-------|-----------|---------|-------|
| **LIVE** | All users | Production-grade. Opa-Locka uses it or could use it today. | Must have: real data, tests, error boundaries, empty states, loading states, analytics event. |
| **PREVIEW** | Paying customers + APAS staff | Functional but not hardened. Visible with a "Preview" badge. | Must have: real data (no mocks), basic error handling. Feature flag controls per-tenant rollout. |
| **LAB** | APAS staff only (admin role) | Works but experimental. Lives under `/lab/*`. | Not shown in main nav. Reachable only from `/admin/registry` or direct URL. |
| **ARCHIVED** | APAS staff only, registry-visible | Code retained, route disabled. | Route returns 404 to non-admins. Entry remains in registry with reason + archive date. |
| **DEPRECATED** | No one, registry-visible | Scheduled for deletion. | Annotated in registry with deletion date (minimum 90 days out). |

Transitions always go through the registry — there is no other way to change a feature's state.

---

## 3. Target module architecture (from 10 → 5 LIVE)

### LIVE modules (5)

| Module | Absorbs | Why it stays | Opa-Locka evidence |
|--------|---------|--------------|--------------------|
| **Monitor** | — | Real-time signals from pumps, wet wells, SmartCover nodes, weather, SSO detection | Station dashboards, alarm feed, live map |
| **Intelligence** | Analytics + parts of Knowledge | ML anomaly, SSO prediction, pump curve, graph-RAG, station chat | Chat assistant, predictions, correlations |
| **Maintain** | — | Work orders, asset ledger, inspections, PM schedules | Daily ops workflow |
| **Compliance** | Chapter 24 pieces from Knowledge | Regulatory corpus, consent-decree evidence pack, NPDES/MS4 artifacts | DERM audits, consent-order response |
| **Admin** | — | Users, tenants, vendor credentials, feature registry, audit log | Multi-tenant control plane |

### LAB modules (moved to `/lab/*`, retained but hidden)

| Original module | New path | Reason | Promote-to-LIVE criteria |
|-----------------|----------|--------|--------------------------|
| **Knowledge** (non-compliance portions) | `/lab/knowledge` | Educational content, not ops-critical | A utility customer asks for it by name |
| **Dictionary** | `/lab/dictionary` | WAM-ONTO browsing tool, internal value | Graph-RAG depends on it in production |
| **Network** | `/lab/network` | Graph visualization, exploratory | Used in 3 consecutive customer demos |
| **Finance** | `/lab/finance` | kWh/demand-response, not billed to Opa-Locka | First utility signs a finance-module SOW |

### What does not move

`Admin` stays at `/admin/*` (not `/lab/`). The Feature Registry lives at `/admin/registry`.

---

## 4. The `feature_registry` table

Single Supabase table, RLS-gated to admin role. This is the source of truth.

```sql
create table public.feature_registry (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,                       -- e.g. "monitor.station-dashboard"
  kind text not null check (kind in
    ('module','route','page','edge_function','integration','experiment')),
  display_name text not null,
  module text not null,                            -- target module (Monitor, Intelligence, ...)
  path text,                                       -- route path if applicable, e.g. "/monitor/stations"
  lifecycle text not null check (lifecycle in
    ('LIVE','PREVIEW','LAB','ARCHIVED','DEPRECATED')),
  visibility text not null check (visibility in
    ('public','tenant','admin')) default 'public',
  owner text,                                      -- github handle or team
  description text,
  rationale text,                                  -- why this lifecycle state
  depends_on text[],                               -- other slugs this depends on
  last_verified_at timestamptz,
  verified_by uuid references auth.users(id),
  opa_locka_in_use boolean default false,          -- does the one paying customer use it?
  analytics_event text,                            -- name of the analytics event if LIVE
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on public.feature_registry (lifecycle);
create index on public.feature_registry (module);
create index on public.feature_registry (kind);

alter table public.feature_registry enable row level security;

create policy "registry_admin_read"
  on public.feature_registry for select
  using (auth.jwt() ->> 'role' = 'admin');

create policy "registry_admin_write"
  on public.feature_registry for all
  using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');
```

An audit companion table `feature_registry_events` records every lifecycle change (old state, new state, actor, reason, timestamp).

---

## 5. `useFeatureFlag` refactor

Today the hook reads from a local config. Tomorrow it reads from the registry, cached per session.

**Behavior:**

```ts
useFeatureFlag(slug)
  → { enabled: boolean, lifecycle: Lifecycle, visibility: Visibility, reason?: string }
```

**Rules enforced in the hook:**

| User role | LIVE | PREVIEW | LAB | ARCHIVED | DEPRECATED |
|-----------|------|---------|-----|----------|------------|
| Public    | ✓    | ✗       | ✗   | ✗        | ✗          |
| Tenant (paying) | ✓ | ✓ (if flag on for tenant) | ✗ | ✗ | ✗ |
| Admin (APAS staff) | ✓ | ✓ | ✓ | view-only in registry | view-only in registry |

Routing layer and nav components call `useFeatureFlag` and hide / redirect when `enabled === false`. Unknown slugs default to `disabled` with a dev-console warning.

---

## 6. The `/lab/*` namespace

A single top-level route prefix. No link to it from the public nav. Reachable from:

- `/admin/registry` → "Open in Lab" action on any LAB-state row
- Direct URL (you remember the path)
- A single "Lab" entry in the Admin-only sidebar section

`/lab` landing page lists every LAB feature with a one-line description, last-modified date, and owner. The landing page is generated from the registry, not hand-maintained.

Physical file moves happen once — from `src/pages/<module>/<feature>.tsx` to `src/pages/lab/<feature>.tsx`. Routes update in one place (`src/App.tsx` or the router config). Imports update accordingly. No code is rewritten.

---

## 7. The `/admin/registry` page

The feature the builder will look at every day. Lovable territory.

**Must have:**

- Table of all registry entries, sortable and filterable by: lifecycle, module, kind, opa_locka_in_use, last_verified_at
- Lifecycle badge with the five colors (green, blue, amber, gray, red)
- Inline actions: change lifecycle, set owner, mark verified, promote to LIVE, move to LAB, archive, deprecate
- Search by slug or path
- Empty state that says "No features match these filters" — not a marketing page
- Export to CSV
- "Stale" flag: last_verified_at older than 90 days
- Counts at the top: N LIVE / N PREVIEW / N LAB / N ARCHIVED / N DEPRECATED / % verified in last 90d

**Nice to have (v2):**

- Dependency graph view (from `depends_on`)
- Bulk edit
- "Assign random LAB feature to verify today" button

---

## 8. Implementation sequence

Execute in this order. Do not batch — each step must land and pass CI before the next begins.

### Phase 1 — Foundation (Claude Code)

1. Create the `feature_registry` + `feature_registry_events` migrations.
2. Seed the registry from a static file `src/registry/seed.ts` that lists every current route and edge function with a proposed lifecycle (see Section 9).
3. Refactor `useFeatureFlag` to read from the registry via a React Query hook, with 5-minute cache.
4. Add the `/admin/registry` route skeleton (table, no actions yet). Gate to admin role.

### Phase 2 — Route labeling (Claude Code, deterministic pass)

5. For each of the 232 routes, add a `<FeatureGate slug="...">` wrapper in the router config. The gate reads the registry and renders the child, a 404, or a redirect based on lifecycle + user role.
6. Add a one-line registry annotation comment above each route: `// registry: monitor.station-dashboard (LIVE)`.
7. Run a verification script that asserts: every route has a registry entry, every registry entry points to a real route or edge function.

### Phase 3 — Module collapse (Claude Code + Lovable)

8. Update nav (sidebar + top bar) to show only the 5 LIVE modules for non-admin users. Admins see a sixth "Lab" entry.
9. Move LAB-candidate pages under `src/pages/lab/`. Update imports. Do not rewrite logic.
10. Update the landing `/` page to reflect the 5-module IA.

### Phase 4 — Registry UI (Lovable)

11. Build out the `/admin/registry` page interactions: filters, bulk select, lifecycle transitions, verified-at stamping.
12. Build the `/lab` landing page (reads from registry).

### Phase 5 — Cleanup & verification (Claude Code)

13. Run dead-import check. Remove any imports that now point nowhere.
14. Run the test suite. Any route that lost a test gets a registry flag `tests: missing`.
15. Generate the "Before / After" diff report: number of routes per module, per lifecycle, before and after.

---

## 9. Initial lifecycle assignments (seed)

The seed file at `src/registry/seed.ts` should be populated by Claude Code by scanning the current router. The initial rule of thumb:

- **Under Monitor, Analytics, Maintain, Admin** → LIVE unless the page renders mock data or has no real edge function behind it.
- **Under Intelligence** → LIVE for station-chat, SSO prediction, pump curve, anomaly detection, graph-RAG. PREVIEW for anything using a placeholder model.
- **Under Compliance** → LIVE for Chapter 24 corpus, consent-decree exhibits, NPDES generator. LAB for anything not yet touched by Opa-Locka.
- **Under Knowledge, Dictionary, Network** → LAB by default. Promote individually with evidence.
- **Under Finance** → LAB by default.
- **Edge functions** → LIVE if referenced by a LIVE route; otherwise inherit the state of their caller. Orphan edge functions (no caller) go to ARCHIVED with reason `no-caller`.

Every seed assignment is a **proposal**. Hardeep reviews the table in `/admin/registry` and adjusts before going public.

---

## 10. Acceptance criteria — "done" looks like this

A reviewer (Hardeep, or someone he trusts) can open the app fresh and see:

1. A public nav with exactly 5 modules: Monitor, Intelligence, Maintain, Compliance, Admin.
2. No broken links. No routes that render "Coming Soon" or obvious placeholder data to a non-admin.
3. `/admin/registry` shows every route, every module, every edge function. Counts add up. The search works.
4. `/lab` shows a clean list of experimental features with owners and last-verified dates.
5. A LAB-state route, visited by a non-admin, returns 404. Visited by an admin, loads normally.
6. Opa-Locka's daily workflow (login → station dashboard → alarms → work orders → logout) is untouched. No regressions.
7. The "Before / After" report shows: 232 routes accounted for, 0 orphans, every lifecycle state has at least one entry, every LIVE entry has `opa_locka_in_use` set to true or false (never null).

---

## 11. What NOT to do

- **Do not delete code.** Archiving is a state change, not a file deletion. Deletion happens only from the DEPRECATED state, after 90 days, by a separate PR.
- **Do not rewrite working logic during the collapse.** The goal is IA, not refactor. Save refactor for a separate pass.
- **Do not break Opa-Locka.** The five LIVE modules must pass the "Opa-Locka daily workflow" smoke test after every phase. If a phase breaks the smoke test, revert and re-plan.
- **Do not hide Admin features behind the collapse.** Admin stays fully functional — it's how the builder navigates the new system.
- **Do not put the Feature Registry behind a feature flag.** The registry is the flag. It must be unconditionally available to admins from day one.
- **Do not merge edge functions during this pass.** 180 edge functions is a separate plan. This pass labels them; consolidation is next quarter.

---

## 12. Rollback plan

Every phase is one PR. Every PR can be reverted.

If Phase 2 (route labeling) causes regressions: revert the PR, leaving the registry in place but unused. Nav still shows the old 10 modules. Nothing is lost.

If Phase 3 (module collapse) causes a demo regression before an Opa-Locka meeting: set a `nav.legacy_ten_modules` flag to LIVE for that tenant, which re-enables the old nav. The flag is in the registry itself.

---

## 13. Artifacts this plan produces

By the end of execution, the following exist in the repo:

1. `supabase/migrations/<timestamp>_feature_registry.sql`
2. `src/registry/seed.ts`
3. `src/registry/useFeatureFlag.ts` (refactored)
4. `src/registry/FeatureGate.tsx`
5. `src/pages/admin/registry/*` (the registry UI)
6. `src/pages/lab/*` (moved files + landing page)
7. `scripts/verify-registry.ts` (CI check)
8. `docs/module-consolidation-report.md` (the generated before/after diff)

And one thing outside the repo: a cleaner product, visible to the builder.

---

## 14. Handoff notes

- **For Claude Code:** Execute Phases 1, 2, 3 (file moves), and 5. Treat this file as the specification. Ask before deviating.
- **For Lovable:** Execute the UI polish in Phase 3 (nav) and Phase 4 (registry UI and `/lab` landing). Iterate visually.
- **For Hardeep:** Phase 1 PR is the one to review carefully — the schema and the `useFeatureFlag` contract lock in the rest of the plan. After that, review is mostly visual.

---

*End of plan. Ship one phase at a time.*
