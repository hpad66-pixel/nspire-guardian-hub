-- Force-enable ElevenLabs Voice Complaints on Glorieta Conveyance.
-- Root cause of "missing" UI: Voice Agent used to live under Property Management
-- in the sidebar. This workspace has property_mgmt_enabled = false, so the link
-- disappeared. Project-level `voice-agent` is also opt-in and can be wiped by
-- module presets. Re-assert both the project module and property config.

DO $$
DECLARE
  v_project uuid := '4b168bb0-a0a0-4c0a-bcd8-eb56ec2f413d'::uuid;
  v_property uuid;
  v_cfg jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = v_project) THEN
    -- Fall back by name if the hard-coded id moved
    SELECT id, property_id INTO v_project, v_property
      FROM public.projects
     WHERE name ILIKE '%conveyance%'
        OR name ILIKE '%sewer extension%'
     ORDER BY created_at
     LIMIT 1;
  ELSE
    SELECT property_id INTO v_property FROM public.projects WHERE id = v_project;
  END IF;

  IF v_project IS NULL THEN
    RAISE NOTICE 'Glorieta Conveyance project not found — skipping voice-agent enable';
    RETURN;
  END IF;

  IF v_property IS NULL THEN
    SELECT id INTO v_property
      FROM public.properties
     WHERE name ILIKE '%glorieta%'
     ORDER BY created_at
     LIMIT 1;
  END IF;

  SELECT COALESCE(module_config, '{}'::jsonb) INTO v_cfg
    FROM public.projects WHERE id = v_project;

  v_cfg := v_cfg || jsonb_build_object(
    'voice-agent', true,
    'stores', COALESCE((v_cfg->>'stores')::boolean, true)
  );

  UPDATE public.projects
     SET module_config = v_cfg,
         property_id = COALESCE(property_id, v_property)
   WHERE id = v_project;

  IF v_property IS NOT NULL THEN
    INSERT INTO public.voice_agent_config (property_id, agent_name, greeting_message)
    VALUES (
      v_property,
      'Glorieta Gardens Concierge',
      'Thank you for calling Glorieta Gardens maintenance. How can I help with your unit today?'
    )
    ON CONFLICT (property_id) DO UPDATE
      SET agent_name = COALESCE(NULLIF(public.voice_agent_config.agent_name, ''), EXCLUDED.agent_name),
          greeting_message = COALESCE(
            NULLIF(public.voice_agent_config.greeting_message, ''),
            EXCLUDED.greeting_message
          );
  END IF;

  RAISE NOTICE 'Enabled voice-agent on project % (property %)', v_project, v_property;
END $$;

-- Re-seed demo tickets when the helper exists and the queue is empty for Glorieta.
DO $$
DECLARE
  v_property uuid;
  v_count int;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'seed_voice_agent_demo'
  ) THEN
    RETURN;
  END IF;

  SELECT o_property_id INTO v_property FROM public.resolve_glorieta_stores_target();
  IF v_property IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_count
    FROM public.maintenance_requests
   WHERE property_id = v_property;

  IF v_count = 0 THEN
    PERFORM public.seed_voice_agent_demo(v_property);
    RAISE NOTICE 'Seeded Glorieta voice complaint demo tickets';
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Voice demo seed skipped: %', SQLERRM;
END $$;
