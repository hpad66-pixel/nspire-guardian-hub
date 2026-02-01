
# Implementation Plan: Outlook-Style Email Mailbox Interface

## Overview

Transform the current simple "Report Inbox" into a full-featured Outlook-style email client with folder navigation (Inbox, Sent, Drafts), a two-panel master-detail layout, and full email viewing with attachments.

---

## Current State Analysis

### What Exists
- Simple list view of sent emails at `/inbox`
- Basic filtering by status (All, Sent, Failed)
- Search functionality
- Date grouping (Today, Yesterday, This Week, Earlier)
- No email detail view - clicking does nothing
- No folder structure (Inbox vs Sent)
- No attachment viewing capability
- No resend/forward/reply actions

### Database Schema (report_emails)
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| recipients | text[] | Email addresses |
| subject | text | Email subject |
| sent_at | timestamp | When sent |
| status | text | sent/failed/pending |
| error_message | text | Error details if failed |
| report_type | text | daily_inspection/daily_report |
| sent_by | uuid | User who sent |
| daily_inspection_id | uuid | Link to inspection |
| report_id | uuid | Link to daily report |

### Missing for Outlook Experience
1. **Email body content** - We don't store the message body
2. **Attachment metadata** - We don't store filename/size info
3. **Read/unread status** - No tracking of viewed emails
4. **Folder structure** - No distinction between incoming/outgoing

---

## Part 1: Database Schema Updates

Add columns to support full email viewing:

```sql
-- Add columns for full email content and read tracking
ALTER TABLE report_emails
ADD COLUMN body_html TEXT,
ADD COLUMN body_text TEXT,
ADD COLUMN is_read BOOLEAN DEFAULT false,
ADD COLUMN attachment_filename TEXT,
ADD COLUMN attachment_size BIGINT;

-- Add index for read status filtering
CREATE INDEX idx_report_emails_is_read ON report_emails(is_read);
CREATE INDEX idx_report_emails_sent_by ON report_emails(sent_by);
```

---

## Part 2: Update Edge Function to Store Email Content

**File**: `supabase/functions/send-report-email/index.ts`

Modify to store the full email body and attachment info when logging:

```typescript
const emailRecord: Record<string, unknown> = {
  recipients,
  subject,
  report_type: reportType,
  sent_by: userId,
  status: "sent",
  body_html: htmlContent,        // NEW: Store full HTML
  body_text: message || "",       // NEW: Store plain text
  attachment_filename: pdfFilename, // NEW: Store filename
  attachment_size: pdfBase64.length, // NEW: Approximate size
  is_read: true,                  // Sender has "read" their own email
};
```

---

## Part 3: Outlook-Style Layout Architecture

Replace the current simple list with a full Outlook-inspired layout:

```
+------------------+----------------------------------------+
|  FOLDERS         |  EMAIL LIST          |  EMAIL PREVIEW  |
|  +-----------+   |  +---------------+   |  +-----------+  |
|  | Inbox     |   |  | Email 1    → |   |  | Subject   |  |
|  | Sent   ✓  |   |  | Email 2       |   |  | From: ... |  |
|  | Drafts    |   |  | Email 3       |   |  | To: ...   |  |
|  | Failed    |   |  | Email 4       |   |  | Date: ... |  |
|  +-----------+   |  +---------------+   |  |-----------|  |
|                  |                      |  | Body      |  |
|  ACTIONS         |  [Search...]         |  |           |  |
|  [+ Compose]     |                      |  |-----------|  |
|                  |                      |  | 📎 PDF    |  |
+------------------+----------------------------------------+
```

### Three-Column Layout
1. **Left Panel (Folders)**: Inbox, Sent, Failed, All
2. **Middle Panel (Email List)**: List of emails with preview
3. **Right Panel (Email Detail)**: Full email view with attachments

---

## Part 4: New Component Architecture

### New Files to Create

| File | Purpose |
|------|---------|
| `src/pages/inbox/MailboxPage.tsx` | Main Outlook-style layout (replaces ReportInboxPage) |
| `src/components/inbox/MailboxFolders.tsx` | Left folder navigation |
| `src/components/inbox/EmailList.tsx` | Middle email list panel |
| `src/components/inbox/EmailPreview.tsx` | Right email detail panel |
| `src/components/inbox/EmailDetailSheet.tsx` | Mobile-friendly full-screen email view |
| `src/components/inbox/ComposeEmailDialog.tsx` | New email composition (future) |

### Component Breakdown

#### MailboxPage.tsx (Main Container)
```tsx
// Three-panel responsive layout
// Desktop: 3 columns with resizable panels
// Mobile: Single column with drill-down navigation

<ResizablePanelGroup direction="horizontal">
  <ResizablePanel defaultSize={20} minSize={15}>
    <MailboxFolders 
      currentFolder={folder}
      onFolderChange={setFolder}
      folderCounts={stats}
    />
  </ResizablePanel>
  
  <ResizableHandle />
  
  <ResizablePanel defaultSize={35} minSize={25}>
    <EmailList 
      folder={folder}
      selectedId={selectedEmailId}
      onSelect={setSelectedEmailId}
      searchQuery={search}
      onSearchChange={setSearch}
    />
  </ResizablePanel>
  
  <ResizableHandle />
  
  <ResizablePanel defaultSize={45} minSize={30}>
    <EmailPreview 
      emailId={selectedEmailId}
      onClose={() => setSelectedEmailId(null)}
    />
  </ResizablePanel>
</ResizablePanelGroup>
```

#### MailboxFolders.tsx
- Folder list with icons and unread counts
- Folders: Inbox (future for received), Sent, Failed, All
- Actions: Compose new (opens SendReportEmailDialog)
- Collapsible on mobile

#### EmailList.tsx
- Scrollable list of emails
- Each item shows: sender avatar, subject, recipients preview, time, status icon
- Unread emails in bold
- Selected email highlighted
- Search bar at top
- Date group headers

#### EmailPreview.tsx
- Full email view when selected
- Header: Subject, From, To, Date, Status badge
- Body: HTML content rendered safely
- Attachments section with download button
- Actions: Download PDF, Resend (if failed), Mark read/unread

---

## Part 5: Updated Hook for Full Email Data

**File**: `src/hooks/useReportEmails.ts`

Add new interfaces and queries:

```typescript
export interface ReportEmailFull extends ReportEmail {
  body_html: string | null;
  body_text: string | null;
  is_read: boolean;
  attachment_filename: string | null;
  attachment_size: number | null;
}

// Fetch single email with full content
export function useReportEmail(id: string | null) {
  return useQuery({
    queryKey: ["report-email", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_emails")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data as ReportEmailFull;
    },
  });
}

// Mark email as read
export function useMarkEmailRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("report_emails")
        .update({ is_read: true })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-emails"] });
      queryClient.invalidateQueries({ queryKey: ["report-email-stats"] });
    },
  });
}

// Update stats to include unread count
export function useReportEmailStats() {
  return useQuery({
    queryKey: ["report-email-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_emails")
        .select("status, is_read");
      
      if (error) throw error;
      
      return {
        total: data.length,
        sent: data.filter((e) => e.status === "sent").length,
        failed: data.filter((e) => e.status === "failed").length,
        pending: data.filter((e) => e.status === "pending").length,
        unread: data.filter((e) => !e.is_read).length,
      };
    },
  });
}
```

---

## Part 6: UI Design Details

### Email List Item
```
┌───────────────────────────────────────────────────────────┐
│ ●  ✓  Daily Grounds Inspection - Rivers...    2:34 PM    │
│       To: john@example.com, sarah@...         📎         │
│       Please find attached the daily...                   │
└───────────────────────────────────────────────────────────┘
  │   │   │                                │        │
  │   │   └─ Subject (truncated)           │        └─ Attachment indicator
  │   └─ Status icon (✓/✗/⏳)              └─ Time
  └─ Unread indicator (blue dot)
```

### Email Preview Panel
```
┌─────────────────────────────────────────────────────────┐
│  Daily Grounds Inspection - Riverside Manor             │
│  February 1, 2026                                       │
├─────────────────────────────────────────────────────────┤
│  From: You                                  [✓ Sent]    │
│  To: john@example.com, sarah@company.com               │
│  Date: February 1, 2026 at 2:34 PM                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  <Rendered HTML Email Body>                             │
│                                                         │
│  Property: Riverside Manor                              │
│  Date: February 1, 2026                                 │
│  Inspector: John Smith                                  │
│                                                         │
│  +------+ +------+ +------+                             │
│  |  4   | |  1   | |  0   |                             │
│  |  OK  | | ATT  | | DEF  |                             │
│  +------+ +------+ +------+                             │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Attachments                                            │
│  ┌─────────────────────────────────────────────────┐    │
│  │ 📄 daily-grounds-inspection-2026-02-01.pdf      │    │
│  │    245 KB                           [Download]  │    │
│  └─────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────┤
│  [📤 Forward]  [🔄 Resend]  [🗑 Delete]                  │
└─────────────────────────────────────────────────────────┘
```

### Folder Panel
```
┌─────────────────────────┐
│  📬 MAILBOX             │
├─────────────────────────┤
│  📥 Inbox          (0)  │  ← Future: incoming emails
│  📤 Sent          (24)  │  ← Currently active
│  ❌ Failed          (2)  │
│  📋 All            (26)  │
├─────────────────────────┤
│  [+ Compose Email]      │
└─────────────────────────┘
```

---

## Part 7: Mobile Responsive Design

On mobile devices, switch to a single-column drill-down pattern:

1. **Folders screen** → tap folder →
2. **Email list** → tap email →
3. **Email detail** (full screen sheet)

Use `EmailDetailSheet.tsx` for mobile email viewing:
- Full-screen Sheet component
- Swipe to dismiss
- All actions in bottom toolbar

---

## Part 8: Route Updates

**File**: `src/App.tsx`

The `/inbox` route already exists, just update to use the new `MailboxPage`:

```tsx
<Route path="/inbox" element={<MailboxPage />} />
```

---

## Implementation Summary

### Database Changes
1. Add columns: `body_html`, `body_text`, `is_read`, `attachment_filename`, `attachment_size`
2. Add indexes for performance

### Modified Files
| File | Changes |
|------|---------|
| `supabase/functions/send-report-email/index.ts` | Store email content and attachment info |
| `src/hooks/useReportEmails.ts` | Add `useReportEmail`, `useMarkEmailRead`, update stats |
| `src/App.tsx` | Update route to use new MailboxPage |

### New Files
| File | Purpose |
|------|---------|
| `src/pages/inbox/MailboxPage.tsx` | Main Outlook-style three-panel layout |
| `src/components/inbox/MailboxFolders.tsx` | Left folder navigation panel |
| `src/components/inbox/EmailList.tsx` | Middle email list panel |
| `src/components/inbox/EmailPreview.tsx` | Right email detail panel |
| `src/components/inbox/EmailDetailSheet.tsx` | Mobile full-screen email view |

### Deleted Files
| File | Reason |
|------|--------|
| `src/pages/inbox/ReportInboxPage.tsx` | Replaced by MailboxPage |

---

## User Experience Flow

### Viewing Sent Emails
1. Click "Inbox" in sidebar
2. See folder list on left, email list in middle
3. Click an email to see full preview on right
4. View rendered HTML body with inspection summary
5. Click "Download" to get PDF attachment

### Resending Failed Email
1. Filter by "Failed" folder
2. Select failed email
3. See error message in preview
4. Click "Resend" button
5. Email resent with toast confirmation

### Mobile Experience
1. Tap "Inbox" in sidebar
2. See folder list
3. Tap "Sent" folder
4. See email list (full width)
5. Tap email
6. Email opens in full-screen sheet
7. Swipe down or tap X to close

---

## Technical Notes

1. **HTML Sanitization**: Use DOMPurify or similar to safely render email HTML content
2. **Resizable Panels**: Use `react-resizable-panels` (already installed)
3. **PDF Re-download**: Since we don't store PDFs, re-download from inspection report or show "unavailable"
4. **Read Status**: Auto-mark as read when previewed for 2+ seconds
5. **Virtualization**: Consider virtualizing email list for performance with many emails

---

## Future Enhancements (Not in Scope)

- Inbox folder for receiving external emails
- Draft saving before sending
- Email threading/conversations
- Forward to new recipients
- Bulk actions (delete, mark read)
- Email templates
- Scheduled sending
