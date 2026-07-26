-- AI writing assistant for the document editor (PR3l) — "Ask AI" to continue,
-- rewrite, or draft into the current letter. Strictly opt-in (a button the user
-- clicks), never auto-run — same minimize-API principle as the rest of
-- correspondence. Registered as a tunable skill like every other AI feature.
INSERT INTO public.ai_skill_prompts (skill_key, display_name, description, system_prompt, model, is_active)
VALUES (
  'document_ai_assist',
  'Document writing assistant',
  'Continues, rewrites, or drafts text into a project document/letter on request.',
  '',
  'claude-sonnet-4-6',
  true
)
ON CONFLICT (skill_key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
