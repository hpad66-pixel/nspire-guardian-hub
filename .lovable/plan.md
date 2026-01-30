

# Complete Project Lifecycle Management Implementation

## Overview
This plan implements a comprehensive Project Detail page and supporting components that showcase the full lifecycle of a construction project, from initial scope through closeout. You'll be able to click on any project and see all its milestones, daily reports, change orders, financial tracking, and progress in one unified view.

---

## What You'll Get

### 1. Project Detail Page
A dedicated page showing everything about a single project:

```text
+----------------------------------------------------------+
|  ROOF REPLACEMENT & HVAC UPGRADE                          |
|  Property: Sunset Gardens  |  Status: Active              |
+----------------------------------------------------------+
|                                                            |
|  [Overview] [Schedule] [Daily Logs] [Financials] [Docs]    |
|                                                            |
|  +----------------+  +----------------+  +----------------+ |
|  | Budget         |  | Progress       |  | Days Left      | |
|  | $450,000       |  | 42%            |  | 145            | |
|  | $187,500 spent |  | 2/6 milestones |  | Target: Jun 30 | |
|  +----------------+  +----------------+  +----------------+ |
|                                                            |
|  SCOPE OF WORK                                             |
|  Phase 1: Building A roof (4 weeks)                        |
|  Phase 2: Building B roof (4 weeks)                        |
|  Phase 3: Building C roof (4 weeks)                        |
|  Phase 4: HVAC replacements (6 weeks)                      |
|  Phase 5: Final inspections (2 weeks)                      |
|                                                            |
+----------------------------------------------------------+
```

### 2. Milestone Timeline
Visual representation of project phases with status tracking:
- Completed milestones (checkmark, green)
- In-progress milestones (spinner, blue)  
- Pending milestones (circle, gray)
- Overdue milestones (warning, red)
- Add/edit/complete milestone capabilities

### 3. Daily Reports Section
Construction field logs with:
- Date, weather, worker count
- Work performed description
- Issues encountered
- Photo attachments
- Submit new daily report form

### 4. Change Orders Management
Full change order workflow:
- View all change orders (draft/pending/approved/rejected)
- Create new change orders with amount and justification
- Approve/reject change orders (for managers/admins)
- Track impact on project budget
- Approval audit trail

### 5. Financial Summary
Budget and cost tracking:
- Original budget vs. current budget (including approved COs)
- Amount spent vs. remaining
- Change order impact summary
- Visual progress bar

### 6. Click-to-Navigate from Dashboard
Update the Projects Dashboard so clicking any project card opens its detail page.

---

## Components to Create

### New Files

| File | Purpose |
|------|---------|
| `src/pages/projects/ProjectDetailPage.tsx` | Main project detail view with tabs |
| `src/components/projects/MilestoneTimeline.tsx` | Visual milestone tracker with CRUD |
| `src/components/projects/MilestoneDialog.tsx` | Create/edit milestone form |
| `src/components/projects/DailyReportsList.tsx` | List of daily reports |
| `src/components/projects/DailyReportDialog.tsx` | Submit new daily report form |
| `src/components/projects/ChangeOrdersList.tsx` | Change orders with approve/reject |
| `src/components/projects/ChangeOrderDialog.tsx` | Create/edit change order form |
| `src/components/projects/ProjectOverview.tsx` | Scope and financial summary |
| `src/components/projects/ProjectFinancials.tsx` | Budget tracking dashboard |

### Files to Update

| File | Changes |
|------|---------|
| `src/App.tsx` | Add route `/projects/:id` |
| `src/pages/projects/ProjectsDashboard.tsx` | Make project cards clickable, link to detail |
| `src/hooks/useProjects.ts` | Add `useProject(id)` hook for single project fetch |

---

## User Experience Flow

1. **Dashboard View**: See all active projects with key metrics
2. **Click Project**: Navigate to `/projects/{id}`
3. **Overview Tab**: See scope, dates, budget summary, property link
4. **Schedule Tab**: View milestone timeline, add/complete milestones
5. **Daily Logs Tab**: Read/submit daily construction reports
6. **Financials Tab**: Track budget, view change order impact
7. **Edit Project**: Click edit button to modify project details
8. **Quick Actions**: Add milestone, submit report, create CO from any tab

---

## Milestone Workflow

```text
[Pending] → [In Progress] → [Completed]
     ↓
 [Overdue] (if past due date and not completed)
```

- Each milestone shows name, due date, status, notes
- Click to mark in-progress or complete
- Visual timeline shows progression through project phases

---

## Change Order Workflow

```text
[Draft] → [Pending] → [Approved] → Added to Budget
                  ↓
              [Rejected]
```

- Create CO with title, amount, description, justification
- Submit for approval (status: pending)
- Manager/admin approves or rejects
- Approved COs update project's adjusted budget

---

## Daily Report Fields

| Field | Type | Required |
|-------|------|----------|
| Report Date | Date picker | Yes |
| Weather | Text (Sunny, 75F) | No |
| Workers On Site | Number | No |
| Work Performed | Textarea | Yes |
| Issues Encountered | Textarea | No |
| Photos | File upload (multiple) | No |

---

## Technical Implementation

### Database
No schema changes required - all tables and relationships already exist:
- `projects` - main project data
- `project_milestones` - milestone tracking
- `daily_reports` - field logs
- `change_orders` - CO management

### Routing
```typescript
// App.tsx - add new route
<Route path="/projects/:id" element={<ProjectDetailPage />} />
```

### Data Fetching
Use existing hooks with React Query:
- `useProject(id)` - single project with property join
- `useMilestonesByProject(id)` - project milestones
- `useDailyReportsByProject(id)` - project daily reports  
- `useChangeOrdersByProject(id)` - project change orders

### Navigation
```typescript
// ProjectsDashboard.tsx - make cards clickable
<div 
  onClick={() => navigate(`/projects/${project.id}`)}
  className="cursor-pointer"
>
```

---

## Expected Outcome

After implementation:
- Click any project from the dashboard to see its full details
- View and manage the complete project lifecycle in one place
- Track milestones from planning through closeout
- Submit and review daily field reports
- Create, approve, and track change orders
- Monitor budget and spending in real-time
- Full audit trail of all project activities

This transforms the Projects module from a simple list into a professional-grade construction project management system.

