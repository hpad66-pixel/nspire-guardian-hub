
# Organizations & Clients — Enterprise Data Layer Overhaul

## What We're Fixing (Root Cause Analysis)

After auditing the full codebase and database, here is exactly what is broken:

**Problem 1 — Clients table is orphaned (no management UI)**
The `clients` table exists in the database with full RLS policies, and `useClients` / `useCreateClient` / `useUpdateClient` / `useDeleteClient` hooks are all written. But there is zero page, zero settings tab, zero management UI anywhere in the app to create, view, edit, or delete clients. Admins are forced to use the inline "+" button inside the Project Dialog — which only creates the minimal name, no contact info, no industry, nothing else.

**Problem 2 — "tenants" table is the WRONG entity (naming collision)**
The `tenants` table in the database is for unit lease tenants (residents with lease_start, lease_end, rent_amount, unit_id). This is completely different from what you mean by "tenants/organizations" — i.e., the companies and businesses that use the platform or are project clients. There is no "organizations" concept in the database at all. The `clients` table IS the right table for what you're describing — it just needs to be expanded and surfaced properly.

**Problem 3 — Users have no organizational affiliation**
The `profiles` table (user data) has no `client_id` or `organization_id` column. When you invite a user, they get a role and optionally a property, but they are never linked to a company or client organization. This means there's no way to say "this user belongs to R4 Capital Partners" or "this user is an ERC Recyclables contact."

**Problem 4 — Project → Client link is non-functional**
The `projects` table has `client_id` (nullable UUID FK to `clients`). The Project Dialog renders a client selector. But because there are zero clients in the database (the table is empty — confirmed via query), the dropdown is always empty. Creating a client via the inline "+" only stores the name — it silently fails to populate contact info. The link technically works at the DB level but has zero data flowing through it.

**Problem 5 — No "client type" distinction**
A client like "R4 Capital Partners" (your own company/organization) is fundamentally different from "ERC Recyclables" (an external business client) or "APAS" (a regulatory/government client). There is no `client_type` field to distinguish these.

---

## The Solution Architecture

The `clients` table becomes the **single source of truth for all organizations, companies, and external clients**. It gets expanded with richer fields. A new **Organizations & Clients** management page is created at `/settings/organizations` (or surfaced as a standalone `/organizations` page). Users gain an optional `client_id` link to tie them to an organization.

```text
clients (expanded)
  ├── id
  ├── name                    ← company/org name (e.g. "R4 Capital Partners")
  ├── client_type             ← NEW: 'internal_org' | 'business_client' | 'property_management' | 'government' | 'other'
  ├── contact_name
  ├── contact_email
  ├── contact_phone
  ├── website                 ← NEW
  ├── address                 ← NEW
  ├── industry
  ├── notes
  ├── is_active               ← NEW: soft-delete/archive flag
  ├── created_by
  ├── created_at / updated_at

profiles (add FK to clients)
  └── client_id               ← NEW: nullable FK to clients.id (which org does this user belong to?)

user_invitations (add client_id)
  └── client_id               ← NEW: nullable FK to clients.id (pre-assign during invite)
```

---

## Part 1 — Database Migration

### Expand the `clients` table

```sql
ALTER TABLE public.clients 
  ADD COLUMN client_type TEXT NOT NULL DEFAULT 'business_client'
    CHECK (client_type IN ('internal_org','business_client','property_management','government','other')),
  ADD COLUMN website TEXT,
  ADD COLUMN address TEXT,
  ADD COLUMN city TEXT,
  ADD COLUMN state TEXT,
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
```

### Link profiles → clients

```sql
ALTER TABLE public.profiles
  ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
```

### Link invitations → clients (pre-assign org on invite)

```sql
ALTER TABLE public.user_invitations
  ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
```

### Seed the first internal org (R4 Capital Partners type)

After the migration, the admin can create orgs via the new UI. No seed data needed — the migration is purely structural.

---

## Part 2 — Expanded Hook: `useClients.ts`

The existing hooks work but are missing:
- `useClient(id)` — single client detail
- RLS for INSERT currently has no `WITH CHECK` (any authenticated user can insert) — needs a manager/admin guard
- No `client_type`, `website`, `address`, `city`, `state`, `is_active` in the TypeScript interface

**Updated `Client` interface:**
```typescript
export interface Client {
  id: string;
  name: string;
  client_type: 'internal_org' | 'business_client' | 'property_management' | 'government' | 'other';
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  industry: string | null;
  notes: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  member_count?: number;
  project_count?: number;
}
```

**Additional hooks added:**
- `useClient(id)` — single client with member_count and project_count joined
- `useActiveClients()` — filters `is_active = true` (used in project dialog)
- `useArchiveClient()` — sets `is_active = false` (soft delete)
- `useClientMembers(clientId)` — fetches profiles where `client_id = clientId`

---

## Part 3 — New Organizations & Clients Management Page

### New route: `/organizations`

A new top-level page added to the app and sidebar under the Core Platform section (between People and Contacts, since it is a related entity management page).

**Page structure:**

```
Organizations & Clients
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Stat: 1 Internal Org] [Stat: 3 Business Clients] [Stat: 0 Property Mgmt] [12 Total Members]

[Search...]  [Type Filter ▾]  [Status: Active/Archived ▾]   [+ New Organization]

┌─ R4 Capital Partners ──────────────────── [Internal Org] ─ [Active] ─────┐
│  📧 admin@r4capital.com  │ 📞 305-XXX-XXXX  │ 🏢 Real Estate              │
│  6 team members linked  │  4 active projects                              │
│  [View Members] [Edit] [Archive]                                          │
└───────────────────────────────────────────────────────────────────────────┘

┌─ ERC Recyclables ──────────────────────── [Business Client] ─ [Active] ──┐
│  📧 contact@erc.com     │ 📞 786-XXX-XXXX  │ 🏭 Environmental             │
│  2 team members linked  │  1 active project                               │
│  [View Members] [Edit] [Archive]                                          │
└───────────────────────────────────────────────────────────────────────────┘

┌─ APAS ─────────────────────────────────── [Government] ─ [Active] ───────┐
│  📧 info@apas.gov       │ 📞 954-XXX-XXXX  │ 🏛 Government / Regulatory  │
│  0 team members linked  │  2 active projects                              │
│  [Edit] [Archive]                                                         │
└───────────────────────────────────────────────────────────────────────────┘
```

Clicking "View Members" opens a slide-in sheet showing all profiles linked to that client, with the ability to unlink or assign them to a different org.

### Client Type Color Coding

| Type | Badge Color | Icon |
|---|---|---|
| Internal Org | Indigo | Building2 |
| Business Client | Blue | Briefcase |
| Property Management | Green | Home |
| Government | Amber | Shield |
| Other | Gray | Globe |

---

## Part 4 — New `OrganizationDialog.tsx` Component

Full create/edit dialog for organizations:

**Fields:**
- Organization Name (required)
- Type (required, color-coded pill selector): Internal Organization / Business Client / Property Management / Government / Other
- Primary Contact Name
- Primary Contact Email
- Primary Contact Phone
- Website URL
- Address / City / State
- Industry (text field)
- Notes (textarea)

On save: creates/updates `clients` row. Immediately available in the Project Dialog client selector and in the invite flow.

---

## Part 5 — Update Invite Flow to Include Organization

**`InviteUserDialog.tsx`** gets a new optional field:

```
[Email Address]
[Role ▾]
[Assign to Property ▾]  (existing)
[Assign to Organization ▾]  ← NEW: dropdown of all active clients
```

When the invitation is accepted in `AcceptInvitePage.tsx`, the `client_id` from the invitation is written to `profiles.client_id` for the new user. This establishes the permanent org link.

**`PersonDialog.tsx`** (used when manually adding an existing user to the system) also gets the organization assignment dropdown, writing to `profiles.client_id` directly.

---

## Part 6 — Update `ProjectDialog.tsx`

The existing client selector in the Project Dialog currently:
1. Shows an empty list (no clients in DB) — **fixed by the new Organizations page creating real data**
2. Has no visual distinction between client types — **fixed by adding type badge in the dropdown**
3. Allows creating a client inline but only captures the name — **fixed: the inline "+" now opens a mini version of the OrganizationDialog capturing at minimum name + type + email**

**Updated client selector in ProjectDialog:**
```
[Select client...                    ▾]  [+ New]
 ┌─────────────────────────────────────┐
 │ 🏢 R4 Capital Partners  [Internal] │
 │ 💼 ERC Recyclables  [Business]     │
 │ 🏛 APAS  [Government]              │
 └─────────────────────────────────────┘
```

The "New" button now opens a popover with the full `OrganizationDialog` rather than just a name input, ensuring complete data capture every time.

---

## Part 7 — Settings Page: Organization Tab Enhancement

The existing **Settings → Organization** tab currently shows a static card with "Tenant Configuration" placeholder text and no real content. This gets replaced with:

- A link/section showing the primary internal organization (the `internal_org` type client)
- A link to `/organizations` to manage all organizations
- Company branding settings (already exists via `useCompanyBranding` hook)

This turns the empty settings tab into a functional hub.

---

## Part 8 — Sidebar: Add Organizations to Navigation

In `AppSidebar.tsx`, add "Organizations" as a nav item in the Core Platform section, positioned between "People" and "Contacts":

```
People
Organizations    ← NEW (icon: Building2 or Layers)
Contacts
```

Route: `/organizations`

New page file: `src/pages/organizations/OrganizationsPage.tsx`

---

## Summary of All Files Changed

| File | Type | Change |
|---|---|---|
| Migration SQL | New | Expand `clients` table (client_type, website, address, city, state, is_active), add `client_id` to `profiles` and `user_invitations` |
| `src/hooks/useClients.ts` | Update | Add new fields to Client interface, add `useClient`, `useActiveClients`, `useArchiveClient`, `useClientMembers` hooks |
| `src/pages/organizations/OrganizationsPage.tsx` | New | Full org management page with cards, search, type filter |
| `src/components/organizations/OrganizationDialog.tsx` | New | Full create/edit dialog with all org fields |
| `src/components/organizations/OrganizationMembersSheet.tsx` | New | Slide-in panel showing users linked to an org |
| `src/components/people/InviteUserDialog.tsx` | Update | Add organization assignment field |
| `src/components/people/PersonDialog.tsx` | Update | Add organization assignment field |
| `src/pages/auth/AcceptInvitePage.tsx` | Update | Write `client_id` from invitation to profile on accept |
| `src/components/projects/ProjectDialog.tsx` | Update | Better client selector with type badges, improved inline creation |
| `src/components/layout/AppSidebar.tsx` | Update | Add Organizations nav item |
| `src/App.tsx` | Update | Add `/organizations` route |
| `src/pages/settings/SettingsPage.tsx` | Update | Replace empty Organization tab with real content |

---

## Technical Notes

- **No circular dependencies** — `useClients` remains independent; `OrganizationsPage` imports it; `ProjectDialog` imports `useActiveClients` (filtered view).
- **Backward compatible** — `client_id` on profiles is nullable (existing users unaffected). `client_type` has a default of `business_client` (existing `clients` rows, if any, get the default).
- **RLS fix for INSERT** — The current INSERT policy on `clients` has no `WITH CHECK` clause, meaning any authenticated user can insert. This is tightened to require `admin` or `manager` role, matching the UPDATE policy.
- **Type safety** — The `Client` TypeScript interface is updated to include all new fields. The `supabase/types.ts` auto-regenerates.
- **The tenant naming collision** — The `tenants` table is left untouched (it handles residential lease data). The word "tenant" in the Settings UI description ("Tenant Configuration") is relabeled to "Organization" to avoid confusion.
