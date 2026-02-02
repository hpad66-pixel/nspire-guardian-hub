

# Property Archives Implementation
## Permanent Document Retention System for Critical Property Records

---

## Overview

Implementing a dedicated **Property Archives** section within the Document Center—a secure, immutable vault for critical property documentation including as-builts, design drawings, equipment manuals, and official permits. This system will be visually distinct with a premium vault aesthetic, admin-managed for uploads, and view/download-only for all other users.

---

## Implementation Summary

| Component | Description |
|-----------|-------------|
| **1 Database Table** | `property_archives` with strict RLS (no delete policy) |
| **1 Storage Bucket** | `property-archives` with admin-only upload access |
| **1 New Hook** | `usePropertyArchives.ts` for CRUD operations |
| **5 New Components** | Premium archive UI components |
| **1 New Page** | `/documents/archives` route |
| **Updated Pages** | `DocumentsPage.tsx` with dual-section layout |
| **Features Update** | Add Property Archives to showcase |

---

## Phase 1: Database & Storage

### New Table: `property_archives`

```sql
CREATE TABLE property_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT 'as-builts',
  subcategory TEXT,
  name TEXT NOT NULL,
  description TEXT,
  document_number TEXT,
  revision TEXT DEFAULT 'A',
  file_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  property_id UUID REFERENCES properties(id),
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  original_date DATE,
  received_from TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT
);

-- Enable RLS with NO DELETE policy (permanent retention)
ALTER TABLE property_archives ENABLE ROW LEVEL SECURITY;

-- View: All authenticated users
CREATE POLICY "Authenticated users can view archives"
ON property_archives FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Insert: Only admins
CREATE POLICY "Only admins can create archives"
ON property_archives FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Update: Only admins  
CREATE POLICY "Only admins can update archives"
ON property_archives FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- NO DELETE POLICY - Documents are permanent
```

### Storage Bucket: `property-archives`

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

-- All authenticated users can download
CREATE POLICY "Authenticated can download archives"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'property-archives');
```

---

## Phase 2: Archive Categories

```typescript
// src/hooks/usePropertyArchives.ts
export const ARCHIVE_CATEGORIES = [
  { id: 'as-builts', label: 'As-Built Drawings', icon: 'FileType', description: 'Final construction drawings reflecting actual conditions' },
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

## Phase 3: New Hook

### `src/hooks/usePropertyArchives.ts`

```typescript
// Fetch all archives with optional category filter
export function usePropertyArchives(category?: string)

// Fetch category counts for tiles
export function useArchiveCategoryStats()

// Upload archive (admin only)
export function useUploadPropertyArchive()

// Update archive metadata (admin only)
export function useUpdatePropertyArchive()

// NO DELETE MUTATION - by design
```

---

## Phase 4: UI Components

### File Structure

```
src/components/documents/
├── DocumentUploadDialog.tsx (existing)
├── ArchiveHero.tsx           # Premium dark hero with vault aesthetic
├── ArchiveCategoryCard.tsx   # Category tile with count
├── ArchiveDocumentCard.tsx   # Individual document row
├── ArchiveUploadDialog.tsx   # Admin-only upload dialog
└── ArchiveViewerSheet.tsx    # Document preview/download sheet
```

### ArchiveHero.tsx - Premium Vault Header
- Dark gradient background (slate-900 → slate-800)
- Gold accent icon (amber-400 → amber-600)
- "Property Archives" title with "Permanent records. Always available." tagline
- Admin-only "Add Document" button with gold styling
- Background grid pattern for premium feel

### ArchiveCategoryCard.tsx - Category Tiles
- Grid of 8 category cards with icons
- Document count per category
- Selected state with primary color
- Hover animation with framer-motion
- Mobile responsive (2 cols → 4 cols)

### ArchiveDocumentCard.tsx - Document Rows
- File type icon with color coding (PDF=red, Excel=green, etc.)
- Document name with revision badge (REV A, REV B)
- Document number, source, and original date
- View/Download buttons on hover
- Admin-only edit button

### ArchiveUploadDialog.tsx - Admin Upload
- File drop zone with drag-and-drop
- Category selector with 8 options
- Document number field (e.g., "DWG-001")
- Revision field (A, B, C, etc.)
- Original date and source/received from fields
- Tags for searchability

---

## Phase 5: New Page

### `src/pages/documents/PropertyArchivesPage.tsx`

```
┌─────────────────────────────────────────────────────┐
│  ← Back to Documents                                │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │  📦 Property Archives (Premium Hero)          │ │
│  │  Permanent records. Always available.         │ │
│  │                      [Admin: + Add Document]  │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ (Category    │
│  │As-   │ │Design│ │Eng.  │ │Equip.│  Tiles)      │
│  │Built │ │Draw. │ │Specs │ │Manual│              │
│  │  12  │ │   8  │ │   4  │ │  24  │              │
│  └──────┘ └──────┘ └──────┘ └──────┘              │
│                                                     │
│  ┌─────────────────────────────────────────────────┐│
│  │ As-Built Drawings                    [Search]  ││
│  ├─────────────────────────────────────────────────┤│
│  │ 📐 Site Plan As-Built        REV C   [📥][👁️] ││
│  │    DWG-001 • ABC Engineering • Mar 2024        ││
│  │ 📐 Floor Plan Level 1        REV B   [📥][👁️] ││
│  │    DWG-002 • XYZ Architects • Jan 2024         ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

---

## Phase 6: DocumentsPage Update

### Transform to Dual-Section Layout

The existing DocumentsPage will be updated to show two distinct sections:

```
┌─────────────────────────────────────────────────────┐
│  DOCUMENTS                                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  🔒 PROPERTY ARCHIVES                        │   │
│  │  Permanent vault for as-builts, drawings,    │   │
│  │  equipment manuals, and permits.             │   │
│  │  View and download only.                     │   │
│  │                            [Open Archives →] │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  📁 WORKING DOCUMENTS                        │   │
│  │  Contracts, insurance, policies, reports.    │   │
│  │  Upload, organize, and manage.               │   │
│  │                                              │   │
│  │  [Existing folder sidebar + document table]  │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Property Archives Card
- Premium dark gradient card at top of page
- Lock icon with amber/gold accent
- "Property Archives" heading
- Clear description of permanent retention
- "Open Archives" button linking to `/documents/archives`
- Document count badge

---

## Phase 7: Route & Navigation

### App.tsx Update
```typescript
// Add new route
<Route path="/documents/archives" element={<PropertyArchivesPage />} />
```

### Sidebar Update
- Documents link remains as-is
- Archives accessible via Documents page card

---

## Phase 8: Features Page Update

### Add Property Archives Module to ModuleShowcase

Add a new module section highlighting the archives feature:

```typescript
{
  title: 'Property Archives',
  headline: 'Your Permanent Digital Vault.',
  points: [
    { icon: Lock, text: 'As-built drawings and design documents secured forever' },
    { icon: BookOpen, text: 'Equipment manuals accessible to maintenance staff' },
    { icon: Shield, text: 'Admin-controlled uploads, view-only for teams' },
    { icon: History, text: 'Complete audit trail of property documentation' },
  ],
  visual: 'archives', // New visual type
}
```

### New Visual for Archives
A premium card showing:
- Vault/archive icon with gold accent
- Category folders with lock badges
- "Permanent" label
- Document previews

---

## Permission Matrix

| Role | View | Download | Upload | Edit | Delete |
|------|------|----------|--------|------|--------|
| Admin | ✅ | ✅ | ✅ | ✅ | ❌ (by design) |
| Manager | ✅ | ✅ | ❌ | ❌ | ❌ |
| All Others | ✅ | ✅ | ❌ | ❌ | ❌ |

**Key Security Feature**: No user—not even admins—can delete property archives. This ensures permanent retention for regulatory compliance.

---

## Visual Design Specifications

### Color Palette
- **Hero Background**: `bg-gradient-to-br from-slate-900 to-slate-800`
- **Accent Color**: `amber-400` to `amber-600` for gold vault aesthetic
- **Category Cards**: Standard card with primary accent on selection
- **Document Cards**: Clean white/card background with subtle borders

### Iconography
- Archive/Vault: `Archive` from lucide-react
- Lock: `Lock` for permanence indication
- Categories: `FileType`, `Compass`, `BookOpen`, `Shield`, `Stamp`, `MapPin`, `Scale`

### Animations (Framer Motion)
- Hero fade-in on page load
- Category cards stagger-in
- Document cards slide-in
- Hover states with subtle lift

---

## Files to Create/Modify

### New Files
1. `src/hooks/usePropertyArchives.ts`
2. `src/components/documents/ArchiveHero.tsx`
3. `src/components/documents/ArchiveCategoryCard.tsx`
4. `src/components/documents/ArchiveDocumentCard.tsx`
5. `src/components/documents/ArchiveUploadDialog.tsx`
6. `src/components/documents/ArchiveViewerSheet.tsx`
7. `src/pages/documents/PropertyArchivesPage.tsx`

### Modified Files
1. `src/pages/documents/DocumentsPage.tsx` - Add archives card section
2. `src/App.tsx` - Add archives route
3. `src/components/features/ModuleShowcase.tsx` - Add archives module

### Database Migration
1. Create `property_archives` table with RLS
2. Create `property-archives` storage bucket with policies

---

## Value Proposition

This implementation positions document management as a **first-class enterprise feature** demonstrating:

1. **Regulatory Compliance** - Permanent retention of critical documents
2. **Operational Efficiency** - Easy access to equipment manuals and as-builts
3. **Security & Control** - Admin-managed uploads, view-only for teams
4. **Professional Trust** - Premium visual design conveying importance

