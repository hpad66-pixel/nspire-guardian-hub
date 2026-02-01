
# Comprehensive Implementation Plan: Enterprise Feature Enhancement

## Executive Summary

This plan addresses five critical platform enhancements:
1. **Email Categorization System** - All emails tagged by source module in mailbox
2. **Voice Dictation Editing Fix** - Ensure text remains editable after AI polish
3. **Document Tagging System** - AI-ready tagging for future search capabilities
4. **Work Order Workflow Engine** - Complete approval, execution, and communication system
5. **Role-Based Dashboards** - Personalized dashboards for each user role

---

## Part 1: Email Categorization System

### Current State
- `report_emails` table has `report_type` field with values: `daily_inspection`, `daily_report`, `proposal`
- No categorization in mailbox UI - all emails shown together
- Missing module source identification

### Solution

**Database Enhancement:**
```sql
-- Add source_module column for categorization
ALTER TABLE report_emails ADD COLUMN source_module TEXT;

-- Add property_id for filtering
ALTER TABLE report_emails ADD COLUMN property_id UUID REFERENCES properties(id);

-- Add project_id for project emails
ALTER TABLE report_emails ADD COLUMN project_id UUID REFERENCES projects(id);

-- Add work_order_id for work order emails
ALTER TABLE report_emails ADD COLUMN work_order_id UUID REFERENCES work_orders(id);
```

**Module Categories:**
| Source Module | Email Types |
|---------------|-------------|
| `daily_grounds` | Daily grounds inspection reports |
| `nspire` | NSPIRE inspection reports |
| `projects` | Daily reports, proposals, change orders |
| `work_orders` | Work order notifications, completions |
| `permits` | Permit compliance notifications |
| `core` | General correspondence |

**UI Changes:**
- Add "Categories" filter section to mailbox sidebar with counts per module
- Add colored category badges to email list items
- Filter emails by category when clicked

---

## Part 2: Voice Dictation Editing Fix

### Current State Analysis
The `VoiceDictationTextareaWithAI` component uses a standard `<Textarea>` which should be editable. Upon reviewing the code, the component correctly:
- Uses `value` and `onChange` props for two-way binding
- Passes both `onValueChange` and `onChange` handlers
- Does not set `readOnly` or `disabled` attributes

### Potential Issue
The textarea is **not** readonly - it should be editable. If the user is experiencing issues, it may be due to:
1. Parent component state management issues
2. Form reset behavior after polishing
3. Browser-specific focus issues

### Solution
1. Add explicit `readOnly={false}` as defensive measure
2. Ensure focus returns to textarea after polish completes
3. Add visual feedback showing the text is in "edit mode"
4. Test in all dialogs where component is used

**Component Enhancement:**
```typescript
// After polish completes, return focus to textarea
const handlePolish = useCallback(async () => {
  if (!currentValue.trim()) return;
  setPreviousValue(currentValue);
  const polished = await polish(currentValue, context);
  
  if (polished) {
    if (onValueChange) onValueChange(polished);
    if (onChange) {
      const syntheticEvent = {
        target: { value: polished },
      } as React.ChangeEvent<HTMLTextAreaElement>;
      onChange(syntheticEvent);
    }
    // Return focus after polish
    textareaRef.current?.focus();
  }
}, [currentValue, context, polish, onChange, onValueChange]);
```

---

## Part 3: Document Tagging System

### Current State
- `organization_documents` table already has a `tags` column (TEXT[])
- Tags are passed during upload but no UI to manage them
- Tags not displayed or searchable

### Solution

**UI Enhancements:**

1. **Upload Dialog - Tag Input:**
```text
┌─────────────────────────────────────────────────────────────────┐
│ Tags                                                             │
├─────────────────────────────────────────────────────────────────┤
│ [contract] [hvac] [2024] [x]                    [Add tag...]    │
│                                                                  │
│ Suggested: compliance, insurance, permit, vendor, inspection    │
└─────────────────────────────────────────────────────────────────┘
```

2. **Document List - Tag Pills:**
- Display tags as colored pills on document cards
- Click tag to filter all documents with that tag

3. **Tag Management Features:**
- Autocomplete from existing tags in organization
- Suggested tags based on folder (e.g., "Permits" folder suggests "permit", "compliance")
- Quick-add common tags

**Suggested Tags by Folder:**
| Folder | Suggested Tags |
|--------|----------------|
| Contracts | vendor, contractor, subcontractor, 2024, 2025 |
| Permits | permit, compliance, inspection, city, county |
| Insurance | liability, workers-comp, property, certificate |
| Legal | agreement, addendum, amendment |
| Training | safety, osha, certification |

**Implementation:**
1. Create `TagInput` component with autocomplete
2. Add `useDocumentTags()` hook to fetch existing tags
3. Update `DocumentUploadDialog` with tag input
4. Add tag display to document list items
5. Add tag filter to documents page

---

## Part 4: Work Order Workflow Engine

### Current State
- Work orders have basic statuses: `pending`, `assigned`, `in_progress`, `completed`, `verified`
- No approval workflow before execution
- No threaded communications
- Created only from NSPIRE defects automatically

### New Workflow Design

**Workflow Stages:**
```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WORK ORDER LIFECYCLE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   CREATION              APPROVAL              EXECUTION              CLOSE   │
│   ────────              ────────              ─────────              ─────   │
│                                                                              │
│   ┌────────┐         ┌────────────┐        ┌─────────────┐      ┌────────┐ │
│   │ DRAFT  │ ──────> │ PENDING    │ ─────> │ IN PROGRESS │ ───> │ CLOSED │ │
│   └────────┘         │ APPROVAL   │        └─────────────┘      └────────┘ │
│        │             └────────────┘               │                   │     │
│        │                   │                      │                   │     │
│        │                   v                      v                   v     │
│        │             ┌────────────┐        ┌─────────────┐     ┌──────────┐│
│        └───────────> │ REJECTED   │        │ COMPLETED   │ ──> │ VERIFIED ││
│                      └────────────┘        └─────────────┘     └──────────┘│
│                            │                                               │
│                            v                                               │
│                      [Revise & Resubmit]                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Database Schema Updates:**

```sql
-- New work order status enum
ALTER TYPE work_order_status ADD VALUE 'draft' BEFORE 'pending';
ALTER TYPE work_order_status ADD VALUE 'pending_approval' AFTER 'draft';
ALTER TYPE work_order_status ADD VALUE 'rejected' AFTER 'pending_approval';
ALTER TYPE work_order_status ADD VALUE 'closed' AFTER 'verified';

-- Add approval workflow columns
ALTER TABLE work_orders ADD COLUMN created_by UUID REFERENCES auth.users(id);
ALTER TABLE work_orders ADD COLUMN submitted_at TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN approved_by UUID REFERENCES auth.users(id);
ALTER TABLE work_orders ADD COLUMN approved_at TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN rejected_by UUID REFERENCES auth.users(id);
ALTER TABLE work_orders ADD COLUMN rejected_at TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN rejection_reason TEXT;
ALTER TABLE work_orders ADD COLUMN estimated_cost NUMERIC;
ALTER TABLE work_orders ADD COLUMN actual_cost NUMERIC;
ALTER TABLE work_orders ADD COLUMN vendor_id UUID; -- Future: link to vendors table
ALTER TABLE work_orders ADD COLUMN work_order_number SERIAL;
ALTER TABLE work_orders ADD COLUMN notes TEXT;
ALTER TABLE work_orders ADD COLUMN closed_at TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN closed_by UUID REFERENCES auth.users(id);

-- Work order comments for threaded communication
CREATE TABLE work_order_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE work_order_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view work order comments"
  ON work_order_comments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create comments"
  ON work_order_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON work_order_comments FOR UPDATE
  USING (auth.uid() = user_id);

-- Work order activity log
CREATE TABLE work_order_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE work_order_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view work order activity"
  ON work_order_activity FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert activity"
  ON work_order_activity FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Index for performance
CREATE INDEX idx_wo_comments_work_order ON work_order_comments(work_order_id);
CREATE INDEX idx_wo_activity_work_order ON work_order_activity(work_order_id);
```

**Role-Based Permissions:**

| Action | Admin | Manager | Superintendent | Inspector | Viewer |
|--------|-------|---------|----------------|-----------|--------|
| Create Draft | Yes | Yes | Yes | No | No |
| Submit for Approval | Yes | Yes | Yes | No | No |
| Approve/Reject | Yes | Yes | No | No | No |
| Assign Worker | Yes | Yes | Yes | No | No |
| Update Progress | Yes | Yes | Yes | Yes | No |
| Mark Complete | Yes | Yes | Yes | Yes | No |
| Verify Completion | Yes | Yes | No | No | No |
| Close Work Order | Yes | Yes | No | No | No |
| Add Comments | Yes | Yes | Yes | Yes | No |

**UI Design - Work Order Detail Sheet:**

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ WO-0042                                          [Draft ▼] [⋮ Actions]      │
│ Repair: Damaged Fence Section                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DETAILS                           WORKFLOW STATUS                          │
│  ────────                          ───────────────                          │
│  Property: Oak Grove Apartments    ┌─────────────────────────────────────┐  │
│  Location: North perimeter         │ ○ Draft                             │  │
│  Priority: [Routine ▼]             │ ○ Pending Approval                  │  │
│  Due Date: Feb 15, 2026            │ ● In Progress ← Current             │  │
│  Assigned: John Smith              │ ○ Completed                         │  │
│  Est. Cost: $450.00                │ ○ Verified                          │  │
│                                    │ ○ Closed                            │  │
│  DESCRIPTION                       └─────────────────────────────────────┘  │
│  ─────────────                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Replace 12ft section of damaged wooden fence along the north       │    │
│  │ property line. Include new posts and staining to match existing.   │    │
│  │                                                 [🎤] [✨ Polish]     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  COMMUNICATION THREAD                                                        │
│  ────────────────────                                                        │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ [Avatar] Sarah Johnson (Manager)                    Feb 2, 9:30 AM  │    │
│  │ Approved. Please coordinate with vendor for earliest availability. │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ [Avatar] John Smith (Superintendent)               Feb 2, 10:15 AM  │    │
│  │ Contacted ABC Fencing. They can start Feb 5th. Materials ordered.  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Type a message...                              [📎] [🎤] [Send →]   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  PROOF PHOTOS                                                                │
│  ────────────                                                                │
│  [+ Upload Proof]                                                            │
│  ┌──────┐ ┌──────┐ ┌──────┐                                                 │
│  │      │ │      │ │      │                                                 │
│  └──────┘ └──────┘ └──────┘                                                 │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  ACTIVITY LOG                                                                │
│  ────────────                                                                │
│  Feb 2, 10:15 AM • John Smith started work                                  │
│  Feb 2, 9:30 AM • Sarah Johnson approved                                    │
│  Feb 1, 4:00 PM • Mike Davis submitted for approval                         │
│  Feb 1, 3:45 PM • Mike Davis created work order                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**New Files:**
| File | Purpose |
|------|---------|
| `src/hooks/useWorkOrderComments.ts` | CRUD for work order comments |
| `src/hooks/useWorkOrderActivity.ts` | Fetch activity log |
| `src/components/workorders/WorkOrderDialog.tsx` | Create/edit work orders |
| `src/components/workorders/WorkOrderComments.tsx` | Threaded communication |
| `src/components/workorders/WorkOrderApprovalActions.tsx` | Approve/reject buttons |
| `src/components/workorders/WorkOrderStatusStepper.tsx` | Visual workflow status |

---

## Part 5: Role-Based Dashboards

### Current State
- Single dashboard showing same content for all users
- Metrics are generic (properties, units, issues, compliance)
- No role-specific focus or actions

### Solution

**Dashboard Personalization by Role:**

| Role | Dashboard Focus | Key Metrics | Quick Actions |
|------|-----------------|-------------|---------------|
| **Admin** | Organization overview | All modules, all properties, revenue, compliance | All actions |
| **Manager** | Property portfolio | Property health, open issues, upcoming deadlines | Review inspections, approve work orders |
| **Superintendent** | Daily operations | Today's inspections, active work orders, crew assignments | Start inspection, create work order |
| **Inspector** | My assignments | My pending inspections, my open items | Start inspection, submit report |
| **Viewer** | Read-only overview | Summary stats only | None (view-only) |

**Admin Dashboard Design:**
```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Good morning, Admin                                                          │
│ Organization command center                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Properties  │  │ Active      │  │ Open        │  │ Compliance  │        │
│  │     12      │  │ Projects    │  │ Work Orders │  │    94%      │        │
│  │ 2 new       │  │     5       │  │    23       │  │ +2% vs last │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                              │
│  NEEDS YOUR ATTENTION                                                        │
│  ────────────────────                                                        │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ 🔴 3 Work Orders Pending Approval                              [View]  │ │
│  │ 🟠 5 Inspections Awaiting Review                               [View]  │ │
│  │ 🟡 2 Proposals Ready to Send                                   [View]  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  MODULE OVERVIEW                                                             │
│  ───────────────                                                             │
│  [Daily Grounds Card]  [NSPIRE Card]  [Projects Card]                       │
│                                                                              │
│  RECENT ACTIVITY                                                             │
│  ───────────────                                                             │
│  [Activity Feed - last 10 items across all modules]                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Inspector Dashboard Design:**
```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Good morning, Inspector                                                      │
│ Your assignments for today                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Today's     │  │ Pending     │  │ My Open     │  │ Completed   │        │
│  │ Inspections │  │ Reviews     │  │ Items       │  │ This Week   │        │
│  │     3       │  │     2       │  │     8       │  │    12       │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                              │
│  TODAY'S SCHEDULE                                                            │
│  ────────────────                                                            │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ 🏢 Oak Grove Apartments                                                │ │
│  │    Daily Grounds Inspection                          [Start →]         │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │ 🏢 Pine Valley Estates                                                 │ │
│  │    Daily Grounds Inspection                          [Start →]         │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │ 🏢 Riverside Commons - Unit 204                                        │ │
│  │    NSPIRE Unit Inspection                            [Start →]         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  MY OPEN ITEMS                                                               │
│  ─────────────                                                               │
│  [Items assigned to me requiring action]                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Implementation:**
1. Create `useDashboardData.ts` hook that fetches role-specific data
2. Create dashboard sections as reusable components
3. Conditionally render sections based on user role
4. Add "Needs Your Attention" section showing role-relevant pending items

**Dashboard Components:**
| Component | Purpose |
|-----------|---------|
| `DashboardMetricsGrid.tsx` | Role-specific metric cards |
| `DashboardActionItems.tsx` | Items requiring user action |
| `DashboardActivityFeed.tsx` | Recent activity stream |
| `DashboardSchedule.tsx` | Today's schedule (inspectors) |
| `DashboardPendingApprovals.tsx` | Approval queue (managers) |

---

## Part 6: Implementation Order

### Phase 1: Foundation (Priority)
1. Database migrations for all new tables/columns
2. Fix voice dictation editing behavior
3. Add document tagging to upload dialog

### Phase 2: Work Order Workflow
4. Add work order creation dialog
5. Implement approval workflow
6. Add work order comments system
7. Add work order activity log
8. Update WorkOrderDetailSheet with new design

### Phase 3: Email Categorization
9. Add source_module to report_emails
10. Update send-report-email function
11. Add category filters to mailbox UI
12. Add category badges to email list

### Phase 4: Role-Based Dashboards
13. Create dashboard data hook
14. Build role-specific dashboard sections
15. Implement conditional rendering by role
16. Add action item sections

### Phase 5: Integration & Polish
17. Add email notifications for work order status changes
18. Connect work orders to inbox system
19. End-to-end testing of all workflows
20. UI/UX refinements

---

## Summary

This comprehensive enhancement transforms the platform with:

1. **Unified Communications** - All emails categorized and tracked in a single inbox with module-based filtering
2. **Seamless Voice Input** - Fix ensures AI-polished text remains fully editable for final adjustments
3. **Smart Document Organization** - Tagging system prepared for future AI-powered search
4. **Enterprise Work Order Management** - Full approval workflow with threaded communications and audit trail
5. **Personalized Experience** - Each role sees exactly what they need to do their job effectively

The design follows Apple-inspired minimalism with focus on clarity, actionability, and reducing friction in every interaction.
