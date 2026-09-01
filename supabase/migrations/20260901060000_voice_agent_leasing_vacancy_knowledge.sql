-- Seed vacancy / leasing prospect education into Glorieta voice_agent_config.
-- Merges with existing HVAC education entries (does not wipe them).

DO $$
DECLARE
  v_property uuid;
  v_existing jsonb;
  v_leasing jsonb := '[
    {
      "id": "vacancy-inquiry",
      "topic": "Vacancies",
      "question": "Do you have a vacancy? / I''m interested in renting.",
      "answer": "Thank them warmly for their interest in Glorieta Gardens. Share that we pride ourselves on a great community and are happy they are considering our location. You cannot confirm live availability on this line — invite them to email leasing@glorietagardens.com and someone will get back ASAP. Collect: preferred move-in date, number of bedrooms and baths, unit size preference, and any other pertinent information they want to share. Spell the email clearly: L-E-A-S-I-N-G at glorietagardens.com. Do NOT create a maintenance work order for a leasing/vacancy inquiry."
    },
    {
      "id": "leasing-contact",
      "topic": "Leasing contact",
      "question": "How do I apply / who do I contact about leasing?",
      "answer": "Please send an email to leasing@glorietagardens.com with your preferred move-in date, bedrooms and baths needed, unit size preference, and any other details that would help our leasing team. Someone will get back to you as soon as possible. Tone: to the point, polite, inviting, and friendly — best-in-class customer service."
    },
    {
      "id": "leasing-info-to-collect",
      "topic": "Leasing intake",
      "question": "What information should I share for a vacancy inquiry?",
      "answer": "Please tell us: (1) When would you like to move in? (2) How many bedrooms and baths do you need? (3) Are you looking at a particular unit size? (4) Any other pertinent information you would like to share. Then email that to leasing@glorietagardens.com so our team can follow up quickly."
    }
  ]'::jsonb;
  v_hvac_fallback jsonb := '[
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
  v_merged jsonb;
BEGIN
  SELECT p.id
    INTO v_property
    FROM public.properties p
   WHERE p.name ILIKE '%Glorieta%'
   ORDER BY p.created_at NULLS LAST
   LIMIT 1;

  IF v_property IS NULL THEN
    RAISE NOTICE 'Glorieta property not found — skipping voice leasing knowledge seed';
    RETURN;
  END IF;

  SELECT c.knowledge_base
    INTO v_existing
    FROM public.voice_agent_config c
   WHERE c.property_id = v_property;

  -- Keep non-leasing entries (HVAC etc.), drop any prior leasing ids, append fresh leasing.
  SELECT COALESCE(jsonb_agg(elem ORDER BY ord), '[]'::jsonb)
    INTO v_merged
    FROM (
      SELECT elem, ord
        FROM jsonb_array_elements(
          CASE
            WHEN v_existing IS NULL OR jsonb_typeof(v_existing) <> 'array'
                 OR jsonb_array_length(v_existing) = 0
              THEN v_hvac_fallback
            ELSE v_existing
          END
        ) WITH ORDINALITY AS t(elem, ord)
       WHERE COALESCE(elem->>'id', '') NOT IN (
         'vacancy-inquiry',
         'leasing-contact',
         'leasing-info-to-collect'
       )
      UNION ALL
      SELECT elem, 1000 + ord
        FROM jsonb_array_elements(v_leasing) WITH ORDINALITY AS t(elem, ord)
    ) combined;

  INSERT INTO public.voice_agent_config (property_id, agent_name, greeting_message, knowledge_base)
  VALUES (
    v_property,
    'Glorieta Gardens Concierge',
    'Thank you for calling Glorieta Gardens. How can I help you today?',
    v_merged
  )
  ON CONFLICT (property_id) DO UPDATE
    SET knowledge_base = EXCLUDED.knowledge_base,
        agent_name = COALESCE(NULLIF(public.voice_agent_config.agent_name, ''), EXCLUDED.agent_name),
        greeting_message = EXCLUDED.greeting_message,
        updated_at = now();

  RAISE NOTICE 'Seeded vacancy/leasing education on voice_agent_config for property %', v_property;
END;
$$;
