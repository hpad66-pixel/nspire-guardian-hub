
# Complete NSPIRE Property OS Implementation Plan

## Executive Summary
This plan implements the full NSPIRE-compliant inspection system with working backend persistence, interactive forms, defect capture, work order generation, and cross-module issue tracking. All features will be functional end-to-end after implementation.

---

## Phase 1: Database Schema Enhancements

### 1.1 Add Storage Bucket for Photo Uploads
Create a storage bucket for inspection photos and proof-of-repair images with appropriate RLS policies.

### 1.2 Add Database Function for Auto-Creating Issues from Defects
Create a trigger that automatically generates an Issue record when a defect is created, linking it to the source inspection and applying NSPIRE severity-based deadlines.

### 1.3 Add Work Orders Table
```text
work_orders
├── id (uuid)
├── defect_id (uuid, FK)
├── issue_id (uuid, FK)
├── property_id (uuid, FK)
├── unit_id (uuid, FK, nullable)
├── title (text)
├── description (text)
├── priority (enum: emergency, routine)
├── status (enum: pending, assigned, in_progress, completed, verified)
├── assigned_to (uuid, FK to auth.users)
├── due_date (date)
├── completed_at (timestamp)
├── proof_photos (text[])
├── created_at, updated_at
```

### 1.4 Add Projects Table (for Projects Module)
```text
projects
├── id, property_id, name, description, scope
├── status (planning, active, on_hold, completed, closed)
├── budget, spent
├── start_date, target_end_date, actual_end_date
├── created_by, created_at, updated_at

project_milestones
├── id, project_id, name, due_date, status, notes

daily_reports
├── id, project_id, report_date, weather, work_performed
├── workers_count, issues_encountered, photos
├── submitted_by, created_at

change_orders
├── id, project_id, title, description, amount
├── status (draft, pending, approved, rejected)
├── requested_by, approved_by, approved_at
```

---

## Phase 2: React Hooks and Data Layer

### 2.1 Create useUnits Hook
Full CRUD operations for units with property relationship joins.

### 2.2 Create useDefects Hook
- Fetch defects by inspection
- Create defect with auto-deadline calculation
- Update defect repair status
- Mark as repaired with proof photos

### 2.3 Create useWorkOrders Hook
- Create work orders from defects
- Update work order status
- Assign work orders to users
- Upload proof of repair photos

### 2.4 Create useProjects Hook (for Projects module)
Full CRUD for projects, milestones, daily reports, and change orders.

### 2.5 Enhance useInspections Hook
- Add scheduling functionality
- Add completion with summary
- Add annual progress tracking queries

---

## Phase 3: Inspection Form Components

### 3.1 Create Property/Unit Selection Dialog
- Search and select property
- For unit inspections: drill down to select specific unit
- Show last inspection date and compliance status

### 3.2 Create Inspection Form Wizard
Multi-step form with:

Step 1: **Select Property/Unit**
- Property dropdown with search
- Unit selection (for unit inspections)
- Area confirmation (outside/inside/unit)

Step 2: **Inspect Items**
- Display NSPIRE catalog items grouped by category
- Each item expandable to add defect
- Quick pass/fail toggle per item

Step 3: **Capture Defects**
- For each failed item:
  - Select condition from predefined list
  - Severity auto-assigned (with override option for inspectors)
  - Location description field
  - Photo capture (multiple photos)
  - Notes field
  - Auto-calculated repair deadline shown

Step 4: **Review and Submit**
- Summary of all defects found
- Total by severity (severe/moderate/low)
- Confirm inspection completion
- Option to save as draft

### 3.3 Create DefectCapture Component
Reusable component for capturing individual defects:
- Photo upload with preview
- Condition selector
- Severity badge with deadline
- Location picker

### 3.4 Create PhotoUpload Component
- Camera integration for mobile
- File upload for desktop
- Image preview with delete
- Compression before upload

---

## Phase 4: Work Order Generation

### 4.1 Auto-Generate Work Orders
When defects are saved:
- Severe defects: Create emergency work order (priority: emergency, due in 24h)
- Moderate defects: Create routine work order (due in 30 days)
- Low defects: Create routine work order (due in 60 days)

### 4.2 Work Order Dashboard
- List all work orders with filters (property, status, priority, assignee)
- Urgent work orders highlighted
- Proof of repair upload for completed work

### 4.3 Work Order Detail View
- Full defect information
- Assignment management
- Status progression workflow
- Proof photo upload for verification

---

## Phase 5: Update Inspection Pages with Real Data

### 5.1 InspectionsDashboard
- Replace mock data with real database queries
- Show actual severe/moderate/low defect counts
- Calculate real annual inspection progress
- List actual recent defects requiring attention

### 5.2 OutsideInspections Page
- List real outside inspections from database
- Add "Start Inspection" button that opens wizard
- Show real defect data per inspection

### 5.3 InsideInspections Page
- Same updates as Outside but for inside/common area
- Building selector for properties with multiple buildings

### 5.4 UnitInspections Page
- Real unit inspection data
- Unit search functionality
- Annual progress by property
- Quick access to start unit inspection

---

## Phase 6: Properties and Units Management

### 6.1 Properties Page Updates
- Add Property creation dialog with full form
- Edit property functionality
- Delete with confirmation
- Toggle NSPIRE/Projects enabled per property

### 6.2 Create Units Page
- List all units with property filter
- Add Unit creation dialog
- Bulk import capability (CSV)
- Last inspection date display
- Quick link to start unit inspection

### 6.3 Property Detail View
- Show property overview
- List all units
- Inspection history
- Active issues/defects

---

## Phase 7: Issues Enhancement

### 7.1 Update Issues Page
- Real data from database with joins
- Filter by source module (Core, NSPIRE, Projects)
- Filter by severity, status, property
- Sort by deadline urgency

### 7.2 Create Issue Dialog
- Manual issue creation
- Property/unit selection
- Severity and deadline
- Assignment

### 7.3 Issue Detail View
- Full issue information
- Link to source inspection/defect
- Status progression
- Assignment and notes

---

## Phase 8: Projects Module (Full Implementation)

### 8.1 Projects List with Real Data
- Create/edit projects
- Property association
- Budget tracking

### 8.2 Project Detail View
- Milestones timeline
- Daily reports list
- Change orders
- Progress visualization

### 8.3 Daily Report Form
- Date and weather
- Work performed
- Worker count
- Issues encountered
- Photo attachments

### 8.4 Change Order Form
- Amount and description
- Approval workflow
- Status tracking

---

## Phase 9: Dashboard with Real Data

### 9.1 Main Dashboard Updates
- Real property and unit counts
- Real open issues count
- Actual compliance rate calculation
- Real severe defects list

### 9.2 Inspection Module Card
- Real completed/scheduled/overdue counts
- Real urgent repairs list

### 9.3 Projects Module Card
- Real active project count
- Real budget totals

---

## Technical Details

### Files to Create:
```text
src/hooks/
├── useUnits.ts
├── useDefects.ts
├── useWorkOrders.ts
├── useProjects.ts
├── useDailyReports.ts
├── useChangeOrders.ts
├── useMilestones.ts
├── useInspectionStats.ts

src/components/inspections/
├── InspectionWizard.tsx
├── PropertyUnitSelector.tsx
├── DefectCapture.tsx
├── DefectCatalogList.tsx
├── InspectionSummary.tsx
├── PhotoUpload.tsx

src/components/workorders/
├── WorkOrderList.tsx
├── WorkOrderCard.tsx
├── WorkOrderDialog.tsx
├── ProofOfRepairUpload.tsx

src/components/properties/
├── PropertyDialog.tsx
├── PropertyCard.tsx

src/components/units/
├── UnitDialog.tsx
├── UnitList.tsx
├── UnitCard.tsx

src/components/issues/
├── IssueDialog.tsx
├── IssueCard.tsx
├── IssueFilters.tsx

src/components/projects/
├── ProjectDialog.tsx
├── ProjectCard.tsx
├── MilestoneTimeline.tsx
├── DailyReportForm.tsx
├── ChangeOrderForm.tsx

src/pages/
├── core/UnitsPage.tsx
├── core/PropertyDetailPage.tsx
├── workorders/WorkOrdersPage.tsx
├── workorders/WorkOrderDetailPage.tsx
├── projects/ProjectDetailPage.tsx
```

### Files to Update:
```text
src/pages/inspections/InspectionsDashboard.tsx
src/pages/inspections/OutsideInspections.tsx
src/pages/inspections/InsideInspections.tsx
src/pages/inspections/UnitInspections.tsx
src/pages/core/PropertiesPage.tsx
src/pages/core/IssuesPage.tsx
src/pages/projects/ProjectsDashboard.tsx
src/pages/Dashboard.tsx
src/App.tsx (add new routes)
```

### Database Migration:
- Add work_orders table with RLS
- Add projects, milestones, daily_reports, change_orders tables
- Create storage bucket for photos
- Add trigger for auto-issue creation from defects
- Add function for deadline calculation

---

## Implementation Order

1. **Database first**: Run migration for all new tables and storage
2. **Hooks layer**: Create all data hooks
3. **Core components**: PropertyDialog, UnitDialog, PhotoUpload
4. **Inspection wizard**: Full multi-step form
5. **Work order system**: Auto-generation and management
6. **Update all pages**: Replace mock data with real queries
7. **Projects module**: Full implementation
8. **Dashboard**: Real-time statistics

---

## Expected Outcome
After implementation:
- Users can sign up and log in
- Admins/managers can create properties and units
- Inspectors can conduct full NSPIRE inspections
- Defects auto-create issues and work orders
- Work orders track repair progress with proof photos
- All dashboards show real data
- Projects module fully functional with daily reports and change orders
- Cross-module issue tracking works end-to-end
