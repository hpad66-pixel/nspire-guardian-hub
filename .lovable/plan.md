
# Enterprise-Grade Property & Construction Management Platform

## Overview

This comprehensive plan transforms the current application into a fully-featured enterprise construction management platform comparable to Procore. It addresses missing functionality, broken CTAs, document management, enhanced reporting, and professional-grade features for construction managers and property owners worldwide.

---

## Part 1: Broken CTAs and Missing Functionality

### 1.1 Issues Page - Create Issue Button (Currently Non-Functional)

The "Create Issue" button exists but doesn't open any dialog.

**Fix Required:**
- Import and wire up the existing `IssueDialog` component
- Add state management for dialog open/close
- Pass correct props to create new issues

```text
IssuesPage.tsx changes:
- Add: const [createDialogOpen, setCreateDialogOpen] = useState(false);
- Wire Button onClick: () => setCreateDialogOpen(true)
- Add: <IssueDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
```

### 1.2 Issues Page - Filter Button (Non-Functional)

The "Filter" button has no functionality.

**Implementation:**
- Create filter popover with options for:
  - Status (Open, In Progress, Resolved)
  - Severity (Severe, Moderate, Low)
  - Source Module (Core, NSPIRE, Projects)
  - Property filter
  - Date range

### 1.3 Projects Dashboard - Quick Action Cards (Non-Functional)

The "Daily Reports", "Change Orders", and "Milestones" cards are clickable but go nowhere.

**Fix Required:**
- Make cards navigate to project list with default tab selected
- Or open a global view of all pending items

### 1.4 Work Orders Page - Missing Work Order Detail View

Work orders can be viewed in a list but cannot be clicked to see details or take action.

**Implementation:**
- Create `WorkOrderDetailSheet.tsx` component
- Add status update workflow
- Add assignee management
- Add proof photo upload for completion

---

## Part 2: Enterprise Document Center

### 2.1 Organization-Level Document Library

Replace the placeholder `/documents` page with a full document management system.

**Features:**
- Folder-based organization (Contracts, Permits, Insurance, Drawings, Photos)
- Document upload with drag-and-drop
- File versioning with history
- Document metadata (uploaded by, date, size, type)
- Full-text search across documents
- Document preview (PDF, images)
- Download and share functionality
- Access permissions per folder

**Database Schema:**
```text
organization_documents
- id (uuid)
- folder (text) - e.g., "Contracts", "Insurance"
- subfolder (text) - optional
- name (text)
- description (text)
- file_url (text)
- file_size (bigint)
- mime_type (text)
- version (integer)
- previous_version_id (uuid) - self-reference
- uploaded_by (uuid)
- created_at (timestamp)
- updated_at (timestamp)
- expiry_date (date) - for contracts, insurance
- tags (text[])
- is_archived (boolean)
```

**Storage Bucket:**
- Create `organization-documents` bucket (private)

**Components:**
- `DocumentLibraryPage.tsx` - Main page with folder navigation
- `DocumentUploadDialog.tsx` - Upload modal with metadata
- `DocumentPreviewSheet.tsx` - Side panel viewer
- `DocumentVersionHistory.tsx` - Version tracking

### 2.2 Project-Level Documents (Already Exists - Enhance)

The `project_documents` table exists but needs UI implementation.

**Add to ProjectDetailPage:**
- New "Documents" tab
- Project-specific folders (Plans, Permits, Submittals, Contracts, Closeout)
- Same functionality as org-level but scoped to project

---

## Part 3: Enhanced Project Management (Procore-Style)

### 3.1 RFI Management Interface

The `project_rfis` table exists. Build the UI.

**New Component:** `RFIList.tsx`
- List view with filters (Open, Pending, Closed)
- RFI number, subject, assignee, due date, status
- Click to open detail sheet

**New Component:** `RFIDialog.tsx`
- Create/edit RFI form
- Subject, question (rich text), assignee, due date
- Response section with who answered

**New Component:** `RFIDetailSheet.tsx`
- Full question and response view
- Response input for assigned user
- Status workflow (Open -> Pending -> Closed)

### 3.2 Submittal Tracking Interface

The `project_submittals` table exists. Build the UI.

**New Component:** `SubmittalList.tsx`
- List with status badges (Pending, Approved, Rejected, Revise)
- Submittal number, title, revision, due date

**New Component:** `SubmittalDialog.tsx`
- Create/edit submittal
- Title, description, due date
- File upload for submittal documents
- Revision tracking

**New Component:** `SubmittalDetailSheet.tsx`
- Review interface
- Approve/Reject/Revise actions
- Comment on rejection with requirements

### 3.3 Punch List Management

The `punch_items` table exists. Build the UI.

**New Component:** `PunchListTab.tsx`
- Add as new tab in ProjectDetailPage
- Location-based grouping
- Before/after photo comparison
- Status workflow (Open -> Completed -> Verified)

**New Component:** `PunchItemDialog.tsx`
- Create punch item with location, description
- Photo upload (before)
- Assign to subcontractor

**New Component:** `PunchItemCard.tsx`
- Visual card with photos
- Quick status update
- After photo upload for completion

### 3.4 Project Communications Log

The `project_communications` table exists. Build the UI.

**New Component:** `CommunicationsTab.tsx`
- Add as new tab in ProjectDetailPage
- Log phone calls, emails, meetings, notes
- Chronological timeline view
- Filter by type

**New Component:** `CommunicationDialog.tsx`
- Log new communication
- Type selector, subject, content
- Participants list

### 3.5 Project Team Management

The `project_team_members` table exists. Build the UI.

**New Component:** `ProjectTeamTab.tsx`
- Add as new tab in ProjectDetailPage
- Team directory with roles
- Add/remove team members
- Contact information

---

## Part 4: Advanced Reporting and Export

### 4.1 Report Export Functionality

Add export capabilities to all reports.

**Features:**
- Export to CSV
- Export to PDF
- Print-optimized layouts
- Email report as PDF attachment

**Implementation:**
- Create `useExportReport` hook
- Add export buttons to each report card
- Use html2pdf for PDF generation
- Use Papa Parse for CSV export

### 4.2 Scheduled Report Emails

Allow users to schedule recurring report delivery.

**New Table:** `scheduled_reports`
```text
- id (uuid)
- user_id (uuid)
- report_type (text)
- frequency (text) - daily, weekly, monthly
- recipients (text[])
- filters (jsonb)
- next_run (timestamp)
- is_active (boolean)
```

**New Edge Function:** `send-scheduled-reports`
- Triggered by cron job
- Generate report PDF
- Email to recipients

### 4.3 Enhanced Report Visualizations

Add charts to existing reports.

**Using Recharts (already installed):**
- Add line chart for trends over time
- Add bar charts for comparisons
- Add pie charts for distributions
- Interactive tooltips

**New Visualizations:**
- Defect trends by month
- Issue resolution time distribution
- Work order completion by priority
- Budget vs. actual spend over time
- Milestone timeline Gantt view

### 4.4 Custom Report Builder (Phase 2)

Allow users to create custom reports.

**Features:**
- Select data sources
- Choose columns to display
- Set filters
- Save as custom report
- Share with team

---

## Part 5: Role-Based Access Enhancements

### 5.1 Implement Role Checks Throughout App

Currently roles exist but aren't enforced in UI.

**Implementation:**
- Create `useUserRole` hook that checks actual database roles
- Add role guards to all CRUD operations
- Hide/show UI elements based on role
- Redirect unauthorized users

### 5.2 Owner Portal (Filtered View)

Property owners should see a simplified view.

**New Route:** `/owner`
- Filtered dashboard showing only their properties
- High-level project status
- Approved change orders only
- Daily report summaries (not full details)
- Document access (owner-shared only)

**Implementation:**
- Create owner-specific pages
- Filter queries by owner's assigned properties
- Hide internal notes and sensitive data

### 5.3 Subcontractor Portal

Subcontractors see only their assigned work.

**Features:**
- Assigned punch items
- Assigned work orders
- Submit completion photos
- View relevant project documents

---

## Part 6: Audit Trail and Activity Logging

### 6.1 Activity Log Viewer

The `activity_log` table exists. Build the UI.

**New Page:** `/settings/activity-log`

**Features:**
- Filterable activity stream
- Entity type filter (project, issue, work order, etc.)
- User filter
- Date range filter
- Action type (create, update, delete)
- View change diff (before/after)

**New Component:** `ActivityLogViewer.tsx`
- Virtualized list for performance
- Change detail expansion
- User avatar and name display

### 6.2 Automatic Activity Logging

Create database triggers to log all changes automatically.

**Implementation:**
- Create trigger function for key tables
- Capture before/after state
- Store as JSONB diff
- Include user context

**Tables to Log:**
- projects (all changes)
- issues (all changes)
- work_orders (all changes)
- defects (all changes)
- change_orders (status changes)
- daily_reports (creation)

---

## Part 7: Enhanced User Experience

### 7.1 Global Search

Add command palette / global search.

**Features:**
- Press Cmd+K to open
- Search across all entities
- Properties, projects, issues, work orders
- Quick navigation
- Recent items

**Implementation:**
- Use existing cmdk package (already installed)
- Create `GlobalSearch.tsx` component
- Add to AppLayout header

### 7.2 Notification Center

In-app notifications for important events.

**New Table:** `notifications`
```text
- id (uuid)
- user_id (uuid)
- type (text) - mention, assignment, deadline, approval
- title (text)
- message (text)
- entity_type (text)
- entity_id (uuid)
- is_read (boolean)
- created_at (timestamp)
```

**Features:**
- Bell icon in header with badge count
- Notification dropdown
- Mark as read
- Click to navigate to entity
- Email notifications for critical items

### 7.3 Dashboard Customization

Allow users to customize their dashboard.

**Features:**
- Drag-and-drop widget arrangement
- Show/hide widgets
- Widget size options
- Save per-user preferences

### 7.4 Mobile Responsiveness Audit

Ensure all new features work on mobile.

**Checklist:**
- Test all new dialogs on mobile
- Ensure touch-friendly interactions
- Optimize table views for small screens
- Test photo upload from mobile camera

---

## Part 8: Technical Improvements

### 8.1 Performance Optimizations

- Add query caching with appropriate stale times
- Implement infinite scroll for long lists
- Use React.memo for expensive components
- Add skeleton loaders to all async areas

### 8.2 Error Handling

- Add global error boundary
- Improve error messages for users
- Add retry logic for failed requests
- Offline detection and messaging

### 8.3 Form Validation

- Use Zod schemas for all forms
- Show validation errors inline
- Prevent submission of invalid data
- Add confirmation dialogs for destructive actions

---

## Implementation Priority

### Phase 1 (Immediate - This Implementation)
1. Fix all broken CTAs (Issues Create, Filter, Quick Actions)
2. Work Order detail sheet with actions
3. Organization Document Center
4. Project Documents tab
5. RFI management interface
6. Punch List management
7. Report export (CSV/PDF)
8. Activity Log viewer

### Phase 2 (Next Sprint)
9. Submittal tracking
10. Project Communications log
11. Project Team management
12. Global search (Cmd+K)
13. Notification center
14. Chart visualizations for reports

### Phase 3 (Future)
15. Owner Portal
16. Subcontractor Portal
17. Scheduled report emails
18. Custom report builder
19. Dashboard customization

---

## New Files to Create

### Pages
| File | Purpose |
|------|---------|
| `src/pages/documents/DocumentsPage.tsx` | Organization document library |
| `src/pages/settings/ActivityLogPage.tsx` | Audit trail viewer |

### Components - Documents
| File | Purpose |
|------|---------|
| `src/components/documents/DocumentLibrary.tsx` | Main library component |
| `src/components/documents/DocumentUploadDialog.tsx` | Upload modal |
| `src/components/documents/DocumentPreviewSheet.tsx` | File viewer |
| `src/components/documents/FolderNav.tsx` | Folder navigation |

### Components - Projects
| File | Purpose |
|------|---------|
| `src/components/projects/ProjectDocumentsTab.tsx` | Project docs tab |
| `src/components/projects/RFIList.tsx` | RFI list |
| `src/components/projects/RFIDialog.tsx` | RFI create/edit |
| `src/components/projects/RFIDetailSheet.tsx` | RFI detail view |
| `src/components/projects/SubmittalList.tsx` | Submittal list |
| `src/components/projects/SubmittalDialog.tsx` | Submittal create/edit |
| `src/components/projects/PunchListTab.tsx` | Punch list management |
| `src/components/projects/PunchItemDialog.tsx` | Punch item form |
| `src/components/projects/CommunicationsTab.tsx` | Communications log |
| `src/components/projects/ProjectTeamTab.tsx` | Team management |

### Components - Work Orders
| File | Purpose |
|------|---------|
| `src/components/workorders/WorkOrderDetailSheet.tsx` | WO detail view |
| `src/components/workorders/WorkOrderActions.tsx` | Status updates |

### Components - Global
| File | Purpose |
|------|---------|
| `src/components/global/GlobalSearch.tsx` | Cmd+K search |
| `src/components/global/NotificationCenter.tsx` | Notifications |
| `src/components/settings/ActivityLogViewer.tsx` | Audit log UI |

### Hooks
| File | Purpose |
|------|---------|
| `src/hooks/useDocuments.ts` | Document CRUD |
| `src/hooks/useRFIs.ts` | RFI CRUD |
| `src/hooks/useSubmittals.ts` | Submittal CRUD |
| `src/hooks/usePunchItems.ts` | Punch item CRUD |
| `src/hooks/useCommunications.ts` | Communications CRUD |
| `src/hooks/useProjectTeam.ts` | Team management |
| `src/hooks/useActivityLog.ts` | Activity log queries |
| `src/hooks/useNotifications.ts` | Notification management |
| `src/hooks/useExportReport.ts` | Report export utilities |

---

## Database Changes Required

### New Table: `organization_documents`
```sql
CREATE TABLE organization_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder TEXT NOT NULL DEFAULT 'General',
  subfolder TEXT,
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES organization_documents(id),
  uploaded_by UUID REFERENCES auth.users(id),
  expiry_date DATE,
  tags TEXT[] DEFAULT '{}',
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### New Table: `notifications`
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### New Storage Bucket
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('organization-documents', 'organization-documents', false);
```

---

## Expected Outcome

After full implementation:

- All CTAs functional with proper dialogs and actions
- Complete document management at org and project level
- Full RFI, Submittal, and Punch List workflows
- Exportable reports in CSV and PDF
- Complete audit trail of all system changes
- Role-enforced access throughout the application
- Global search for quick navigation
- In-app notifications for assignments and mentions
- Mobile-optimized enterprise experience
- Professional-grade construction management comparable to Procore

