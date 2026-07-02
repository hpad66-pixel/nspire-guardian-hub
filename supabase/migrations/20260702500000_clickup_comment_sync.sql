-- Track which action-item comments have been mirrored to ClickUp so a re-push
-- doesn't duplicate them.
ALTER TABLE public.action_item_comments
  ADD COLUMN IF NOT EXISTS clickup_comment_id text;

NOTIFY pgrst, 'reload schema';
