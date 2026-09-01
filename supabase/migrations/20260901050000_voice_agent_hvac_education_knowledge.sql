-- Seed HVAC / filter / humidity resident-education knowledge into Glorieta
-- voice_agent_config so the dashboard and call context stay aligned with the
-- ElevenLabs agent prompt.

DO $$
DECLARE
  v_property uuid;
  v_kb jsonb := '[
    {
      "id": "filter-responsibility",
      "topic": "Filters",
      "question": "Who is responsible for changing the AC / HVAC filter?",
      "answer": "Filter change-outs are the resident''s (client''s) responsibility. Keeping a clean filter helps the AC run properly and can prevent many cooling complaints. Maintenance can still check the unit if the problem continues after a fresh filter."
    },
    {
      "id": "ac-windows-doors",
      "topic": "AC not cooling",
      "question": "My AC is not working / not cooling. What should I check first?",
      "answer": "Before assuming the system is broken, please check that all windows are closed and properly secured, and that the front door (and any balcony or patio door) is not left open. Cool air escapes when doors or windows stay open, so the AC can feel like it is not working even when it is running."
    },
    {
      "id": "humidity-mold-education",
      "topic": "Humidity & mold",
      "question": "Why does it matter if I leave the door or windows open with the AC on?",
      "answer": "Leaving the door or windows open is not only about comfort and the energy bill. Warm humid air comes in, which can create damp conditions in the unit. Over time that dampness is not healthy and can encourage mold growth. Keeping windows secured and the front door closed helps the AC cool properly, saves energy, and helps keep the unit healthy and dry. Please share this politely — never scold; many residents leave doors open without realizing the impact."
    }
  ]'::jsonb;
BEGIN
  SELECT p.id
    INTO v_property
    FROM public.properties p
   WHERE p.name ILIKE '%Glorieta%'
   ORDER BY p.created_at NULLS LAST
   LIMIT 1;

  IF v_property IS NULL THEN
    RAISE NOTICE 'Glorieta property not found — skipping voice HVAC knowledge seed';
    RETURN;
  END IF;

  INSERT INTO public.voice_agent_config (property_id, agent_name, greeting_message, knowledge_base)
  VALUES (
    v_property,
    'Glorieta Gardens Concierge',
    'Thank you for calling Glorieta Gardens maintenance. How can I help with your unit today?',
    v_kb
  )
  ON CONFLICT (property_id) DO UPDATE
    SET knowledge_base = EXCLUDED.knowledge_base,
        agent_name = COALESCE(NULLIF(public.voice_agent_config.agent_name, ''), EXCLUDED.agent_name),
        greeting_message = COALESCE(
          NULLIF(public.voice_agent_config.greeting_message, ''),
          EXCLUDED.greeting_message
        ),
        updated_at = now();

  RAISE NOTICE 'Seeded HVAC education knowledge on voice_agent_config for property %', v_property;
END;
$$;
