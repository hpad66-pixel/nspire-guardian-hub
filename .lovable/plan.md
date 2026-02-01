
# Implementation Plan: Comprehensive QA/QC and Feature Completion

## Executive Summary

This plan addresses six critical areas:
1. **Implement Placeholder Features** - Occupancy Tracking, Mailbox Integration (already functional), QR Code Scanning
2. **Module Visibility Control** - Show/hide navigation based on activation status
3. **Navigation Organization & Audit** - Ensure all features are accessible with proper tooltips
4. **Data Filtering** - Add search/filter capabilities to all data tables
5. **Voice Dictation Editability** - Verify all voice dictation fields allow post-transcription editing
6. **Tooltip Implementation** - Add contextual help throughout the application

---

## Part 1: Current State Analysis

### Placeholder Features Status
| Feature | Current State | Action Required |
|---------|---------------|-----------------|
| Occupancy Tracking | Toggle exists in Settings, no functionality | Implement basic occupancy management |
| Email Inbox Integration | **Already functional** at `/inbox` | Remove "Coming Soon" badge, fully integrate |
| QR Code Scanning | Toggle exists in Settings, no functionality | Implement QR scanning for assets |

### Voice Dictation Components Status
| Component | Uses | Editable After? | Action |
|-----------|------|-----------------|--------|
| `VoiceDictationTextareaWithAI` | ProjectDialog, ChangeOrderDialog, PermitDialog, AssetDialog, ProposalEditor, etc. | Yes - textarea with `readOnly={false}` | Verify in all 8 locations |
| `VoiceDictationTextarea` (basic) | IssueDialog, RFIDialog, PunchItemDialog, AddendumDialog, InspectionReviewSheet, EnhancedDailyReportDialog | Yes - standard textarea | Upgrade to include AI polish |

### Pages Missing Search/Filters
| Page | Current Filters | Needs Added |
|------|-----------------|-------------|
| PropertiesPage | None | Search bar, status filter |
| WorkOrdersPage | Status, Priority | Search bar |
| PeoplePage | Property, Role, Status | Search bar |
| MailboxPage | Folder only | Search bar, source module filter |
| ReportsPage | None | Type filter |

---

## Part 2: Occupancy Tracking Module

### Implementation Scope
Create a functional tenant/occupancy management system that:
- Tracks tenant occupancy per unit
- Manages lease dates and status
- Provides occupancy analytics

### Database Schema
```sql
-- Tenant/Occupancy tracking table
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  lease_start DATE NOT NULL,
  lease_end DATE,
  rent_amount NUMERIC,
  deposit_amount NUMERIC,
  status TEXT NOT NULL DEFAULT 'active', -- active, notice_given, moved_out
  move_in_date DATE,
  move_out_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### New Files
| File | Purpose |
|------|---------|
| `src/pages/occupancy/OccupancyPage.tsx` | Main occupancy dashboard |
| `src/components/occupancy/TenantDialog.tsx` | Add/edit tenant |
| `src/components/occupancy/TenantDetailSheet.tsx` | View tenant details |
| `src/hooks/useTenants.ts` | Tenant CRUD operations |

### Navigation
- Add "Occupancy" link to sidebar under Platform section (conditionally shown when `occupancyEnabled`)

---

## Part 3: QR Code Scanning Module

### Implementation Scope
Enable mobile-friendly QR scanning for quick asset identification:
- Generate QR codes for each asset
- Scan QR to navigate to asset details
- Quick inspection start from QR scan

### Implementation Approach
1. Use browser native camera API for scanning (no heavy dependencies)
2. Generate QR codes containing asset ID
3. Create scanner component with camera access

### New Files
| File | Purpose |
|------|---------|
| `src/pages/qr/QRScannerPage.tsx` | QR scanner interface |
| `src/components/qr/QRCodeGenerator.tsx` | Generate QR for assets |
| `src/components/qr/QRScanner.tsx` | Camera-based scanner component |

### Integration Points
- Add QR code display to Asset cards
- Add "Scan Asset" option in mobile navigation
- Quick-start inspection from scanned asset

---

## Part 4: Module Visibility Control

### Current Issue
- All core platform items show regardless of module activation
- Inbox shows always but is labeled "Phase 2" in Settings

### Solution
Update `AppSidebar.tsx` to:
1. Show Inbox link always (it's already functional)
2. Conditionally show Occupancy when `occupancyEnabled`
3. Add QR Scanner link when `qrScanningEnabled`
4. Remove "Coming Soon" badges from functional features

### Navigation Structure (Updated)
```text
Platform Section:
├── Dashboard (always)
├── Properties (always)
├── Units (always)
├── Assets (always)
├── Issues (always)
├── Work Orders (always)
├── Documents (always)
├── Permits (always)
├── Inbox (always - functional)
├── People (always)
├── Reports (always)
├── Occupancy (when occupancyEnabled) ← NEW
└── QR Scanner (when qrScanningEnabled) ← NEW

Daily Grounds Module: (when dailyGroundsEnabled)
├── Today's Inspection
├── History
└── Review Queue

NSPIRE Compliance Module: (when nspireEnabled)
├── Dashboard
├── Outside
├── Inside
└── Units

Projects Module: (when projectsEnabled)
├── All Projects
└── Proposals (admin only)
```

---

## Part 5: Tooltip Implementation

### Approach
Wrap key navigation items and action buttons with `Tooltip` components to provide contextual help.

### Priority Areas for Tooltips
| Location | Element | Tooltip Text |
|----------|---------|--------------|
| Sidebar | Dashboard | "Overview of your property portfolio" |
| Sidebar | Properties | "Manage your real estate properties" |
| Sidebar | Units | "View and manage individual units" |
| Sidebar | Assets | "Infrastructure and equipment inventory" |
| Sidebar | Issues | "Track and resolve property issues" |
| Sidebar | Work Orders | "Manage repair and maintenance tasks" |
| Sidebar | Documents | "Organization-wide file library" |
| Sidebar | Permits | "Compliance permits and requirements" |
| Sidebar | Inbox | "Sent emails and communications" |
| Sidebar | People | "Team member management" |
| Sidebar | Reports | "Analytics and performance reports" |
| Sidebar | Occupancy | "Tenant and lease management" |
| Actions | + Add Property | "Add a new property to your portfolio" |
| Actions | Voice Mic | "Click to record, click again to stop" |
| Actions | Polish AI | "Use AI to improve and professionalize text" |

### Implementation
- Update `AppSidebar.tsx` to wrap menu items with tooltips
- Add tooltips to all primary action buttons
- Use consistent tooltip positioning (right side for sidebar, bottom for buttons)

---

## Part 6: Search & Filter Additions

### PropertiesPage
```typescript
// Add state
const [searchQuery, setSearchQuery] = useState('');
const [statusFilter, setStatusFilter] = useState<string>('all');

// Add filter UI
<div className="flex gap-4">
  <div className="relative flex-1 max-w-sm">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
    <Input
      placeholder="Search properties..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="pl-10"
    />
  </div>
  <Select value={statusFilter} onValueChange={setStatusFilter}>
    <SelectTrigger className="w-[150px]">
      <SelectValue placeholder="All Statuses" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Statuses</SelectItem>
      <SelectItem value="active">Active</SelectItem>
      <SelectItem value="inactive">Inactive</SelectItem>
    </SelectContent>
  </Select>
</div>
```

### WorkOrdersPage
- Add search input to existing filter row
- Search across title, property name, defect description

### PeoplePage
- Already has filters, add search input

### MailboxPage
- Add source_module filter dropdown
- Already has search via `searchQuery` state

---

## Part 7: Voice Dictation Verification

### Components Using VoiceDictationTextarea (basic)
These should be upgraded to `VoiceDictationTextareaWithAI` for consistency:

1. `IssueDialog.tsx` - Description field
2. `RFIDialog.tsx` - Question field  
3. `PunchItemDialog.tsx` - Description field
4. `AddendumDialog.tsx` - Content field
5. `InspectionReviewSheet.tsx` - Reviewer Notes field
6. `EnhancedDailyReportDialog.tsx` - Multiple fields

### Verification Checklist
All voice dictation textareas should:
- [x] Use controlled value prop
- [x] Have onChange handler for typing
- [x] Have onValueChange for programmatic updates
- [x] Not have `readOnly` or `disabled` attributes
- [x] Return focus after AI polish

The `VoiceDictationTextareaWithAI` component already has `readOnly={false}` and focus return logic. The basic `VoiceDictationTextarea` should also work for editing since it's a standard textarea.

---

## Part 8: Settings Page Updates

### Remove "Coming Soon" Labels
Update Settings page to:
1. Remove "Coming Soon" badge from Occupancy (now functional)
2. Change "Phase 2" badge on Email Inbox to "Available" (it's functional)
3. Keep QR Scanning as "Phase 2" until fully implemented

### Add Database Columns
```sql
-- Add to properties table for module persistence
ALTER TABLE properties ADD COLUMN occupancy_enabled BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN qr_scanning_enabled BOOLEAN DEFAULT false;
```

### Update ModuleContext
Map new module flags to database columns:
```typescript
const moduleColumnMap: Record<string, string> = {
  nspireEnabled: 'nspire_enabled',
  dailyGroundsEnabled: 'daily_grounds_enabled',
  projectsEnabled: 'projects_enabled',
  occupancyEnabled: 'occupancy_enabled',     // NEW
  qrScanningEnabled: 'qr_scanning_enabled',  // NEW
};
```

---

## Part 9: Files to Create

| File | Purpose |
|------|---------|
| `src/pages/occupancy/OccupancyPage.tsx` | Occupancy dashboard |
| `src/components/occupancy/TenantDialog.tsx` | Tenant add/edit form |
| `src/components/occupancy/TenantDetailSheet.tsx` | Tenant details view |
| `src/hooks/useTenants.ts` | Tenant CRUD hooks |
| `src/pages/qr/QRScannerPage.tsx` | QR scanner page |
| `src/components/qr/QRCodeGenerator.tsx` | QR code generation |
| `src/components/qr/QRScanner.tsx` | Camera scanner component |

---

## Part 10: Files to Modify

| File | Changes |
|------|---------|
| `src/components/layout/AppSidebar.tsx` | Add tooltips, conditional nav for Occupancy & QR |
| `src/pages/settings/SettingsPage.tsx` | Update badges, fix module status labels |
| `src/contexts/ModuleContext.tsx` | Add new module columns to map |
| `src/types/modules.ts` | Already has types (no change needed) |
| `src/App.tsx` | Add routes for Occupancy and QR pages |
| `src/pages/core/PropertiesPage.tsx` | Add search and status filter |
| `src/pages/workorders/WorkOrdersPage.tsx` | Add search input |
| `src/pages/inbox/MailboxPage.tsx` | Add source_module filter |
| `src/components/inbox/MailboxFolders.tsx` | Add module category filters |
| `src/components/issues/IssueDialog.tsx` | Upgrade to VoiceDictationTextareaWithAI |
| `src/components/projects/RFIDialog.tsx` | Upgrade to VoiceDictationTextareaWithAI |
| `src/components/projects/PunchItemDialog.tsx` | Upgrade to VoiceDictationTextareaWithAI |
| `src/components/inspections/AddendumDialog.tsx` | Upgrade to VoiceDictationTextareaWithAI |
| `src/components/inspections/InspectionReviewSheet.tsx` | Upgrade to VoiceDictationTextareaWithAI |
| `src/components/assets/AssetDialog.tsx` | Add QR code display |

---

## Part 11: Implementation Order

### Phase 1: Database & Core Infrastructure
1. Database migration for tenants table and property columns
2. Update ModuleContext with new column mappings
3. Update Settings page badges

### Phase 2: Occupancy Module
4. Create useTenants hook
5. Build OccupancyPage
6. Build TenantDialog and TenantDetailSheet
7. Add navigation link

### Phase 3: QR Scanning Module
8. Create QR generator component
9. Create scanner component (camera access)
10. Build QRScannerPage
11. Add QR to asset cards
12. Add navigation link

### Phase 4: Navigation & Tooltips
13. Update AppSidebar with tooltips on all items
14. Add conditional rendering for new modules
15. Verify all links work

### Phase 5: Search & Filters
16. Add search to PropertiesPage
17. Add search to WorkOrdersPage
18. Add module filter to MailboxPage

### Phase 6: Voice Dictation Upgrade
19. Upgrade basic VoiceDictationTextarea to WithAI in 6 components
20. Test editability after transcription and polish

### Phase 7: QA/QC Verification
21. End-to-end test all module toggles
22. Verify navigation visibility changes
23. Test all voice dictation fields
24. Verify all search/filter functionality

---

## Summary

This comprehensive QA/QC implementation addresses:

1. **Feature Completion** - Occupancy Tracking and QR Scanning modules fully implemented
2. **Module Visibility** - Navigation items conditionally shown based on activation
3. **Discoverability** - Tooltips added to all major navigation and action elements
4. **Data Findability** - Search and filter capabilities across all data views
5. **Voice Input UX** - All dictation fields support post-transcription editing with AI polish
6. **Professional Polish** - Consistent UX patterns throughout the application

The implementation prioritizes user experience with minimal friction, following the established Apple-inspired design language.
