
# Implementation Plan: Modular Architecture for Independent Modules

## Overview

This plan restructures the platform into three distinct, independently activatable modules:

| Module | Purpose | Billing |
|--------|---------|---------|
| **NSPIRE** | Inside unit inspections, compliance-driven | Paid add-on |
| **Daily Grounds** | Outside/grounds/asset inspections | Paid add-on |
| **Projects** | Construction/renovation projects | Paid add-on |

Each module can be enabled/disabled per property with settings persisted in the database.

---

## Current State Analysis

### What Exists
- `ModuleContext` with local state (not persisted)
- `properties.nspire_enabled` and `properties.projects_enabled` columns in database
- Settings page with toggle switches (changes lost on refresh)
- Sidebar conditionally shows modules (but NSPIRE and Daily Grounds bundled)

### What's Missing
1. No `daily_grounds_enabled` column in properties table
2. Module settings not loaded from database on app start
3. NSPIRE and Daily Grounds treated as same module
4. No per-property module configuration UI

---

## Part 1: Database Schema Update

Add new column to track Daily Grounds module separately:

```sql
ALTER TABLE properties 
ADD COLUMN daily_grounds_enabled BOOLEAN DEFAULT false;
```

---

## Part 2: Update Types

### src/types/modules.ts

```typescript
export interface ModuleConfig {
  nspireEnabled: boolean;      // Inside unit inspections
  dailyGroundsEnabled: boolean; // Outside/asset inspections (NEW)
  projectsEnabled: boolean;    // Construction projects
  occupancyEnabled: boolean;   // Future
  emailInboxEnabled: boolean;  // Future
  qrScanningEnabled: boolean;  // Future
}
```

### src/hooks/useProperties.ts

Add `daily_grounds_enabled` to Property interface.

---

## Part 3: Persist Module Settings

### Updated ModuleContext Logic

1. Load module defaults from properties on app start
2. When toggling at tenant level (Settings), update all properties
3. When toggling at property level, update that specific property

```typescript
// src/contexts/ModuleContext.tsx - Updated flow

// On load: Check if ANY property has module enabled
const loadModulesFromProperties = async () => {
  const { data: properties } = await supabase.from('properties').select('*');
  
  setModules({
    nspireEnabled: properties?.some(p => p.nspire_enabled) || false,
    dailyGroundsEnabled: properties?.some(p => p.daily_grounds_enabled) || false,
    projectsEnabled: properties?.some(p => p.projects_enabled) || false,
    // ... others
  });
};

// On toggle: Update all properties for tenant-wide setting
const toggleModule = async (module: keyof ModuleConfig) => {
  const columnMap = {
    nspireEnabled: 'nspire_enabled',
    dailyGroundsEnabled: 'daily_grounds_enabled',
    projectsEnabled: 'projects_enabled',
  };
  
  await supabase
    .from('properties')
    .update({ [columnMap[module]]: !modules[module] });
    
  setModules(prev => ({ ...prev, [module]: !prev[module] }));
};
```

---

## Part 4: Separate Sidebar Navigation

### Current (Bundled)
```
Inspections (nspireEnabled)
├── Dashboard
├── Daily Grounds     <-- Wrong location!
├── History
├── Review Queue
├── Outside (NSPIRE)
├── Inside (NSPIRE)
└── Units (NSPIRE)
```

### New (Separated)

```
Daily Grounds (dailyGroundsEnabled)
├── Today's Inspection
├── History
└── Review Queue

NSPIRE Compliance (nspireEnabled)
├── Dashboard
├── Outside (Building exterior per NSPIRE)
├── Inside (Common areas per NSPIRE)
└── Units (Unit inspections per NSPIRE)

Projects (projectsEnabled)
└── All Projects
```

---

## Part 5: Settings Page Enhancement

### Per-Property Module Configuration

Add ability to enable/disable modules at the property level in addition to tenant-wide:

```
Settings > Modules Tab

[Tenant-Wide Defaults]
┌─────────────────────────────────────────────┐
│ 🏠 Daily Grounds Inspections               │
│ Outside grounds and asset inspections      │
│ [Toggle: ON]                               │
├─────────────────────────────────────────────┤
│ 📋 NSPIRE Compliance                       │
│ Inside unit inspections per NSPIRE         │
│ [Toggle: OFF]                              │
├─────────────────────────────────────────────┤
│ 🔨 Projects                                │
│ Capital improvements and construction      │
│ [Toggle: ON]                               │
└─────────────────────────────────────────────┘

[Per-Property Overrides]
┌─────────────────────────────────────────────┐
│ Property: Riverside Manor                  │
│ [x] Daily Grounds  [x] NSPIRE  [ ] Projects│
├─────────────────────────────────────────────┤
│ Property: Glorieta Gardens                 │
│ [x] Daily Grounds  [ ] NSPIRE  [x] Projects│
└─────────────────────────────────────────────┘
```

---

## Part 6: Property Dialog Update

When creating/editing a property, show module toggles:

```
Edit Property Dialog

[Property Details...]

[Enabled Modules]
☑ Daily Grounds Inspections
☐ NSPIRE Compliance  
☑ Projects Module
```

---

## Implementation Summary

### Database Changes
1. Add `daily_grounds_enabled` column to properties table

### Files to Update

| File | Changes |
|------|---------|
| `src/types/modules.ts` | Add `dailyGroundsEnabled` to ModuleConfig |
| `src/contexts/ModuleContext.tsx` | Load from DB, persist toggles |
| `src/hooks/useProperties.ts` | Add `daily_grounds_enabled` to interface |
| `src/components/layout/AppSidebar.tsx` | Split into 3 module sections |
| `src/pages/settings/SettingsPage.tsx` | Add Daily Grounds toggle, per-property config |
| `src/components/properties/PropertyDialog.tsx` | Add module toggles to form |

### New Files
None required - all changes are to existing files.

---

## Module Descriptions (for UI)

| Module | Description | Use Case |
|--------|-------------|----------|
| **Daily Grounds** | Ongoing daily inspections of exterior grounds, assets, and infrastructure (cleanouts, catch basins, retention ponds) | Contracted for ongoing grounds maintenance inspections |
| **NSPIRE Compliance** | HUD NSPIRE-compliant inspection engine for inside areas and units with mandated defect catalogs and deadlines | Contracted for HUD compliance inspections |
| **Projects** | Capital improvement project management with daily reports, RFIs, change orders, punch lists, and closeout documentation | Contracted for specific construction/renovation projects |

---

## Technical Notes

1. **Backward Compatibility**: Existing `nspire_enabled` stays as-is for NSPIRE module
2. **Default Values**: New `daily_grounds_enabled` defaults to `false` 
3. **Migration**: Existing properties with NSPIRE enabled could optionally have Daily Grounds auto-enabled if desired
4. **Route Guards**: Consider adding route-level checks that redirect if module disabled
