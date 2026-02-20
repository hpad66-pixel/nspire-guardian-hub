-- ─────────────────────────────────────────────────────────────────────────────
-- Messaging workspace isolation patch
--
-- Problem: message_threads has no workspace_id column, so participant_ids
-- membership checks alone cannot prevent cross-tenant reads.
--
-- Fix:
--   1. Add workspace_id to message_threads (NOT NULL with default for safety)
--   2. Backfill existing rows from the creator's profile
--   3. Add a NOT NULL constraint now that rows are filled
--   4. Add index for RLS performance
--   5. Replace all RLS policies with workspace-scoped versions
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1: Add workspace_id as nullable first so backfill can run
ALTER TABLE public.message_threads
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id);

-- Step 2: Backfill from the creating user's profile
UPDATE public.message_threads mt
SET workspace_id = p.workspace_id
FROM public.profiles p
WHERE p.user_id = mt.created_by
  AND mt.workspace_id IS NULL;

-- Step 3: For any orphaned rows (creator profile missing), use the default workspace
UPDATE public.message_threads
SET workspace_id = '00000000-0000-0000-0000-000000000001'
WHERE workspace_id IS NULL;

-- Step 4: Now enforce NOT NULL
ALTER TABLE public.message_threads
  ALTER COLUMN workspace_id SET NOT NULL;

-- Step 5: Performance index for RLS lookups
CREATE INDEX IF NOT EXISTS idx_message_threads_workspace_id
  ON public.message_threads(workspace_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Rebuild message_threads RLS policies
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS message_threads_select ON public.message_threads;
DROP POLICY IF EXISTS message_threads_insert ON public.message_threads;
DROP POLICY IF EXISTS message_threads_update ON public.message_threads;
DROP POLICY IF EXISTS message_threads_delete ON public.message_threads;

-- SELECT: must be a participant AND in the same workspace
CREATE POLICY message_threads_select ON public.message_threads
  FOR SELECT TO authenticated
  USING (
    (auth.uid())::text = ANY (participant_ids::text[])
    AND workspace_id = public.get_my_workspace_id()
  );

-- INSERT: creator's workspace_id must match their own workspace
CREATE POLICY message_threads_insert ON public.message_threads
  FOR INSERT TO authenticated
  WITH CHECK (
    (auth.uid())::text = ANY (participant_ids::text[])
    AND workspace_id = public.get_my_workspace_id()
  );

-- UPDATE: participant in the same workspace
CREATE POLICY message_threads_update ON public.message_threads
  FOR UPDATE TO authenticated
  USING (
    (auth.uid())::text = ANY (participant_ids::text[])
    AND workspace_id = public.get_my_workspace_id()
  )
  WITH CHECK (
    (auth.uid())::text = ANY (participant_ids::text[])
    AND workspace_id = public.get_my_workspace_id()
  );

-- DELETE: admin only, still scoped to their workspace
CREATE POLICY message_threads_delete ON public.message_threads
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND workspace_id = public.get_my_workspace_id()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Rebuild thread_messages RLS policies
-- (chain through message_threads which now enforces workspace_id)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS thread_messages_select ON public.thread_messages;
DROP POLICY IF EXISTS thread_messages_insert ON public.thread_messages;
DROP POLICY IF EXISTS thread_messages_update ON public.thread_messages;
DROP POLICY IF EXISTS thread_messages_delete ON public.thread_messages;

-- SELECT: parent thread must be visible to this user (enforced by thread policy)
CREATE POLICY thread_messages_select ON public.thread_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.message_threads mt
      WHERE mt.id = thread_messages.thread_id
        AND (auth.uid())::text = ANY (mt.participant_ids::text[])
        AND mt.workspace_id = public.get_my_workspace_id()
    )
  );

-- INSERT: sender must be a participant in a same-workspace thread
CREATE POLICY thread_messages_insert ON public.thread_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.message_threads mt
      WHERE mt.id = thread_messages.thread_id
        AND (auth.uid())::text = ANY (mt.participant_ids::text[])
        AND mt.workspace_id = public.get_my_workspace_id()
    )
  );

-- UPDATE: only the sender can edit their own message, within workspace
CREATE POLICY thread_messages_update ON public.thread_messages
  FOR UPDATE TO authenticated
  USING (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.message_threads mt
      WHERE mt.id = thread_messages.thread_id
        AND mt.workspace_id = public.get_my_workspace_id()
    )
  )
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.message_threads mt
      WHERE mt.id = thread_messages.thread_id
        AND mt.workspace_id = public.get_my_workspace_id()
    )
  );

-- DELETE: sender or admin, within workspace
CREATE POLICY thread_messages_delete ON public.thread_messages
  FOR DELETE TO authenticated
  USING (
    (
      sender_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
    )
    AND EXISTS (
      SELECT 1 FROM public.message_threads mt
      WHERE mt.id = thread_messages.thread_id
        AND mt.workspace_id = public.get_my_workspace_id()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Rebuild thread_read_status RLS policies
-- (must also verify the thread belongs to the user's workspace)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS thread_read_status_select ON public.thread_read_status;
DROP POLICY IF EXISTS thread_read_status_insert ON public.thread_read_status;
DROP POLICY IF EXISTS thread_read_status_update ON public.thread_read_status;
DROP POLICY IF EXISTS thread_read_status_delete ON public.thread_read_status;

CREATE POLICY thread_read_status_select ON public.thread_read_status
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.message_threads mt
      WHERE mt.id = thread_read_status.thread_id
        AND mt.workspace_id = public.get_my_workspace_id()
    )
  );

CREATE POLICY thread_read_status_insert ON public.thread_read_status
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.message_threads mt
      WHERE mt.id = thread_read_status.thread_id
        AND mt.workspace_id = public.get_my_workspace_id()
    )
  );

CREATE POLICY thread_read_status_update ON public.thread_read_status
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.message_threads mt
      WHERE mt.id = thread_read_status.thread_id
        AND mt.workspace_id = public.get_my_workspace_id()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.message_threads mt
      WHERE mt.id = thread_read_status.thread_id
        AND mt.workspace_id = public.get_my_workspace_id()
    )
  );

CREATE POLICY thread_read_status_delete ON public.thread_read_status
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.message_threads mt
      WHERE mt.id = thread_read_status.thread_id
        AND mt.workspace_id = public.get_my_workspace_id()
    )
  );