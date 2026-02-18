
## Dual-Mode Projects: Property-Linked & Standalone Client Projects

### The Problem

Right now, every project **requires** a property. The database has `property_id` as `NOT NULL` with a foreign key cascade to the `properties` table. This means you cannot create a project for a standalone client (like ERC) that has no property management function. The platform needs to serve two distinct use cases simultaneously:

1. **Property-Management Projects** — tied to a specific property (roof replacement, renovation, etc.)
2. **Standalone Client Projects** — associated with a client/company (ERC tax credit work, general contracting, etc.) with no property dependency

---

### Proposed Architecture

```text
BEFORE                          AFTER
──────────────────────          ─────────────────────────────────────
projects
  property_id (NOT NULL)        projects
  → hard dependency               property_id (nullable)   ← optional
                                  client_id   (nullable)   ← new optional
                                  project_type: 'property' | 'client'

                                clients (new table)
                                  id, name, contact_name,
                                  contact_email, contact_phone,
                                  industry, notes
```

A project will link to **either** a property **or** a client — or neither for fully internal projects.

---

### What Changes

**1. Database Migration**

- Make `property_id` on `projects` **nullable** (drop the NOT NULL constraint; keep the foreign key for integrity)
- Add a new `clients` table with fields: `id`, `name`, `contact_name`, `contact_email`, `contact_phone`, `industry`, `notes`, `created_by`, `created_at`, `updated_at`
- Add a `client_id` nullable foreign key column on `projects` referencing `clients`
- Add a `project_type` column (text, default `'property'`) to distinguish the two modes — values: `'property'` or `'client'`
- Add RLS policies on the `clients` table (admin/manager create/update/delete, all authenticated users can view)

**2. ProjectDialog (Create/Edit Form)**

- Add a **Project Type** selector at the top: `Property Project` | `Client / Standalone Project`
- When **Property Project** is selected: show the existing Property dropdown (required)
- When **Client / Standalone Project** is selected: show a Client dropdown (with an inline "Add New Client" option) and hide the property field
- The form validates the correct dependency based on type

**3. Projects Dashboard (`ProjectsDashboard.tsx`)**

- Add filter tabs: `All | Property Projects | Client Projects`
- Project cards show either the property name or the client name under the project title
- Add a subtle type badge (`Property` / `Client`) on each card

**4. Project Detail Page (`ProjectDetailPage.tsx`)**

- Header shows either `Building2` icon + property name, or `Briefcase` icon + client name (or "Standalone" if neither)
- No functional change to any of the 12 operational tabs

**5. `useProjects` Hook**

- Update all queries to use `LEFT JOIN` (via Supabase select) to fetch both `property:properties(name)` and `client:clients(name)` simultaneously — the one that's null is simply not displayed
- Update `getAssignedPropertyIds` / access logic so standalone client projects are visible to admins/managers without needing property team membership

**6. New `useClients` Hook**

- Standard CRUD operations: `useClients`, `useCreateClient`, `useUpdateClient`
- Used in the ProjectDialog dropdown

**7. Sidebar Navigation**

- The Projects section in the sidebar remains exactly as-is — no changes needed here since Projects is already its own top-level module, independent of any specific property

---

### Files to Create
- `src/hooks/useClients.ts` — full CRUD hook for the new clients table

### Files to Modify
- **Database migration** — alter `projects` table + create `clients` table
- `src/components/projects/ProjectDialog.tsx` — dual-mode form
- `src/hooks/useProjects.ts` — update queries for nullable property + client join
- `src/pages/projects/ProjectsDashboard.tsx` — type filter tabs + client name display
- `src/pages/projects/ProjectDetailPage.tsx` — conditional property/client display in header

### No Changes Needed
- All 12 project operational tabs (they work off `project_id` alone)
- Sidebar navigation (projects is already property-independent in the nav)
- RLS policies on `projects` (already permissive for authenticated users)
- Any inspection, work order, or issue logic (they connect via `property_id` directly, not through projects)

---

### Data Safety

There are currently **4 existing projects**, all with a `property_id`. The migration will make `property_id` nullable but won't remove any existing data — all 4 projects remain fully linked to their properties and continue to work exactly as before.
