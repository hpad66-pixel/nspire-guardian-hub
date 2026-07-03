-- Register the consulting AI features in Settings → AI Skills so their model
-- (Haiku / Sonnet / Opus) is configurable per skill. Empty system_prompt means
-- "use the function's built-in prompt"; the edge functions only override the
-- prompt when it's non-empty, but always honour the chosen model.
INSERT INTO public.ai_skill_prompts (skill_key, display_name, description, system_prompt, model, is_active)
VALUES
  ('action_items_extract',     'Meeting → action items',   'Summarises a transcript and extracts assigned action items', '', 'claude-sonnet-4-6', true),
  ('meeting_agenda',           'Meeting agenda',           'Builds the agenda narrative (objectives, decisions, next steps)', '', 'claude-sonnet-4-6', true),
  ('consulting_client_update', 'Client progress update',   'Drafts a client-facing progress update from scope % + actions', '', 'claude-sonnet-4-6', true),
  ('proposal_scopes_extract',  'Proposal → engagement scopes', 'Extracts scope-of-work + fees from a won proposal', '', 'claude-sonnet-4-6', true)
ON CONFLICT (skill_key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
