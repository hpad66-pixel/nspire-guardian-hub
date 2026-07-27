-- Branded, AI-drafted client updates (PR3q) — from a single task's comments (one
-- topic) or a weekly rollup of every open task in a project. Strictly opt-in
-- (a button click) and always editable before send — human-in-the-loop, never
-- auto-sent, same principle as every other AI feature in this app.
INSERT INTO public.ai_skill_prompts (skill_key, display_name, description, system_prompt, model, is_active)
VALUES (
  'task_update_draft',
  'Task / status update drafting',
  'Drafts a succinct, client-ready status update from one task''s comments, or a weekly rollup of every open task in a project.',
  '',
  'claude-sonnet-4-6',
  true
)
ON CONFLICT (skill_key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
