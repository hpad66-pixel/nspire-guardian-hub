
# Implementation Plan: Voice Dictation + Complete Inspection Workflow

## Overview

This plan addresses three main areas:
1. **Reduce assets to 5 per property** (not 38)
2. **Add voice dictation everywhere there's text input**
3. **Complete the 6-point inspection workflow** that was only partially implemented

---

## Current Status Assessment

### What's Already Done (Database Only)
- Review status columns added to `daily_inspections` table
- `daily_inspection_addendums` table created
- `issue_id` column added to `daily_inspection_items`

### What's NOT Done (UI/Logic)
1. **Post-completion redirect** - Wizard stays on page instead of going to dashboard
2. **Supervisor review interface** - No review queue page exists
3. **Issue creation from defects** - No database trigger to auto-create issues
4. **Unified issues dashboard** - `daily_grounds` not added to issue source enum
5. **No direct editing after completion** - Still shows "View or Edit" button
6. **Addendum system** - No UI components built yet

---

## Part 1: Reduce Assets to 5 Per Property

### Current State
- Riverside Manor: 38 assets
- Glorieta Gardens: 38 assets

### Action
Delete excess assets, keeping only 5 per property:
- 2 Cleanouts
- 2 Catch Basins  
- 1 General Grounds

SQL to execute:
```sql
-- Keep first 2 cleanouts, first 2 catch basins, first general_grounds per property
-- Delete the rest
```

---

## Part 2: Universal Voice Dictation

### Design: VoiceDictationTextarea Component

Create a composite component that wraps Textarea with built-in voice:

```text
VoiceDictationTextarea
├── Textarea (standard input)
└── VoiceDictation button (inline or adjacent)
```

### Files Needing Voice Integration

| Component | Text Fields |
|-----------|-------------|
| `AssetCheckCard.tsx` | Defect description, Quick notes |
| `IssueDialog.tsx` | Description |
| `IssueConversation.tsx` | Comment input |
| `RFIDialog.tsx` | Question |
| `RFIDetailSheet.tsx` | Response |
| `ChangeOrderDialog.tsx` | Description |
| `EnhancedDailyReportDialog.tsx` | Work performed, Issues, Safety notes, Delays |
| `MentionInput.tsx` | Comment content |
| `WorkOrderDetailSheet.tsx` | Notes/descriptions |
| `PunchItemDialog.tsx` | Description |

### Implementation Approach

1. Create `VoiceDictationTextarea` wrapper component
2. Add `onTranscript` prop that appends dictated text
3. Replace standard Textarea usage across all forms

---

## Part 3: Complete the 6-Point Workflow

### 3.1 Post-Completion Redirect

**File:** `src/components/inspections/DailyInspectionWizard.tsx`

Update `handleSubmit`:
```typescript
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

const handleSubmit = async () => {
  await updateInspection.mutateAsync({
    id: inspection.id,
    general_notes: generalNotes,
    attachments,
    status: 'completed',
    completed_at: new Date().toISOString(),
    review_status: 'pending_review',  // NEW
    submitted_at: new Date().toISOString(),  // NEW
  });
  
  toast.success('Inspection submitted for review!');
  navigate('/');  // Redirect to dashboard
};
```

### 3.2 Supervisor Review Interface

**New Files:**
- `src/pages/inspections/InspectionReviewPage.tsx` - Review queue
- `src/components/inspections/InspectionReviewSheet.tsx` - Detail view
- `src/hooks/useInspectionReview.ts` - Review hooks

**Features:**
- List all inspections with `review_status = 'pending_review'`
- Filter by property, date, inspector
- Approve / Request Revision / Reject actions
- Reviewer notes field

**Sidebar Update:** Add "Review Queue" link for managers/admins

### 3.3 Automatic Issue Creation from Defects

**Database Trigger:**
```sql
CREATE OR REPLACE FUNCTION create_issues_from_approved_inspection()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.review_status = 'approved' AND 
     (OLD.review_status IS NULL OR OLD.review_status != 'approved') THEN
    
    INSERT INTO issues (property_id, source_module, severity, ...)
    SELECT 
      NEW.property_id,
      'daily_grounds',
      'moderate',
      ...
    FROM daily_inspection_items
    WHERE daily_inspection_id = NEW.id
      AND status = 'defect_found'
      AND issue_id IS NULL;
      
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_issues_on_approval
AFTER UPDATE ON daily_inspections
FOR EACH ROW
EXECUTE FUNCTION create_issues_from_approved_inspection();
```

**Also add `daily_grounds` to issue_source enum:**
```sql
ALTER TYPE issue_source ADD VALUE 'daily_grounds';
```

### 3.4 Unified Issues Dashboard

The Issues page already shows all sources. Once `daily_grounds` is added to the enum:
- New issues from approved inspections appear automatically
- Source badge shows "DAILY_GROUNDS"
- Existing filters work

### 3.5 No Direct Editing After Completion

**File:** `src/pages/inspections/DailyGroundsPage.tsx`

Update completed inspection display:
```typescript
{todayInspection?.status === 'completed' ? (
  <div className="text-center space-y-3">
    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100">
      <Lock className="h-7 w-7 text-green-600" />
    </div>
    <div>
      <h3 className="font-semibold">Today's Inspection Complete!</h3>
      <p className="text-sm text-muted-foreground">
        Status: {todayInspection.review_status || 'Pending Review'}
      </p>
    </div>
    <div className="flex gap-2 justify-center">
      <Button variant="outline" onClick={() => setShowViewOnly(true)}>
        View Report
      </Button>
      <Button variant="outline" onClick={() => setShowAddendum(true)}>
        Add Addendum
      </Button>
    </div>
  </div>
)}
```

### 3.6 Addendum System

**New Files:**
- `src/components/inspections/AddendumDialog.tsx` - Create addendum
- `src/components/inspections/AddendumList.tsx` - Display addendums
- `src/hooks/useInspectionAddendums.ts` - CRUD hooks

**AddendumDialog Features:**
- Rich text content area (with voice dictation)
- Attachment upload
- Submit button
- Links to parent inspection

**Display:**
- Addendums shown below inspection report
- Chronological order
- Author name + timestamp
- Cannot be edited after creation

### 3.7 Dashboard: Pending Reviews Section

**File:** `src/pages/Dashboard.tsx`

Add for supervisors/managers:
```typescript
// Pending Reviews Card (for managers)
{canReview && pendingReviewCount > 0 && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <ClipboardCheck className="h-5 w-5" />
        Pending Reviews
        <Badge variant="destructive">{pendingReviewCount}</Badge>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <Button asChild>
        <Link to="/inspections/review">Review Inspections</Link>
      </Button>
    </CardContent>
  </Card>
)}
```

---

## Part 4: Implementation Order

### Phase 1: Database & Quick Fixes
1. Delete excess assets (keep 5 per property)
2. Add `daily_grounds` to issue_source enum
3. Create trigger for issue creation on approval
4. Update DailyInspectionWizard with redirect + review_status

### Phase 2: Lock & Addendum
5. Update DailyGroundsPage to lock completed inspections
6. Create AddendumDialog component
7. Create AddendumList component
8. Create useInspectionAddendums hook

### Phase 3: Voice Everywhere
9. Create VoiceDictationTextarea component
10. Update AssetCheckCard with voice
11. Update all form dialogs with voice capability

### Phase 4: Supervisor Review
12. Create InspectionReviewPage
13. Create InspectionReviewSheet
14. Create useInspectionReview hook
15. Update AppSidebar with Review Queue link
16. Update Dashboard with pending reviews section

---

## File Changes Summary

### New Files (10)
```text
src/components/ui/voice-dictation-textarea.tsx
src/components/inspections/AddendumDialog.tsx
src/components/inspections/AddendumList.tsx
src/components/inspections/InspectionReviewSheet.tsx
src/pages/inspections/InspectionReviewPage.tsx
src/hooks/useInspectionAddendums.ts
src/hooks/useInspectionReview.ts
```

### Modified Files (12)
```text
src/components/inspections/DailyInspectionWizard.tsx - redirect + review_status
src/components/inspections/AssetCheckCard.tsx - add voice
src/pages/inspections/DailyGroundsPage.tsx - lock editing, show addendums
src/pages/Dashboard.tsx - pending reviews section
src/components/layout/AppSidebar.tsx - Review Queue link
src/components/issues/IssueDialog.tsx - add voice
src/components/projects/RFIDialog.tsx - add voice
src/components/projects/RFIDetailSheet.tsx - add voice
src/components/projects/ChangeOrderDialog.tsx - add voice
src/components/projects/EnhancedDailyReportDialog.tsx - add voice
src/components/projects/PunchItemDialog.tsx - add voice
src/App.tsx - add /inspections/review route
```

### Database Migrations (3)
1. Delete excess assets to keep 5 per property
2. Add `daily_grounds` to issue_source enum
3. Create trigger for auto-issue creation

---

## Voice Dictation Technical Details

Uses existing ElevenLabs integration (`elevenlabs-transcribe` edge function) with `scribe_v2` model.

The VoiceDictationTextarea component:
```typescript
interface VoiceDictationTextareaProps 
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onValueChange?: (value: string) => void;
}

// Renders Textarea with microphone button inline
// Appends transcribed text to existing content
```
