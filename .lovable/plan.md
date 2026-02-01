
# Implementation Plan: Complete People Management System

## Executive Summary

This plan implements a comprehensive People management system with property-specific assignments, dynamic role-based permissions, archival capabilities for departed staff, and complete audit trails for legal compliance and forensic purposes.

---

## Part 1: Current State Analysis

### What Exists
| Component | Status | Notes |
|-----------|--------|-------|
| `profiles` table | Exists | Stores user profile information |
| `user_roles` table | Exists | Stores global roles per user |
| `project_team_members` table | Exists | Project-specific role assignments |
| `UserManagement` component | Exists | Basic role management in Settings |
| `has_role()` function | Exists | Security definer for RLS checks |
| `activity_log` table | Exists | General audit trail |

### What's Missing
- **Property-specific team assignments** (like `project_team_members` but for properties)
- **Custom role definitions** with granular permissions
- **User status management** (active/archived/deactivated)
- **Historical tracking** of role changes
- **Departure/archival workflow** with reason tracking
- **Dedicated People page** with full CRUD and filtering

---

## Part 2: Database Architecture

### New Tables

**1. `property_team_members`** - Links users to properties with roles
```sql
CREATE TABLE property_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  title TEXT, -- Job title: "Site Manager", "Lead Inspector"
  department TEXT, -- "Operations", "Maintenance", "Compliance"
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE, -- NULL = active, date = departed
  status TEXT NOT NULL DEFAULT 'active', -- active, archived, deactivated
  departure_reason TEXT, -- resignation, termination, transfer, contract_end
  departure_notes TEXT, -- Additional context for records
  added_by UUID REFERENCES auth.users(id),
  archived_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id, user_id, end_date) -- Allow same user to rejoin
);
```

**2. `role_definitions`** - Custom role configuration
```sql
CREATE TABLE role_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key TEXT UNIQUE NOT NULL, -- Maps to app_role enum
  display_name TEXT NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL DEFAULT 1, -- For hierarchy
  is_system_role BOOLEAN DEFAULT false, -- Can't be deleted
  permissions JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**3. `role_permissions`** - Granular permission assignments
```sql
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key TEXT NOT NULL,
  module TEXT NOT NULL, -- 'properties', 'inspections', 'projects', 'work_orders', etc.
  action TEXT NOT NULL, -- 'view', 'create', 'update', 'delete', 'approve', 'assign'
  allowed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role_key, module, action)
);
```

**4. `user_status_history`** - Track all status changes for audit
```sql
CREATE TABLE user_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  property_id UUID REFERENCES properties(id), -- NULL = global change
  previous_status TEXT,
  new_status TEXT NOT NULL,
  previous_role app_role,
  new_role app_role,
  reason TEXT,
  notes TEXT,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Schema Updates

**Update `profiles` table:**
```sql
ALTER TABLE profiles ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE profiles ADD COLUMN phone TEXT;
ALTER TABLE profiles ADD COLUMN job_title TEXT;
ALTER TABLE profiles ADD COLUMN department TEXT;
ALTER TABLE profiles ADD COLUMN emergency_contact TEXT;
ALTER TABLE profiles ADD COLUMN emergency_phone TEXT;
ALTER TABLE profiles ADD COLUMN hire_date DATE;
ALTER TABLE profiles ADD COLUMN last_active_at TIMESTAMPTZ;
```

---

## Part 3: Role & Permission System

### Default System Roles

| Role Key | Display Name | Priority | Description |
|----------|--------------|----------|-------------|
| `admin` | Administrator | 100 | Full system access |
| `manager` | Property Manager | 80 | Manage properties, approve actions |
| `project_manager` | Project Manager | 70 | Manage projects, budgets, teams |
| `superintendent` | Superintendent | 60 | Field operations, work orders |
| `inspector` | Inspector | 50 | Inspections, defect reporting |
| `owner` | Property Owner | 40 | Read-only oversight, reports |
| `subcontractor` | Subcontractor | 30 | Limited project access |
| `viewer` | Viewer | 10 | Read-only access |
| `user` | Standard User | 1 | Basic authenticated access |

### Permission Matrix

```text
┌──────────────────┬───────┬─────────┬─────────────────┬───────────────┬───────────┬───────┬──────────────┬────────┐
│ Module           │ Admin │ Manager │ Project Manager │ Superintendent│ Inspector │ Owner │ Subcontractor│ Viewer │
├──────────────────┼───────┼─────────┼─────────────────┼───────────────┼───────────┼───────┼──────────────┼────────┤
│ Properties       │ CRUD  │ CRUD    │ R               │ R             │ R         │ R     │ -            │ R      │
│ People           │ CRUD  │ CRUD    │ R               │ R             │ R         │ R     │ -            │ R      │
│ Work Orders      │ CRUD  │ CRUD    │ CRU             │ CRU           │ RU        │ R     │ R            │ R      │
│ Inspections      │ CRUD  │ CRU     │ R               │ CRU           │ CRU       │ R     │ -            │ R      │
│ Projects         │ CRUD  │ CRU     │ CRUD            │ RU            │ R         │ R     │ RU           │ R      │
│ Issues           │ CRUD  │ CRU     │ CRU             │ CRU           │ CRU       │ R     │ R            │ R      │
│ Documents        │ CRUD  │ CRUD    │ CRU             │ CRU           │ CRU       │ R     │ R            │ R      │
│ Reports          │ CRUD  │ R       │ R               │ R             │ R         │ R     │ -            │ R      │
│ Settings         │ CRUD  │ R       │ -               │ -             │ -         │ -     │ -            │ -      │
│ Approve Actions  │ ✓     │ ✓       │ ✓ (projects)    │ -             │ -         │ -     │ -            │ -      │
└──────────────────┴───────┴─────────┴─────────────────┴───────────────┴───────────┴───────┴──────────────┴────────┘
```
*C = Create, R = Read, U = Update, D = Delete*

---

## Part 4: People Page UI Design

### Main View

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ People                                                                               │
│ Manage team members across all properties                                            │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐│
│  │ Active Members   │  │ Archived         │  │ Properties       │  │ Roles        ││
│  │       24         │  │       8          │  │      12          │  │      9       ││
│  │                  │  │ Historical       │  │ With team        │  │ Defined      ││
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────┘│
│                                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────────────────┤
│  │ [🔍 Search people...]  [Status ▼]  [Property ▼]  [Role ▼]         [+ Add Person]│
│  └──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  Tabs: [All People] [By Property] [Archived] [Roles & Permissions]                  │
│                                                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │ User              │ Properties & Roles      │ Status    │ Since     │ Actions │  │
│  ├───────────────────────────────────────────────────────────────────────────────┤  │
│  │ [Avatar] Sarah    │ Oak Grove - Manager     │ ● Active  │ Jan 2024  │ [⋮]     │  │
│  │          Johnson  │ Pine Valley - Manager   │           │           │         │  │
│  │          sarah@.. │                         │           │           │         │  │
│  ├───────────────────────────────────────────────────────────────────────────────┤  │
│  │ [Avatar] Mike     │ Oak Grove - Inspector   │ ● Active  │ Mar 2024  │ [⋮]     │  │
│  │          Davis    │                         │           │           │         │  │
│  │          mike@..  │                         │           │           │         │  │
│  ├───────────────────────────────────────────────────────────────────────────────┤  │
│  │ [Avatar] John     │ Riverside - Super       │ ○ Archived│ Jun 2023- │ [⋮]     │  │
│  │          Smith    │ (Resigned Jan 2025)     │           │ Jan 2025  │         │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Person Detail Sheet

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Sarah Johnson                                                     [● Active ▼] [×] │
│ Property Manager                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  [Avatar]     sarah.johnson@company.com                                             │
│               (555) 123-4567                                                         │
│               Hired: January 15, 2024                                               │
│                                                                                      │
│  ────────────────────────────────────────────────────────────────────────────────   │
│                                                                                      │
│  PROPERTY ASSIGNMENTS                                           [+ Add Property]   │
│  ─────────────────────                                                               │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │ 🏢 Oak Grove Apartments                                                        │ │
│  │    Role: [Manager ▼]  Title: Site Manager   Dept: Operations                   │ │
│  │    Since: Jan 15, 2024                                      [Remove]          │ │
│  ├────────────────────────────────────────────────────────────────────────────────┤ │
│  │ 🏢 Pine Valley Estates                                                         │ │
│  │    Role: [Manager ▼]  Title: Oversight                                         │ │
│  │    Since: Mar 1, 2024                                       [Remove]          │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                      │
│  GLOBAL ROLES                                                                        │
│  ────────────                                                                        │
│  [Manager ×] [User ×]                               [+ Add Role]                    │
│                                                                                      │
│  ACTIVITY HISTORY                                                                    │
│  ────────────────                                                                    │
│  Feb 1, 2025 • Assigned to Pine Valley as Manager (by Admin)                        │
│  Jan 15, 2024 • Added to Oak Grove as Manager (by Admin)                            │
│  Jan 15, 2024 • Account created                                                      │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Archive Person Dialog

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Archive Team Member                                                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  You are about to archive John Smith from Oak Grove Apartments.                      │
│                                                                                      │
│  This will:                                                                          │
│  • Revoke active access to the property                                             │
│  • Preserve all historical data for audit purposes                                   │
│  • Allow reactivation in the future if needed                                        │
│                                                                                      │
│  Departure Date: [Feb 1, 2025 📅]                                                    │
│                                                                                      │
│  Reason: [Select reason ▼]                                                          │
│    ○ Resignation                                                                     │
│    ○ Termination                                                                     │
│    ○ Transfer to another property                                                    │
│    ○ Contract ended                                                                  │
│    ○ Other                                                                           │
│                                                                                      │
│  Notes: ┌─────────────────────────────────────────────────────────────────────────┐ │
│         │ Add any relevant details for records...                    [🎤] [✨]    │ │
│         └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                                      │
│                                              [Cancel]  [Archive Team Member]        │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Roles & Permissions Tab

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Roles & Permissions                                                 [+ Create Role] │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  System Roles                                                                        │
│  ─────────────                                                                       │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │ [Shield] Administrator                                          [🔒 System]    │ │
│  │          Full platform access. Cannot be modified or deleted.                  │ │
│  │          Members: 2                                                             │ │
│  ├────────────────────────────────────────────────────────────────────────────────┤ │
│  │ [Shield] Property Manager                                      [Edit]          │ │
│  │          Manages assigned properties, approves work orders.                    │ │
│  │          Members: 8                                                             │ │
│  │          ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │          │ Properties: ✓View ✓Create ✓Edit ✓Delete                        │   │ │
│  │          │ Work Orders: ✓View ✓Create ✓Edit □Delete ✓Approve              │   │ │
│  │          │ Inspections: ✓View ✓Create ✓Edit □Delete                       │   │ │
│  │          │ People: ✓View ✓Create ✓Edit □Delete                            │   │ │
│  │          └─────────────────────────────────────────────────────────────────┘   │ │
│  ├────────────────────────────────────────────────────────────────────────────────┤ │
│  │ [Shield] Inspector                                             [Edit]          │ │
│  │          Conducts inspections and reports defects.                             │ │
│  │          Members: 12                                                            │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 5: Files to Create

| File | Purpose |
|------|---------|
| `src/pages/people/PeoplePage.tsx` | Main People management page |
| `src/components/people/PersonDetailSheet.tsx` | View/edit person details |
| `src/components/people/PersonDialog.tsx` | Add/invite new person |
| `src/components/people/PropertyAssignmentDialog.tsx` | Assign person to property |
| `src/components/people/ArchivePersonDialog.tsx` | Archive with reason |
| `src/components/people/RolesPermissionsTab.tsx` | Role management interface |
| `src/components/people/PersonPropertyCard.tsx` | Property assignment card |
| `src/hooks/usePeople.ts` | CRUD for property_team_members |
| `src/hooks/useRoleDefinitions.ts` | Role management hooks |
| `src/hooks/useUserStatusHistory.ts` | Status change tracking |
| `src/hooks/usePermissions.ts` | Permission checking utilities |

---

## Part 6: Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add `/people` route pointing to new PeoplePage |
| `src/components/layout/AppSidebar.tsx` | Already has People link (no change needed) |
| `src/hooks/useUserManagement.ts` | Add profile status updates |
| `src/contexts/ModuleContext.tsx` | Add permission checking methods |

---

## Part 7: RLS Policies

```sql
-- property_team_members policies
CREATE POLICY "Authenticated users can view team members"
  ON property_team_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can manage team members"
  ON property_team_members FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- role_definitions policies  
CREATE POLICY "Authenticated users can view roles"
  ON role_definitions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can manage roles"
  ON role_definitions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- role_permissions policies
CREATE POLICY "Authenticated users can view permissions"
  ON role_permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can manage permissions"
  ON role_permissions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- user_status_history policies
CREATE POLICY "Admins and managers can view history"
  ON user_status_history FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "System can insert history"
  ON user_status_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
```

---

## Part 8: Audit Trail Integration

### Automatic Logging Trigger

```sql
CREATE OR REPLACE FUNCTION log_user_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.role IS DISTINCT FROM NEW.role OR
    OLD.end_date IS DISTINCT FROM NEW.end_date
  ) THEN
    INSERT INTO user_status_history (
      user_id, property_id, previous_status, new_status,
      previous_role, new_role, reason, changed_by
    ) VALUES (
      NEW.user_id, NEW.property_id, OLD.status, NEW.status,
      OLD.role, NEW.role, NEW.departure_reason, auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER track_team_member_changes
  AFTER UPDATE ON property_team_members
  FOR EACH ROW EXECUTE FUNCTION log_user_status_change();
```

---

## Part 9: Implementation Order

### Phase 1: Database Foundation
1. Create database migration with all new tables
2. Seed default role definitions and permissions
3. Add trigger for automatic status tracking

### Phase 2: Core Hooks & Utilities
4. Create `usePeople.ts` hook for CRUD operations
5. Create `useRoleDefinitions.ts` for role management
6. Create `useUserStatusHistory.ts` for audit viewing
7. Create `usePermissions.ts` for permission checks

### Phase 3: Main UI Components
8. Build `PeoplePage.tsx` with tabs and filtering
9. Build `PersonDetailSheet.tsx` for viewing/editing
10. Build `PersonDialog.tsx` for adding new people
11. Build `PropertyAssignmentDialog.tsx`

### Phase 4: Archival & Roles
12. Build `ArchivePersonDialog.tsx` with reason capture
13. Build `RolesPermissionsTab.tsx` for role configuration
14. Build role permission editor component

### Phase 5: Integration
15. Update route in `App.tsx`
16. Add permission checks to existing pages
17. Connect to activity log system
18. Test end-to-end workflows

---

## Part 10: Key Features Summary

| Feature | Description | Audit Trail |
|---------|-------------|-------------|
| **Property Assignments** | Assign users to specific properties with roles | Logged on create/update |
| **Role Management** | View/edit permissions per role | Logged on changes |
| **Archival Workflow** | Deactivate with reason, preserve history | Full reason capture |
| **Status History** | Complete timeline of all changes | Automatic trigger |
| **Reactivation** | Restore archived users when needed | Logged with reason |
| **Permission Matrix** | Granular control per module/action | Editable by admin |
| **Property Filtering** | View people by property | N/A |
| **Search & Filter** | Find people by name, role, status | N/A |

---

## Technical Considerations

1. **Soft Delete Pattern**: Never hard-delete user records - always archive with status change
2. **Separation of Concerns**: Global roles (user_roles) vs Property-specific assignments (property_team_members)
3. **Immutable History**: Status history table is append-only for audit compliance
4. **Permission Caching**: Consider caching role permissions in React context for performance
5. **RLS Security**: All access controlled via security definer functions to prevent escalation

---

## Summary

This implementation provides:

1. **Property-Specific Team Management** - Assign users to specific properties with appropriate roles
2. **Flexible Role System** - Predefined roles with customizable permissions
3. **Complete Audit Trail** - Every status change, role assignment, and archival is tracked
4. **Legal Compliance** - Archived users preserve all data for forensic purposes
5. **Intuitive UI** - Clean, minimal design following existing patterns
6. **Access Control Integration** - Permissions connect to all existing modules
