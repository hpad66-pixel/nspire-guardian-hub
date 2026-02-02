

# In-App Threaded Messaging System
## Enterprise-Grade Communication Hub

---

## Overview

Transform the current mailbox from a simple email record viewer into a full-fledged **in-app messaging center** with real-time threaded conversations. This will enable team members to communicate instantly without relying on external email, while preserving the existing email functionality for external communications.

---

## Current State Analysis

### What Exists Today
- **Internal messaging foundation**: `useInternalMessaging.ts` hook that writes to `report_emails` table
- **Database structure**: `report_emails` table with `thread_id`, `reply_to_id`, `message_type`, `recipient_user_ids`, and `from_user_id` columns
- **Compose dialog**: Already supports internal vs. external message tabs
- **User picker**: Team member selection using profiles data

### Limitations
- Messages are stored flat (no thread grouping in UI)
- No real-time updates (requires manual refresh)
- Reply functionality uses email-style quoting instead of thread view
- No typing indicators or presence
- No message search within threads

---

## Proposed Architecture

```text
+----------------------------------+
|        Messaging Page            |
+----------------------------------+
|  +--------+  +----------------+  |
|  | Thread |  |   Thread View  |  |
|  | List   |  |  (Conversation)|  |
|  |        |  |                |  |
|  | [New]  |  |  +----------+  |  |
|  | Thread1|  |  | Message1 |  |  |
|  | Thread2|  |  | Message2 |  |  |
|  | Thread3|  |  | Message3 |  |  |
|  |        |  |  +----------+  |  |
|  |        |  |  [Reply Box]   |  |
|  +--------+  +----------------+  |
+----------------------------------+
```

---

## Database Changes

### New Table: `message_threads`
Dedicated table to track conversation threads for better performance and organization.

```sql
CREATE TABLE message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  participant_ids UUID[] NOT NULL DEFAULT '{}',
  is_group BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

-- Users can view threads they participate in
CREATE POLICY "Users can view their threads"
ON message_threads FOR SELECT
USING (auth.uid() = ANY(participant_ids));

-- Users can create threads
CREATE POLICY "Authenticated users can create threads"
ON message_threads FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Participants can update thread (archive)
CREATE POLICY "Participants can update threads"
ON message_threads FOR UPDATE
USING (auth.uid() = ANY(participant_ids));
```

### New Table: `thread_messages`
Dedicated messages table for threaded conversations (separate from report_emails).

```sql
CREATE TABLE thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES message_threads(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) NOT NULL,
  content TEXT NOT NULL,
  content_html TEXT,
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  attachments TEXT[] DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE thread_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages in their threads
CREATE POLICY "Users can view thread messages"
ON thread_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM message_threads
  WHERE message_threads.id = thread_messages.thread_id
  AND auth.uid() = ANY(participant_ids)
));

-- Users can send messages to their threads
CREATE POLICY "Users can send messages"
ON thread_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM message_threads
    WHERE message_threads.id = thread_messages.thread_id
    AND auth.uid() = ANY(participant_ids)
  )
);
```

### New Table: `thread_read_status`
Track per-user read status for each thread.

```sql
CREATE TABLE thread_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES message_threads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  last_read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(thread_id, user_id)
);

-- RLS policies
ALTER TABLE thread_read_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own read status"
ON thread_read_status FOR ALL
USING (auth.uid() = user_id);
```

### Enable Realtime
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE thread_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_threads;
```

---

## Frontend Components

### 1. New Page: `/messages`
Dedicated messaging page (can coexist with or replace `/inbox`).

**File: `src/pages/messages/MessagesPage.tsx`**
- Three-panel layout: Thread list | Conversation | Participants
- Mobile: Stack layout with navigation

### 2. Thread List Component
**File: `src/components/messages/ThreadList.tsx`**
- List of all conversations the user participates in
- Sorted by `last_message_at` descending
- Shows unread indicator (blue dot)
- Shows participant avatars
- Shows preview of last message
- New thread button at top

### 3. Thread Conversation View
**File: `src/components/messages/ThreadConversation.tsx`**
- Header with subject and participants
- Scrollable message list
- Real-time message updates via Supabase Realtime
- Auto-scroll to newest message
- Message bubbles with sender avatar, name, timestamp
- "You" label for own messages

### 4. Message Composer
**File: `src/components/messages/MessageComposer.tsx`**
- Rich text input (reuse existing RichTextEditor)
- @mention support (reuse MentionInput pattern)
- Send button with loading state
- Keyboard shortcut: Enter to send (Shift+Enter for newline)

### 5. New Thread Dialog
**File: `src/components/messages/NewThreadDialog.tsx`**
- Participant picker (multi-select from profiles)
- Subject line input
- Initial message body
- Create and send

### 6. Participant Panel
**File: `src/components/messages/ThreadParticipants.tsx`**
- List of thread participants with avatars
- Option to add participants (for group threads)
- Leave thread option

---

## Hooks Architecture

### `useMessageThreads.ts`
```typescript
// Fetch all threads user participates in
export function useMessageThreads() { ... }

// Fetch single thread details
export function useMessageThread(threadId: string) { ... }

// Create new thread
export function useCreateThread() { ... }

// Archive thread
export function useArchiveThread() { ... }
```

### `useThreadMessages.ts`
```typescript
// Fetch messages for a thread
export function useThreadMessages(threadId: string) { ... }

// Send message to thread
export function useSendThreadMessage() { ... }

// Subscribe to realtime updates
export function useThreadRealtime(threadId: string) { ... }
```

### `useThreadReadStatus.ts`
```typescript
// Get unread count across all threads
export function useUnreadThreadCount() { ... }

// Mark thread as read
export function useMarkThreadRead() { ... }
```

---

## Real-Time Features

### Message Delivery
Using Supabase Realtime for instant message updates:

```typescript
const channel = supabase
  .channel(`thread:${threadId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'thread_messages',
      filter: `thread_id=eq.${threadId}`
    },
    (payload) => {
      // Add new message to UI
      queryClient.setQueryData(['thread-messages', threadId], (old) => [...old, payload.new]);
    }
  )
  .subscribe();
```

### Typing Indicators (Optional Enhancement)
Can be added using Supabase Realtime broadcast:

```typescript
channel.send({
  type: 'broadcast',
  event: 'typing',
  payload: { userId: currentUser.id }
});
```

---

## Navigation Updates

### Sidebar Change
Update `AppSidebar.tsx`:
- Add new "Messages" nav item with icon
- Show unread count badge
- Keep "Inbox" for email records (or rename to "Email History")

### Route Addition
Update `App.tsx`:
```typescript
<Route path="/messages" element={<MessagesPage />} />
<Route path="/messages/:threadId" element={<MessagesPage />} />
```

---

## Notification Integration

When a new message is received:
1. Create notification in `notifications` table
2. Type: `message`
3. Link to thread via `entity_type: 'thread'` and `entity_id`

```sql
-- Trigger on thread_messages insert
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
  SELECT 
    unnest(t.participant_ids),
    'message',
    'New message from ' || p.full_name,
    substring(NEW.content, 1, 100),
    'thread',
    NEW.thread_id
  FROM message_threads t
  JOIN profiles p ON p.user_id = NEW.sender_id
  WHERE t.id = NEW.thread_id
  AND NEW.sender_id != unnest(t.participant_ids);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## File Structure

```text
src/
├── pages/
│   └── messages/
│       └── MessagesPage.tsx           # Main messaging page
├── components/
│   └── messages/
│       ├── ThreadList.tsx             # Left panel: thread list
│       ├── ThreadListItem.tsx         # Individual thread preview
│       ├── ThreadConversation.tsx     # Center: conversation view
│       ├── MessageBubble.tsx          # Individual message display
│       ├── MessageComposer.tsx        # Input area for new messages
│       ├── NewThreadDialog.tsx        # Create new conversation
│       ├── ThreadParticipants.tsx     # Right panel: participants
│       └── ThreadHeader.tsx           # Conversation header
├── hooks/
│   ├── useMessageThreads.ts           # Thread CRUD operations
│   ├── useThreadMessages.ts           # Message operations + realtime
│   └── useThreadReadStatus.ts         # Read/unread tracking
```

---

## Implementation Phases

### Phase 1: Database & Core Hooks
1. Create database tables with RLS
2. Enable Realtime for tables
3. Implement `useMessageThreads.ts`
4. Implement `useThreadMessages.ts`
5. Implement `useThreadReadStatus.ts`

### Phase 2: UI Components
1. Create `MessagesPage.tsx` with layout
2. Build `ThreadList.tsx` and `ThreadListItem.tsx`
3. Build `ThreadConversation.tsx` and `MessageBubble.tsx`
4. Build `MessageComposer.tsx` with rich text
5. Build `NewThreadDialog.tsx`

### Phase 3: Integration
1. Add route to `App.tsx`
2. Add sidebar navigation with unread badge
3. Connect real-time subscriptions
4. Add notification triggers

### Phase 4: Polish
1. Mobile-responsive layout
2. Keyboard shortcuts
3. Message search
4. Thread archiving
5. Read receipts display

---

## Migration Strategy

The existing internal messaging in `report_emails` will continue to work. The new threading system is separate and additive. Users can:
- Use the new Messages feature for real-time team chat
- Continue using Inbox for email history and external communications

---

## Summary of Deliverables

| Component | Purpose |
|-----------|---------|
| 3 new database tables | `message_threads`, `thread_messages`, `thread_read_status` |
| 3 new hooks | Thread CRUD, message operations, read status |
| 8 new UI components | Full messaging interface |
| 1 new page | `/messages` route |
| Sidebar update | Messages nav with badge |
| Realtime integration | Live message updates |
| Notification trigger | Alert users of new messages |

This implementation transforms the platform into a true **enterprise collaboration hub** with instant internal messaging, while preserving all existing email functionality.

