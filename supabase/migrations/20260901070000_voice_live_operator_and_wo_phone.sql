-- Seed live-operator escalate number + knowledge into Glorieta voice_agent_config.
-- Phone: 954-243-1238 (APAS human-in-the-loop last resort).

DO $$
DECLARE
  v_property uuid;
  v_existing jsonb;
  v_operator jsonb := '[
    {
      "id": "live-operator-escalate",
      "topic": "Live operator",
      "question": "I want to speak to a real person / I''m not happy with this.",
      "answer": "If the caller is frustrated, upset, asks for a manager/human, or says the AI is not helping: apologize briefly, offer a live operator as a last resort, and give them this number clearly — 954-243-1238 (speak it slowly as 9-5-4, 2-4-3, 1-2-3-8). Invite them to call that number now, or stay on the line while you finish creating their maintenance ticket first if they still need one. Never argue. Keep it warm and short."
    },
    {
      "id": "live-operator-when",
      "topic": "Escalate when",
      "question": "When should you escalate to a live operator?",
      "answer": "Escalate when the caller (1) asks for a human / manager / real person, (2) sounds angry or says they are unhappy, (3) repeats that the bot is not helping, or (4) has a sensitive situation you cannot resolve. Give 954-243-1238. Still create the maintenance request if they reported a unit issue — unless they only wanted to be transferred and refuse to share details."
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
    RAISE NOTICE 'Glorieta property not found — skipping live-operator seed';
    RETURN;
  END IF;

  SELECT c.knowledge_base
    INTO v_existing
    FROM public.voice_agent_config c
   WHERE c.property_id = v_property;

  SELECT COALESCE(jsonb_agg(elem ORDER BY ord), '[]'::jsonb)
    INTO v_merged
    FROM (
      SELECT elem, ord
        FROM jsonb_array_elements(COALESCE(v_existing, '[]'::jsonb)) WITH ORDINALITY AS t(elem, ord)
       WHERE COALESCE(elem->>'id', '') NOT IN (
         'live-operator-escalate',
         'live-operator-when'
       )
      UNION ALL
      SELECT elem, 2000 + ord
        FROM jsonb_array_elements(v_operator) WITH ORDINALITY AS t(elem, ord)
    ) combined;

  INSERT INTO public.voice_agent_config (
    property_id,
    agent_name,
    greeting_message,
    knowledge_base,
    emergency_notification_phone
  )
  VALUES (
    v_property,
    'Glorieta Gardens Concierge',
    'Thank you for calling Glorieta Gardens. How can I help you today?',
    v_merged,
    '9542431238'
  )
  ON CONFLICT (property_id) DO UPDATE
    SET knowledge_base = EXCLUDED.knowledge_base,
        emergency_notification_phone = '9542431238',
        updated_at = now();

  RAISE NOTICE 'Seeded live-operator escalate (954-243-1238) for property %', v_property;
END;
$$;
