
# Property Archives - Permanent Document Retention System
## Enterprise-Grade As-Built & Critical Document Repository

---

## Overview

Create a dedicated **Property Archives** section within the Document Center that serves as an immutable, permanently retained repository for critical property documents like as-builts, design drawings, engineering specifications, equipment manuals, and official permits. This section will be visually distinct, admin-managed, and view-only for all other users.

---

## Core Requirements

| Requirement | Implementation |
|-------------|----------------|
| **Permanent Retention** | No delete capability, no archive capability - documents stay forever |
| **Admin-Only Upload** | Only users with `admin` role can add/manage documents |
| **View & Download for Others** | All authenticated users can view and download, but not modify |
| **Beautiful UX** | Premium visual design that conveys importance and permanence |
| **Clear Separation** | Distinct from regular document folders |

---

## Database Schema

### New Table: `property_archives`

A dedicated table for permanent records, separate from `organization_documents`:

```sql
CREATE TABLE property_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Category & Organization
  category TEXT NOT NULL DEFAULT 'as-builts',
  subcategory TEXT,
  
  -- Document Metadata
  name TEXT NOT NULL,
  description TEXT,
  document_number TEXT, -- e.g., "DWG-001", "MECH-HVAC-01"
  revision TEXT DEFAULT 'A', -- A, B, C, etc.
  
  -- File Info
  file_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  
  -- Property Association (optional - for multi-property support)
  property_id UUID REFERENCES properties(id),
  
  -- Timestamps & Attribution
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Source / Original Date
  original_date DATE, -- When the original document was created
  received_from TEXT, -- e.g., "ABC Engineering", "City of Houston"
  
  -- Searchability
  tags TEXT[] DEFAULT '{}',
  
  -- Audit Trail
  notes TEXT
);

-- Enable RLS
ALTER TABLE property_archives ENABLE ROW LEVEL SECURITY;

-- Everyone can view
CREATE POLICY "Authenticated users can view archives"
ON property_archives FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admins can insert
CREATE POLICY "Only admins can create archives"
ON property_archives FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Only admins can update
CREATE POLICY "Only admins can update archives"
ON property_archives FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- NO DELETE POLICY - Documents cannot be deleted
```

### Archive Categories (Enum or constant)

```typescript
export const ARCHIVE_CATEGORIES = [
  { id: 'as-builts', label: 'As-Built Drawings', icon: 'Blueprint', description: 'Final construction drawings reflecting actual conditions' },
  { id: 'design-drawings', label: 'Design Drawings', icon: 'Compass', description: 'Original architectural and engineering designs' },
  { id: 'engineering', label: 'Engineering Specifications', icon: 'FileCode', description: 'Structural, MEP, and civil engineering documents' },
  { id: 'equipment-manuals', label: 'Equipment Manuals', icon: 'BookOpen', description: 'Operating & maintenance manuals for installed equipment' },
  { id: 'permits-approvals', label: 'Permits & Approvals', icon: 'Stamp', description: 'Original issued permits and regulatory approvals' },
  { id: 'surveys-reports', label: 'Surveys & Reports', icon: 'MapPin', description: 'Property surveys, environmental reports, assessments' },
  { id: 'warranties', label: 'Warranties & Guarantees', icon: 'Shield', description: 'Equipment and construction warranties' },
  { id: 'legal-deeds', label: 'Legal & Deeds', icon: 'Scale', description: 'Property deeds, easements, legal agreements' },
] as const;
```

---

## UI Architecture

### Documents Page Redesign

Transform the Document Center into a two-section layout:

```
┌─────────────────────────────────────────────────────┐
│  DOCUMENTS                                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  📦 PROPERTY ARCHIVES                        │   │
│  │  Permanent records. As-builts, drawings,     │   │
│  │  equipment manuals. View & download only.    │   │
│  │                                [View Archives]│   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  📁 WORKING DOCUMENTS                        │   │
│  │  Contracts, insurance, policies, reports.    │   │
│  │                             [Browse Documents]│   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Property Archives Page

A premium, dedicated page for the archives:

```
┌─────────────────────────────────────────────────────┐
│  ← Back to Documents                                │
│                                                     │
│  📦 Property Archives                               │
│  Permanent property records - never deleted         │
│                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ As-Built │ │ Design   │ │ Equip.   │ │ Permits│ │
│  │ Drawings │ │ Drawings │ │ Manuals  │ │        │ │
│  │    12    │ │    8     │ │    24    │ │   6    │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
│                                                     │
│  ┌─────────────────────────────────────────────────┐│
│  │ Category: As-Built Drawings              [Admin]││
│  ├─────────────────────────────────────────────────┤│
│  │ 📐 Site Plan As-Built          REV C    [View] ││
│  │    DWG-001 • ABC Engineering • Mar 2024        ││
│  │ 📐 Floor Plan Level 1          REV B    [View] ││
│  │    DWG-002 • ABC Engineering • Mar 2024        ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

---

## Component Structure

### New Files

```
src/
├── pages/
│   └── documents/
│       └── PropertyArchivesPage.tsx     # Full archives view
├── components/
│   └── documents/
│       ├── ArchiveHero.tsx              # Premium hero section
│       ├── ArchiveCategoryCard.tsx      # Category tiles
│       ├── ArchiveDocumentCard.tsx      # Individual document card
│       ├── ArchiveDocumentTable.tsx     # List view
│       ├── ArchiveUploadDialog.tsx      # Admin upload (admin only)
│       ├── ArchiveDocumentViewer.tsx    # View/download sheet
│       └── ArchiveEmptyState.tsx        # Beautiful empty state
├── hooks/
│   └── usePropertyArchives.ts           # CRUD operations
```

---

## Visual Design

### Design Language

The Property Archives section will use a **premium, vault-like aesthetic** to convey:
- **Permanence** - These documents don't get deleted
- **Importance** - Critical property records
- **Trust** - Secure, organized, professional

### Visual Elements

| Element | Design |
|---------|--------|
| **Color Palette** | Deep navy, gold accents, subtle gradients |
| **Icons** | Blueprint, Compass, BookOpen, Shield, Stamp |
| **Cards** | Elevated shadows, subtle borders, premium feel |
| **Empty States** | Illustrated, encouraging, professional |
| **Admin Badge** | Subtle gold "Admin" indicator on upload actions |

### Hero Section (ArchiveHero.tsx)

```tsx
// Premium hero with vault/archive imagery
<div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 mb-8">
  {/* Background pattern */}
  <div className="absolute inset-0 opacity-5">
    <GridPattern />
  </div>
  
  <div className="relative z-10">
    <div className="flex items-center gap-3 mb-4">
      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
        <Archive className="h-7 w-7 text-white" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white">Property Archives</h1>
        <p className="text-slate-400">Permanent records. Always available.</p>
      </div>
    </div>
    
    <p className="text-slate-300 max-w-2xl">
      Critical property documentation including as-built drawings, engineering specifications, 
      equipment manuals, and official permits. These records are permanently retained and 
      cannot be deleted.
    </p>
    
    {isAdmin && (
      <Button className="mt-6 bg-amber-500 hover:bg-amber-600">
        <Plus className="mr-2 h-4 w-4" />
        Add Document
      </Button>
    )}
  </div>
</div>
```

### Category Cards

```tsx
// Premium category tiles with counts
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  {categories.map((cat) => (
    <motion.div
      whileHover={{ y: -4 }}
      className={cn(
        "relative p-6 rounded-2xl border cursor-pointer transition-all",
        selectedCategory === cat.id
          ? "bg-primary text-primary-foreground border-primary shadow-lg"
          : "bg-card hover:bg-muted/50 border-border"
      )}
    >
      <cat.icon className="h-8 w-8 mb-4" />
      <p className="font-semibold">{cat.label}</p>
      <p className="text-3xl font-bold mt-2">{cat.count}</p>
      <p className="text-xs opacity-75">documents</p>
    </motion.div>
  ))}
</div>
```

### Document Cards (View Mode)

```tsx
// Individual archive document - premium card
<div className="group p-4 rounded-xl border bg-card hover:shadow-md transition-all">
  <div className="flex items-start gap-4">
    {/* File type icon */}
    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
      <FileType className="h-6 w-6 text-primary" />
    </div>
    
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <h4 className="font-semibold truncate">{document.name}</h4>
        <Badge variant="outline">REV {document.revision}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">{document.document_number}</p>
      <p className="text-xs text-muted-foreground mt-1">
        {document.received_from} • {format(document.original_date, 'MMM yyyy')}
      </p>
    </div>
    
    {/* Actions */}
    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button variant="ghost" size="icon" onClick={() => handleView(document)}>
        <Eye className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => handleDownload(document)}>
        <Download className="h-4 w-4" />
      </Button>
    </div>
  </div>
</div>
```

---

## Permission Handling

### Frontend Checks

```tsx
// In PropertyArchivesPage.tsx
const { isAdmin } = useUserPermissions();

return (
  <div>
    <ArchiveHero canUpload={isAdmin} onUpload={() => setUploadOpen(true)} />
    
    {/* Upload button only for admins */}
    {isAdmin && (
      <Button onClick={() => setUploadOpen(true)}>
        Add Document
      </Button>
    )}
    
    {/* View/Download available to everyone */}
    <ArchiveDocumentTable 
      documents={documents} 
      canEdit={isAdmin}  // Shows edit actions only for admin
    />
  </div>
);
```

### Action Restrictions

| Role | View | Download | Upload | Edit | Delete |
|------|------|----------|--------|------|--------|
| Admin | ✅ | ✅ | ✅ | ✅ | ❌ (by design) |
| Manager | ✅ | ✅ | ❌ | ❌ | ❌ |
| All Others | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## Storage Bucket

Create a dedicated, private storage bucket for archives:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-archives', 'property-archives', false);

-- Only admins can upload
CREATE POLICY "Admins can upload archives"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-archives' AND
  has_role(auth.uid(), 'admin')
);

-- All authenticated can download
CREATE POLICY "Authenticated can download archives"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'property-archives');
```

---

## Value Proposition Messaging

Integrate into the Documents page and Features page with clear value messaging:

### In Documents Page Header

> **Property Archives**: Your permanent vault for critical property documentation. 
> As-builts, equipment manuals, and original permits—secured and accessible forever.

### In Features Page (Update ModuleShowcase)

Add a section highlighting the archives:

```tsx
{
  title: 'Property Archives',
  headline: 'Your Permanent Digital Vault.',
  points: [
    { icon: Lock, text: 'As-built drawings and design documents secured forever' },
    { icon: BookOpen, text: 'Equipment manuals accessible to maintenance staff' },
    { icon: Shield, text: 'Admin-controlled uploads, view-only for teams' },
    { icon: History, text: 'Complete audit trail of property documentation' },
  ],
  visual: 'archives',
}
```

---

## Implementation Phases

### Phase 1: Database & Hooks
1. Create `property_archives` table with RLS
2. Create `property-archives` storage bucket
3. Implement `usePropertyArchives.ts` hook
4. Add categories constant

### Phase 2: UI Components
1. Build `ArchiveHero.tsx` with premium styling
2. Build `ArchiveCategoryCard.tsx` tiles
3. Build `ArchiveDocumentCard.tsx` for list view
4. Build `ArchiveUploadDialog.tsx` (admin only)
5. Build `ArchiveDocumentViewer.tsx` sheet

### Phase 3: Page Integration
1. Create `PropertyArchivesPage.tsx`
2. Add route in `App.tsx`
3. Update `DocumentsPage.tsx` with dual-section layout
4. Add navigation link in sidebar

### Phase 4: Features Integration
1. Update `ModuleShowcase.tsx` with archives section
2. Add archives to platform overview

---

## Deliverables Summary

| Component | Purpose |
|-----------|---------|
| **Database table** | `property_archives` with strict RLS |
| **Storage bucket** | `property-archives` with admin-only upload |
| **New hook** | `usePropertyArchives.ts` |
| **6 new components** | Premium archives UI |
| **1 new page** | `/documents/archives` |
| **Updated Documents page** | Dual-section layout |
| **Features page update** | Archives module showcase |

---

## Visual Mockup Summary

The Property Archives will feel like:
- A **secure vault** for important documents
- **Premium and professional** with dark gradients and gold accents
- **Clear hierarchy** with category tiles
- **Easy to navigate** with filtering and search
- **Immediately useful** with view and download always visible
- **Trust-building** with revision tracking and source attribution

This implementation positions document management as a **first-class enterprise feature** that demonstrates the platform's commitment to permanent record retention and regulatory compliance.
