-- Make the portfolio briefing's model selectable in Settings → AI Skills.
INSERT INTO public.ai_skill_prompts (skill_key, display_name, description, system_prompt, model, is_active)
VALUES ('portfolio_briefing', 'Portfolio briefing', 'Cross-project state-of-the-portfolio summary, risks + team read', '', 'claude-sonnet-4-6', true)
ON CONFLICT (skill_key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
