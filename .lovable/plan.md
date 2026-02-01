
# Inspection Review Workflow & Addendum System

## Overview

This plan implements a professional inspection lifecycle with supervisor review, automatic issue creation from defects, redirect-on-completion, and an addendum system that prevents editing completed reports while allowing appended corrections.

---

## Part 1: Database Schema Changes

### 1.1 Add Review Workflow Columns to `daily_inspections`

New columns for the review lifecycle:

| Column | Type | Purpose |
|--------|------|---------|
| `review_status` | ENUM | `pending_review`, `approved`, `needs_revision`, `rejected` |
| `reviewed_by` | UUID | Supervisor who reviewed |
| `reviewed_at` | TIMESTAMP | When reviewed |
| `reviewer_notes` | TEXT | Feedback from supervisor |
| `submitted_at` | TIMESTAMP | When inspector submitted |

### 1.2 New `daily_inspection_addendums` Table

Stores amendments to completed inspections:

```text
daily_inspection_addendums
- id (uuid)
- daily_inspection_id (uuid) - parent inspection
- created_by (uuid) - who created addendum
- content (text) - addendum text
- attachments (text[]) - additional files
- created_at (timestamp)
```

### 1.3 Update `daily_inspection_items` Table

Add flag to track if item created an issue:

| Column | Type | Purpose |
|--------|------|---------|
| `issue_id` | UUID | Links to created issue (if defect) |

---

## Part 2: Review Status Workflow

### 2.1 Status Flow Diagram

```text
Inspector submits
       |
       v
+----------------+
| pending_review |  <-- Supervisor sees in queue
+----------------+
       |
  Supervisor action
       |
  +----+----+----+
  |         |    |
  v         v    v
+--------+ +--------+ +--------+
|approved| |needs   | |rejected|
|        | |revision|  |        |
+--------+ +--------+ +--------+
              |
              v
     Inspector revises
     (via addendum only)
```

### 2.2 Review Permissions by Role

| Role | Can Submit | Can Review | Can View All |
|------|------------|------------|--------------|
| inspector | Yes | No | Own only |
| superintendent | Yes | Yes | Own property |
| manager | Yes | Yes | All |
| admin | Yes | Yes | All |

---

## Part 3: Automatic Issue Creation

### 3.1 Trigger Logic

When an inspection is approved, automatically create Issues from items with `defect_found` status:

- Source: `daily_grounds` (new enum value for issue_source)
- Severity: Map from defect type or default to `moderate`
- Property: From inspection
- Title: Asset name + "Defect Found"
- Description: Include notes, defect description
- Photo URLs: Copied from inspection item

### 3.2 Link Back to Source

Each created issue links back via `daily_inspection_item_id` field on issues table (new column).

---

## Part 4: Post-Completion Redirect

### 4.1 Updated Wizard Flow

When inspector clicks "Submit Inspection":

1. Update inspection status to `completed`
2. Set `review_status` to `pending_review`
3. Set `submitted_at` timestamp
4. Show success toast with summary
5. **Redirect to Dashboard** using `react-router-dom` navigate

### 4.2 Dashboard Integration

Add "Pending Reviews" section to Dashboard for supervisors/managers:
- Count of inspections awaiting review
- Quick action to go to review queue

---

## Part 5: Supervisor Review Interface

### 5.1 New Page: `/inspections/review`

Review queue for supervisors showing:
- List of pending inspections
- Filter by property, date, inspector
- Quick approve/reject actions

### 5.2 Review Detail View

When viewing a pending inspection:
- Read-only view of all asset checks
- Photos gallery
- General notes
- Approve / Request Revision / Reject buttons
- Add reviewer notes field

### 5.3 New Components

| Component | Purpose |
|-----------|---------|
| `InspectionReviewPage.tsx` | Review queue page |
| `InspectionReviewSheet.tsx` | Slide-out detail view |
| `ReviewActionButtons.tsx` | Approve/Reject controls |

---

## Part 6: Addendum System

### 6.1 Addendum UI

For completed inspections, show:
- Locked icon indicating "Report Finalized"
- "Add Addendum" button
- List of existing addendums with timestamps

### 6.2 Addendum Dialog

Simple form:
- Rich text area for addendum content
- Attachment upload
- Submit button

### 6.3 Display

Addendums appear at bottom of inspection view:
- Chronological order
- Author name + timestamp
- Full content with attachments

---

## Part 7: Unified Issues Dashboard

### 7.1 Issue Source Integration

Add `daily_grounds` to issue source enum:
- Issues page already shows all sources
- New issues from daily inspections appear automatically
- Filtered by source module

### 7.2 Visibility

All roles see the same Issues dashboard:
- Filter by property (existing)
- Filter by source (existing)
- New source badge: "Daily Grounds"

---

## Part 8: Implementation Files

### New Files

```text
src/pages/inspections/
  InspectionReviewPage.tsx     # Supervisor review queue

src/components/inspections/
  InspectionReviewSheet.tsx    # Review detail slide-out
  AddendumDialog.tsx           # Add addendum form
  AddendumList.tsx             # Display addendums
  ReviewActionButtons.tsx      # Approve/Reject controls

src/hooks/
  useInspectionReview.ts       # Review CRUD operations
  useInspectionAddendums.ts    # Addendum CRUD operations
```

### Modified Files

```text
src/components/inspections/DailyInspectionWizard.tsx
  - Add useNavigate for redirect
  - Update handleSubmit to redirect to dashboard

src/pages/inspections/DailyGroundsPage.tsx
  - Show lock icon for completed inspections
  - Show "Add Addendum" for completed inspections
  - Prevent editing completed inspections

src/pages/Dashboard.tsx
  - Add "Pending Reviews" section for supervisors

src/hooks/useDailyInspections.ts
  - Add review status fields to interface
  - Add usePendingReviews hook
  - Add useSubmitForReview mutation
  - Add useReviewInspection mutation

src/components/layout/AppSidebar.tsx
  - Add "Review Queue" nav item for supervisors
```

---

## Part 9: Database Migration SQL

### Migration: Add Review Workflow

```sql
-- Review status enum
CREATE TYPE daily_inspection_review_status AS ENUM (
  'pending_review',
  'approved', 
  'needs_revision',
  'rejected'
);

-- Add review columns to daily_inspections
ALTER TABLE daily_inspections
ADD COLUMN review_status daily_inspection_review_status,
ADD COLUMN reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN reviewed_at TIMESTAMPTZ,
ADD COLUMN reviewer_notes TEXT,
ADD COLUMN submitted_at TIMESTAMPTZ;

-- Addendums table
CREATE TABLE daily_inspection_addendums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_inspection_id UUID NOT NULL REFERENCES daily_inspections(id),
  created_by UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link inspection items to issues
ALTER TABLE daily_inspection_items
ADD COLUMN issue_id UUID REFERENCES issues(id);

-- Add daily_grounds source
-- (Depends on current enum - may need ALTER TYPE)

-- RLS for addendums
ALTER TABLE daily_inspection_addendums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view addendums"
ON daily_inspection_addendums FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create addendums"
ON daily_inspection_addendums FOR INSERT
WITH CHECK (auth.uid() = created_by);
```

---

## Part 10: User Experience Flow

### Inspector Flow

1. Start daily inspection
2. Check all assets with photos
3. Add notes, attachments
4. Click "Submit Inspection"
5. **Redirect to Dashboard**
6. See status: "Pending Review"
7. Cannot edit - only add addendum if needed

### Supervisor Flow

1. See notification badge: "3 Pending Reviews"
2. Click to open Review Queue
3. Select inspection to review
4. View all asset checks, photos, notes
5. Either:
   - **Approve**: Issues created from defects
   - **Request Revision**: Inspector notified
   - **Reject**: With notes

### After Approval

1. Issues auto-created from defects
2. Appear in unified Issues dashboard
3. Assigned per normal workflow
4. Work orders can be created
5. Everyone sees same issues

---

## Part 11: Implementation Order

### Phase 1: Core Database & Redirect
1. Run database migration (review columns, addendums table)
2. Update wizard to redirect on completion
3. Update inspection interfaces with new fields

### Phase 2: Addendum System
4. Create AddendumDialog component
5. Create AddendumList component
6. Update DailyGroundsPage to show addendums
7. Prevent editing completed inspections

### Phase 3: Supervisor Review
8. Create InspectionReviewPage
9. Create InspectionReviewSheet
10. Add review hooks
11. Update sidebar with Review Queue link

### Phase 4: Issue Integration
12. Add trigger/function to create issues from approved defects
13. Add daily_grounds source to issues
14. Test end-to-end flow

---

## Technical Notes

### Preventing Edits

In `DailyGroundsPage.tsx`, when showing completed inspection:
- Hide "View or Edit" button
- Show "View Report" + "Add Addendum" instead
- Wizard receives `readOnly` prop

### Navigation

Use `react-router-dom`:
```tsx
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
// After submit:
navigate('/');
```

### Role Checking

Leverage existing `has_role` function:
```tsx
// Client-side (for UI only)
const canReview = userRoles.includes('manager') || 
                  userRoles.includes('superintendent') || 
                  userRoles.includes('admin');
```

RLS policies enforce server-side.
