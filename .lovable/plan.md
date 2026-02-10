

# Voice Agent Transcript-to-Issues Pipeline

## Overview

This feature adds a **human-in-the-loop workflow** where AI extracts potential issues from voice agent call transcripts, presents them to supervisors for review, and allows one-click creation of formal Issues that feed into the existing workflow (assignments, work orders, etc.).

## How It Works

```text
Voice Call Ends
       |
       v
  Transcript Saved
  (maintenance_requests table)
       |
       v
  Supervisor opens Request Detail
       |
       v
  Clicks "Extract Issues from Transcript"
       |
       v
  AI (Gemini) analyzes transcript
  and returns suggested issues:
  - Title, description, severity, area, category
       |
       v
  ┌──────────────────────────────────┐
  │  HUMAN-IN-THE-LOOP REVIEW       │
  │                                  │
  │  Issue 1: Water leak bathroom    │
  │  [Severity: Moderate] [Edit]     │
  │  [ ] Include this issue          │
  │                                  │
  │  Issue 2: HVAC not cooling       │
  │  [Severity: Low] [Edit]          │
  │  [ ] Include this issue          │
  │                                  │
  │  [Create Selected Issues]        │
  └──────────────────────────────────┘
       |
       v
  Issues created in issues table
  (source_module = 'voice_agent')
       |
       v
  Linked back to maintenance_request
  Normal issue workflow takes over
  (assign, work orders, resolve)
```

---

## Database Changes

### 1. Add `voice_agent` to the `issue_source` enum

So issues created from voice calls are properly tagged and distinguishable.

```sql
ALTER TYPE issue_source ADD VALUE IF NOT EXISTS 'voice_agent';
```

### 2. Add `maintenance_request_id` column to `issues` table

Links issues back to the originating maintenance request for traceability.

```sql
ALTER TABLE issues ADD COLUMN maintenance_request_id UUID REFERENCES maintenance_requests(id);
```

---

## New Edge Function: `extract-transcript-issues`

An edge function that sends the call transcript to AI (Gemini 2.5 Flash via Lovable AI) and returns structured issue suggestions.

**Input:** `{ transcript: string, property_id: string, caller_name: string, issue_category: string }`

**Output:** Array of suggested issues:
```json
[
  {
    "title": "Water leak in bathroom",
    "description": "Caller reports water dripping from ceiling in bathroom...",
    "severity": "moderate",
    "area": "unit",
    "category": "plumbing"
  }
]
```

The AI prompt instructs Gemini to:
- Extract distinct actionable maintenance issues from the transcript
- Assign appropriate severity (severe/moderate/low) based on urgency keywords
- Determine the area (inside/outside/unit)
- Write clear, professional titles and descriptions
- Avoid duplicates if caller mentions the same issue multiple times

---

## New React Hook: `useTranscriptIssueExtraction`

A hook that:
- Calls the `extract-transcript-issues` edge function
- Manages loading/error state
- Returns the array of suggested issues

---

## UI Changes

### Updated: `RequestDetailSheet.tsx`

Add a new section between the Call Transcript and Assignment sections:

**"Extract Issues" button** -- appears when a transcript exists and request status is `new` or `reviewed`.

When clicked:
1. Shows a loading spinner while AI processes
2. Displays a list of suggested issues with checkboxes
3. Each suggestion is editable inline (title, severity, description)
4. "Create Selected Issues" button at the bottom
5. After creation, shows confirmation with links to created issues

### New Component: `TranscriptIssueReview.tsx`

A self-contained component that handles:
- Displaying AI-suggested issues as editable cards
- Checkbox selection for which issues to create
- Inline editing of title, severity, description, and area
- Assignee picker (optional, pre-assign during creation)
- Bulk creation via `useCreateIssue`
- Success state showing created issue count with a link to the Issues page

---

## Files to Create

1. **`supabase/functions/extract-transcript-issues/index.ts`** -- AI extraction edge function
2. **`src/hooks/useTranscriptIssueExtraction.ts`** -- React hook for calling the extraction
3. **`src/components/voice-agent/TranscriptIssueReview.tsx`** -- Human-in-the-loop review UI

## Files to Modify

1. **`src/components/voice-agent/RequestDetailSheet.tsx`** -- Add "Extract Issues" button and embed the review component
2. **`src/hooks/useIssues.ts`** -- Add a bulk create mutation (`useCreateIssuesFromTranscript`) that accepts multiple issues at once

## Migration

1. **`supabase/migrations/[timestamp]_add_voice_agent_issue_source.sql`** -- Adds `voice_agent` to enum and `maintenance_request_id` column

---

## Security

- The edge function uses Lovable AI (no external API key needed)
- Issues inherit the property_id from the maintenance request, so existing RLS policies apply
- Only authenticated users can call the extraction endpoint
- The human-in-the-loop ensures no issues are auto-created without supervisor approval

---

## Implementation Phases

### Phase 1: Database
- Add `voice_agent` to `issue_source` enum
- Add `maintenance_request_id` FK column to `issues`

### Phase 2: AI Extraction Edge Function
- Create `extract-transcript-issues` function
- Use Gemini 2.5 Flash for fast, cost-effective extraction
- Return structured JSON array of suggested issues

### Phase 3: React Hook + UI Components
- Create `useTranscriptIssueExtraction` hook
- Build `TranscriptIssueReview` component with editable cards
- Add bulk issue creation mutation to `useIssues`

### Phase 4: Integration
- Embed extraction button and review component in `RequestDetailSheet`
- Link created issues back to maintenance request via `maintenance_request_id`
- Show created issues count on the request detail view

