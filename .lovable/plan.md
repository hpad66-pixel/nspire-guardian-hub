
# Implementation Plan: Universal Voice Dictation + AI Text Enhancement

## Overview

Integrate ElevenLabs voice-to-text across all narrative input areas in the application, and add an AI "polish" feature powered by Gemini to transform raw transcribed text into professional, well-structured content.

---

## Part 1: Current State Analysis

### Already Have Voice Dictation
| Component | Field | Status |
|-----------|-------|--------|
| `IssueDialog.tsx` | Description | Has voice |
| `RFIDialog.tsx` | Question | Has voice |
| `PunchItemDialog.tsx` | Description | Has voice |
| `EnhancedDailyReportDialog.tsx` | Work Performed | Has voice |
| `InspectionReviewSheet.tsx` | Reviewer Notes | Has voice |

### Need Voice Dictation Added
| Component | Fields | Priority |
|-----------|--------|----------|
| `ProjectDialog.tsx` | Description, Scope | High |
| `ProposalEditor.tsx` | Additional Context | High |
| `ChangeOrderDialog.tsx` | Description | High |
| `PermitDialog.tsx` | Description, Notes | Medium |
| `AssetDialog.tsx` | Location Description | Medium |
| `WorkOrderDetailSheet.tsx` | Notes | Medium |
| `DocumentUploadDialog.tsx` | Description | Low |
| `ProposalSendDialog.tsx` | Additional Message | Low |

---

## Part 2: Enhanced Voice Dictation Component

Create a new component that combines voice dictation with AI text enhancement.

### New Component: `VoiceDictationWithAI`

```text
┌─────────────────────────────────────────────────────────────────┐
│ Description                                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  The scope includes replacing all outdated HVAC units in        │
│  building A and B, installing new energy efficient systems...   │
│                                                                  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                      [🎤 Voice]  [✨ Polish AI]  │
└─────────────────────────────────────────────────────────────────┘
```

### Features
1. **Voice Dictation**: Existing ElevenLabs integration (scribe_v2)
2. **AI Polish Button**: Sends text to Gemini to make it professional
3. **Loading States**: Clear visual feedback during processing
4. **Undo Option**: Ability to revert to original text

---

## Part 3: AI Text Enhancement Edge Function

### New Edge Function: `polish-text`

Creates a new edge function that accepts raw text and returns a polished, professional version using Gemini.

**Endpoint**: `/functions/v1/polish-text`

**Request**:
```json
{
  "text": "raw transcribed text here",
  "context": "project_description" | "scope" | "notes" | "correspondence"
}
```

**Response**:
```json
{
  "polished": "Professional, well-structured text..."
}
```

**AI Prompt Strategy**:
- Context-aware prompts based on field type
- Maintains original meaning while improving clarity
- Fixes grammar and punctuation
- Structures content with appropriate formatting
- Non-streaming for quick responses

---

## Part 4: Component Architecture

### Enhanced Textarea Component

```typescript
interface VoiceDictationTextareaWithAIProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  context?: 'description' | 'scope' | 'notes' | 'correspondence';
  rows?: number;
}
```

### Button Layout
```text
┌──────────────────────────────────┐
│  [🎤]  [✨ Polish]               │
└──────────────────────────────────┘
     │        │
     │        └─ Sends to Gemini, replaces text
     │
     └─ Records audio, transcribes via ElevenLabs
```

---

## Part 5: Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/polish-text/index.ts` | AI text enhancement edge function |
| `src/hooks/useTextPolish.ts` | Hook for calling polish-text function |
| `src/components/ui/voice-dictation-textarea-ai.tsx` | Enhanced component with AI polish |

---

## Part 6: Files to Modify

| File | Change |
|------|--------|
| `src/components/projects/ProjectDialog.tsx` | Replace Textarea with VoiceDictationTextareaWithAI for Description and Scope |
| `src/components/proposals/ProposalEditor.tsx` | Replace Textarea with VoiceDictationTextareaWithAI for Additional Context |
| `src/components/projects/ChangeOrderDialog.tsx` | Replace Textarea with VoiceDictationTextareaWithAI for Description |
| `src/components/permits/PermitDialog.tsx` | Replace Textarea with VoiceDictationTextareaWithAI for Description and Notes |
| `src/components/assets/AssetDialog.tsx` | Replace Textarea with VoiceDictationTextareaWithAI for Location Description |
| `src/components/workorders/WorkOrderDetailSheet.tsx` | Add notes input with VoiceDictationTextareaWithAI |
| `src/components/documents/DocumentUploadDialog.tsx` | Replace Textarea with VoiceDictationTextareaWithAI |
| `src/components/proposals/ProposalSendDialog.tsx` | Replace Textarea with VoiceDictationTextareaWithAI |
| `supabase/config.toml` | Add polish-text function configuration |

---

## Part 7: Edge Function Implementation

### `polish-text/index.ts`

Key Features:
- Authentication via JWT validation
- Context-aware prompting based on field type
- Rate limiting protection (429/402 handling)
- Quick non-streaming response for better UX

Context-Specific Prompts:
- **description**: "Improve this project description for clarity and professionalism..."
- **scope**: "Structure this scope of work with clear deliverables..."
- **notes**: "Polish these notes for professional documentation..."
- **correspondence**: "Refine this business correspondence..."

---

## Part 8: UI/UX Design

### Polish Button States

```text
Default:     [✨ Polish]
Processing:  [⏳ Polishing...]  (disabled)
Success:     [✓ Polished]  (brief, then revert to default)
Error:       Toast notification with retry option
```

### Visual Integration

The AI Polish button appears alongside the microphone:
- Both buttons are subtle, outline style
- Positioned at bottom-right of textarea
- Tooltips explain functionality
- Disabled when textarea is empty

---

## Part 9: Implementation Order

### Phase 1: Backend
1. Create `polish-text` edge function
2. Add function to `supabase/config.toml`
3. Deploy and test with curl

### Phase 2: Frontend Hook
4. Create `useTextPolish.ts` hook
5. Handle loading, error, and success states

### Phase 3: Enhanced Component
6. Create `voice-dictation-textarea-ai.tsx`
7. Integrate voice dictation + AI polish buttons
8. Add undo functionality

### Phase 4: Integration
9. Update `ProjectDialog.tsx` (Description, Scope)
10. Update `ProposalEditor.tsx` (Additional Context)
11. Update `ChangeOrderDialog.tsx` (Description)
12. Update `PermitDialog.tsx` (Description, Notes)
13. Update `AssetDialog.tsx` (Location Description)
14. Update `WorkOrderDetailSheet.tsx` (Notes)
15. Update `DocumentUploadDialog.tsx` (Description)
16. Update `ProposalSendDialog.tsx` (Message)

---

## Part 10: Context-Aware AI Prompts

| Context | AI Instruction |
|---------|----------------|
| `description` | "Transform this into a clear, professional project description. Maintain all factual content. Use complete sentences and proper grammar." |
| `scope` | "Structure this as a professional scope of work. Use numbered or bulleted lists for deliverables. Be specific about what is included." |
| `notes` | "Polish these notes for professional documentation. Fix grammar, improve clarity, and maintain the original meaning." |
| `correspondence` | "Refine this into professional business correspondence. Maintain a formal yet friendly tone. Ensure proper structure." |

---

## Summary

This implementation provides:

1. **Universal Voice Dictation**: All narrative text fields across the app support voice input via ElevenLabs
2. **AI Text Enhancement**: One-click polish using Gemini to make transcribed or typed text professional
3. **Context-Aware Processing**: AI prompts tailored to the type of content (scope vs. description vs. notes)
4. **Consistent UX**: Same interaction pattern across all forms
5. **Non-Intrusive Design**: Subtle buttons that don't distract from the content

The enhanced component can be incrementally adopted across the codebase, starting with high-priority areas like Projects and Proposals.
