-- ============================================================
-- Baseline seed — populate the minimum data Lovable had pre-loaded
-- so the app doesn't render empty skeletons on a fresh Supabase.
-- Idempotent: safe to re-run, nothing deletes existing data.
-- ============================================================

-- 1. Ensure a default workspace exists.
--    If the tenant already has at least one workspace, do nothing.
--    Otherwise create an "APAS" workspace so dashboards have something to render.
DO $$
DECLARE
  v_workspace_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.workspaces LIMIT 1) THEN
    INSERT INTO public.workspaces (name, slug, plan, status)
    VALUES ('APAS', 'apas', 'enterprise', 'active')
    RETURNING id INTO v_workspace_id;
    RAISE NOTICE 'Created default workspace %', v_workspace_id;
  END IF;
END $$;

-- 2. Seed role_definitions (the 11-tier hierarchy the app expects).
INSERT INTO public.role_definitions (role_key, display_name, description, priority, is_system_role, permissions)
VALUES
  ('super_admin',   'Super Admin',    'Full platform access',                 100, true, '{"all": true}'::jsonb),
  ('owner',         'Owner',          'Full tenant access',                    90, true, '{"all": true}'::jsonb),
  ('administrator', 'Administrator',  'Tenant admin without billing',          80, true, '{"all": true}'::jsonb),
  ('manager',       'Manager',        'Project / property manager',            70, true, '{"projects": true, "properties": true}'::jsonb),
  ('pm',            'Project Manager','Construction PM',                       65, true, '{"projects": true, "rfis": true, "submittals": true}'::jsonb),
  ('superintendent','Superintendent', 'Field supervisor',                      60, true, '{"field": true, "daily_log": true}'::jsonb),
  ('inspector',     'Inspector',      'NSPIRE inspector',                      50, true, '{"inspections": true, "punch": true}'::jsonb),
  ('clerk',         'Clerk',          'Documents + distribution',              40, true, '{"documents": true}'::jsonb),
  ('subcontractor', 'Subcontractor',  'Portal-only sub access',                30, true, '{"portal_sub": true}'::jsonb),
  ('viewer',        'Viewer',         'Read-only',                             20, true, '{"view_all": true}'::jsonb),
  ('user',          'User',           'Baseline user',                         10, true, '{}'::jsonb)
ON CONFLICT (role_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description  = EXCLUDED.description,
  priority     = EXCLUDED.priority,
  is_system_role = EXCLUDED.is_system_role,
  updated_at   = now();

-- 3. Seed the CSI cost code library + cost types for the default workspace.
DO $$
DECLARE
  v_tenant uuid;
  v_library_id uuid;
BEGIN
  SELECT id INTO v_tenant FROM public.workspaces ORDER BY created_at LIMIT 1;
  IF v_tenant IS NULL THEN RETURN; END IF;

  -- Create library if none exists for this tenant
  IF NOT EXISTS (SELECT 1 FROM public.cost_code_libraries WHERE tenant_id = v_tenant) THEN
    INSERT INTO public.cost_code_libraries (tenant_id, name, source, is_default)
    VALUES (v_tenant, 'CSI MasterFormat 2018 (System)', 'csi', true)
    RETURNING id INTO v_library_id;

    -- 16 CSI divisions (level 1)
    INSERT INTO public.cost_codes (library_id, code, description, level) VALUES
      (v_library_id, '01 00 00', 'General Requirements',                 1),
      (v_library_id, '02 00 00', 'Existing Conditions',                  1),
      (v_library_id, '03 00 00', 'Concrete',                             1),
      (v_library_id, '04 00 00', 'Masonry',                              1),
      (v_library_id, '05 00 00', 'Metals',                               1),
      (v_library_id, '06 00 00', 'Wood, Plastics, and Composites',       1),
      (v_library_id, '07 00 00', 'Thermal and Moisture Protection',      1),
      (v_library_id, '08 00 00', 'Openings',                             1),
      (v_library_id, '09 00 00', 'Finishes',                             1),
      (v_library_id, '10 00 00', 'Specialties',                          1),
      (v_library_id, '21 00 00', 'Fire Suppression',                     1),
      (v_library_id, '22 00 00', 'Plumbing',                             1),
      (v_library_id, '23 00 00', 'HVAC',                                 1),
      (v_library_id, '26 00 00', 'Electrical',                           1),
      (v_library_id, '31 00 00', 'Earthwork',                            1),
      (v_library_id, '33 00 00', 'Utilities',                            1);
  END IF;

  -- Cost types (L/M/E/S/O/OTH)
  INSERT INTO public.cost_types (tenant_id, code, name, sort_order) VALUES
    (v_tenant, 'L',   'Labor',       1),
    (v_tenant, 'M',   'Material',    2),
    (v_tenant, 'E',   'Equipment',   3),
    (v_tenant, 'S',   'Subcontract', 4),
    (v_tenant, 'O',   'Overhead',    5),
    (v_tenant, 'OTH', 'Other',       6)
  ON CONFLICT (tenant_id, code) DO NOTHING;
END $$;

-- 4. Bootstrap the Procore Lite permission templates for the default workspace.
DO $$
DECLARE
  v_tenant uuid;
BEGIN
  SELECT id INTO v_tenant FROM public.workspaces ORDER BY created_at LIMIT 1;
  IF v_tenant IS NULL THEN RETURN; END IF;

  INSERT INTO public.permission_templates (tenant_id, name, description, is_system)
  VALUES
    (v_tenant, 'Super Admin',     'Full platform access across all tenants.', true),
    (v_tenant, 'Owner',           'Full access within a single tenant.',      true),
    (v_tenant, 'Administrator',   'All modules, cannot delete system data.',  true),
    (v_tenant, 'Project Manager', 'Full project execution; financial read only.', true),
    (v_tenant, 'Superintendent',  'Field modules + schedule.',                true),
    (v_tenant, 'Inspector',       'Punch, daily log, incidents, photos.',     true),
    (v_tenant, 'Clerk',           'Documents and distribution admin.',        true),
    (v_tenant, 'Subcontractor',   'Portal-only access, own submittals/RFIs.', true),
    (v_tenant, 'Viewer',          'Read-only across project.',                true),
    (v_tenant, 'Standard User',   'Baseline; escalate via per-module grants.',true)
  ON CONFLICT (tenant_id, name) DO NOTHING;
END $$;

-- 5. Link every existing auth.user to the default workspace as a 'main' portal member
--    so JWTs have a tenant to resolve through portal_memberships.
DO $$
DECLARE
  v_tenant uuid;
BEGIN
  SELECT id INTO v_tenant FROM public.workspaces ORDER BY created_at LIMIT 1;
  IF v_tenant IS NULL THEN RETURN; END IF;

  INSERT INTO public.portal_memberships (tenant_id, user_id, portal_kind, role, is_active)
  SELECT v_tenant, u.id, 'main', 'owner', true
  FROM auth.users u
  ON CONFLICT (user_id, tenant_id, portal_kind) DO NOTHING;
END $$;

-- 6. Inject tenant_id into each user's app_metadata so the JWT picks it up on next refresh.
--    This is the cheap alternative to wiring a real Auth Hook; you can still configure
--    the hook later and this UPDATE becomes redundant (but harmless).
DO $$
DECLARE
  v_tenant uuid;
BEGIN
  SELECT id INTO v_tenant FROM public.workspaces ORDER BY created_at LIMIT 1;
  IF v_tenant IS NULL THEN RETURN; END IF;

  UPDATE auth.users
     SET raw_app_meta_data =
         COALESCE(raw_app_meta_data, '{}'::jsonb)
         || jsonb_build_object('tenant_id', v_tenant::text)
   WHERE raw_app_meta_data -> 'tenant_id' IS NULL
      OR raw_app_meta_data ->> 'tenant_id' <> v_tenant::text;
END $$;
