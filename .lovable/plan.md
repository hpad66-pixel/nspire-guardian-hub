# APAS OS — Six Enterprise Feature Build Prompts
**For:** Lovable (or any React/Supabase developer)  
**Stack:** React 18 + TypeScript + Vite + Supabase + Tailwind + shadcn/ui + Framer Motion + Recharts  
**Design system:** Deep navy app interior, JetBrains Mono eyebrows, sapphire for action, gold for earned achievement  
**Rule:** Do NOT break any existing functionality. All new features are additive.

---

---

# PROMPT 1 — REGULATORY COMPLIANCE CALENDAR

## What We're Building

A unified compliance calendar that aggregates every time-sensitive regulatory obligation across the entire platform — permits expiring, training certifications lapsing, inspection deadlines, consent order milestones, equipment document renewals, and crew credential expirations — into a single, actionable timeline. This replaces the spreadsheet currently used to track regulatory deadlines.

## New Files to Create

```
src/pages/compliance/ComplianceCalendarPage.tsx
src/hooks/useComplianceEvents.ts
src/components/compliance/CalendarEventCard.tsx
src/components/compliance/CalendarMonthView.tsx
src/components/compliance/CalendarListView.tsx
src/components/compliance/CalendarFilters.tsx
src/components/compliance/ComplianceEventDialog.tsx
src/components/compliance/UpcomingEventsPanel.tsx
```

## New Supabase Table Required

Create this migration in Supabase:

```sql
create table compliance_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  
  title text not null,
  description text,
  
  -- Source: what generated this event
  source_type text not null check (source_type in (
    'permit', 'credential', 'training', 'equipment_doc', 
    'inspection_schedule', 'regulatory_agreement', 'manual'
  )),
  source_id uuid,  -- foreign key to the source record (nullable for manual)
  
  -- Categorization
  category text not null check (category in (
    'permit_renewal', 'license_expiry', 'inspection_due', 
    'training_due', 'certification_expiry', 'regulatory_deadline',
    'reporting_deadline', 'insurance_renewal', 'other'
  )),
  
  -- Regulatory agency (freeform, common values: DERM, HUD, FDEP, City, OSHA, State Fire Marshal)
  agency text,
  
  -- Dates
  due_date date not null,
  reminder_days integer[] default '{90,60,30,14,7}',  -- days before due_date to alert
  
  -- Status
  status text not null default 'upcoming' check (status in (
    'upcoming', 'acknowledged', 'in_progress', 'completed', 'overdue', 'waived'
  )),
  
  -- Priority
  priority text not null default 'medium' check (priority in ('critical', 'high', 'medium', 'low')),
  
  -- Ownership
  assigned_to uuid references profiles(id) on delete set null,
  created_by uuid references profiles(id),
  
  -- Notes
  notes text,
  completion_notes text,
  completed_at timestamptz,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table compliance_events enable row level security;

-- Policy: workspace members can see events for their workspace
create policy "workspace members can view compliance events"
on compliance_events for select
using (
  workspace_id = (select get_my_workspace_id())
);

create policy "workspace members can insert compliance events"
on compliance_events for insert
with check (
  workspace_id = (select get_my_workspace_id())
);

create policy "workspace members can update compliance events"
on compliance_events for update
using (workspace_id = (select get_my_workspace_id()));
```

## Hook: `useComplianceEvents.ts`

```typescript
// Fetch all compliance events, optionally filtered
export function useComplianceEvents(filters?: {
  propertyId?: string;
  status?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
})

// Auto-sync: pull expiry dates from existing tables and upsert into compliance_events
// Sources to pull from:
// - permits table: expiry_date → category='permit_renewal', source_type='permit'
// - credentials table: expiry_date → category='certification_expiry', source_type='credential'
// - equipment_documents table: expiry_date → category='certification_expiry', source_type='equipment_doc'
// - training_assignments table: due_date → category='training_due', source_type='training'
export function useSyncComplianceEvents()

// Stats for the summary bar
export function useComplianceEventStats() 
// returns: { overdue: number, due7Days: number, due30Days: number, due90Days: number, total: number }

export function useCreateComplianceEvent()
export function useUpdateComplianceEvent()
export function useDeleteComplianceEvent()
```

## Page: `ComplianceCalendarPage.tsx`

### Layout

```
┌──────────────────────────────────────────────────────┐
│  EYEBROW: "REGULATORY CALENDAR"                       │
│  H1: Compliance Calendar                              │
│  Sub: All deadlines. One view. Nothing missed.        │
│                                    [+ Add Event] btn  │
├──────────────────────────────────────────────────────┤
│  SUMMARY BAR — 4 stat cards (all clickable filters):  │
│  [🔴 Overdue: N] [🟠 Due 7d: N] [🟡 Due 30d: N] [⚪ Due 90d: N] │
├──────────────────────────────────────────────────────┤
│  FILTER ROW:                                          │
│  [Property ▼] [Category ▼] [Agency ▼] [Status ▼]    │
│                              [Month View] [List View] │
├──────────────────────────────────────────────────────┤
│  LEFT PANEL (70%)          │  RIGHT PANEL (30%)       │
│  Calendar or List view     │  UpcomingEventsPanel     │
│                            │  (next 14 days, always)  │
└──────────────────────────────────────────────────────┤
```

### Month View (`CalendarMonthView.tsx`)

Standard 7-column calendar grid showing the current month. Each day cell shows up to 3 event pills. Events are color-coded:
- Red pill: overdue or ≤7 days
- Amber pill: 8–30 days
- Blue pill: 31–90 days  
- Gray pill: >90 days

Clicking an event pill opens `ComplianceEventDialog.tsx` in view/edit mode.

Navigation: prev/next month arrows. "Today" button.

### List View (`CalendarListView.tsx`)

Grouped by time horizon:
1. **OVERDUE** — red header, all past-due events
2. **THIS WEEK** — next 7 days
3. **THIS MONTH** — 8–30 days
4. **NEXT 90 DAYS** — 31–90 days
5. **FUTURE** — beyond 90 days

Each row: `CalendarEventCard.tsx`
- Left: color bar (urgency color)
- Icon: category icon (Shield for permit, GraduationCap for training, etc.)
- Title, agency badge, property name
- Due date (relative: "in 14 days" + absolute date)
- Assigned person avatar
- Status badge (gold if completed, amber if in_progress, red if overdue)
- Quick actions: Mark Complete button, Edit button

### Right Panel: `UpcomingEventsPanel.tsx`

Always visible. Shows next 14 days of events as a compact list. No filters — raw urgency view. This is what you look at first every morning.

### `ComplianceEventDialog.tsx`

Full create/edit dialog with fields:
- Title (required)
- Category (select — the 9 types above)
- Agency (text input with autocomplete: DERM, HUD, FDEP, City of Opa-locka, OSHA, State Fire Marshal, Miami-Dade County, Other)
- Property (select)
- Due Date (date picker)
- Priority (select: Critical / High / Medium / Low)
- Assigned To (people picker from profiles)
- Reminder Days (multi-select chips: 90, 60, 30, 14, 7, 3, 1)
- Description (textarea)
- Source Reference (freeform text — permit number, CO item number, etc.)
- Status (select)
- Completion Notes (textarea, only visible when status = completed)

Mark Complete button: sets status=completed, completed_at=now(), prompts for completion notes.

## Sidebar Integration

In `AppSidebar.tsx`, add under the "Respond" NavSubLabel section, after Permits:

```tsx
<NavItem 
  to="/compliance-calendar" 
  icon={<CalendarDays />} 
  label="Compliance Calendar" 
  collapsed={collapsed} 
/>
```

## App.tsx Route

```tsx
const ComplianceCalendarPage = lazy(() => import('./pages/compliance/ComplianceCalendarPage'));
// Add inside ProtectedRoute → AppLayout:
<Route path="/compliance-calendar" element={<ComplianceCalendarPage />} />
```

## Auto-Sync Logic

On `ComplianceCalendarPage` mount, call `useSyncComplianceEvents()` which runs a background query to:
1. Pull all `permits` with `expiry_date` not null → upsert into `compliance_events` where `source_type='permit'` and `source_id=permit.id`. Use `on conflict (source_type, source_id) do update` so it doesn't duplicate.
2. Pull all `credentials` with `expiry_date` → same upsert pattern.
3. Pull all `training_assignments` with `due_date` → same pattern.

This means the calendar self-populates from data already in the system. Manual events are additive on top.

---

---

# PROMPT 2 — RISK REGISTER

## What We're Building

A structured risk management module. Every open risk on every property is logged, categorized, owned, and tracked. Risks link to mitigations, which link to actions, which link to status. The output is a risk register report that an owner or PE can sign off on in a board meeting or regulatory audit.

## New Files to Create

```
src/pages/risk/RiskRegisterPage.tsx
src/hooks/useRisks.ts
src/components/risk/RiskCard.tsx
src/components/risk/RiskDialog.tsx
src/components/risk/RiskMatrix.tsx
src/components/risk/RiskMitigationPanel.tsx
src/components/risk/RiskStatusBadge.tsx
src/components/risk/RiskRegisterTable.tsx
src/components/risk/RiskExportDialog.tsx
```

## New Supabase Table

```sql
create table risks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  
  -- Identity
  risk_number serial,  -- auto-incrementing display ID: RISK-001, RISK-002
  title text not null,
  description text,
  
  -- Classification
  category text not null check (category in (
    'regulatory',    -- DERM, HUD, DEP, City violations, consent orders
    'financial',     -- budget overruns, contractor defaults, liens
    'safety',        -- OSHA, site safety, injury potential
    'schedule',      -- project delays, permit delays, contractor delays
    'environmental', -- stormwater, groundwater, soil contamination
    'legal',         -- litigation, contract disputes, liability
    'operational',   -- system failures, utility outages, staffing
    'reputational'   -- tenant relations, community, media
  )),
  
  -- Risk scoring (5x5 matrix)
  probability integer check (probability between 1 and 5),  -- 1=Rare, 5=Almost Certain
  impact integer check (impact between 1 and 5),            -- 1=Insignificant, 5=Catastrophic
  -- risk_score is computed: probability * impact (1–25)
  
  -- Status
  status text not null default 'open' check (status in (
    'identified',   -- logged, not yet assessed
    'open',         -- assessed, mitigation not started
    'mitigating',   -- mitigation actions in progress
    'monitoring',   -- mitigation complete, watching
    'closed',       -- risk resolved
    'accepted'      -- risk accepted with no mitigation (documented decision)
  )),
  
  -- Ownership and review
  risk_owner uuid references profiles(id) on delete set null,
  review_date date,  -- next scheduled review
  
  -- Source linkage (optional — risk can be linked to an existing record)
  source_type text check (source_type in (
    'permit', 'issue', 'project', 'inspection', 'compliance_event', 'manual'
  )),
  source_id uuid,
  
  -- Mitigation
  mitigation_strategy text,  -- the plan
  
  -- Closure
  closed_at timestamptz,
  closure_notes text,
  closed_by uuid references profiles(id),
  
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table risk_actions (
  id uuid primary key default gen_random_uuid(),
  risk_id uuid references risks(id) on delete cascade,
  workspace_id uuid references workspaces(id) on delete cascade,
  
  title text not null,
  description text,
  assigned_to uuid references profiles(id) on delete set null,
  due_date date,
  
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'cancelled')),
  completed_at timestamptz,
  completion_notes text,
  
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- RLS policies (same workspace pattern as above)
alter table risks enable row level security;
alter table risk_actions enable row level security;

create policy "workspace members can manage risks"
on risks for all
using (workspace_id = (select get_my_workspace_id()))
with check (workspace_id = (select get_my_workspace_id()));

create policy "workspace members can manage risk_actions"
on risk_actions for all
using (workspace_id = (select get_my_workspace_id()))
with check (workspace_id = (select get_my_workspace_id()));
```

## Hook: `useRisks.ts`

```typescript
export function useRisks(filters?: { propertyId?: string; category?: string; status?: string })
export function useRisk(id: string)
export function useRiskActions(riskId: string)
export function useCreateRisk()
export function useUpdateRisk()
export function useCloseRisk()
export function useCreateRiskAction()
export function useUpdateRiskAction()

// Derived stats
export function useRiskStats()
// returns: { 
//   total, open, critical (score ≥ 20), high (15–19), medium (8–14), low (≤7),
//   byCategory: Record<string, number>,
//   overdue: number (open risks past review_date)
// }
```

## Page: `RiskRegisterPage.tsx`

### Layout

```
┌──────────────────────────────────────────────────────┐
│  EYEBROW: "RISK MANAGEMENT"                           │
│  H1: Risk Register                                    │
│  Sub: Identify. Own. Mitigate. Close.                 │
│                         [Export PDF] [+ Log Risk] btn │
├──────────────────────────────────────────────────────┤
│  SUMMARY BAR:                                         │
│  [🔴 Critical: N] [🟠 High: N] [🟡 Medium: N] [⚪ Low: N] [✅ Closed: N] │
├──────────────────────────────────────────────────────┤
│  LEFT PANEL (65%)          │  RIGHT PANEL (35%)       │
│  RiskRegisterTable         │  RiskMatrix (5×5 grid)   │
│  (filterable)              │  + Category breakdown    │
└──────────────────────────────────────────────────────┘
│  Clicking a row → opens RiskDetailSheet (slide-in)    │
└──────────────────────────────────────────────────────┘
```

### `RiskMatrix.tsx`

Classic 5×5 probability vs. impact heat map.
- Axes: Probability (Y: Rare→Almost Certain) and Impact (X: Insignificant→Catastrophic)
- Cell colors: 1–6=green, 7–12=amber, 13–19=orange, 20–25=red
- Each cell shows a count bubble of risks in that cell
- Clicking a cell filters the table to show only risks at that score
- Each axis label uses JetBrains Mono

### `RiskRegisterTable.tsx`

A sortable, filterable table. Columns:
| # | Risk Title | Category | Property | P | I | Score | Status | Owner | Review Due |
|---|---|---|---|---|---|---|---|---|---|

- Score column: colored badge (red 20–25, orange 13–19, amber 7–12, green ≤6)
- Status: `RiskStatusBadge.tsx` — gold for closed/accepted, blue for mitigating, amber for open, gray for identified
- Overdue review dates shown in red
- Click row → open risk detail slide-in sheet

### `RiskDialog.tsx` — Create/Edit

Full-width dialog. Two columns:
**Left column:**
- Title
- Category (select with icons)
- Property (select)
- Description (textarea)
- Source Link (select source_type + paste/select source_id — optional)

**Right column:**
- Probability (1–5 slider with labels: Rare / Unlikely / Possible / Likely / Almost Certain)
- Impact (1–5 slider with labels: Insignificant / Minor / Moderate / Major / Catastrophic)
- **Risk Score display** (auto-computed: P×I, color-coded, large)
- Risk Owner (person picker)
- Review Date (date picker)
- Status (select)

**Bottom section (full width):**
- Mitigation Strategy (rich textarea)

### `RiskMitigationPanel.tsx`

Shown in the risk detail sheet after the main risk info. Shows all `risk_actions` for this risk. Each action card:
- Title, description, assigned person, due date
- Status badge (gold for completed)
- Complete button (marks completed, prompts for notes)

Add action button opens inline mini-form.

### Risk Detail Sheet

Slide-in sheet (not a dialog — use Sheet component). Full detail view showing:
1. Risk header (number, title, category badge, score badge, status badge)
2. Two-column: description + matrix position visual
3. Mitigation strategy
4. Risk Actions panel (`RiskMitigationPanel`)
5. History/audit: created by, updated at
6. Action bar: Edit | Close Risk | Add Action

Closing a risk: prompts for closure notes. Sets status=closed, closed_at=now().

### Export Dialog (`RiskExportDialog.tsx`)

Opens when "Export PDF" is clicked. Simple dialog with options:
- Filter: All risks / Open only / Critical and High only
- Include: Mitigation details (checkbox) / Closed risks (checkbox) / Actions (checkbox)
- Property filter (select)

On confirm, generates a printable HTML table formatted as a professional risk register report. Trigger `window.print()` on the formatted content.

## Sidebar Integration

Under the same "Respond" section in AppSidebar.tsx, after Compliance Calendar:

```tsx
<NavItem 
  to="/risk-register" 
  icon={<ShieldAlert />} 
  label="Risk Register" 
  collapsed={collapsed} 
/>
```

## App.tsx Route

```tsx
const RiskRegisterPage = lazy(() => import('./pages/risk/RiskRegisterPage'));
<Route path="/risk-register" element={<RiskRegisterPage />} />
```

---

---

# PROMPT 3 — CORRECTIVE ACTION TRACKER (Regulatory Non-Compliance)

## What We're Building

A structured tracker for any formal regulatory non-compliance document — DERM consent orders, DEP consent agreements, HUD corrective action plans, City violation notices, NOVs, fire marshal citations, EPA orders — anything from any agency that requires a documented response and compliance timeline. Each document is logged, each required action tracked item by item, evidence attached, and a compliance status computed automatically. This is your regulatory accountability system.

## New Files to Create

```
src/pages/compliance/CorrectiveActionPage.tsx
src/hooks/useCorrectiveActions.ts
src/components/corrective-actions/RegulatoryDocumentCard.tsx
src/components/corrective-actions/RegulatoryDocumentDialog.tsx
src/components/corrective-actions/ActionItemRow.tsx
src/components/corrective-actions/ActionItemDialog.tsx
src/components/corrective-actions/ComplianceProgressBar.tsx
src/components/corrective-actions/EvidenceUploadSheet.tsx
src/components/corrective-actions/AgencyBadge.tsx
src/components/corrective-actions/CorrectiveActionExport.tsx
```

## New Supabase Tables

```sql
-- The regulatory document (consent order, NOV, corrective action plan, etc.)
create table regulatory_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  
  -- Identity
  doc_number text,  -- e.g. "DERM-2024-0234", "NOV-23-004512"
  title text not null,
  description text,
  
  -- Type
  doc_type text not null check (doc_type in (
    'consent_order',         -- DERM, DEP
    'consent_agreement',     -- DEP
    'corrective_action_plan',-- HUD, NSPIRE
    'notice_of_violation',   -- City, OSHA, Fire Marshal
    'administrative_order',  -- Any agency
    'citation',              -- Code enforcement
    'warning_letter',        -- Pre-enforcement
    'compliance_schedule',   -- Negotiated timeline
    'other'
  )),
  
  -- Issuing agency
  agency text not null,  -- DERM, HUD, FDEP, City of Opa-locka, OSHA, State Fire Marshal, EPA, Miami-Dade, Other
  agency_contact_name text,
  agency_contact_email text,
  agency_contact_phone text,
  
  -- Case reference
  case_number text,
  
  -- Key dates
  issued_date date,
  effective_date date,
  final_compliance_date date,  -- the hard deadline
  
  -- Status (auto-computed based on action items, but can be overridden)
  status text not null default 'active' check (status in (
    'active',       -- in progress, compliance actions ongoing
    'compliant',    -- all items closed, awaiting agency confirmation
    'closed',       -- agency confirmed compliance, case closed
    'appealing',    -- formal appeal in process
    'overdue'       -- past final_compliance_date with open items
  )),
  
  -- Financial exposure
  penalty_amount numeric(12,2),
  daily_fine numeric(10,2),  -- per-day fine if non-compliant
  
  -- Document attachment
  document_url text,  -- link to uploaded PDF
  
  -- Ownership
  assigned_to uuid references profiles(id),
  created_by uuid references profiles(id),
  
  notes text,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Individual required actions within the document
create table regulatory_action_items (
  id uuid primary key default gen_random_uuid(),
  regulatory_document_id uuid references regulatory_documents(id) on delete cascade,
  workspace_id uuid references workspaces(id) on delete cascade,
  
  -- Identity
  item_number text,  -- e.g. "Item 1", "Section 3.b", "Finding #7"
  title text not null,
  description text,  -- exact language from the document
  
  -- Compliance requirement
  required_action text,  -- what must be done
  acceptance_criteria text,  -- how agency will verify compliance
  
  -- Dates
  due_date date,
  
  -- Status
  status text not null default 'open' check (status in (
    'open',         -- not started
    'in_progress',  -- work underway
    'submitted',    -- response submitted to agency, awaiting confirmation
    'closed',       -- agency confirmed, item satisfied
    'waived',       -- agency granted waiver
    'disputed'      -- we dispute this finding
  )),
  
  -- Ownership
  assigned_to uuid references profiles(id),
  
  -- Linkage to other modules
  linked_permit_id uuid references permits(id),
  linked_project_id uuid references projects(id) on delete set null,
  linked_issue_id uuid references issues(id) on delete set null,
  
  -- Evidence
  -- (stored in regulatory_evidence table below)
  
  -- Notes
  notes text,
  completion_notes text,
  completed_at timestamptz,
  completed_by uuid references profiles(id),
  
  sort_order integer default 0,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Evidence/documentation attached to action items
create table regulatory_evidence (
  id uuid primary key default gen_random_uuid(),
  action_item_id uuid references regulatory_action_items(id) on delete cascade,
  workspace_id uuid references workspaces(id) on delete cascade,
  
  title text not null,
  description text,
  
  evidence_type text check (evidence_type in (
    'photo', 'document', 'report', 'permit', 'test_result', 
    'inspection_report', 'letter', 'email', 'other'
  )),
  
  file_url text,
  file_name text,
  
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz default now()
);

-- RLS
alter table regulatory_documents enable row level security;
alter table regulatory_action_items enable row level security;
alter table regulatory_evidence enable row level security;

create policy "workspace members can manage regulatory_documents"
on regulatory_documents for all
using (workspace_id = (select get_my_workspace_id()))
with check (workspace_id = (select get_my_workspace_id()));

create policy "workspace members can manage regulatory_action_items"
on regulatory_action_items for all
using (workspace_id = (select get_my_workspace_id()))
with check (workspace_id = (select get_my_workspace_id()));

create policy "workspace members can manage regulatory_evidence"
on regulatory_evidence for all
using (workspace_id = (select get_my_workspace_id()))
with check (workspace_id = (select get_my_workspace_id()));
```

## Hook: `useCorrectiveActions.ts`

```typescript
export function useRegulatoryDocuments(propertyId?: string)
export function useRegulatoryDocument(id: string)
// includes nested: action_items with evidence count, assigned_to profile
export function useRegulatoryActionItems(documentId: string)
export function useRegulatoryEvidence(actionItemId: string)

export function useCreateRegulatoryDocument()
export function useUpdateRegulatoryDocument()
export function useCreateActionItem()
export function useUpdateActionItem()
export function useCloseActionItem()  // sets status=closed, completed_at, prompts evidence
export function useUploadEvidence()

// Auto-compute: if all action items are closed → doc status = 'compliant'
// This should be a computed field or a trigger
export function useCorrectiveActionStats()
// returns: { totalDocs, activeDocs, overdueItems, closedThisMonth, totalExposure }
```

## Page: `CorrectiveActionPage.tsx`

### Layout — Two Levels

**Level 1 (document list):** Shows all regulatory documents as cards
**Level 2 (document detail):** Click a card → expand in-page (or navigate to /corrective-actions/:id) to show all action items

```
┌──────────────────────────────────────────────────────┐
│  EYEBROW: "REGULATORY COMPLIANCE"                     │
│  H1: Corrective Actions                               │
│  Sub: Every agency document. Every required action.   │
│                               [+ Add Document] btn    │
├──────────────────────────────────────────────────────┤
│  SUMMARY BAR:                                         │
│  [Active Documents: N] [Overdue Items: N] [Open Items: N] [Financial Exposure: $X] │
├──────────────────────────────────────────────────────┤
│  FILTER: [Property ▼] [Agency ▼] [Type ▼] [Status ▼] │
├──────────────────────────────────────────────────────┤
│  DOCUMENT CARDS (vertical stack)                      │
│  Each card shows → click to expand detail panel below │
└──────────────────────────────────────────────────────┘
```

### `RegulatoryDocumentCard.tsx`

Each card shows:
- **Left stripe:** Color-coded by urgency (days to final_compliance_date)
- **`AgencyBadge.tsx`** — colored pill with agency name (each agency gets a consistent color: DERM=teal, HUD=blue, FDEP=green, OSHA=orange, City=gray)
- Document type badge (JetBrains Mono)
- Document title (bold) + case number
- Property name
- Issued date | Final Compliance Date (red if <30 days or past)
- `ComplianceProgressBar.tsx` — horizontal bar showing X/Y items closed (green fill, gold when 100%)
- Financial exposure (if penalty_amount or daily_fine set) — shown in amber
- Assigned to avatar
- Status badge (gold if closed/compliant)
- Expand button → shows action items below

### Expanded Document Detail (in-page accordion)

When a document card is expanded, show below it:
- Full description
- Agency contact info (if set)
- Action items table

### Action Items Table

Columns: Item # | Required Action | Assigned To | Due Date | Evidence | Status

Each row:
- Left: sort handle (drag to reorder)
- Item number (JetBrains Mono)
- Required action title (click → opens ActionItemDialog for detail)
- Assigned person avatar + name
- Due date (relative + absolute, red if overdue)
- Evidence count badge (📎 3 files) — click to open EvidenceUploadSheet
- Status badge: gold for closed/waived, blue for submitted, amber for in_progress, gray for open
- Quick status button: "Mark Submitted" / "Mark Closed" depending on current status

"Add Action Item" row at the bottom of the table.

### `ActionItemDialog.tsx`

Full detail dialog for a single action item:
- Item number + title
- Description (from document)
- Required action (what must be done)
- Acceptance criteria (how agency will verify)
- Due date + assigned to
- Status select
- Links to: Permit / Project / Issue (optional linkage)
- Completion notes (textarea)
- Evidence panel: list of attached files + upload button

### `EvidenceUploadSheet.tsx`

Slide-in sheet for uploading evidence against an action item:
- List of existing evidence files (title, type badge, uploaded by/when, download link, delete)
- Upload new: title, evidence_type select, file upload (to Supabase Storage)
- Evidence types: Photo, Document, Report, Permit, Test Result, Inspection Report, Letter/Email, Other

### Export

"Export PDF" button generates a printable HTML compliance summary:
- Document header (agency, type, case number, property, dates)
- Financial exposure summary
- Action items table with status and evidence count
- Compliance percentage
- Prepared by / date
Print via `window.print()`.

## Sidebar Integration

In AppSidebar.tsx, add a new section label after Permits in the "Respond" zone:

```tsx
<NavSubLabel label="Compliance" />
<NavItem 
  to="/compliance-calendar" 
  icon={<CalendarDays />} 
  label="Compliance Calendar" 
  collapsed={collapsed} 
/>
<NavItem 
  to="/corrective-actions" 
  icon={<Gavel />} 
  label="Corrective Actions" 
  collapsed={collapsed} 
/>
<NavItem 
  to="/risk-register" 
  icon={<ShieldAlert />} 
  label="Risk Register" 
  collapsed={collapsed} 
/>
```

## App.tsx Route

```tsx
const CorrectiveActionPage = lazy(() => import('./pages/compliance/CorrectiveActionPage'));
<Route path="/corrective-actions" element={<CorrectiveActionPage />} />
<Route path="/corrective-actions/:id" element={<CorrectiveActionPage />} />
```

---

---

# PROMPT 4 — OWNER'S EXECUTIVE DASHBOARD (Portfolio Score)

## What We're Building

A dedicated page at `/reports/executive` that serves two modes:
1. **Dashboard Mode** — live data panel showing Portfolio Score (0–100), critical alerts, KPIs, active projects, and analytics charts. This is what Hardeep opens every morning.
2. **Presentation Mode** — full-screen animated 10-slide deck for client presentations. Same data, executive visual format.

This is the highest-visibility feature. It is what the client (Chris Sullivan at R4 Capital) sees. It justifies the platform fee more visibly than anything else.

## New Files to Create

```
src/pages/reports/ExecutiveSuitePage.tsx
src/hooks/useExecutiveDashboard.ts
src/components/executive/PortfolioScoreCard.tsx
src/components/executive/CriticalAlertBanner.tsx
src/components/executive/ExecutiveKPIRow.tsx
src/components/executive/ActiveProjectsTable.tsx
src/components/executive/ActivityFeedPanel.tsx
src/components/executive/MonthlyInspectionsChart.tsx
src/components/executive/IssueStatusDonut.tsx
src/components/executive/AnimatedNumber.tsx
src/components/executive/ExecutivePresentationMode.tsx
src/components/executive/slides/Slide01Hero.tsx
src/components/executive/slides/Slide02Problem.tsx
src/components/executive/slides/Slide03Solution.tsx
src/components/executive/slides/Slide04LiveData.tsx
src/components/executive/slides/Slide05Access.tsx
src/components/executive/slides/Slide06ValueCase.tsx
src/components/executive/slides/Slide07Compliance.tsx
src/components/executive/slides/Slide08Architecture.tsx
src/components/executive/slides/Slide09Analytics.tsx
src/components/executive/slides/Slide10CTA.tsx
```

## Hook: `useExecutiveDashboard.ts`

```typescript
// Aggregates data from multiple existing hooks into one executive view
export function useExecutiveDashboard() {
  // pulls from: useProjects, useIssues, useWorkOrders, useInspectionStats,
  //             usePermits, useRisks (new), useComplianceEvents (new)
  
  // Returns:
  return {
    portfolioScore: number,     // 0–100, computed (see formula below)
    scoreBreakdown: {
      inspections: number,       // % of units inspected this cycle (weight: 40%)
      compliance: number,        // % permits active/current (weight: 30%)
      maintenance: number,       // % work orders not overdue (weight: 20%)
      projects: number,          // % projects not behind schedule (weight: 10%)
    },
    alerts: {
      overdueWorkOrders: number,
      expiredPermits: number,
      openCriticalIssues: number,
      overdueComplianceItems: number,
      criticalRisks: number,
    },
    kpis: {
      totalProperties: number,
      openIssues: number,
      activeProjects: number,
      complianceRate: number,     // % permits active vs total
    },
    activeProjects: Project[],   // top 5 by urgency
    recentActivity: ActivityItem[],
    monthlyInspections: { month: string; count: number }[],  // last 6 months
    issueStatusBreakdown: { status: string; count: number; color: string }[],
  }
}
```

**Portfolio Score Formula:**
```
portfolioScore = (
  (inspectedUnits / totalUnits) * 40 +      // Inspection coverage
  (activePermits / totalPermits) * 30 +      // Compliance rate
  (nonOverdueWOs / totalWOs) * 20 +          // Maintenance health
  (onScheduleProjects / totalProjects) * 10  // Project health
)
// Clamped 0–100. Missing data treated as 0 for that component.
```

## Page: `ExecutiveSuitePage.tsx`

Two render modes controlled by a `useState<'dashboard' | 'presentation'>`. Default is `'dashboard'`.

### Dashboard Mode Layout

```
┌──────────────────────────────────────────────────────┐
│  EYEBROW: "PORTFOLIO COMMAND"                         │
│  H1: Executive Suite    [🖥 Start Presentation] btn   │
├──────────────────────────────────────────────────────┤
│  CriticalAlertBanner (conditional — red, if alerts > 0) │
├──────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────────────────────┐  │
│  │ PortfolioScore│  │ ExecutiveKPIRow (4 cards)    │  │
│  │ Card (hero)  │  │                              │  │
│  └──────────────┘  └──────────────────────────────┘  │
├──────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐  ┌────────────────────┐ │
│  │ ActiveProjectsTable     │  │ ActivityFeedPanel  │ │
│  │ (60% width)             │  │ (40% width)        │ │
│  └─────────────────────────┘  └────────────────────┘ │
├──────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐  ┌────────────────────┐ │
│  │ MonthlyInspectionsChart │  │ IssueStatusDonut   │ │
│  └─────────────────────────┘  └────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### `PortfolioScoreCard.tsx`

Hero element — large and visually dominant:
- Giant score number (font-size: 72px, DM Sans bold, letterSpacing: -0.04em)
- Color: green if ≥80, amber if 60–79, red if <60 (applies to the number AND a subtle glow)
- "Portfolio Score" label in JetBrains Mono eyebrow style
- Donut progress ring around the number
- Score breakdown: 4 sub-rows showing each component percentage with a tiny progress bar
- Last updated timestamp (JetBrains Mono, muted)

### `CriticalAlertBanner.tsx`

Only renders when any alert count > 0. Red background stripe:
- AlertTriangle icon (animated pulse)
- Text: "X critical items require immediate attention" (lists what they are)
- "View All" button → navigates to issues/work orders as appropriate
- Dismiss button (X) → hides for current session only

### `ExecutiveKPIRow.tsx`

4 stat cards in a row, each with:
- Icon (colored per category)
- Value (large, `AnimatedNumber` counting up on page load)
- Label
- Trend arrow (if data available)

Cards: Total Properties | Open Issues | Active Projects | Compliance Rate

### `AnimatedNumber.tsx`

Reusable component. Props: `{ value: number; duration?: number; prefix?: string; suffix?: string }`.
Counts up from 0 to `value` over `duration` ms using `requestAnimationFrame`. Only runs once on mount (or when value changes significantly).

### `ActiveProjectsTable.tsx`

Card with title "Active Projects". Top 5 projects by urgency (overdue first, then by end date).

Table rows:
- Project name (link to /projects/:id)
- Property
- Health dot (green/amber/red based on schedule variance)
- Budget progress bar (spent/budget ratio, red if over)
- End date (relative)
- Status badge

### `ActivityFeedPanel.tsx`

Card with title "Recent Activity". Last 10 cross-module activity items. Pull from `activity_log` table.
Each item:
- Action icon (colored by type: create=sapphire, update=amber, complete=emerald)
- "[User] [action] [entity]" text
- Relative timestamp (JetBrains Mono)

Scrollable. No load more — just last 10.

### `MonthlyInspectionsChart.tsx`

Recharts `BarChart`. 6-month rolling window. Each bar = count of inspections completed that month. Fill color: `var(--apas-sapphire)`. Clean axes in Inter font, no grid lines except horizontal. Tooltip on hover.

### `IssueStatusDonut.tsx`

Recharts `PieChart` (donut). Shows issue count by status. Colors: open=red, in_progress=amber, resolved=emerald, closed=gold. Center label: total count + "Issues". Legend to the right.

### Presentation Mode

When "Start Presentation" is clicked:
- Use `createPortal` to render full-screen overlay (z-index 9999, position fixed)
- Black background (#090D17)
- Top controls bar: APAS OS logo + slide counter (02/10) + prev/next buttons + auto-play toggle (30s interval) + [Exit] button
- Bottom: slide indicator dots (active dot expands to rectangle)
- Keyboard: Space/ArrowRight=next, ArrowLeft=prev, Escape=exit
- Each slide is a full-screen Framer Motion component

Each slide uses this pattern:
```tsx
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }
};
```

Each slide has:
- Left accent bar (6px wide, full height, position absolute left-0, color varies by slide)
- Top-left tag (JetBrains Mono, 10px, 0.25em tracking, uppercase)
- Headline (Lora serif, 34px, bold)
- Content

**Slide content specifications:**

Slide 1 (Hero): sapphire bar. "APAS OS" + "One Platform. Every Property. Complete Control." iPhone mockup with floating animation on right.

Slide 2 (The Problem): rose bar. "THE CHALLENGE" tag. 3 problem cards: Fragmented Operations, No Visibility at Scale, Compliance Exposure.

Slide 3 (The Solution): sapphire bar. "THE PLATFORM" tag. 2×3 grid of module cards (Inspections, Projects, Permits, Risk, Compliance, Reports).

Slide 4 (Live Data): emerald bar. "LIVE DATA" tag. Pulls REAL data from `useExecutiveDashboard()`. Shows portfolio score, project count, issue count, compliance rate. Property name in headline. This is the proof slide.

Slide 5 (Mobile Access): violet bar. "ANYWHERE ACCESS" tag. 3 device frames side by side (dashboard, inspection, field).

Slide 6 (Value Case): emerald bar. "THE ROI" tag. 4 big stat cards with AnimatedNumber: 200+ Properties, 40% Faster, ∞ Audit Trail, $0 Travel. Before/After comparison table.

Slide 7 (Compliance Engine): amber bar. "COMPLIANCE ENGINE" tag. 5-node flow diagram: Property → Inspection → Defect → Work Order → Verified. Animated connection lines. 4 agency badges: DERM, HUD, FDEP, City.

Slide 8 (Architecture): sapphire bar. "THE PLATFORM" tag. 3 horizontal layer bars sliding in from left: Field Layer (emerald), Operations Layer (sapphire), Intelligence Layer (amber).

Slide 9 (Analytics): sapphire bar. "INTELLIGENCE" tag. Shows real Recharts bar chart + donut chart from dashboard data.

Slide 10 (CTA): Full-width sapphire header. "APAS OS — The intelligent OS for serious property owners." 6 deliverable bullets. Contact: apasos.ai | hardeep@apas.ai. Keyboard hint in JetBrains Mono.

## Sidebar + Route

```tsx
// AppSidebar.tsx — under Reports
<NavItem to="/reports/executive" icon={<LayoutDashboard />} label="Executive Suite" collapsed={collapsed} />

// App.tsx
const ExecutiveSuitePage = lazy(() => import('./pages/reports/ExecutiveSuitePage'));
<Route path="/reports/executive" element={<ExecutiveSuitePage />} />
```

---

---

# PROMPT 5 — SLA & ESCALATION ENGINE

## What We're Building

A configurable rules engine that makes the platform proactive. When critical items go unacknowledged or stale — emergency work orders, severe NSPIRE defects, overdue compliance items, critical risks — the system automatically escalates via in-app notifications and pushes to the right people. No more relying on someone to check the dashboard. The system chases them.

## New Files to Create

```
src/pages/settings/EscalationRulesPage.tsx
src/hooks/useEscalationRules.ts
src/hooks/useEscalationEngine.ts
src/components/escalation/EscalationRuleCard.tsx
src/components/escalation/EscalationRuleDialog.tsx
src/components/escalation/EscalationTestPanel.tsx
src/components/escalation/EscalationHistoryLog.tsx
```

## New Supabase Tables

```sql
create table escalation_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  
  name text not null,
  description text,
  is_active boolean default true,
  
  -- Trigger: what condition fires this rule
  trigger_entity text not null check (trigger_entity in (
    'work_order', 'issue', 'compliance_event', 'risk', 
    'permit', 'inspection', 'regulatory_action_item'
  )),
  
  -- Condition on the entity
  trigger_condition jsonb not null,
  -- Examples:
  -- { "field": "priority", "operator": "equals", "value": "emergency" }
  -- { "field": "severity", "operator": "equals", "value": "severe" }
  -- { "field": "status", "operator": "equals", "value": "open" }
  -- { "field": "status", "operator": "not_in", "value": ["completed", "verified", "closed"] }
  
  -- Time delay: how long the condition must persist before escalation fires
  delay_hours integer not null default 2,
  -- e.g. 2 = "if still unacknowledged after 2 hours, escalate"
  
  -- Who to notify
  notify_roles text[] default '{}',  -- ['admin', 'owner', 'manager', 'superintendent']
  notify_user_ids uuid[] default '{}',  -- specific users always notified
  
  -- How to notify
  notification_channel text[] default '{"in_app"}' check (
    notification_channel <@ ARRAY['in_app', 'email']::text[]
  ),
  
  -- Escalation message template
  message_template text,
  -- Supports tokens: {entity_type}, {entity_title}, {hours_elapsed}, {assigned_to}, {property}
  
  -- Stop escalating once this condition is met
  resolution_condition jsonb,
  -- e.g. { "field": "status", "operator": "in", "value": ["completed", "verified", "closed"] }
  
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table escalation_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  rule_id uuid references escalation_rules(id) on delete set null,
  rule_name text,  -- snapshot at time of firing
  
  entity_type text not null,
  entity_id uuid not null,
  entity_title text,
  
  -- Who was notified
  notified_user_ids uuid[] default '{}',
  notification_channels text[] default '{}',
  
  fired_at timestamptz default now(),
  resolved_at timestamptz,
  
  -- Was it acknowledged?
  acknowledged_by uuid references profiles(id),
  acknowledged_at timestamptz
);

-- RLS
alter table escalation_rules enable row level security;
alter table escalation_log enable row level security;

create policy "workspace members can manage escalation_rules"
on escalation_rules for all
using (workspace_id = (select get_my_workspace_id()))
with check (workspace_id = (select get_my_workspace_id()));

create policy "workspace members can view escalation_log"
on escalation_log for select
using (workspace_id = (select get_my_workspace_id()));
```

## Hook: `useEscalationRules.ts`

```typescript
export function useEscalationRules()
export function useCreateEscalationRule()
export function useUpdateEscalationRule()
export function useDeleteEscalationRule()
export function useEscalationLog(filters?: { entityType?: string; dateFrom?: string })
```

## Hook: `useEscalationEngine.ts`

This is the core engine. Run on dashboard load and on a 15-minute polling interval.

```typescript
export function useEscalationEngine() {
  // Runs all active escalation rules against current data
  // For each rule:
  //   1. Query entities matching trigger_entity + trigger_condition
  //   2. For each matching entity, check if created_at or last_updated is > delay_hours ago
  //   3. Check escalation_log: has this entity+rule combination already been escalated?
  //      - If yes and not resolved: skip (don't spam)
  //      - If yes and resolved: re-check based on rule settings
  //      - If no: fire escalation
  //   4. Firing escalation:
  //      - Insert notification(s) into notifications table for each notify_user_id
  //      - Insert record into escalation_log
  //   5. Check resolution_condition — if entity now meets it, mark escalation_log.resolved_at
  
  // Returns: { escalationsChecked, escalationsFired, activeEscalations }
}
```

**Implementation note:** The engine runs client-side using React Query with a `refetchInterval: 15 * 60 * 1000`. It is not a Supabase Edge Function — it runs in the browser. This is acceptable for the current scale. It only fires notifications via Supabase inserts into the existing `notifications` table.

## Page: `EscalationRulesPage.tsx`

Lives under Settings. Route: `/settings/escalation`.

### Layout

```
┌──────────────────────────────────────────────────────┐
│  EYEBROW: "AUTOMATION"                                │
│  H1: Escalation Rules                                 │
│  Sub: The system that ensures nothing stays ignored.  │
│                              [+ New Rule] btn         │
├──────────────────────────────────────────────────────┤
│  STATS: [Active Rules: N] [Escalations Today: N] [Avg Response Time: Xh] │
├──────────────────────────────────────────────────────┤
│  RULE CARDS (stacked)                                 │
├──────────────────────────────────────────────────────┤
│  ESCALATION HISTORY LOG (last 30 days, filterable)    │
└──────────────────────────────────────────────────────┘
```

### Pre-Built Default Rules

When a workspace is created (or when this page is first opened with no rules), seed these 5 default rules automatically:

1. **Emergency Work Order — 2 Hour Response**
   - Trigger: work_order where priority=emergency AND status=open
   - Delay: 2 hours
   - Notify: admin, owner, manager
   - Message: "Emergency work order '{entity_title}' at {property} has been open for {hours_elapsed} hours without acknowledgment."

2. **Severe NSPIRE Defect — 48 Hour Assignment**
   - Trigger: issue where severity=severe AND status=open AND source=nspire
   - Delay: 48 hours
   - Notify: admin, owner
   - Message: "Severe NSPIRE defect '{entity_title}' has been unassigned for {hours_elapsed} hours."

3. **Permit Expiring — 30 Days**
   - Trigger: compliance_event where category=permit_renewal AND status=upcoming AND due_date within 30 days
   - Delay: 0 (immediate — fires when permit enters 30-day window)
   - Notify: admin, owner
   - Message: "Permit '{entity_title}' expires in 30 days. Action required."

4. **Critical Risk No Mitigation — 7 Days**
   - Trigger: risk where (probability × impact) ≥ 20 AND status=open
   - Delay: 168 hours (7 days)
   - Notify: admin, owner
   - Message: "Critical risk '{entity_title}' has been open for {hours_elapsed} hours with no mitigation actions."

5. **Overdue Regulatory Action Item**
   - Trigger: regulatory_action_item where due_date < today AND status not in (closed, waived)
   - Delay: 0 (immediate when it becomes overdue)
   - Notify: admin, owner, assigned_to
   - Message: "Regulatory action item '{entity_title}' is now overdue. Compliance deadline was {due_date}."

### `EscalationRuleCard.tsx`

Each rule shown as a card:
- Status toggle (active/inactive) — large, visible, first thing you see
- Rule name (bold)
- Trigger description: "[entity_type] where [condition] for [delay_hours] hours"
- Notify: role badges
- Last fired: relative timestamp (or "Never")
- Edit button | Delete button

### `EscalationRuleDialog.tsx`

Create/edit dialog. Three sections:

**Section 1 — Trigger**
- Entity type (select: Work Order / Issue / Compliance Event / Risk / Permit / Regulatory Action Item)
- Condition field (select — populates based on entity type selected):
  - Work Order: priority=emergency, priority=urgent, status=open, status=pending_approval
  - Issue: severity=severe, severity=moderate, status=open
  - Compliance Event: days_until_due ≤ N (number input appears)
  - Risk: risk_score ≥ N (number input), status=open
  - Permit: days_until_expiry ≤ N
  - Regulatory Action Item: is_overdue=true, status=open
- Time delay (number input + "hours" label)

**Section 2 — Notification**
- Notify roles (multi-select checkboxes: Admin / Owner / Manager / Superintendent / Inspector)
- Message template (textarea with token hints shown below: {entity_title}, {property}, {hours_elapsed}, {assigned_to})

**Section 3 — Resolution**
- Resolution condition (select): "When status changes to: [select status values]"
- Rule name + description

### `EscalationHistoryLog.tsx`

Table of escalation_log entries:
- Date/time fired (JetBrains Mono)
- Rule name
- Entity: type + title (linked)
- Notified users (avatars)
- Status: Active (red dot) / Resolved (gold dot) / Acknowledged (green dot)
- Time to resolve (if resolved)

## Sidebar Integration

In the Settings section of AppSidebar.tsx:
```tsx
<NavItem 
  to="/settings/escalation" 
  icon={<Bell />} 
  label="Escalation Rules" 
  collapsed={collapsed} 
/>
```

## App.tsx Route

```tsx
const EscalationRulesPage = lazy(() => import('./pages/settings/EscalationRulesPage'));
<Route path="/settings/escalation" element={<EscalationRulesPage />} />
```

## Engine Integration

In `Dashboard.tsx` (the main dashboard), add at the top:
```tsx
useEscalationEngine(); // runs passive background check, no UI output
```

This is the only place it needs to be called. It runs on dashboard load and polls every 15 minutes.

---

---

# PROMPT 6 — CORRECTIVE ACTION LOOP (Defect → Work Order → Verified Closed)

## What We're Building

Close the most important workflow gap in the platform: right now, a defect found during an NSPIRE inspection generates an "issue" but there is no automated path from that defect to a work order, to assignment, to verification, to documented closure. This prompt builds that full loop — and extends it to handle defects from ANY source (NSPIRE inspection, daily grounds, manual issue, regulatory action item, risk mitigation action). Every defect has an owner, a deadline, a work order, and a verifiable close-out.

## New Files to Create

```
src/components/corrective-loop/CorrectiveLoopDrawer.tsx
src/components/corrective-loop/DefectToWorkOrderWizard.tsx
src/components/corrective-loop/VerificationChecklist.tsx
src/components/corrective-loop/ClosureDocumentSheet.tsx
src/components/corrective-loop/LoopStatusStepper.tsx
src/components/corrective-loop/CorrectiveLoopTimeline.tsx
src/hooks/useCorrectiveLoop.ts
src/pages/corrective-loop/CorrectiveLoopPage.tsx
```

## Database Changes (Additions Only)

No new tables required. Add columns to existing tables:

```sql
-- Add to issues table (additive — won't break anything)
alter table issues add column if not exists linked_work_order_id uuid references work_orders(id) on delete set null;
alter table issues add column if not exists corrective_action_required boolean default false;
alter table issues add column if not exists corrective_deadline date;
alter table issues add column if not exists corrective_status text default 'none' check (corrective_status in (
  'none',           -- no corrective action initiated
  'work_order_created',  -- WO exists, work not done
  'work_completed',      -- WO completed by assignee
  'verified',            -- supervisor verified the fix
  'closed'               -- documented and closed
));
alter table issues add column if not exists verified_by uuid references profiles(id) on delete set null;
alter table issues add column if not exists verified_at timestamptz;
alter table issues add column if not exists verification_notes text;
alter table issues add column if not exists closure_photo_url text;

-- Add to work_orders table (additive)
alter table work_orders add column if not exists source_issue_id uuid references issues(id) on delete set null;
alter table work_orders add column if not exists source_defect_id uuid references defects(id) on delete set null;
alter table work_orders add column if not exists source_regulatory_action_id uuid references regulatory_action_items(id) on delete set null;
alter table work_orders add column if not exists requires_verification boolean default false;
alter table work_orders add column if not exists verified_by uuid references profiles(id) on delete set null;
alter table work_orders add column if not exists verified_at timestamptz;
alter table work_orders add column if not exists verification_notes text;
alter table work_orders add column if not exists closure_photos text[] default '{}';
```

## Hook: `useCorrectiveLoop.ts`

```typescript
// Get all issues/defects that need corrective action but don't have a WO yet
export function useDefectsNeedingAction(propertyId?: string)
// Query: issues where corrective_action_required=true AND linked_work_order_id IS NULL

// Get all issues in the corrective loop (any status except 'none' and 'closed')
export function useActiveCorrectiveLoop(propertyId?: string)

// Create a work order FROM an issue/defect (the key workflow action)
export function useCreateCorrectiveWorkOrder()
// Takes: issueId, workOrderData
// Does: creates work_order with source_issue_id=issueId, requires_verification=true
//        updates issue.linked_work_order_id and issue.corrective_status='work_order_created'

// Verify a completed work order (supervisor action)
export function useVerifyCorrectiveAction()
// Takes: workOrderId, verificationNotes, closurePhotos[]
// Does: updates work_order: verified_by, verified_at, verification_notes, closure_photos, status='verified'
//        updates linked issue: corrective_status='verified', verified_by, verified_at

// Close the loop (final documentation)
export function useCloseCorrectiveLoop()
// Takes: issueId, closureNotes, closurePhotoUrl
// Does: updates issue status='resolved', corrective_status='closed'
//        if linked to regulatory_action_item → auto-update that item to 'submitted'

// Stats
export function useCorrectiveLoopStats(propertyId?: string)
// returns: { needsWorkOrder, workOrderCreated, workCompleted, awaitingVerification, verified, closedThisMonth }
```

## New Page: `CorrectiveLoopPage.tsx`

Route: `/corrective-loop`

This is a dedicated "action station" — the page a supervisor or manager opens specifically to process the corrective action queue.

### Layout

```
┌──────────────────────────────────────────────────────┐
│  EYEBROW: "CORRECTIVE ACTIONS"                        │
│  H1: Corrective Action Queue                          │
│  Sub: From defect to documented closure.              │
├──────────────────────────────────────────────────────┤
│  PIPELINE STATS BAR:                                  │
│  [Needs WO: N] → [WO Created: N] → [Work Done: N] → [Awaiting Verify: N] → [✅ Closed: N] │
│  (Each stage is a clickable filter)                   │
├──────────────────────────────────────────────────────┤
│  FILTER: [Property ▼] [Source ▼] [Priority ▼] [Assigned ▼] │
├──────────────────────────────────────────────────────┤
│  QUEUE CARDS (stacked, grouped by stage)              │
└──────────────────────────────────────────────────────┘
```

### Queue Cards

Cards are grouped under stage headings:
- **🔴 NEEDS WORK ORDER** — defects/issues with no WO yet
- **🟠 WORK ORDER CREATED** — WO exists, waiting on completion
- **🟡 AWAITING VERIFICATION** — WO marked complete, needs supervisor sign-off
- **🟢 VERIFIED** — verified but not formally documented/closed
- **✅ CLOSED** — complete loop (collapsible, shows last 30 days)

Each card:
- Source badge (NSPIRE in cyan, Daily Grounds in blue, Issue in amber, Regulatory in red)
- Defect/issue title
- Property + unit number
- Severity badge
- Days open (JetBrains Mono, red if >14 days)
- Assigned to (avatar)
- Stage-specific action button (primary, right side):
  - Needs WO → **[Create Work Order]** (opens DefectToWorkOrderWizard)
  - WO Created → **[View Work Order]** (link to WO detail)
  - Awaiting Verification → **[Verify & Close]** (opens VerificationChecklist)
  - Verified → **[Document Closure]** (opens ClosureDocumentSheet)

### `DefectToWorkOrderWizard.tsx`

Three-step slide-in sheet:

**Step 1 — Review Defect**
Shows the defect/issue detail: title, description, photos, location, severity, source. Read-only review. "Looks right — continue" button.

**Step 2 — Create Work Order**
Pre-populated from defect data. Editable fields:
- Title (pre-filled from issue title)
- Description (pre-filled from issue description)
- Priority (pre-selected based on severity: severe → emergency, moderate → high, low → normal)
- Assign To (person picker from profiles)
- Due Date (date picker — default: +3 days for severe, +7 for moderate, +14 for low)
- Estimated Cost (optional number input)
- Notes to technician (textarea)

**Step 3 — Confirm**
Summary card showing: defect → work order link. Who was assigned. Due date. A "Submit" button that calls `useCreateCorrectiveWorkOrder()`.

On success: shows green confirmation. Updates card in the queue immediately.

### `VerificationChecklist.tsx`

Sheet opened when supervisor clicks "Verify & Close" on an Awaiting Verification card.

Shows the original defect/issue on the left. On the right, a verification checklist:

```
□ Work has been physically inspected
□ Defect condition has been corrected
□ Surrounding area is in acceptable condition
□ No additional defects identified at this location
□ Documentation is complete
```

Below checklist:
- Verification Notes (textarea — required)
- Photo Upload: "Upload at least one closure photo" (required for NSPIRE-source items, optional for others)
- Pass / Fail toggle

On "Mark Verified": calls `useVerifyCorrectiveAction()`. Updates the card stage.
On "Fail — Return to Queue": sets WO back to in_progress with a note explaining why.

### `ClosureDocumentSheet.tsx`

Final documentation step. Simple:
- Summary of the full loop: defect → WO → completed → verified
- Closure notes (textarea — required)
- Final closure photo (optional)
- "If this defect was linked to a regulatory action item, mark that item as Submitted?" checkbox (default checked if linked)
- [Document & Close] button

On close: updates issue status to resolved, corrective_status to closed. If checkbox checked + linked regulatory_action_item → updates that item to 'submitted'.

### `LoopStatusStepper.tsx`

Reusable component. Shows a horizontal 5-step stepper:
```
○─●─○─○─○
```
Steps: Defect Logged → Work Order → Work Complete → Verified → Closed
Active step is filled (sapphire), completed steps are gold, future steps are gray.

Used inside `CorrectiveLoopDrawer.tsx` and on the Issue Detail Sheet.

### Integration: Issue Detail Sheet

In the existing `IssueDetailSheet.tsx`, add a new "Corrective Action" tab (after the existing tabs). Shows:
- `LoopStatusStepper` showing current stage
- If corrective_status = 'none': "Start Corrective Action" button → triggers DefectToWorkOrderWizard
- If work order linked: work order card with link + status
- If awaiting verification: Verify button
- Timeline of all corrective loop events

### Integration: NSPIRE Inspection Review

In `InspectionReviewSheet.tsx`, add to each severe/moderate defect row:
- Small "Corrective Action" button (only on severity=severe or moderate)
- Clicking it opens `DefectToWorkOrderWizard` pre-filled from that defect
- Shows corrective_status badge if action already initiated

### Integration: Dashboard

On the main `Dashboard.tsx`, in the existing Issues zone, add a "Corrective Queue" count badge:
```
Issues  [23 open] [7 need corrective action →]
```
The → navigates to /corrective-loop.

## Sidebar Integration

```tsx
// In AppSidebar.tsx, under the "Respond" section, after Issues:
<NavItem 
  to="/corrective-loop" 
  icon={<RefreshCw />} 
  label="Corrective Queue" 
  collapsed={collapsed}
  badge={needsActionCount}  // from useCorrectiveLoopStats
  badgeVariant="destructive"
/>
```

## App.tsx Route

```tsx
const CorrectiveLoopPage = lazy(() => import('./pages/corrective-loop/CorrectiveLoopPage'));
<Route path="/corrective-loop" element={<CorrectiveLoopPage />} />
```

---

## CROSS-MODULE CONNECTIONS (Build After All 6 Prompts)

Once all six features are built, wire these connections:

1. **Compliance Calendar → Risk Register**: When a compliance event becomes overdue, auto-create a risk with category='regulatory', priority=critical, linked to that compliance event.

2. **Corrective Actions → Compliance Calendar**: When a regulatory_action_item due_date is set, auto-create a compliance_event for it (source_type='regulatory_agreement').

3. **Corrective Loop → Corrective Actions**: When a corrective_action loop closes an issue linked to a regulatory_action_item, it advances that item to 'submitted' status.

4. **Escalation Engine → All New Modules**: The SLA engine (Prompt 5) already has rules for compliance_event and risk and regulatory_action_item — these wire automatically once those tables exist.

5. **Executive Dashboard → All New Modules**: The Portfolio Score should add: compliance rate (from compliance_events % completed) and risk exposure (from open critical risks) to its scoring components.

---

*End of 6 enterprise feature prompts. Each prompt is independently buildable and deployable. Build them in order: Prompts 1 and 2 first (foundational data), then 3 (uses the new tables), then 4 (reads from everything), then 5 (automates across all), then 6 (closes the workflow loop).*
