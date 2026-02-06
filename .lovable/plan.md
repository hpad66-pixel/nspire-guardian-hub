
# Demo Property Seeding System

## Overview

This plan creates a comprehensive **seeded demo property** called "Demo Property - Sunset Ridge" that is:
1. Completely separate from production data (Glorieta Gardens)
2. Only visible to users with `admin`, `owner`, or `manager` roles
3. Fully populated with realistic sample data across all modules
4. Protected by a database flag `is_demo` on the properties table

---

## Technical Architecture

```text
                     DEMO PROPERTY FIREWALL
    ┌───────────────────────────────────────────────────────────────┐
    │                                                               │
    │  ┌─────────────────────────────────────────────────────────┐ │
    │  │  properties (is_demo = true)                            │ │
    │  │  "Demo Property - Sunset Ridge"                         │ │
    │  └─────────────────────────────────────────────────────────┘ │
    │                          │                                    │
    │        ┌─────────────────┼─────────────────┐                 │
    │        ▼                 ▼                 ▼                 │
    │  ┌───────────┐    ┌───────────┐    ┌───────────┐            │
    │  │   Units   │    │   Assets  │    │  Projects │            │
    │  │   (10)    │    │   (15)    │    │    (2)    │            │
    │  └───────────┘    └───────────┘    └───────────┘            │
    │        │                │                │                   │
    │        ▼                ▼                ▼                   │
    │  ┌───────────┐    ┌───────────┐    ┌───────────┐            │
    │  │  Issues   │    │Daily Insp.│    │Milestones │            │
    │  │   (8)     │    │   (5)     │    │   (6)     │            │
    │  └───────────┘    └───────────┘    └───────────┘            │
    │        │                                                     │
    │        ▼                                                     │
    │  ┌───────────┐    ┌───────────┐    ┌───────────┐            │
    │  │Work Orders│    │  Permits  │    │ Contacts  │            │
    │  │   (6)     │    │   (3)     │    │   (5)     │            │
    │  └───────────┘    └───────────┘    └───────────┘            │
    │                                                               │
    └───────────────────────────────────────────────────────────────┘
                                │
                                ▼
              ROLE-BASED ACCESS CONTROL (RLS)
              ┌────────────────────────────────┐
              │ Visible only to:               │
              │  • admin                       │
              │  • manager                     │
              │  • owner                       │
              └────────────────────────────────┘
```

---

## Database Changes

### 1. Add `is_demo` Flag to Properties Table

Add a boolean column to identify demo properties:

```sql
ALTER TABLE properties 
ADD COLUMN is_demo BOOLEAN DEFAULT FALSE;
```

### 2. Create Security Definer Function for Demo Access

```sql
CREATE OR REPLACE FUNCTION public.can_view_demo_property(_user_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'manager', 'owner')
  )
$$;
```

### 3. Update RLS Policies

Update the properties SELECT policy to filter demo properties for non-privileged users:

```sql
-- Drop existing policy
DROP POLICY IF EXISTS "Authenticated users can view properties" ON properties;

-- Create new policy that hides demo from non-admin/manager/owner
CREATE POLICY "Users can view appropriate properties"
ON properties FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    is_demo = false OR 
    is_demo IS NULL OR 
    can_view_demo_property(auth.uid())
  )
);
```

---

## Seeded Demo Data

### Demo Property Details
| Field | Value |
|-------|-------|
| Name | Demo Property - Sunset Ridge |
| Address | 1234 Sunset Boulevard |
| City | Phoenix |
| State | AZ |
| Zip | 85001 |
| Year Built | 2015 |
| Total Units | 48 |
| Status | active |
| is_demo | TRUE |
| All modules enabled | TRUE |

### Units (10 sample)
| Unit | Bedrooms | Bathrooms | Status |
|------|----------|-----------|--------|
| 101 | 1 | 1 | occupied |
| 102 | 2 | 1 | occupied |
| 103 | 2 | 2 | occupied |
| 201 | 1 | 1 | vacant |
| 202 | 2 | 1 | occupied |
| 203 | 3 | 2 | occupied |
| 301 | 1 | 1 | maintenance |
| 302 | 2 | 2 | occupied |
| 303 | 2 | 1 | vacant |
| 401 | 3 | 2 | occupied |

### Assets (15 sample - 3 per type)
| Type | Name | Location | Status |
|------|------|----------|--------|
| cleanout | Main Sewer Cleanout A | Building A - North Side | active |
| cleanout | Main Sewer Cleanout B | Building B - East Side | active |
| cleanout | Secondary Cleanout | Parking Lot | needs_attention |
| catch_basin | Storm Drain CB-01 | Parking Entrance | active |
| catch_basin | Storm Drain CB-02 | Pool Area | active |
| catch_basin | Storm Drain CB-03 | Building C Rear | needs_attention |
| lift_station | Primary Lift Station | Utility Building | active |
| lift_station | Secondary Lift Station | South Lot | active |
| lift_station | Emergency Backup LS | Basement Utility | maintenance |
| retention_pond | East Retention Basin | East Property Line | active |
| retention_pond | West Retention Basin | West Property Line | active |
| retention_pond | Overflow Pond | North Corner | active |
| general_grounds | Main Entrance Garden | Property Entrance | active |
| general_grounds | Pool Deck Area | Pool Zone | active |
| general_grounds | Playground Equipment | Children's Area | active |

### Issues (8 sample with various statuses/severities)
| Title | Severity | Status | Source |
|-------|----------|--------|--------|
| Water leak in Unit 302 bathroom | moderate | open | core |
| HVAC not cooling in Unit 103 | moderate | in_progress | core |
| Broken light fixture in parking lot | low | open | daily_grounds |
| Storm drain CB-02 clogged | moderate | assigned | daily_grounds |
| Cracked tile in Unit 401 kitchen | low | resolved | nspire |
| Emergency exit sign malfunction | severe | open | core |
| Lift station alarm triggered | severe | in_progress | daily_grounds |
| Pool gate latch needs replacement | low | resolved | core |

### Work Orders (6 sample)
| Title | Priority | Status | Due Date |
|-------|----------|--------|----------|
| Repair bathroom leak - Unit 302 | emergency | in_progress | +2 days |
| Replace HVAC filter - Unit 103 | routine | pending | +5 days |
| Fix parking lot lights | routine | assigned | +7 days |
| Clear storm drain CB-02 | emergency | assigned | +1 day |
| Replace pool gate latch | routine | completed | -3 days |
| Service lift station pump | routine | pending | +10 days |

### Projects (2 sample)
| Name | Status | Budget | Spent |
|------|--------|--------|-------|
| Building Exterior Renovation | active | $150,000 | $45,000 |
| Pool Deck Resurfacing | planning | $35,000 | $0 |

### Project Milestones (6 sample for Renovation project)
| Milestone | Due Date | Status |
|-----------|----------|--------|
| Scaffolding Installation | -30 days | completed |
| Pressure Washing | -15 days | completed |
| Paint Prep Work | -5 days | completed |
| First Coat Application | +10 days | in_progress |
| Final Coat Application | +25 days | pending |
| Final Inspection | +35 days | pending |

### Permits (3 sample)
| Name | Type | Status | Expiry |
|------|------|--------|--------|
| Building Occupancy Certificate | occupancy_certificate | active | +365 days |
| Fire Safety Inspection | fire_safety | active | +180 days |
| Pool Operating Permit | pool | active | +90 days |

### CRM Contacts (5 sample)
| Name | Type | Company |
|------|------|---------|
| Mike's Plumbing | vendor | Mike's Plumbing Co. |
| ABC Electric | vendor | ABC Electrical Services |
| Green Lawn Care | vendor | Green Lawn Landscaping |
| Fire Marshal Office | regulator | Phoenix Fire Department |
| Pool Inspector | inspector | County Health Dept. |

### Internal Messages (3 sample threads)
| Subject | Participants |
|---------|--------------|
| Weekly Maintenance Update | All staff |
| HVAC Issue Follow-up - Unit 103 | Maintenance + Manager |
| Pool Permit Renewal Reminder | Admin + Compliance |

### Maintenance Requests (2 sample via Voice Agent)
| Ticket | Issue | Status |
|--------|-------|--------|
| MR-0001 | Kitchen sink clog | new |
| MR-0002 | AC not working | assigned |

---

## Implementation Files

### New Files

1. **`supabase/migrations/[timestamp]_add_demo_property_support.sql`**
   - Add `is_demo` column to properties
   - Create `can_view_demo_property()` function
   - Update RLS policies

2. **`supabase/migrations/[timestamp]_seed_demo_property.sql`**
   - Insert demo property with fixed UUID
   - Insert all related demo data (units, assets, issues, etc.)
   - Use deterministic UUIDs for easy reference

3. **`src/hooks/useDemoProperty.ts`**
   - Hook to identify if current user can see demo data
   - Hook to get the demo property ID

### Modified Files

1. **`src/hooks/useProperties.ts`**
   - No changes needed (RLS handles filtering automatically)

2. **`src/pages/core/PropertiesPage.tsx`**
   - Add visual indicator (badge) for demo properties
   - Show "Demo" tag to distinguish from real properties

3. **`src/components/layout/AppSidebar.tsx`**
   - Add demo property indicator in sidebar if user has access

---

## Demo Property Visual Indicator

Properties marked as demo will display a distinctive badge:

```text
┌─────────────────────────────────────────────┐
│ 🏢 Demo Property - Sunset Ridge  [DEMO]    │
│ 📍 Phoenix, AZ                              │
│ 🚪 48 units                                 │
│ ┌─────────────────────────────────────────┐ │
│ │ NSPIRE │ Projects │ Daily Grounds │    │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

---

## Security Model

### Who Can See Demo Property?

| Role | Can View Demo? |
|------|----------------|
| admin | Yes |
| manager | Yes |
| owner | Yes |
| project_manager | No |
| superintendent | No |
| inspector | No |
| subcontractor | No |
| viewer | No |
| user | No |

### RLS Policy Flow

```text
User Request → Check auth.uid() exists
                    ↓
            Query properties table
                    ↓
        ┌───────────────────────────┐
        │ is_demo = false/NULL?     │
        │         ↓ YES             │
        │    Return property        │
        └───────────────────────────┘
                    │ NO (is_demo = true)
                    ↓
        ┌───────────────────────────┐
        │ can_view_demo_property()? │
        │         ↓ YES             │
        │    Return property        │
        │         ↓ NO              │
        │    Filter out (hidden)    │
        └───────────────────────────┘
```

---

## Sample Data Reference IDs

Using deterministic UUIDs for the demo data allows for:
- Easy testing and debugging
- Consistent cross-referencing in seed data
- Simple cleanup if needed

```sql
-- Demo Property ID
'00000000-0000-0000-0000-000000000001'

-- Demo Units (001-010)
'00000000-0000-0000-0001-000000000001' through '...010'

-- Demo Assets (001-015)
'00000000-0000-0000-0002-000000000001' through '...015'

-- Demo Issues (001-008)
'00000000-0000-0000-0003-000000000001' through '...008'

-- Demo Work Orders (001-006)
'00000000-0000-0000-0004-000000000001' through '...006'

-- Demo Projects (001-002)
'00000000-0000-0000-0005-000000000001' through '...002'
```

---

## Implementation Steps

### Phase 1: Database Schema
1. Add `is_demo` column to properties table
2. Create `can_view_demo_property()` security definer function
3. Update properties RLS policy to filter demo data

### Phase 2: Seed Demo Property
1. Insert demo property with is_demo = true
2. Insert 10 sample units
3. Insert 15 sample assets (3 per type)
4. Enable all modules on demo property

### Phase 3: Seed Related Data
1. Insert 8 sample issues (various statuses)
2. Insert 6 sample work orders
3. Insert 2 sample projects with milestones
4. Insert 3 sample permits with requirements
5. Insert 5 sample CRM contacts
6. Insert 2 sample maintenance requests (voice agent)

### Phase 4: UI Indicators
1. Add "DEMO" badge to property cards
2. Create `useDemoProperty` hook for access checking
3. Optionally add demo mode toggle in settings (admin only)

---

## Value Delivered

1. **Developer Onboarding**: New developers can immediately see how all features work together
2. **Client Demos**: Sales team can demonstrate full functionality without using real data
3. **Testing**: QA can use demo property for regression testing
4. **Training**: New staff can explore the system without affecting production
5. **Security**: Demo data is completely isolated via RLS policies
