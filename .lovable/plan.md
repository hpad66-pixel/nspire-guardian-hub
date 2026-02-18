
# ClickUp-Style Action Items & To-Do System — Enterprise Implementation

## Vision & UX Strategy

The goal is a **live, persistent task thread** that lives in two places simultaneously:
1. **Inside each project** — an "Action Items" panel (same pattern as Activity Feed), accessible from the project header
2. **On the Dashboard** — a dedicated "My Tasks" section that aggregates all tasks assigned to the current user across all projects, always visible and "staring at your face"

The design language draws from **ClickUp's task cards**, **Linear's clean list view**, and **GitHub's assignee/label system** — compact, color-coded, drag-and-drop ready, with real-time status syncing between the assigner's view and the assignee's view.

---

## Where It Lives in the Project

A new **"Tasks"** button is added to the project header action bar (next to Activity, Discuss, Reports):

```
[Activity] [Discuss] [Tasks ✓] [Reports] [Edit]
```

Clicking **Tasks** slides open an overlay panel from the right — identical UX pattern to the Activity Feed panel (absolute-positioned overlay, no horizontal scroll). The panel has two tabs:
- **All Tasks** — all action items for this project
- **Mine** — only tasks assigned to the current user

---

## Database Schema

### New Table: `project_action_items`

```sql
CREATE TABLE public.project_action_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,
  status            TEXT NOT NULL DEFAULT 'todo'  
                    CHECK (status IN ('todo','in_progress','in_review','done','cancelled')),
  priority          TEXT NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('urgent','high','medium','low')),
  assigned_to       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  due_date          DATE,
  completed_at      TIMESTAMPTZ,
  tags              TEXT[] DEFAULT '{}',
  linked_entity_type TEXT,          -- 'rfi', 'punch_item', 'meeting', 'milestone', etc.
  linked_entity_id  UUID,
  sort_order        INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.project_action_items ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view action items (they're project-scoped)
CREATE POLICY "Authenticated users can view action items"
  ON public.project_action_items FOR SELECT
  TO authenticated USING (true);

-- Users can create action items
CREATE POLICY "Users can create action items"
  ON public.project_action_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);

-- Creator or assignee can update
CREATE POLICY "Creator or assignee can update action items"
  ON public.project_action_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR auth.uid() = assigned_to);

-- Only creator can delete
CREATE POLICY "Creator can delete action items"
  ON public.project_action_items FOR DELETE
  TO authenticated USING (auth.uid() = created_by);
```

### New Table: `action_item_comments`

```sql
CREATE TABLE public.action_item_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_item_id  UUID NOT NULL REFERENCES project_action_items(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  created_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.action_item_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view comments"
  ON public.action_item_comments FOR SELECT TO authenticated USING (true);
  
CREATE POLICY "Users can create comments"
  ON public.action_item_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own comments"
  ON public.action_item_comments FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);
```

### Enable Realtime

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_action_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.action_item_comments;
```

---

## New Files

### 1. `src/hooks/useActionItems.ts`

Manages all CRUD operations and real-time subscription:
- `useActionItemsByProject(projectId)` — fetches with assignee profile join, realtime subscription
- `useMyActionItems()` — fetches all items `assigned_to = current user` across all projects (for dashboard)
- `useActionItemComments(actionItemId)` — comment thread, realtime
- `useCreateActionItem()` — mutation
- `useUpdateActionItem()` — mutation (status, priority, assignee, due date, title)
- `useDeleteActionItem()` — mutation
- `useCreateActionItemComment()` — mutation
- When `assigned_to` changes, a `notification` is created for the new assignee via the existing `notifications` table with `type: 'assignment'` and `entity_type: 'action_item'`

### 2. `src/components/projects/ActionItemsPanel.tsx`

The slide-in overlay panel — mirrors the `ActivityFeedPanel` structure but with richer task UI:

**Panel structure:**
```
┌──────────────────────────────────┐
│  ✓ Action Items    [All] [Mine]  │  ← header with tab filter
│  ────────────────────────────── │
│  [+ Add Task           ▾ Filter]│  ← quick add inline
│  ════════════════════════════════│
│                                  │
│  ● URGENT                        │  ← priority group header
│  ┌────────────────────────────┐  │
│  │ ◈ Fix RFI response delay   │  │  ← task card
│  │   👤 John D. · Due Mar 1   │  │
│  │   [Todo] → [In Progress]   │  │
│  └────────────────────────────┘  │
│                                  │
│  ● HIGH                          │
│  ┌────────────────────────────┐  │
│  │ ◈ Submit permit docs       │  │
│  │   👤 Sarah K. · Due Mar 5  │  │
│  └────────────────────────────┘  │
│                                  │
│  [See all completed tasks ↓]     │
└──────────────────────────────────┘
```

**Quick-add bar**: A single text input at the top — type a task title and press Enter to create it instantly (like ClickUp's quick-add). A "More options" expander reveals the full form (assignee, due date, priority, description, linked entity).

**Task Cards** show:
- Checkbox (clicking immediately marks done with a satisfying animation)
- Title (click to expand into detail view)
- Assignee avatar + name
- Priority color tag (left border: red=urgent, orange=high, blue=medium, gray=low)
- Due date (turns red if overdue, yellow if due within 3 days)
- Status pill with one-click status transitions
- Comment count badge

**Clicking a task card** expands it inline (ClickUp-style accordion) to show:
- Editable title and description
- Comment thread (live, real-time)
- Linked entity (e.g., "Linked to: RFI #12")
- Status change buttons
- Delete button (for creator only)

**Filtering**: A filter dropdown by status (Todo / In Progress / In Review / Done), by assignee, by priority.

### 3. `src/components/projects/ActionItemDialog.tsx`

Full create/edit dialog for cases where the quick-add needs more detail:
- Title (required)
- Description (rich text, optional)
- Priority picker (Urgent / High / Medium / Low — color-coded pills)
- Assignee picker (searchable profile dropdown with avatars)
- Due date (calendar picker)
- Tags (free text tags)
- Link to entity (optional: RFI, Punch Item, Meeting, Milestone dropdown)

### 4. Dashboard Integration — `src/pages/Dashboard.tsx`

A new **"My Tasks"** section is added prominently in the dashboard, below the core metrics and above the module cards. It uses the existing `useMyActionItems()` hook:

```
┌─────────────────────────────────────────────────────────┐
│  ✓ My Tasks                               [View All →]  │
│  ─────────────────────────────────────────────────────  │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 🔴 Fix RFI response          Due: Today  [Todo]  │   │
│  │    Tower Renovation Project               →      │   │
│  ├──────────────────────────────────────────────────┤   │
│  │ 🟡 Submit permit documents   Due: Feb 22 [In Pr] │   │
│  │    Riverside Phase 2                      →      │   │
│  ├──────────────────────────────────────────────────┤   │
│  │ 🔵 Review safety checklist   Due: Feb 25 [Todo]  │   │
│  │    Office Buildout                        →      │   │
│  └──────────────────────────────────────────────────┘   │
│  [+ Create Task]                [2 more tasks ↓]        │
└─────────────────────────────────────────────────────────┘
```

Each row in "My Tasks":
- Priority dot (red/orange/blue/gray)
- Task title
- Due date (colored based on urgency)
- Status pill (click to change inline)
- Project name (links to project)
- Checkbox (one-click complete)

Tasks are sorted: overdue first, then by due date, then by priority. Completed tasks are hidden but a "Show X completed" toggle is available.

**Persistence**: The section is sticky — after login, this is the first thing users see after the greeting and core metrics.

---

## Integration Points

### Project Header Button
In `ProjectDetailPage.tsx`, add the Tasks button alongside the Activity button:

```tsx
<Button
  variant={actionItemsOpen ? 'secondary' : 'outline'}
  size="sm"
  className="gap-1.5 relative"
  onClick={() => { setActionItemsOpen(!actionItemsOpen); /* close others */ }}
>
  <CheckSquare className="h-4 w-4" />
  <span className="hidden sm:inline">Tasks</span>
  {openTaskCount > 0 && (
    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-white text-[10px] flex items-center justify-center">
      {openTaskCount}
    </span>
  )}
</Button>
```

A red badge on the button shows the count of open/overdue tasks for the project.

### Notifications
When a task is assigned to a user, a notification is inserted into the `notifications` table:
- `type: 'assignment'`
- `title: 'You've been assigned a task'`
- `message: '<task title> — <project name>'`
- `entity_type: 'action_item'`
- `entity_id: <task id>`

This surfaces in the existing NotificationCenter bell and in the Dashboard "Action Required" section.

---

## Visual Design System — Priority Colors

| Priority | Color | Left Border | Badge |
|---|---|---|---|
| Urgent | Red `#EF4444` | `border-l-red-500` | `bg-red-50 text-red-700` |
| High | Orange `#F97316` | `border-l-orange-500` | `bg-orange-50 text-orange-700` |
| Medium | Blue `#3B82F6` | `border-l-blue-500` | `bg-blue-50 text-blue-700` |
| Low | Gray `#94A3B8` | `border-l-slate-300` | `bg-slate-50 text-slate-500` |

## Visual Design System — Status Flow

```
[Todo] → [In Progress] → [In Review] → [Done]
                   ↓
             [Cancelled]
```

Each status transition is animated: checking "Done" plays a satisfying strikethrough animation on the task title.

---

## Technical Implementation Steps

1. **Database migration** — Create `project_action_items` and `action_item_comments` tables with RLS policies and enable realtime
2. **`useActionItems.ts`** — Full hook with CRUD mutations, realtime subscriptions, and notification creation on assignment
3. **`ActionItemsPanel.tsx`** — Overlay panel with quick-add, grouped task cards, inline comment thread expansion
4. **`ActionItemDialog.tsx`** — Full create/edit form with assignee picker, due date, priority, entity linking
5. **`ProjectDetailPage.tsx`** — Add Tasks button to header, wire overlay panel (same absolute overlay pattern as Activity)
6. **`Dashboard.tsx`** — Add "My Tasks" section with `useMyActionItems()` data, priority sorting, one-click complete

No new npm dependencies are required — all UI components use existing shadcn, Radix, Framer Motion, and Lucide.
