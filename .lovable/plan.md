
# Implementation Plan: Permit & Regulatory Compliance Tracking System

## Overview

Build a comprehensive permit and regulatory compliance tracking system that manages permits, their requirements, deliverables, and compliance status. This system will integrate with the existing Document Center for file storage while providing dedicated tracking, deadline management, and compliance reporting.

---

## Architecture Decision: Standalone Module vs. Document Center Extension

### Recommended Approach: Hybrid Architecture

The permit system should be a **standalone module** that **links to** the Document Center for file storage. This provides:

1. **Dedicated data structures** for permit metadata (issue dates, expiry dates, jurisdictions, etc.)
2. **Requirement tracking** with deadlines, deliverables, and compliance status
3. **Integration with existing documents** - permits stored in "Permits" folder remain linked
4. **Issues integration** - non-compliance creates issues in the unified Issues system

---

## Part 1: Data Model Design

### Core Tables

```text
+---------------------+       +------------------------+       +------------------------+
|      permits        |       |  permit_requirements   |       | permit_deliverables    |
+---------------------+       +------------------------+       +------------------------+
| id                  |       | id                     |       | id                     |
| property_id (FK)    |<------| permit_id (FK)         |<------| requirement_id (FK)    |
| permit_type         |       | title                  |       | title                  |
| permit_number       |       | description            |       | description            |
| name                |       | requirement_type       |       | due_date               |
| description         |       | frequency              |       | submitted_at           |
| issuing_authority   |       | start_date             |       | status                 |
| issue_date          |       | end_date               |       | document_id (FK)       |
| expiry_date         |       | status                 |       | submitted_by           |
| status              |       | next_due_date          |       | notes                  |
| document_id (FK)    |       | notes                  |       | created_at             |
| notes               |       | created_at             |       +------------------------+
| created_by          |       +------------------------+
| created_at          |
+---------------------+
```

### Permit Types (Enum)
- `building_permit` - Construction/renovation permits
- `occupancy_certificate` - Certificate of Occupancy
- `fire_safety` - Fire department permits/inspections
- `elevator` - Elevator operating permits
- `pool` - Pool/spa permits
- `boiler` - Boiler inspection certificates
- `environmental` - Environmental compliance permits
- `hud_compliance` - HUD/Section 8 compliance
- `ada` - ADA compliance certifications
- `other` - Custom permit types

### Requirement Types (Enum)
- `inspection` - Periodic inspections required
- `report` - Reports that must be submitted
- `certification` - Certifications that must be renewed
- `filing` - Documents to be filed with authorities
- `payment` - Fees or payments due
- `training` - Required training/certifications for staff
- `other` - Custom requirements

### Frequency Options (Enum)
- `one_time` - One-time requirement
- `monthly` - Every month
- `quarterly` - Every 3 months
- `semi_annual` - Every 6 months
- `annual` - Every year
- `biennial` - Every 2 years
- `as_needed` - No fixed schedule

### Status Values
**Permit Status**: `draft`, `active`, `expired`, `renewed`, `revoked`
**Requirement Status**: `pending`, `in_progress`, `compliant`, `non_compliant`, `waived`
**Deliverable Status**: `pending`, `submitted`, `approved`, `rejected`, `overdue`

---

## Part 2: Database Schema

```sql
-- Create permit types enum
CREATE TYPE permit_type AS ENUM (
  'building_permit', 'occupancy_certificate', 'fire_safety', 
  'elevator', 'pool', 'boiler', 'environmental', 
  'hud_compliance', 'ada', 'other'
);

-- Create requirement types enum
CREATE TYPE requirement_type AS ENUM (
  'inspection', 'report', 'certification', 
  'filing', 'payment', 'training', 'other'
);

-- Create frequency enum
CREATE TYPE requirement_frequency AS ENUM (
  'one_time', 'monthly', 'quarterly', 'semi_annual', 
  'annual', 'biennial', 'as_needed'
);

-- Create permit status enum
CREATE TYPE permit_status AS ENUM (
  'draft', 'active', 'expired', 'renewed', 'revoked'
);

-- Create requirement status enum
CREATE TYPE requirement_status AS ENUM (
  'pending', 'in_progress', 'compliant', 'non_compliant', 'waived'
);

-- Create deliverable status enum
CREATE TYPE deliverable_status AS ENUM (
  'pending', 'submitted', 'approved', 'rejected', 'overdue'
);

-- Permits table
CREATE TABLE permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  permit_type permit_type NOT NULL,
  permit_number TEXT,
  name TEXT NOT NULL,
  description TEXT,
  issuing_authority TEXT,
  issue_date DATE,
  expiry_date DATE,
  status permit_status NOT NULL DEFAULT 'draft',
  document_id UUID REFERENCES organization_documents(id),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Permit requirements table
CREATE TABLE permit_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id UUID NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  requirement_type requirement_type NOT NULL,
  frequency requirement_frequency NOT NULL DEFAULT 'annual',
  start_date DATE,
  end_date DATE,
  status requirement_status NOT NULL DEFAULT 'pending',
  next_due_date DATE,
  last_completed_date DATE,
  responsible_user_id UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Permit deliverables table (specific submissions for requirements)
CREATE TABLE permit_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES permit_requirements(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  submitted_at TIMESTAMPTZ,
  status deliverable_status NOT NULL DEFAULT 'pending',
  document_id UUID REFERENCES organization_documents(id),
  submitted_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_permits_property ON permits(property_id);
CREATE INDEX idx_permits_status ON permits(status);
CREATE INDEX idx_permits_expiry ON permits(expiry_date);
CREATE INDEX idx_requirements_permit ON permit_requirements(permit_id);
CREATE INDEX idx_requirements_due ON permit_requirements(next_due_date);
CREATE INDEX idx_deliverables_requirement ON permit_deliverables(requirement_id);
CREATE INDEX idx_deliverables_due ON permit_deliverables(due_date);
CREATE INDEX idx_deliverables_status ON permit_deliverables(status);

-- Enable RLS
ALTER TABLE permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE permit_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE permit_deliverables ENABLE ROW LEVEL SECURITY;

-- RLS Policies (similar to other tables)
CREATE POLICY "Authenticated users can view permits" ON permits
  FOR SELECT USING (true);

CREATE POLICY "Admins and managers can manage permits" ON permits
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Similar policies for requirements and deliverables...

-- Trigger to update updated_at
CREATE TRIGGER update_permits_updated_at BEFORE UPDATE ON permits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requirements_updated_at BEFORE UPDATE ON permit_requirements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deliverables_updated_at BEFORE UPDATE ON permit_deliverables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Part 3: UI Architecture

### New Pages

| Route | Component | Purpose |
|-------|-----------|---------|
| `/permits` | `PermitsDashboard.tsx` | Overview of all permits with stats |
| `/permits/:id` | `PermitDetailPage.tsx` | Single permit with requirements |

### Page Structure

```text
PERMITS DASHBOARD
+------------------------------------------------------------------+
|  [Shield] Permits & Compliance            [+ Add Permit]         |
|  Track regulatory requirements and deadlines                     |
+------------------------------------------------------------------+

STATS CARDS:
+------------+ +------------+ +------------+ +------------+
|   Active   | |  Expiring  | |    Due     | | Non-Compl. |
|     12     | |   Soon 3   | |   This Mo  | |     2      |
|  permits   | |  (30 days) | |     5      | |  critical  |
+------------+ +------------+ +------------+ +------------+

FILTERS:  [Property ▼] [Type ▼] [Status ▼] [Search...]

PERMIT CARDS:
+------------------------------------------------------------------+
| [Fire] Fire Safety Certificate         [Active] [Exp: Mar 2026]  |
|        Riverside Manor                                            |
|        FDNY Certificate #12345                                    |
|        +--------------------------------------------------+       |
|        | Requirements: 2/3 compliant | Next Due: Feb 15  |       |
|        +--------------------------------------------------+       |
+------------------------------------------------------------------+

| [Elevator] Elevator Operating Permit   [Expiring] [Exp: Feb 2026]|
|        ...                                                        |
+------------------------------------------------------------------+
```

### Permit Detail Page

```text
PERMIT DETAIL
+------------------------------------------------------------------+
|  [← Back]  Fire Safety Certificate              [Edit] [Archive] |
|                                          [Active] [Expires: Mar] |
+------------------------------------------------------------------+
|  Property: Riverside Manor                                       |
|  Permit #: FDNY-2024-12345                                       |
|  Authority: NYC Fire Department                                  |
|  Issued: Jan 15, 2024                                            |
|  Expires: Mar 15, 2026                                           |
|                                                                  |
|  [📄 View Permit Document]                                       |
+------------------------------------------------------------------+

TABS: [Requirements] [Deliverables] [History] [Documents]

REQUIREMENTS TAB:
+------------------------------------------------------------------+
| ● Annual Fire Inspection                    [Compliant]          |
|   Frequency: Annual | Next Due: Jan 15, 2027                     |
|   Last Completed: Jan 10, 2026                                   |
|   Assigned to: John Smith                                        |
|   +---------------------------------------------------+          |
|   | Deliverables:                                     |          |
|   | ✓ Inspection Report (submitted)                  |          |
|   | ✓ Corrective Action Plan (approved)              |          |
|   | ○ Fire Drill Documentation (due Feb 28)          |          |
|   +---------------------------------------------------+          |
+------------------------------------------------------------------+
| ○ Monthly Fire Extinguisher Check           [Pending]            |
|   Frequency: Monthly | Next Due: Feb 1, 2026                     |
|   ...                                                            |
+------------------------------------------------------------------+
```

---

## Part 4: New Components

### Components to Create

| Component | Purpose |
|-----------|---------|
| `PermitsDashboard.tsx` | Main permits listing page |
| `PermitDetailPage.tsx` | Single permit detail view |
| `PermitDialog.tsx` | Create/edit permit form |
| `PermitCard.tsx` | Permit summary card |
| `RequirementDialog.tsx` | Create/edit requirement |
| `RequirementCard.tsx` | Requirement with progress |
| `DeliverableDialog.tsx` | Create/edit deliverable |
| `DeliverableItem.tsx` | Individual deliverable row |
| `PermitCalendar.tsx` | Calendar view of due dates |
| `ComplianceStats.tsx` | Stats card component |

---

## Part 5: Hooks Architecture

### New Hooks

```typescript
// src/hooks/usePermits.ts
export function usePermits(propertyId?: string)
export function usePermit(id: string)
export function usePermitStats()
export function useExpiringPermits(days: number)
export function useCreatePermit()
export function useUpdatePermit()
export function useArchivePermit()

// src/hooks/usePermitRequirements.ts
export function useRequirementsByPermit(permitId: string)
export function useUpcomingRequirements(days: number)
export function useNonCompliantRequirements()
export function useCreateRequirement()
export function useUpdateRequirement()
export function useCompleteRequirement()

// src/hooks/usePermitDeliverables.ts
export function useDeliverablesByRequirement(requirementId: string)
export function useOverdueDeliverables()
export function useCreateDeliverable()
export function useSubmitDeliverable()
export function useApproveDeliverable()
export function useRejectDeliverable()
```

---

## Part 6: Integration Points

### 1. Issues Integration
When a requirement becomes non-compliant or a deliverable is overdue, automatically create an Issue:

```sql
-- Trigger function to create issue on non-compliance
CREATE OR REPLACE FUNCTION create_issue_from_permit_noncompliance()
RETURNS TRIGGER AS $$
DECLARE
  v_permit RECORD;
  v_requirement RECORD;
BEGIN
  -- When deliverable becomes overdue or requirement non-compliant
  IF NEW.status = 'overdue' AND OLD.status != 'overdue' THEN
    -- Get requirement and permit details
    SELECT * INTO v_requirement FROM permit_requirements WHERE id = NEW.requirement_id;
    SELECT * INTO v_permit FROM permits WHERE id = v_requirement.permit_id;
    
    -- Create issue
    INSERT INTO issues (
      property_id, source_module, severity, deadline,
      title, description, status
    ) VALUES (
      v_permit.property_id, 'permits', 'moderate',
      NEW.due_date + INTERVAL '7 days',
      v_permit.name || ' - ' || NEW.title || ' Overdue',
      'Permit deliverable is overdue and requires immediate attention.',
      'open'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 2. Document Center Integration
- Permit documents stored in existing `organization_documents` table
- Link via `document_id` foreign key
- Deliverables also link to uploaded documents
- "Permits" folder in Document Center shows linked documents

### 3. Dashboard Integration
Add permit compliance stats to main Dashboard:
- Expiring permits count
- Upcoming requirements due
- Non-compliant items requiring action

### 4. Notifications
Create notifications for:
- Permits expiring in 30/60/90 days
- Requirements due in 7/14/30 days
- Deliverables approaching deadline
- Non-compliance status changes

---

## Part 7: Navigation Update

Add to `AppSidebar.tsx`:

```text
PLATFORM (in sidebar)
├── Dashboard
├── Properties
├── Units
├── Issues
├── Documents
├── Permits & Compliance    ← NEW
└── Inbox
```

---

## Part 8: Implementation Order

### Phase 1: Database & Core
1. Create database migration with all tables, enums, RLS
2. Create `usePermits.ts` hook with CRUD operations
3. Create `usePermitRequirements.ts` hook
4. Create `usePermitDeliverables.ts` hook

### Phase 2: UI - Permits Dashboard
5. Create `PermitCard.tsx` component
6. Create `PermitDialog.tsx` for create/edit
7. Create `PermitsDashboard.tsx` page
8. Add route and navigation

### Phase 3: UI - Permit Detail
9. Create `RequirementCard.tsx` component
10. Create `RequirementDialog.tsx` for create/edit
11. Create `DeliverableItem.tsx` and `DeliverableDialog.tsx`
12. Create `PermitDetailPage.tsx` with tabs

### Phase 4: Integrations
13. Add Issues integration trigger
14. Update Dashboard with permit stats
15. Create notification triggers
16. Add to existing reports

---

## Part 9: Future Enhancements (Not in Initial Scope)

- **Permit Templates**: Pre-built templates for common permit types
- **Automated Reminders**: Email notifications for upcoming deadlines
- **Bulk Import**: Import permits from CSV/Excel
- **Regulatory API Integration**: Auto-check permit status with authorities
- **Calendar Sync**: Export deadlines to calendar apps
- **Audit Trail**: Detailed history of all changes
- **Multi-property View**: Cross-property compliance reporting

---

## Summary

This implementation creates a robust permit and regulatory compliance tracking system that:

1. **Stores permit metadata** separately from documents for better querying
2. **Tracks requirements** with flexible frequency options
3. **Manages deliverables** with approval workflows
4. **Integrates with Issues** for unified problem tracking
5. **Links to Document Center** for file storage
6. **Provides dashboards** with compliance visibility
7. **Follows existing patterns** in the codebase for consistency

The system ensures properties stay compliant with all regulatory requirements through proactive deadline tracking and automated issue creation when items become non-compliant.
