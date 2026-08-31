-- Project-scoped construction / closeout permit register.
-- Distinct from property-level public.permits (renewal/expiry portfolio model)
-- and from permit_obligations (recurring env compliance deadlines).
-- Seeded from GGPermitLog_260715 for Glorieta Conveyance & Close-Out.

CREATE TABLE IF NOT EXISTS public.project_permits (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id         uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  permit_number      text NOT NULL,
  issued_on          date,
  department         text,
  building           text,
  street_address     text,
  trade              text,
  contractor         text,
  description        text NOT NULL,
  status             text NOT NULL DEFAULT 'open_active'
                       CHECK (status IN ('open_active', 'pending', 'closed', 'expired', 'on_hold')),
  notes              text,
  responsible_party  text,
  next_action        text,
  city_confirmed_on  date,
  closed_on          date,
  client_visible     boolean NOT NULL DEFAULT true,
  sort_order         integer NOT NULL DEFAULT 0,
  created_by         uuid,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_permits_project_idx ON public.project_permits (project_id);
CREATE INDEX IF NOT EXISTS project_permits_status_idx  ON public.project_permits (project_id, status);
CREATE INDEX IF NOT EXISTS project_permits_tenant_idx  ON public.project_permits (tenant_id);

ALTER TABLE public.project_permits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_permits_tenant_isolation ON public.project_permits;
CREATE POLICY project_permits_tenant_isolation ON public.project_permits
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- Portal users do not inherit tenant policies; grant owner-safe reads only.
DROP POLICY IF EXISTS client_portal_boundary ON public.project_permits;
CREATE POLICY client_portal_boundary ON public.project_permits AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    public.current_portal_kind() = 'main' OR public.is_super_admin()
    OR (client_visible = true AND public.owner_can_access_project(project_id))
  );

DROP POLICY IF EXISTS project_permits_owner_portal_select ON public.project_permits;
CREATE POLICY project_permits_owner_portal_select ON public.project_permits FOR SELECT TO authenticated
  USING (client_visible = true AND public.owner_can_access_project(project_id));

NOTIFY pgrst, 'reload schema';

-- Seed Glorieta Gardens permit log onto Conveyance & Close-Out.
DO $$
DECLARE
  v_project uuid := '4b168bb0-a0a0-4c0a-bcd8-eb56ec2f413d';
  v_tenant uuid;
  v_count integer := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = v_project) THEN
    RAISE NOTICE 'Glorieta Conveyance project not found — skipping permit seed';
    RETURN;
  END IF;

  SELECT COALESCE(
    (SELECT c.workspace_id
       FROM public.clients c
       JOIN public.projects p ON p.client_id = c.id
      WHERE p.id = v_project),
    (SELECT pr.workspace_id
       FROM public.properties pr
       JOIN public.projects p ON p.property_id = pr.id
      WHERE p.id = v_project),
    (SELECT pf.workspace_id
       FROM public.profiles pf
       JOIN public.projects p ON p.created_by = pf.user_id
      WHERE p.id = v_project)
  ) INTO v_tenant;

  IF v_tenant IS NULL THEN
    RAISE NOTICE 'Glorieta workspace not resolvable — skipping permit seed';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.project_permits WHERE project_id = v_project;
  IF v_count > 0 THEN
    RAISE NOTICE 'Glorieta project_permits already seeded (% rows) — skipping', v_count;
    RETURN;
  END IF;

  INSERT INTO public.project_permits (
    project_id, tenant_id, permit_number, issued_on, department, building,
    street_address, trade, contractor, description, status, notes,
    responsible_party, client_visible, sort_order
  ) VALUES
  (v_project, v_tenant, '23110050', '2023-11-27'::date, 'Building & Licensing', 'Building 4', '13122 Port Said Road', NULL, 'D''Shin Plumbing', 'Building 4 - Excavate, Remove & Replace Sanitary Piping', 'closed', 'Confirmation Received By City of Opa-Locka 07/01/2026', 'Greg', true, 1),
  (v_project, v_tenant, '23110051', '2023-11-27'::date, 'Building & Licensing', 'Building 8', '13004 Alexandria Drive', 'Building', 'Elementz Reconstruction, LLC', 'Regulatory Compliance ("Red Tag") Repairs', 'closed', 'Confirmation Received By City of Opa-Locka 07/09/2026', 'Greg', true, 2),
  (v_project, v_tenant, '23110052', '2023-11-27'::date, 'Building & Licensing', 'Building 7', '13112 Alexandria Drive', 'Building', 'Elementz Reconstruction, LLC', '2 LF Drywall Perimeter Of Floor; Water Damage', 'closed', 'Confirmation Received By City of Opa-Locka 07/06/2026', 'Greg', true, 3),
  (v_project, v_tenant, '23110062', '2023-12-13'::date, 'Building & Licensing', 'Building 8', '13004 Alexandria Drive', 'Plumbing', 'D''Shin Plumbing', 'Sanitary Drain Replacement & Repairs', 'closed', 'Confirmation Received By City of Opa-Locka 07/01/2026', 'Greg', true, 4),
  (v_project, v_tenant, '23120041', '2023-12-13'::date, 'Building & Licensing', NULL, '13210 Alexandria Drive', 'Building', 'Elementz Reconstruction, LLC', 'Annual Facility Repairs & Maintenance', 'closed', NULL, NULL, true, 5),
  (v_project, v_tenant, '24030102', '2024-04-02'::date, 'Building & Licensing', 'Building 8', '13004 Alexandria Drive', 'Plumbing', 'D''Shin Plumbing', 'Sewer Connection', 'closed', 'Confirmation Received By City of Opa-Locka 07/01/2026', 'Greg', true, 6),
  (v_project, v_tenant, 'PW 24040057', '2024-05-08'::date, 'Public Works', 'Junkyard', '13210 Alexandria Drive', 'Plumbing', 'D''Shin Plumbing', 'Stormwater Cleanout Repair & Manhole Extensions', 'open_active', 'Pending Signoff From Public Works', 'Greg', true, 7),
  (v_project, v_tenant, '24040058', '2024-05-08'::date, 'Building & Licensing', 'Junkyard', '13210 Alexandria Drive', 'Plumbing', 'D''Shin Plumbing', 'Stormwater Cleanout Repair & Manhole Extensions', 'open_active', 'Pending Signoff From Public Works', 'Greg', true, 8),
  (v_project, v_tenant, '24070083', '2024-12-04'::date, 'Building & Licensing', 'Retention Pond', '13004 Alexandria Drive', 'Building', 'Elementz Reconstruction, LLC', 'Concrete Slab For New Detention Pond Pump', 'closed', 'Building Final Passed 6/30; Roger To Confirm Closed', 'Roger', true, 9),
  (v_project, v_tenant, '24090001', '2025-03-07'::date, 'Building & Licensing', 'Building 2', '13412 Alexandria Drive', 'Building', 'Ray Roof & GC LLC', 'Roof Replacement', 'closed', 'Closed', 'James', true, 10),
  (v_project, v_tenant, '24100067', '2025-01-08'::date, 'Building & Licensing', 'Building 7', '13112 Alexandria Drive', 'Building', 'Elementz Reconstruction, LLC', 'Foundation Slab Repairs Following Plumbing Work', 'closed', 'Confirmation Received By City of Opa-Locka 07/06/2026', 'Greg', true, 11),
  (v_project, v_tenant, '24100067', '2025-01-06'::date, 'Building & Licensing', 'Building 7', '13210 Alexandria Drive', 'Plumbing', 'D''Shin Plumbing', 'Foundation Drains', 'closed', 'Confirmation Received By City of Opa-Locka 07/06/2026', 'Greg', true, 12),
  (v_project, v_tenant, '24120020', NULL, NULL, NULL, NULL, 'Plumbing', 'D''Shin Plumbing', 'Sewer Extension', 'open_active', NULL, 'Greg', true, 13),
  (v_project, v_tenant, '25010033', '2025-01-30'::date, 'Building & Licensing', 'Building 7', '13112 Alexandria Drive', 'Plumbing', 'D''Shin Plumbing', 'Foundation Drains', 'closed', 'Confirmation Received By City of Opa-Locka 07/06/2026', 'Greg', true, 14),
  (v_project, v_tenant, '26030035', '2026-06-03'::date, 'Public Works', 'Building 8', '13004 Alexandria Drive', 'Plumbing', 'D''Shin Plumbing', 'New Sewer Line For Conveyance', 'open_active', 'New Sanitary Rework For Conveyance Per A Austin', 'Vanessa', true, 15),
  (v_project, v_tenant, '26030036', '2026-06-03'::date, 'Public Works', 'Building 7', '13112 Alexandria Drive', 'Plumbing', 'D''Shin Plumbing', 'New Sewer Line For Conveyance', 'open_active', 'New Sanitary Rework For Conveyance Per A Austin', 'Vanessa', true, 16),
  (v_project, v_tenant, '25110072', '2026-01-02'::date, 'Building & Licensing', 'Building 2', '13412 Aswan Road', 'Building', 'Elementz Reconstruction, LLC', 'Exterior Paint After-The-Fact', 'closed', 'Closed', 'James', true, 17),
  (v_project, v_tenant, '26010013', '2026-01-28'::date, 'Building & Licensing', 'Building 3', '13132 Alexandria Drive', 'Plumbing', 'T&R Plumbing Services', 'Foundation Drain Plumbing', 'closed', 'Confirmation Received By City of Opa-Locka 07/09/2027', 'James', true, 18),
  (v_project, v_tenant, '26010014', '2026-01-28'::date, 'Building & Licensing', 'Building 4', '13122 Alexandria Drive', 'Plumbing', 'T&R Plumbing Services', 'Foundation Drain Plumbing', 'pending', 'Final Trade Subcontractor Passed 6/26; City To Confirm Closed', 'James', true, 19),
  (v_project, v_tenant, '26010015', '2026-01-28'::date, 'Building & Licensing', 'Building 5', '13144 Alexandria Drive', 'Plumbing', 'T&R Plumbing Services', 'Foundation Drain Plumbing', 'pending', 'Final Trade Subcontractor Passed 6/26; City To Confirm Closed', 'James', true, 20),
  (v_project, v_tenant, '26010016', '2026-01-28'::date, 'Building & Licensing', 'Building 6', '13142 Alexandria Drive', 'Plumbing', 'T&R Plumbing Services', 'Foundation Drain Plumbing', 'closed', 'Confirmation Received By City of Opa-Locka 07/09/2027', 'James', true, 21),
  (v_project, v_tenant, '25110066', '2026-03-25'::date, 'Building & Licensing', 'Building 5', '13144 Alexandria Drive', 'Building', 'Elementz Reconstruction, LLC', 'UFAS 7 ADA Units', 'closed', 'Confirmation Received By City of Opa-Locka 07/09/2026', 'James', true, 22),
  (v_project, v_tenant, '25110067', '2026-03-25'::date, 'Building & Licensing', 'Building 5', '13144 Alexandria Drive', 'Electrical', 'Elementz Reconstruction, LLC', 'UFAS 7 ADA Units', 'closed', 'Confirmation Received By City of Opa-Locka 07/09/2027', 'James', true, 23),
  (v_project, v_tenant, '25110068', '2026-03-25'::date, 'Building & Licensing', 'Building 5', '13144 Alexandria Drive', 'Plumbing', 'Elementz Reconstruction, LLC', 'UFAS 7 ADA Units', 'closed', 'Confirmation Received By City of Opa-Locka 07/09/2027', 'James', true, 24),
  (v_project, v_tenant, '25110069', '2026-03-25'::date, 'Building & Licensing', 'Building 4', '13122 Alexandria Drive', 'Building', 'Elementz Reconstruction, LLC', 'UFAS 10 ADA Units', 'closed', 'Confirmation Received By City of Opa-Locka 07/09/2026', 'James', true, 25),
  (v_project, v_tenant, '25110070', '2026-03-25'::date, 'Building & Licensing', 'Building 4', '13122 Alexandria Drive', 'Electrical', 'Elementz Reconstruction, LLC', 'UFAS 7 ADA Units', 'closed', 'Confirmation Received By City of Opa-Locka 07/09/2027', 'James', true, 26),
  (v_project, v_tenant, '25110071', '2026-03-25'::date, 'Building & Licensing', 'Building 4', '13122 Alexandria Drive', 'Plumbing', 'Elementz Reconstruction, LLC', 'UFAS 7 ADA Units', 'closed', 'Confirmation Received By City of Opa-Locka 07/09/2027', 'James', true, 27),
  (v_project, v_tenant, '25120117', '2026-01-28'::date, 'Building & Licensing', 'Building 3', '13132 Alexandria Drive', 'Plumbing', 'Elementz Reconstruction, LLC', 'Foundation Drain Concrete Slab', 'closed', 'Confirmation Received By City of Opa-Locka 07/09/2026', 'James', true, 28),
  (v_project, v_tenant, '25120119', '2026-01-28'::date, 'Building & Licensing', 'Building 4', '13122 Alexandria Drive', 'Plumbing', 'Elementz Reconstruction, LLC', 'Foundation Drain Concrete Slab', 'pending', 'Final Trade Subcontractor Passed 6/26; City To Confirm Closed', 'James', true, 29),
  (v_project, v_tenant, '25120120', '2026-01-28'::date, 'Building & Licensing', 'Building 5', '13144 Alexandria Drive', 'Plumbing', 'Elementz Reconstruction, LLC', 'Foundation Drain Concrete Slab', 'pending', 'Final Trade Subcontractor Passed 6/26; City To Confirm Closed', 'James', true, 30),
  (v_project, v_tenant, '25120123', '2026-01-28'::date, 'Building & Licensing', 'Building 6', '13142 Alexandria Drive', 'Plumbing', 'Elementz Reconstruction, LLC', 'Foundation Drain Concrete Slab', 'closed', 'Confirmation Received By City of Opa-Locka 07/09/2026', 'James', true, 31);

  -- Enable Permits module + owner portal compliance surface on Conveyance.
  UPDATE public.projects
     SET module_config = COALESCE(module_config, '{}'::jsonb) || jsonb_build_object('permits', true)
   WHERE id = v_project;

  RAISE NOTICE 'Seeded Glorieta project_permits from GGPermitLog_260715';
END
$$;
