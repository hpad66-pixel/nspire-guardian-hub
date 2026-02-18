
# Projects UX/UI Overhaul — View Toggle, Health Signals & Project Deletion

## What We're Solving

**Three concrete problems identified in the codebase:**

1. **No delete UI** — `useDeleteProject()` hook and the RLS DELETE policy (`has_role(auth.uid(), 'admin')`) already exist in the database, but there is zero UI to trigger them. Admins and owners cannot delete projects from the frontend.

2. **Tile-only layout doesn't scale** — `ProjectsDashboard.tsx` renders a single vertical list of tiles. With 20+ projects, this becomes a scroll-heavy, hard-to-scan experience. There is no table, no list mode, no sorting, no global search, and no status-based filtering beyond All/Property/Client.

3. **No project health signals** — The tile shows a budget progress bar and a due date, but there is no computed "health" status (On Track / At Risk / Overdue / Stalled) that gives the admin an instant read on portfolio health without clicking into each project.

---

## Part 1 — Project Deletion (Admin/Owner Only)

### Where the delete trigger lives

**Two surfaces:**

**Surface A — Projects Dashboard (the list)**
Each project row/tile gets a `⋯` (more options) dropdown on hover containing:
- Edit
- Archive (change status to `closed`)
- **Delete** (destructive, red, admin/owner only)

**Surface B — Project Detail Page header**
The existing "Edit" button gains a `⋯` dropdown next to it containing Edit, Archive, and Delete — so the admin can delete while looking at a project.

### Delete confirmation flow
Clicking Delete opens a dedicated `AlertDialog` (already in the shadcn library) that:
1. Shows the project name prominently: `"Delete 'Building Exterior Renovation'?"`
2. Warns: "This will permanently delete all associated milestones, daily reports, change orders, RFIs, meetings, action items, and all other project data. This cannot be undone."
3. Requires the user to type the project name to confirm (enterprise-grade safety UX, used by GitHub, Vercel, and Linear)
4. Shows a red "Delete Project" button that only enables once the name is typed correctly
5. On success → navigates back to `/projects` and shows a toast

### Role-gating
The delete option is only rendered when `currentRole === 'admin' || currentRole === 'owner'`. This is checked using the existing `useUserPermissions()` hook. The RLS policy already restricts deletion to `admin` on the database side, so the UI gating is a UX guard on top of the server-side security.

### Files changed:
- `src/pages/projects/ProjectsDashboard.tsx` — add `⋯` menu with delete to each project tile
- `src/pages/projects/ProjectDetailPage.tsx` — add `⋯` dropdown next to Edit button with delete option
- **New file**: `src/components/projects/DeleteProjectDialog.tsx` — the typed-confirmation AlertDialog
- `src/hooks/useProjects.ts` — no changes needed (hook already exists and works)

---

## Part 2 — View Toggle: Tile / List / Table

### Three view modes

**Mode 1: Card View (current default)** — Rich tiles with budget bar and milestone count. Best for <10 projects. Keep as-is.

**Mode 2: List View (new)** — Compact single-line rows. Each row shows:
```
[●] Project Name    [Property Badge]    $350k/$500k ████░░ 70%    Due Mar 15    [On Track ✓]    [⋯]
```
This is similar to Linear's issue list. ~4x more projects visible on screen without scrolling.

**Mode 3: Table View (new)** — Full sortable data table with columns:
- Name (sortable, clickable)
- Type (Property / Client)
- Property / Client
- Status (sortable)
- Budget (sortable)
- Spent %
- Start Date
- End Date (sortable)
- Health (sortable)
- Actions

### View toggle control
Three icon buttons added to the Projects Dashboard header row (right side, next to "New Project"):
```
[≡ List] [⊞ Cards] [⊟ Table]  ← toggle group
```
The selected view is persisted to `localStorage` under key `projects_view_preference` so it remembers the user's choice across sessions.

### Sorting & filtering
Added to the dashboard header:
- **Sort by**: Name / Created / Due Date / Budget / Health (dropdown)
- **Sort direction**: ASC/DESC toggle button
- **Status filter**: All / Active / Planning / On Hold / Completed (extends current All/Property/Client tabs)
- **Search bar**: Real-time filter by project name (client-side, no DB call) using a `useState` filter on the fetched `projects` array

### Files changed:
- `src/pages/projects/ProjectsDashboard.tsx` — major refactor to support three views
- **New file**: `src/components/projects/ProjectListView.tsx` — compact list row component
- **New file**: `src/components/projects/ProjectTableView.tsx` — sortable table component

---

## Part 3 — Project Health Signals

### Health computation logic
Each project gets a computed `health` value derived from existing data already fetched in the dashboard. This is a **pure client-side computation** on the data already in-memory — no extra DB queries.

```typescript
function computeHealth(project: Project): 'on_track' | 'at_risk' | 'overdue' | 'stalled' {
  const daysUntilEnd = project.target_end_date 
    ? differenceInDays(new Date(project.target_end_date), new Date()) 
    : null;
  const budgetPct = project.budget && project.spent 
    ? (Number(project.spent) / Number(project.budget)) * 100 
    : 0;
  const daysSinceUpdate = differenceInDays(new Date(), new Date(project.updated_at));

  if (daysUntilEnd !== null && daysUntilEnd < 0) return 'overdue';
  if (daysSinceUpdate > 14 && project.status === 'active') return 'stalled';
  if (budgetPct > 90 || (daysUntilEnd !== null && daysUntilEnd < 7)) return 'at_risk';
  return 'on_track';
}
```

### Health badge design

| Health | Color | Icon | Meaning |
|---|---|---|---|
| On Track | `text-green-600 bg-green-50` | ✓ CheckCircle | Budget OK, timeline OK |
| At Risk | `text-amber-600 bg-amber-50` | ⚠ AlertTriangle | Budget >90% or due <7 days |
| Overdue | `text-red-600 bg-red-50` | ✕ XCircle | Past target end date |
| Stalled | `text-slate-500 bg-slate-100` | ⏸ Pause | No updates in 14+ days |

### Dashboard summary bar
A new horizontal summary strip added ABOVE the project list/cards (below the 4 stat cards):
```
Portfolio Health:  ● 8 On Track   ⚠ 2 At Risk   ✕ 1 Overdue   ⏸ 0 Stalled
```
Each chip is clickable and filters the list to show only projects of that health category.

### Files changed:
- `src/pages/projects/ProjectsDashboard.tsx` — adds `computeHealth()` and health filter chips
- A new shared utility `src/lib/projectHealth.ts` — exports `computeHealth()` and `HEALTH_CONFIG` so all three views (Card, List, Table) can use identical logic

---

## Part 4 — Sidebar: Project Navigator Enhancement

### Current state
The Projects sidebar group has only two items: "All Projects" and "Proposals". When you have 10+ projects, navigating between them requires going back to `/projects`, scanning, and clicking in.

### Enhancement: Recent Projects in sidebar
Below "All Projects" in the sidebar, add a dynamic "Recent" section showing the 3 most recently accessed projects (tracked via `localStorage`). Each item shows:
- Project name (truncated)
- A health dot (colored)
- Clicking navigates directly to `/projects/{id}`

In icon-collapsed mode, these items are hidden (the sidebar is too narrow), and a tooltip on "All Projects" says "All Projects (3 recent)".

This mirrors how Linear and Jira keep recently visited items in the sidebar for fast re-access.

### Files changed:
- `src/components/layout/AppSidebar.tsx` — add recent projects section inside the Projects `CollapsibleNavGroup`
- `src/hooks/useProjects.ts` — no changes (data already available)

---

## Summary of All Files Changed

| File | Change Type | What Changes |
|---|---|---|
| `src/pages/projects/ProjectsDashboard.tsx` | Major refactor | View toggle (Card/List/Table), sorting, search, health chips, delete trigger |
| `src/pages/projects/ProjectDetailPage.tsx` | Minor addition | `⋯` dropdown next to Edit with Archive + Delete options |
| `src/components/projects/DeleteProjectDialog.tsx` | New file | Typed-confirmation delete dialog |
| `src/components/projects/ProjectListView.tsx` | New file | Compact list row component |
| `src/components/projects/ProjectTableView.tsx` | New file | Sortable data table component |
| `src/lib/projectHealth.ts` | New file | `computeHealth()` utility + `HEALTH_CONFIG` constants |
| `src/components/layout/AppSidebar.tsx` | Minor addition | Recent projects section in Projects nav group |

---

## Technical Notes

- **No new dependencies** required — view toggle uses existing Lucide icons; table uses Tailwind; `AlertDialog` is already in the shadcn library
- **No new DB queries** — health computation runs on already-fetched data; recent projects use `localStorage`
- **Delete safety**: typed-name confirmation guards against accidental deletion; server-side RLS policy provides the real security wall
- **Database cascade**: all child tables (`project_action_items`, `project_milestones`, `project_discussions`, etc.) already have `ON DELETE CASCADE` foreign keys referencing `projects.id` — confirmed by seeing 17 child tables all reference the project id. Deleting the parent row cascades automatically.
- **The `useDeleteProject` hook already works** — it calls `supabase.from('projects').delete().eq('id', id)` and the `admin` RLS policy already allows it. We just need the UI.
