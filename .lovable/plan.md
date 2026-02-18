
# Meeting Minutes — Complete UX/UI & Editor Overhaul

## What's Wrong Today (Diagnosis)

1. **Header branding is incorrect** — It says "Asset & Property Administration System" underneath "APAS." You explicitly want just "APAS Consulting" — nothing more, nothing less.
2. **Header is visually too heavy** — The full-width gradient banner is bulky and corporate, not sleek or modern.
3. **AI output is poorly processed** — The markdown → HTML regex conversion in `handlePolish()` is fragile and produces broken markup with stray special characters and garbled tables.
4. **AI prompt is weak** — The `meeting_minutes` prompt in `polish-text/index.ts` doesn't instruct Gemini to write at a McKinsey-grade level: expansive, formal, detailed, with full sentences, not cryptic bullets.
5. **Rich text editor is basic** — Only has Bold/Italic/Underline/Strike/H2/H3/Lists. Missing: H1, font colors, highlight/background colors, text alignment, image insertion, tables, code blocks, Notion-style slash commands / AI autocomplete.
6. **No full-screen editor mode** — The sheet sidebar has a fixed max-width. There's no way to expand it to a full-screen editing experience.
7. **Notion-style AI completion** — The user wants to type a partial sentence and have AI complete it inline (like Notion's AI assistant).

---

## Solution Architecture

### Part 1 — Upgrade the Rich Text Editor (`rich-text-editor.tsx`)

The existing `RichTextEditor` is barebones Tiptap. We need to significantly expand it. The installed Tiptap packages are `starter-kit`, `extension-placeholder`, and `extension-underline`. We will add additional Tiptap extensions that are available from the already-installed `@tiptap` packages (no new npm installs needed for core features), or use additional extensions that can be installed.

**New editor capabilities:**
- **Formatting**: H1, H2, H3, Bold, Italic, Underline, Strike, Code (inline), Code Block
- **Structure**: Bullet list, Ordered list, Blockquote, Horizontal Rule
- **Alignment**: Left, Center, Right, Justify (using CSS class approach via `TextAlign` extension — already in Tiptap starter ecosystem)
- **Colors**: Text color picker, Highlight/background color picker
- **Tables**: Insert table, add/remove rows/columns
- **Images**: Upload or paste images (stored via existing `organization-documents` storage bucket)
- **Undo/Redo**: Full history
- **AI Completion**: A dedicated "AI Complete" button in the toolbar — takes the current paragraph text as context and appends AI-generated continuation inline

The toolbar will be organized into **logical groups** with dividers:
```
[H1][H2][H3] | [B][I][U][S] | [Color][Highlight] | [Align↔] | [List][OList][Quote][HR] | [Table] | [Image] | [AI✨] | [Undo][Redo]
```

### Part 2 — Full-Screen Expand/Collapse

The `MeetingEditorSheet` currently uses `<Sheet>` (a Radix side panel). We will add:
- An **Expand button** (maximize icon) in the sheet header that transitions the editor from sidebar mode to a full-screen overlay (using a `Dialog` with `max-w-screen-2xl` or `w-screen h-screen` class)
- When full-screen, the same editor content, tabs, and toolbar are displayed but with much more horizontal space — the editor fills 2/3 width, and a live branded preview occupies the right 1/3
- A **Collapse button** (minimize icon) returns to the sidebar sheet
- State is preserved seamlessly — no content loss during the mode switch

The implementation uses a `isFullScreen` boolean that conditionally renders either a `<Sheet>` wrapper or a `<Dialog className="w-screen h-screen max-w-full rounded-none">` wrapper around the same inner content.

### Part 3 — APAS Branding Fix

**Current (wrong):**
```
APAS
Asset & Property Administration System
```

**Fixed (correct):**
```
APAS Consulting
```

The header becomes a sleek, minimal strip — not a towering gradient block. Design language:
- **Left-aligned** horizontal letterhead strip (McKinsey-style)
- Thin rule under the company name
- `APAS Consulting` in a strong, slightly spaced serif-feel sans-serif — not a banner
- The meeting title, date, and type sit below in elegant type hierarchy
- No giant gradient — just clean whitespace with a thin navy left border accent

### Part 4 — Upgraded AI Prompt (McKinsey-Grade Minutes)

The `meeting_minutes` prompt in `supabase/functions/polish-text/index.ts` is rewritten to:

1. Instruct the model to write **full, complete, professional sentences** — not cryptic abbreviations
2. Demand **proper HTML output** directly (not markdown that gets mangled) — the prompt explicitly asks for clean HTML with `<h2>`, `<h3>`, `<p>`, `<ul>`, `<table>` tags
3. Set a tone: *"You are a senior project management consultant preparing formal board-level meeting minutes. Write with precision, authority, and completeness..."*
4. Include all canonical McKinsey minutes sections:
   - **Meeting Information** (auto-extracted)
   - **Executive Summary** (2–3 paragraph narrative of what was accomplished)
   - **Agenda & Discussion** (numbered sections per topic, full narrative per topic)
   - **Key Decisions** (complete sentences, not fragments)
   - **Risks & Issues Identified** (with severity and owner if mentioned)
   - **Action Items** (proper HTML table: Item | Owner | Due Date | Priority)
   - **Next Steps & Upcoming Meetings**
   - **Prepared By / Distribution** (signature line)

5. The `handlePolish` function will no longer apply regex post-processing — the AI returns clean HTML directly, which is loaded straight into the Tiptap editor.

### Part 5 — Notion-Style AI Continuation

A dedicated **`AI Continue`** toolbar button in the editor:
- Takes the last paragraph or selected text as context
- Sends it to the `polish-text` edge function with a new `context: 'ai_continue'` mode
- Appends the AI-generated continuation text at the current cursor position
- Shows a subtle loading state on the button while generating

The new prompt for `ai_continue`:
> "Continue writing the following text in a formal, professional project management tone. Write naturally as a continuation — no headings, no repetition of the existing text. Output only the continuation text."

---

## Files to Change

### 1. `src/components/ui/rich-text-editor.tsx` — Complete Rewrite
**New capabilities:**
- Additional Tiptap extensions: `TextAlign`, `Color`, `Highlight`, `Image`, `Table`, `TableRow`, `TableHeader`, `TableCell`, `HorizontalRule`, `CodeBlock`
- These are installed via the packages `@tiptap/extension-text-align`, `@tiptap/extension-color`, `@tiptap/extension-highlight`, `@tiptap/extension-image`, `@tiptap/extension-table` — we will need to **install these packages**
- New `ProRichTextEditor` component with the expanded toolbar, grouped into logical sections
- Export both the original `RichTextEditor` (for backward compat elsewhere) and the new `ProRichTextEditor`
- The `ProRichTextEditor` accepts an `onAiComplete?: (context: string) => Promise<string>` prop for the AI continuation button

### 2. `src/components/projects/MeetingsTab.tsx` — Major Refactor
**Changes:**
- Replace `APAS` + subtitle with just `APAS Consulting` in slim, modern letterhead style
- Complete redesign of `MinutesViewer` — clean white document with narrow navy left-border accent, elegant typography
- `MeetingEditorSheet`: Add `isFullScreen` state and toggle button; render Sheet vs full-screen Dialog based on state
- Switch from basic `RichTextEditor` to `ProRichTextEditor` in the edit mode
- Remove the regex-based markdown-to-HTML conversion in `handlePolish` — AI now returns HTML directly
- Wire up the `onAiComplete` prop for inline AI continuation in the editor

### 3. `supabase/functions/polish-text/index.ts` — Prompt Upgrade
**Changes:**
- Rewrite the `meeting_minutes` prompt for McKinsey-grade, HTML-output minutes
- Add new `ai_continue` context prompt for inline sentence completion
- Keep all other prompts unchanged

### 4. Package Additions
We need to install the following Tiptap extensions:
- `@tiptap/extension-text-align`
- `@tiptap/extension-color`
- `@tiptap/extension-highlight`
- `@tiptap/extension-image`
- `@tiptap/extension-table`

These are all official Tiptap v3-compatible packages from the same `@tiptap` family already in use.

---

## Visual Design — What It Will Look Like

### The Letterhead Strip (MinutesViewer)
```
┌──────────────────────────────────────────────────────┐
│▌ APAS Consulting                              [logo] │  ← slim, left-aligned, navy left border
│▌ ─────────────────────────────────────────────────  │  ← hairline rule
│                                                      │
│  WEEKLY PROGRESS MEETING                            │  ← meeting type, small caps, slate
│  Week 12 Site Coordination                          │  ← meeting title, large, bold
│  Monday, February 18, 2026  ·  9:00 AM  ·  Site    │  ← meta in one clean line
│                                                      │
│ ─────────────────────────────────────────────────   │
│                                                      │
│  ATTENDEES                                           │
│  ┌──────────┬─────────────┬──────────────────┐      │
│  │ Name     │ Role        │ Company          │      │
│  ├──────────┼─────────────┼──────────────────┤      │
│  │ ...      │ ...         │ ...              │      │
│  └──────────┴─────────────┴──────────────────┘      │
│                                                      │
│  1. EXECUTIVE SUMMARY                               │
│  The project team convened for the twelfth weekly   │
│  progress meeting to review schedule performance... │
│                                                      │
│  2. AGENDA & DISCUSSION                             │
│  ...                                                 │
└──────────────────────────────────────────────────────┘
```

### Full-Screen Editor Mode
```
┌──[Header: APAS Consulting · Week 12 · Draft]──[↙Collapse]──[Save][Finalize][Email][PDF][Word]──┐
│                                                                                                   │
│  ┌──[Raw Notes]──[Formatted Minutes]──[AI Polish ✨]──────────────────────────────────────────┐  │
│  │                                                                                              │  │
│  │  EDITOR (left 60%)                    │  LIVE PREVIEW (right 40%)                          │  │
│  │  ┌──Toolbar──────────────────────┐    │  ┌───────────────────────────────┐                 │  │
│  │  │ H1 H2 H3 | B I U | Color...  │    │  │▌ APAS Consulting              │                 │  │
│  │  ├───────────────────────────────┤    │  │▌ ─────────────────────────── │                 │  │
│  │  │                               │    │  │  WEEKLY PROGRESS MEETING      │                 │  │
│  │  │  [Editing content here...]    │    │  │  Week 12 Site Coordination... │                 │  │
│  │  │                               │    │  │                               │                 │  │
│  │  └───────────────────────────────┘    │  └───────────────────────────────┘                 │  │
│  └──────────────────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```
