BEGIN;

-- Files (3).zip documents property-wide conditions at Glorieta Gardens. It was
-- initially attached to the sewer conveyance project during intake. Create a
-- dedicated R4 project under Program Management & ProjOS and move the complete
-- evidence graph together: visit, issues, originals, links, conversations,
-- annotations, events, and caption history.
DO $$
DECLARE
  v_site_project_id uuid;
  v_item_ids uuid[];
  v_photo_ids uuid[];
  v_visit_ids uuid[];
  v_item_count integer;
  v_photo_count integer;
BEGIN
  -- Production-specific correction. A clean/local database intentionally skips
  -- it when the Glorieta program records are not present.
  IF NOT EXISTS (
    SELECT 1
    FROM public.clients client
    JOIN public.properties property
      ON property.workspace_id = client.workspace_id
    JOIN public.projects parent
      ON parent.id = '5e37c05d-98ef-4a9c-ac7d-3bceacfe3428'::uuid
    WHERE client.id = '60c4c698-6e9d-43ff-841a-11ffa7d4a904'::uuid
      AND property.id = 'd34df7d5-6274-4bfe-81f1-29ad4246d4a4'::uuid
  ) THEN
    RAISE NOTICE 'Glorieta production records are absent; skipping property-wide photo relocation';
    RETURN;
  END IF;

  SELECT project.id INTO v_site_project_id
  FROM public.projects project
  WHERE project.program_meta->>'program_key' = 'GLORIETA'
    AND project.program_meta->>'project_key' = 'PMO-03'
  LIMIT 1;

  IF v_site_project_id IS NULL THEN
    v_site_project_id := 'ab40d8aa-fc47-4f10-955a-0210481043a7'::uuid;
    INSERT INTO public.projects (
      id, property_id, client_id, parent_project_id, name, description, scope,
      status, project_type, phase, ai_enabled, module_inherit_from_parent,
      module_config, program_meta, created_by
    ) VALUES (
      v_site_project_id,
      'd34df7d5-6274-4bfe-81f1-29ad4246d4a4'::uuid,
      '60c4c698-6e9d-43ff-841a-11ffa7d4a904'::uuid,
      '5e37c05d-98ef-4a9c-ac7d-3bceacfe3428'::uuid,
      'Glorieta Gardens — Site Accountability',
      'Property-wide owner, property-management, consultant, inspector, and maintenance accountability for Glorieta Gardens. This record covers the whole site and is independent of any single sewer, stormwater, water, building, or repair project.',
      E'• Capture recurring owner and management site walks across the entire property.\n• Categorize photographs by observable condition and exact location without treating AI suggestions as verified findings.\n• Keep questions, responses, ball-in-court, due dates, and responsible parties attached to the photographic record.\n• Require before, progress, and one-to-three after photographs for completed work.\n• Preserve capture date, GPS, uploader ownership, caption history, annotations, and status history.\n• Give R4 a single dashboard for open, overdue, repeat, owner-review, completed, and verified conditions across the site.',
      'active',
      'property',
      'construction',
      true,
      false,
      '{
        "overview": true,
        "subprojects": false,
        "directory": true,
        "env-compliance": false,
        "permits": false,
        "site-map": true,
        "stores": false,
        "voice-agent": false,
        "scope": false,
        "action-items": true,
        "schedule": true,
        "daily-logs": true,
        "accountability": true,
        "gallery": true,
        "financials": false,
        "contracts": false,
        "rfis": false,
        "submittals": false,
        "punch-list": true,
        "project-log": true,
        "progress": false,
        "procurement": false,
        "safety": true,
        "meetings": true,
        "closeout": false,
        "proposals": false,
        "repository": true,
        "invoicing": false,
        "correspondence": true,
        "client-updates": true,
        "client-portal": true,
        "admin": true
      }'::jsonb,
      '{
        "kind": "project",
        "type": "Owner Operations · Field Accountability",
        "program_key": "GLORIETA",
        "bucket_key": "PMO",
        "project_key": "PMO-03",
        "status_label": "Active",
        "headline": "One property-wide evidence and accountability record for every Glorieta Gardens site condition.",
        "parties": "R4 · APAS · Property Management · Maintenance · Inspectors · Contractors",
        "deliverables": [
          "Property-wide site-walk register",
          "Photographic condition library with verified locations",
          "Ball-in-court and due-date dashboard",
          "Before, progress, and after evidence",
          "Owner questions, decisions, and verification history"
        ],
        "source": "Files (3).zip · owner-directed property-wide classification"
      }'::jsonb,
      'a87a3932-6c42-433b-a0c9-c8b545951eca'::uuid
    );
  END IF;

  -- Reassert the classification if this correction is ever reapplied.
  UPDATE public.projects
  SET property_id = 'd34df7d5-6274-4bfe-81f1-29ad4246d4a4'::uuid,
      client_id = '60c4c698-6e9d-43ff-841a-11ffa7d4a904'::uuid,
      parent_project_id = '5e37c05d-98ef-4a9c-ac7d-3bceacfe3428'::uuid,
      status = 'active',
      project_type = 'property',
      phase = 'construction',
      ai_enabled = true,
      module_inherit_from_parent = false
  WHERE id = v_site_project_id;

  SELECT array_agg(item.id ORDER BY item.id), count(*)::integer
  INTO v_item_ids, v_item_count
  FROM public.field_accountability_items item
  WHERE item.source_type LIKE 'client_photo_import:files-3-2026-08-31:%';

  IF v_item_count <> 10 THEN
    RAISE EXCEPTION 'Expected 10 Files (3) accountability groups; found %', v_item_count;
  END IF;

  SELECT array_agg(link.photo_id ORDER BY link.photo_id), count(*)::integer
  INTO v_photo_ids, v_photo_count
  FROM public.field_accountability_photos link
  WHERE link.item_id = ANY(v_item_ids);

  IF v_photo_count <> 153 THEN
    RAISE EXCEPTION 'Expected 153 Files (3) photographs; found %', v_photo_count;
  END IF;

  SELECT array_agg(DISTINCT item.visit_id)
  INTO v_visit_ids
  FROM public.field_accountability_items item
  WHERE item.id = ANY(v_item_ids)
    AND item.visit_id IS NOT NULL;

  -- Order matters because the linkage triggers enforce matching tenant/project
  -- keys. All changes remain atomic inside this migration transaction.
  UPDATE public.photos
  SET project_id = v_site_project_id,
      exif = exif || jsonb_build_object(
        'accountability_scope', 'property_wide',
        'accountability_project_id', v_site_project_id,
        'reclassified_from_project_id', '4b168bb0-a0a0-4c0a-bcd8-eb56ec2f413d'
      )
  WHERE id = ANY(v_photo_ids);

  UPDATE public.field_visits
  SET project_id = v_site_project_id,
      title = 'Glorieta Gardens property-wide owner walk — August 31, 2026'
  WHERE id = ANY(v_visit_ids);

  UPDATE public.field_accountability_items
  SET project_id = v_site_project_id
  WHERE id = ANY(v_item_ids);

  UPDATE public.field_accountability_photos
  SET project_id = v_site_project_id
  WHERE item_id = ANY(v_item_ids);

  UPDATE public.field_photo_annotations
  SET project_id = v_site_project_id
  WHERE item_id = ANY(v_item_ids);

  UPDATE public.field_accountability_comments
  SET project_id = v_site_project_id
  WHERE item_id = ANY(v_item_ids);

  UPDATE public.field_accountability_events
  SET project_id = v_site_project_id
  WHERE item_id = ANY(v_item_ids);

  UPDATE public.field_photo_caption_revisions
  SET project_id = v_site_project_id
  WHERE photo_id = ANY(v_photo_ids);

  IF EXISTS (
    SELECT 1 FROM public.field_accountability_items item
    WHERE item.id = ANY(v_item_ids) AND item.project_id <> v_site_project_id
  ) OR EXISTS (
    SELECT 1 FROM public.field_accountability_photos link
    WHERE link.photo_id = ANY(v_photo_ids) AND link.project_id <> v_site_project_id
  ) OR EXISTS (
    SELECT 1 FROM public.photos photo
    WHERE photo.id = ANY(v_photo_ids) AND photo.project_id <> v_site_project_id
  ) THEN
    RAISE EXCEPTION 'Property-wide accountability relocation did not complete atomically';
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
