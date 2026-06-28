-- Seed the Glorieta Sewer Extension Project Log from the contractor's punch-list
-- portal (the HTML template). One-off, guarded: only runs if the project exists
-- and has no tracker items yet, so it never duplicates or touches other projects.

DO $$
DECLARE
  v_pid     uuid := '4b168bb0-a0a0-4c0a-bcd8-eb56ec2f413d';
  v_tenant  uuid;
  v_creator uuid;
  v_ts      timestamptz := '2026-06-26 16:30:00+00';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = v_pid) THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.tracker_items WHERE project_id = v_pid) THEN RETURN; END IF;

  SELECT COALESCE(
    (SELECT pr.workspace_id FROM public.properties pr JOIN public.projects p ON p.property_id = pr.id WHERE p.id = v_pid),
    (SELECT pf.workspace_id FROM public.profiles pf JOIN public.projects p ON p.created_by = pf.user_id WHERE p.id = v_pid)
  ) INTO v_tenant;
  IF v_tenant IS NULL THEN v_tenant := '00000000-0000-0000-0000-000000000001'; END IF;
  SELECT created_by INTO v_creator FROM public.projects WHERE id = v_pid;

  INSERT INTO public.tracker_items
    (tenant_id, project_id, code, owner, category, title, priority, status, client_visible, created_by, created_at, closed_at)
  VALUES
    (v_tenant, v_pid, 'F1','Felix','punch','Deliver final as-built quantities for the main and manholes','high','done',true,v_creator,v_ts,v_ts),
    (v_tenant, v_pid, 'F2','Felix','punch','Submit as-built drawings, quantities, and bills','high','progress',true,v_creator,v_ts,NULL),
    (v_tenant, v_pid, 'D1','Donnell','punch','Walk the site to identify & document bollards damaged by crew (photos of metal + old PVC)','high','open',true,v_creator,v_ts,NULL),
    (v_tenant, v_pid, 'D2','Donnell','punch','Email Alex the exact damaged bollards + agreed credit (equivalent PVC value, not metal upgrade)','high','open',true,v_creator,v_ts,NULL),
    (v_tenant, v_pid, 'D3','Donnell','punch','Density test + asphalt paving','high','scheduled',true,v_creator,v_ts,NULL),
    (v_tenant, v_pid, 'D4','Donnell','punch','Remove sidewalk demolition debris from the stockpile','high','scheduled',true,v_creator,v_ts,NULL),
    (v_tenant, v_pid, 'D5','Donnell','punch','Catch basin / manhole — excavate & drop structure; photos before backfill w/ hydraulic compaction','high','progress',true,v_creator,v_ts,NULL),
    (v_tenant, v_pid, 'D6','Donnell','punch','Call gate/IT vendor (Danny''s team) re: detector-loop reinstallation; coordinate with paving','high','open',true,v_creator,v_ts,NULL),
    (v_tenant, v_pid, 'D7','Donnell','punch','Package & submit permits 7 & 8 to Owen for closeout; notify so Airia can confirm','high','open',true,v_creator,v_ts,NULL),
    (v_tenant, v_pid, 'D8','Donnell','punch','Properly compact the old manhole void near the driveway (hydraulic)','med','open',true,v_creator,v_ts,NULL),
    (v_tenant, v_pid, 'D9','Donnell','punch','Complete welding of the old manholes being left per plan','med','open',true,v_creator,v_ts,NULL),
    (v_tenant, v_pid, 'D10','Donnell','punch','Install L-shaped surface at Bldg 4 west sidewalk + NW corner Bldg 5 (with James) — before paving','med','open',true,v_creator,v_ts,NULL),
    (v_tenant, v_pid, 'D11','Donnell','punch','Street sweepers + dump site at the Bldg 3 dumpster','med','scheduled',true,v_creator,v_ts,NULL),
    (v_tenant, v_pid, 'D12','Donnell','punch','Notify Alex about residents using the construction dumpster; arrange labor to clear it','med','open',true,v_creator,v_ts,NULL),
    (v_tenant, v_pid, 'D13','Donnell','punch','Provide copies of active permit cards','med','progress',true,v_creator,v_ts,NULL),
    (v_tenant, v_pid, 'D14','Donnell','punch','Confirm with Arda whether the sediment dewatering tank is still needed before removal','med','open',true,v_creator,v_ts,NULL),
    (v_tenant, v_pid, 'D15','Donnell','punch','After sod is complete, gate off only the active work area in Bldgs 4/5/6 and remove the remaining fence','med','open',true,v_creator,v_ts,NULL),
    (v_tenant, v_pid, 'A1','Alex','punch','Join the bollard walk with Donnell & Arda; confirm the damaged-bollard list and credit','high','open',true,v_creator,v_ts,NULL),
    (v_tenant, v_pid, 'A2','Alex','punch','Execute all bollard, parking stop, and restoration work with vendor','high','open',true,v_creator,v_ts,NULL),
    (v_tenant, v_pid, 'A3','Alex','punch','Coordinate with Donnell on clearing the construction dumpster','med','open',true,v_creator,v_ts,NULL),
    (v_tenant, v_pid, 'J1','James / Elementz','punch','Install L-shaped surface with Donnell (Bldg 4 west sidewalk + NW corner Bldg 5) — before paving','med','open',true,v_creator,v_ts,NULL),
    (v_tenant, v_pid, 'J2','James / Elementz','punch','Ozzie site visit / final inspections','med','progress',true,v_creator,v_ts,NULL),
    (v_tenant, v_pid, 'J3','James / Elementz','punch','Pursue closeout of permits for Bldgs 7 & 8 despite red-tag removal (with Donnell)','med','progress',true,v_creator,v_ts,NULL),
    (v_tenant, v_pid, 'J4','James / Elementz','punch','Permit 7 & 8 closeout status on the weekly Chris Sullivan update sheet (ongoing weekly)','med','progress',true,v_creator,v_ts,NULL),
    (v_tenant, v_pid, 'AL1','Al','decision','Review the one-page R4 future-work agreement for permit 7 (technical standpoint)','high','open',true,v_creator,v_ts,NULL),
    (v_tenant, v_pid, 'AR1','Arda','punch','Confirm with Donnell whether the sediment dewatering tank is still needed before removal','med','open',true,v_creator,v_ts,NULL),
    (v_tenant, v_pid, 'AR2','Arda','general','Keep this tracker current with daily updates through Tuesday; funding tied to verified completion','med','progress',true,v_creator,v_ts,NULL),
    (v_tenant, v_pid, 'H1','Hardeep','general','Prepare and load the pay application','high','progress',true,v_creator,v_ts,NULL),
    (v_tenant, v_pid, 'PM1','Property Management','punch','Stop new residents using the construction dumpster / leaving debris; some buildings occupied while permits open','med','open',true,v_creator,v_ts,NULL);

  INSERT INTO public.tracker_updates (tenant_id, project_id, item_id, author, body, created_at)
  SELECT v_tenant, v_pid, ti.id, x.author, x.body, v_ts
  FROM (VALUES
    ('F1','Contractor (Hardeep)','Quantity numbers received (confirmed by D''Shin). Unblocks the invoice and pay application.'),
    ('F2','Contractor (Hardeep)','Quantities delivered; as-built drawings and bills still to follow. Reconcile 6" vs 4" pipe difference against the drawings.'),
    ('D3','Contractor (Hardeep)','Complete asphalt at the Entrance Sat (6/27), reopen Entrance by EOD; install asphalt at Building 5 Mon (6/29).'),
    ('D4','Contractor (Hardeep)','Final construction-debris pickup Mon (6/29) 8:00 AM.'),
    ('D5','Contractor (Hardeep)','Manhole not on site yet. Dig for manhole + core hole Sat (6/27); continue install Mon (6/29); backfill & grade Tue (6/30) at Building 5 small area near manhole.'),
    ('D11','Contractor (Hardeep)','Street sweeper Mon (6/29) 12:00 PM; debris pickup same morning 8:00 AM.'),
    ('D13','Greg Radd','Donnell to ensure Roger has a copy of any permit cards not on site, ahead of Ozzie''s Tuesday inspection.'),
    ('J2','Greg Radd','Spoke with Donnell; will schedule final inspections Mon (6/29) so Ozzie (City Plumbing Inspector) can inspect & sign off open permits during his Tue (6/30) Opa-locka inspections. Greg has Ozzie''s cell and will coordinate so Roger can meet him for sign-off.'),
    ('J3','Greg Radd','Updated permit log circulated. All ECS-inspected permits (ADA & Foundation Drain) approved today by City Electrical Inspector (ADA units); Plumbing passed Tuesday. ECS to confirm closeout with City next week and provide proof.'),
    ('J4','Greg Radd','Once the future-work letter is signed by the Director of Public Works, Donnell will have plans signed/approved by Opa-locka Public Works (Owen Carney) and see to cancellation/closeout of applicable permits. Permit 7 resolution clears ~$100K and removes the planned letter.'),
    ('H1','Contractor (Hardeep)','Felix''s quantities received — invoice / pay application now in preparation.')
  ) AS x(code, author, body)
  JOIN public.tracker_items ti ON ti.project_id = v_pid AND ti.code = x.code;
END $$;
