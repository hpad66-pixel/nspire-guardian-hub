

# Issues Detail View with Threaded Conversations

## Overview

This plan implements a clean, intuitive issues system where users can click on any issue to open a detail panel, take action (update status, assign, resolve), and participate in a threaded conversation. The focus is on simplicity and clarity - showing who needs to act on what.

---

## What You'll Get

### 1. Clickable Issue Detail Panel

When you click on an issue, a slide-out panel opens showing:

```text
+----------------------------------------------------------+
|  [←] Broken HVAC Unit - Building A                       |
+----------------------------------------------------------+
|                                                            |
|  YOUR ACTION REQUIRED                    [Mark Resolved]  |
|  You are assigned to this issue                           |
|                                                            |
|  +------------------------------------------------------+ |
|  | DETAILS                                               | |
|  | Property: Sunset Gardens • Unit 101                   | |
|  | Severity: Severe (24hr deadline)                      | |
|  | Deadline: Jan 31, 2026                                | |
|  | Created by: John Smith • 2 hours ago                  | |
|  +------------------------------------------------------+ |
|                                                            |
|  CONVERSATION (3)                                         |
|  +------------------------------------------------------+ |
|  | JS  John Smith                          2 hrs ago    | |
|  |     Tenant reported no heat. HVAC not responding.    | |
|  +------------------------------------------------------+ |
|  | MA  Mike Anderson                       1 hr ago     | |
|  |     Assigned to ACME Repair. They'll be on-site by 4pm|
|  +------------------------------------------------------+ |
|  | You                                     Just now     | |
|  |     [Type your message...]                     [Send]| |
|  +------------------------------------------------------+ |
|                                                            |
+----------------------------------------------------------+
```

### 2. "Your Action Required" Indicator

Issues assigned to the current user show a prominent banner at the top. On the issues list, a "Your Action" badge appears next to issues where the user needs to act.

### 3. Threaded Conversations

Each issue has a simple, chronological comment thread:
- User avatar/initials + name + timestamp
- Comment text
- New comment input at the bottom
- Comments auto-scroll to latest

### 4. Quick Actions

From the detail panel:
- Change status (Open → In Progress → Resolved)
- Assign/reassign to another user
- Update severity if needed
- Mark as resolved with optional closing note

---

## Database Changes

### New Table: `issue_comments`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| issue_id | uuid | Foreign key to issues |
| user_id | uuid | Who posted the comment |
| content | text | The comment text |
| created_at | timestamp | When posted |

**RLS Policies:**
- SELECT: All authenticated users can view comments on issues they can access
- INSERT: Authenticated users can post comments (user_id = auth.uid())
- UPDATE: Users can only edit their own comments
- DELETE: Users can only delete their own comments

---

## Components to Create

### New Files

| File | Purpose |
|------|---------|
| `src/components/issues/IssueDetailSheet.tsx` | Slide-out panel with issue details + conversation |
| `src/components/issues/IssueConversation.tsx` | Threaded comment display + new comment input |
| `src/components/issues/IssueActions.tsx` | Status change, assign, resolve buttons |

### Files to Update

| File | Changes |
|------|---------|
| `src/pages/core/IssuesPage.tsx` | Add click handler to open detail sheet, show "Your Action" badge |
| `src/hooks/useIssues.ts` | Add `useIssue(id)` for single issue fetch, add assignee/creator profile joins |

### New Hook

| File | Purpose |
|------|---------|
| `src/hooks/useIssueComments.ts` | Fetch, create, delete comments for an issue |

---

## User Experience Flow

1. **Browse Issues**: See all issues with status, severity, and "Your Action" badge if assigned to you
2. **Click Issue**: Detail sheet slides in from right
3. **View Details**: See description, property, deadline, who created it
4. **Take Action**: Change status, assign to someone, or mark resolved
5. **Communicate**: Read existing comments, add your own update
6. **Close**: Click outside or X to close the sheet

---

## Visual Indicators

### "Your Action Required" Badge

On the issues list, issues assigned to the current user will show:
- Blue left border on the row
- "Your Action" pill badge

### Status Colors

| Status | Color |
|--------|-------|
| Open | Orange outline |
| In Progress | Blue |
| Resolved | Green |

### Assignee Display

If an issue is assigned, show who it's assigned to with their avatar/initials.

---

## Technical Details

### Issue Query Enhancement

Update the issues query to include:
- `created_by_profile: profiles(full_name, email, avatar_url)` - who created it
- `assigned_to_profile: profiles(full_name, email, avatar_url)` - who's assigned

### Comments Query

```typescript
const { data: comments } = await supabase
  .from('issue_comments')
  .select(`
    *,
    user:profiles!issue_comments_user_id_fkey(full_name, email, avatar_url)
  `)
  .eq('issue_id', issueId)
  .order('created_at', { ascending: true });
```

### Current User Detection

Use `useAuth()` to get current user ID and compare with `assigned_to` to show "Your Action" indicator.

---

## Component Structure

### IssueDetailSheet

```text
Sheet (side="right", width ~500px)
├── SheetHeader
│   ├── Severity badge
│   └── Issue title
├── Action Required Banner (if assigned to current user)
├── Details Section
│   ├── Property + Unit
│   ├── Status dropdown
│   ├── Assignee selector
│   ├── Deadline
│   └── Description
└── Conversation Section
    ├── ScrollArea (comments list)
    │   └── CommentItem × N
    └── New Comment Input + Send button
```

### IssueConversation

```text
Container
├── Comments List (scrollable)
│   └── Comment
│       ├── Avatar
│       ├── Name + Timestamp
│       └── Content
└── Input Area
    ├── Textarea
    └── Send Button
```

---

## Minimalistic Design Principles

1. **No clutter**: Only show what's needed for action
2. **Clear hierarchy**: Action banner at top, then details, then conversation
3. **Simple interactions**: Click to open, simple dropdowns for changes
4. **Readable conversation**: Clean chat-like display with good spacing
5. **Obvious CTA**: "Your Action Required" is immediately visible

---

## Expected Outcome

After implementation:
- Click any issue to see full details and conversation
- Clear indication when you need to take action
- Simple status workflow (Open → In Progress → Resolved)
- Threaded communication for collaboration
- Easy assignment to team members
- Clean, minimal interface focused on getting work done

