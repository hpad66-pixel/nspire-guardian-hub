

# Simplified Asset-Based Grounds Inspection System

## Overview

This plan redesigns the inspections module to create a simple, mobile-first daily inspection workflow that a 10th grader can complete. The system automatically populates assets (cleanouts, catch basins, lift stations, retention ponds) for daily inspections, with photo capture, voice dictation via ElevenLabs, and attachment support.

---

## Part 1: Database Design

### 1.1 New `assets` Table

Stores infrastructure assets that require daily inspection.

```text
assets
- id (uuid)
- property_id (uuid) - links to property
- name (text) - e.g., "Cleanout #1", "Catch Basin North"
- asset_type (enum) - cleanout, catch_basin, lift_station, retention_pond, general_grounds
- location_description (text) - where on property
- latitude (decimal) - optional GPS
- longitude (decimal) - optional GPS  
- status (text) - active, inactive, needs_repair
- photo_url (text) - reference photo of asset
- qr_code (text) - optional for scanning
- created_at, updated_at
```

### 1.2 New `daily_inspections` Table

Separate from NSPIRE inspections - this is for daily grounds checks.

```text
daily_inspections
- id (uuid)
- property_id (uuid)
- inspection_date (date)
- inspector_id (uuid)
- weather (text)
- general_notes (text) - main notes area
- general_notes_html (text) - rich text version
- voice_transcript (text) - from dictation
- status (enum) - in_progress, completed
- attachments (text[]) - file URLs
- created_at, completed_at
```

### 1.3 New `daily_inspection_items` Table

Individual asset checks within a daily inspection.

```text
daily_inspection_items
- id (uuid)
- daily_inspection_id (uuid)
- asset_id (uuid)
- status (enum) - ok, needs_attention, defect_found
- photo_urls (text[])
- notes (text)
- defect_description (text) - if defect found
- checked_at (timestamp)
```

### 1.4 Seed Data

Pre-populate assets for the property:
- 20 Cleanouts (Cleanout #1 through #20)
- 15 Catch Basins (Catch Basin #1 through #15)
- 1 Lift Station
- 1 Retention Pond
- 1 General Grounds/Housekeeping

---

## Part 2: ElevenLabs Integration for Voice Dictation

### 2.1 API Key Setup

Using the ElevenLabs Speech-to-Text API for real transcription.

- Create connector or prompt for ElevenLabs API key
- Store as `ELEVENLABS_API_KEY` secret

### 2.2 New Edge Function: `elevenlabs-transcribe`

```text
supabase/functions/elevenlabs-transcribe/index.ts

- Accepts base64 audio from client
- Sends to ElevenLabs API:
  POST https://api.elevenlabs.io/v1/speech-to-text
  model_id: "scribe_v2"
  file: [audio data]
- Returns transcript text
```

### 2.3 Enhanced Voice Dictation Component

Update `VoiceDictation.tsx` to:
- Use ElevenLabs edge function
- Show real-time recording indicator
- Display transcribed text immediately
- Support appending to existing notes

---

## Part 3: Mobile-First UI Components

### 3.1 New Page: `/inspections/daily`

The main entry point for daily grounds inspections.

**Features:**
- Big, friendly "Start Today's Inspection" button
- Show today's date prominently
- Property selector (if multiple)
- List of recent inspections with status

### 3.2 New Component: `DailyInspectionWizard.tsx`

A step-by-step mobile wizard with large touch targets.

**Step 1: Start**
- Confirm property
- Weather selector (icons for sun, clouds, rain, snow)
- Big "Let's Go!" button

**Step 2: Asset Checklist (Swipeable Cards)**
- One asset per screen (like Tinder swipe)
- Asset name and type icon at top
- Large photo capture button (full width)
- Three big buttons: ✓ OK | ⚠️ Attention | ✗ Defect
- Quick notes input
- Swipe or tap to next asset
- Progress bar showing X of Y assets

**Step 3: General Notes**
- Large text area
- Voice dictation button (microphone icon)
- "Exterior Defects Observed" section
- General housekeeping checklist
- Attachment upload area

**Step 4: Review & Submit**
- Summary of all checks
- Count: 38 OK, 2 Need Attention
- Photo gallery
- Submit button
- Option to sign

### 3.3 New Component: `AssetCard.tsx`

Individual asset inspection card (mobile optimized).

```text
+----------------------------------+
|  🔧 CLEANOUT #1                  |
|  Location: North parking lot     |
+----------------------------------+
|                                  |
|     [ TAKE PHOTO 📷 ]           |
|     (big touch target)           |
|                                  |
|  +------+ +------+ +------+     |
|  |  ✓   | |  ⚠️  | |  ✗   |     |
|  |  OK  | | ATN  | | DEF  |     |
|  +------+ +------+ +------+     |
|                                  |
|  Notes: ___________________     |
|                                  |
|         [NEXT →]                |
+----------------------------------+
```

### 3.4 Enhanced Photo Capture

Optimize for mobile with:
- Full-screen camera overlay option
- Auto-compress large images
- Thumbnail preview immediately
- "Capture" attribute for native camera on mobile
- GPS location embedding (optional)

---

## Part 4: Asset Management Page

### 4.1 Replace Placeholder `/assets` Page

Full asset inventory management.

**Features:**
- List all assets by property
- Filter by type (cleanouts, catch basins, etc.)
- Add new assets
- Edit/delete assets
- Upload reference photos
- Bulk import option

### 4.2 New Components

| Component | Purpose |
|-----------|---------|
| `AssetsPage.tsx` | Main asset inventory page |
| `AssetDialog.tsx` | Create/edit asset form |
| `AssetCard.tsx` | Asset display card |
| `AssetTypeIcon.tsx` | Icons for each asset type |

### 4.3 New Hook: `useAssets.ts`

CRUD operations for assets:
- `useAssets(propertyId)` - list assets
- `useAssetsByType(propertyId, type)` - filtered list
- `useCreateAsset()` - add new
- `useUpdateAsset()` - edit
- `useDeleteAsset()` - remove

---

## Part 5: Hooks and Data Layer

### 5.1 New Hooks

| Hook | Purpose |
|------|---------|
| `useAssets.ts` | Asset CRUD |
| `useDailyInspections.ts` | Daily inspection CRUD |
| `useTodayInspection.ts` | Get/create today's inspection |
| `useElevenLabsTranscribe.ts` | Voice-to-text hook |

### 5.2 Updated Components

| File | Changes |
|------|---------|
| `VoiceDictation.tsx` | Use ElevenLabs API instead of placeholder |

---

## Part 6: File Structure

### New Files

```text
src/pages/
├── assets/
│   └── AssetsPage.tsx           # Asset inventory management
├── inspections/
│   └── DailyGroundsPage.tsx     # Daily grounds inspection entry

src/components/
├── assets/
│   ├── AssetDialog.tsx          # Create/edit asset
│   ├── AssetCard.tsx            # Asset display card
│   └── AssetTypeIcon.tsx        # Type icons
├── inspections/
│   ├── DailyInspectionWizard.tsx    # Main wizard
│   ├── AssetCheckCard.tsx           # Per-asset check UI
│   ├── WeatherSelector.tsx          # Weather picker
│   └── InspectionProgress.tsx       # Progress indicator

src/hooks/
├── useAssets.ts
├── useDailyInspections.ts
└── useElevenLabsTranscribe.ts

supabase/functions/
└── elevenlabs-transcribe/
    └── index.ts
```

---

## Part 7: User Experience Flow

### Happy Path

1. **User opens app on phone**
2. **Taps "Inspections" → "Daily Grounds"**
3. **Sees big "Start Today's Inspection" button**
4. **Selects weather with friendly icons**
5. **Asset cards appear one-by-one:**
   - Takes photo with one tap
   - Taps green checkmark for "OK"
   - Swipes to next
6. **After all assets, enters general notes:**
   - Taps microphone, speaks observations
   - Text appears automatically
   - Adds any attachments
7. **Reviews summary, taps "Submit"**
8. **Done! Shows confirmation with stats**

### Design Principles

- **Minimal taps** - most common action is biggest button
- **Large touch targets** - minimum 44px, prefer 60px+
- **Clear visual feedback** - color changes on selection
- **Progress visibility** - always show how far along
- **Forgiving** - easy to go back and correct
- **Works offline** - queue uploads for later

---

## Part 8: Technical Considerations

### Mobile Camera Integration

```tsx
<input
  type="file"
  accept="image/*"
  capture="environment"  // Use back camera
  onChange={handleCapture}
/>
```

### ElevenLabs Transcription

Using `scribe_v2` model for high-quality transcription:
- Supports multiple languages
- Handles construction terminology
- Returns clean, formatted text

### Responsive Breakpoints

- **Mobile (default)**: Full-width cards, stacked layout
- **Tablet (md)**: 2-column grid, larger touch targets
- **Desktop (lg)**: 3-column grid, sidebar navigation

---

## Part 9: Database Migrations

### Migration 1: Create Asset Types and Tables

```sql
-- Asset types enum
CREATE TYPE asset_type AS ENUM (
  'cleanout', 
  'catch_basin', 
  'lift_station', 
  'retention_pond', 
  'general_grounds'
);

-- Inspection item status
CREATE TYPE inspection_item_status AS ENUM (
  'ok', 
  'needs_attention', 
  'defect_found'
);

-- Assets table
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  name TEXT NOT NULL,
  asset_type asset_type NOT NULL,
  location_description TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  status TEXT DEFAULT 'active',
  photo_url TEXT,
  qr_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily inspections
CREATE TABLE daily_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  inspector_id UUID REFERENCES auth.users(id),
  weather TEXT,
  general_notes TEXT,
  general_notes_html TEXT,
  voice_transcript TEXT,
  status TEXT DEFAULT 'in_progress',
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(property_id, inspection_date)
);

-- Inspection items (per asset)
CREATE TABLE daily_inspection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_inspection_id UUID NOT NULL REFERENCES daily_inspections(id),
  asset_id UUID NOT NULL REFERENCES assets(id),
  status inspection_item_status DEFAULT 'ok',
  photo_urls TEXT[] DEFAULT '{}',
  notes TEXT,
  defect_description TEXT,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Migration 2: RLS Policies

- Authenticated users can view/create assets
- Inspectors can create/update inspections
- Admins can manage all

### Migration 3: Seed Sample Assets

Insert the 38 default assets:
- Cleanout #1 through #20
- Catch Basin #1 through #15
- Lift Station #1
- Retention Pond #1
- General Grounds

---

## Part 10: Implementation Steps

### Phase 1: Database & Assets (Day 1)
1. Run database migrations
2. Create `useAssets.ts` hook
3. Build `AssetsPage.tsx` with full CRUD
4. Replace placeholder assets route

### Phase 2: ElevenLabs Integration (Day 1)
5. Add ElevenLabs API key secret
6. Create `elevenlabs-transcribe` edge function
7. Update `VoiceDictation.tsx` to use real transcription

### Phase 3: Daily Inspection UI (Day 2)
8. Create `DailyGroundsPage.tsx`
9. Build `DailyInspectionWizard.tsx` with steps
10. Create `AssetCheckCard.tsx` for mobile
11. Add weather selector

### Phase 4: Polish & Navigation (Day 2)
12. Add routes to App.tsx
13. Update sidebar navigation
14. Test on mobile devices
15. Add offline support (optional)

---

## Expected Outcome

After implementation:

- Simple, intuitive daily inspection flow
- Mobile-first design usable by anyone
- Real voice-to-text via ElevenLabs
- Photo capture directly from phone camera
- All assets auto-populated for each property
- Progress tracking through checklist
- Attachment support for additional files
- Professional-grade yet simple UX

