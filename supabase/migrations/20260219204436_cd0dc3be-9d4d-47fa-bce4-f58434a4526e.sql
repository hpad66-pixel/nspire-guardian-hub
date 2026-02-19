
BEGIN;

-- ================================================================
-- STEP 1: Ensure get_my_workspace_id() helper exists
-- ================================================================
CREATE OR REPLACE FUNCTION public.get_my_workspace_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ================================================================
-- STEP 2: Drop ALL existing RLS policies to start fresh
-- ================================================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.' || quote_ident(r.tablename);
  END LOOP;
END $$;

-- ================================================================
-- STEP 3: Add workspace_id to document_folders
-- ================================================================
ALTER TABLE public.document_folders
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id);

-- ================================================================
-- STEP 4: Enable RLS on ALL tables
-- ================================================================
ALTER TABLE public.action_item_comments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_skill_prompts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_type_definitions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_orders                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_action_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_messages                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portals                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_branding               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_progress                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credential_alerts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credential_share_links         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credentials                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_inspection_addendums     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_inspection_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_inspections              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defects                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_folders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_assets               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_checkouts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_documents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hud_sample_sizes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_comments                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_mentions                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lw_courses                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lw_school_assignments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lw_schools                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lw_sso_sessions                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_request_activity   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_unlock_requests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_threads                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nspire_scoring_weights         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_status              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_documents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permit_deliverables            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permit_requirements            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permits                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_gallery                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_access                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_activity                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_client_uploads          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_document_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_exclusions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_action_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_client_updates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_closeout_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_communications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_discussion_replies     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_discussions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_documents              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_lessons_learned        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_meetings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_progress_entries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_progress_reports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_proposals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_purchase_orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_rfis                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_safety_incidents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_submittals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_team_members           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_toolbox_talks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_warranties             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_archives              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_inventory_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_module_overrides      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_team_members          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_utility_bills         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_templates             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.punch_items                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_emails                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_definitions               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_incident_attachments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_incidents               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_messages                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_read_status             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_assignments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_completions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_courses               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_progress              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_requests              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_resources             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_share_links           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units                          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invitations               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_module_access             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_status_history            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_agent_config             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_activity            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_comments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_equipment_config     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_modules              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces                     ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- STEP 5: CREATE ALL POLICIES
-- ================================================================

-- WORKSPACES
CREATE POLICY "workspaces_select" ON public.workspaces FOR SELECT TO authenticated USING (id = public.get_my_workspace_id());
CREATE POLICY "workspaces_update" ON public.workspaces FOR UPDATE TO authenticated USING (id = public.get_my_workspace_id() AND public.has_role(auth.uid(), 'admin')) WITH CHECK (id = public.get_my_workspace_id() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "workspaces_insert" ON public.workspaces FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "workspaces_delete" ON public.workspaces FOR DELETE TO authenticated USING (false);

-- PROFILES
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid() OR workspace_id = public.get_my_workspace_id());
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND workspace_id = public.get_my_workspace_id());
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid() OR (workspace_id = public.get_my_workspace_id() AND public.has_role(auth.uid(), 'admin'))) WITH CHECK (user_id = auth.uid() OR (workspace_id = public.get_my_workspace_id() AND public.has_role(auth.uid(), 'admin')));
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') AND workspace_id = public.get_my_workspace_id());

-- TIER 1: Pattern A — Direct workspace_id
CREATE POLICY "ai_skill_prompts_select" ON public.ai_skill_prompts FOR SELECT TO authenticated USING (workspace_id = public.get_my_workspace_id());
CREATE POLICY "ai_skill_prompts_insert" ON public.ai_skill_prompts FOR INSERT TO authenticated WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "ai_skill_prompts_update" ON public.ai_skill_prompts FOR UPDATE TO authenticated USING (workspace_id = public.get_my_workspace_id()) WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "ai_skill_prompts_delete" ON public.ai_skill_prompts FOR DELETE TO authenticated USING (workspace_id = public.get_my_workspace_id());

CREATE POLICY "client_portals_select" ON public.client_portals FOR SELECT TO authenticated USING (workspace_id = public.get_my_workspace_id());
CREATE POLICY "client_portals_insert" ON public.client_portals FOR INSERT TO authenticated WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "client_portals_update" ON public.client_portals FOR UPDATE TO authenticated USING (workspace_id = public.get_my_workspace_id()) WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "client_portals_delete" ON public.client_portals FOR DELETE TO authenticated USING (workspace_id = public.get_my_workspace_id());

CREATE POLICY "clients_select" ON public.clients FOR SELECT TO authenticated USING (workspace_id = public.get_my_workspace_id());
CREATE POLICY "clients_insert" ON public.clients FOR INSERT TO authenticated WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "clients_update" ON public.clients FOR UPDATE TO authenticated USING (workspace_id = public.get_my_workspace_id()) WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "clients_delete" ON public.clients FOR DELETE TO authenticated USING (workspace_id = public.get_my_workspace_id());

CREATE POLICY "company_branding_select" ON public.company_branding FOR SELECT TO authenticated USING (workspace_id = public.get_my_workspace_id());
CREATE POLICY "company_branding_insert" ON public.company_branding FOR INSERT TO authenticated WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "company_branding_update" ON public.company_branding FOR UPDATE TO authenticated USING (workspace_id = public.get_my_workspace_id()) WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "company_branding_delete" ON public.company_branding FOR DELETE TO authenticated USING (workspace_id = public.get_my_workspace_id());

CREATE POLICY "credentials_select" ON public.credentials FOR SELECT TO authenticated USING (workspace_id = public.get_my_workspace_id());
CREATE POLICY "credentials_insert" ON public.credentials FOR INSERT TO authenticated WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "credentials_update" ON public.credentials FOR UPDATE TO authenticated USING (workspace_id = public.get_my_workspace_id()) WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "credentials_delete" ON public.credentials FOR DELETE TO authenticated USING (workspace_id = public.get_my_workspace_id());

CREATE POLICY "crm_contacts_select" ON public.crm_contacts FOR SELECT TO authenticated USING (workspace_id = public.get_my_workspace_id());
CREATE POLICY "crm_contacts_insert" ON public.crm_contacts FOR INSERT TO authenticated WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "crm_contacts_update" ON public.crm_contacts FOR UPDATE TO authenticated USING (workspace_id = public.get_my_workspace_id()) WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "crm_contacts_delete" ON public.crm_contacts FOR DELETE TO authenticated USING (workspace_id = public.get_my_workspace_id());

CREATE POLICY "equipment_assets_select" ON public.equipment_assets FOR SELECT TO authenticated USING (workspace_id = public.get_my_workspace_id());
CREATE POLICY "equipment_assets_insert" ON public.equipment_assets FOR INSERT TO authenticated WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "equipment_assets_update" ON public.equipment_assets FOR UPDATE TO authenticated USING (workspace_id = public.get_my_workspace_id()) WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "equipment_assets_delete" ON public.equipment_assets FOR DELETE TO authenticated USING (workspace_id = public.get_my_workspace_id());

CREATE POLICY "equipment_checkouts_select" ON public.equipment_checkouts FOR SELECT TO authenticated USING (workspace_id = public.get_my_workspace_id());
CREATE POLICY "equipment_checkouts_insert" ON public.equipment_checkouts FOR INSERT TO authenticated WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "equipment_checkouts_update" ON public.equipment_checkouts FOR UPDATE TO authenticated USING (workspace_id = public.get_my_workspace_id()) WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "equipment_checkouts_delete" ON public.equipment_checkouts FOR DELETE TO authenticated USING (workspace_id = public.get_my_workspace_id());

CREATE POLICY "equipment_documents_select" ON public.equipment_documents FOR SELECT TO authenticated USING (workspace_id = public.get_my_workspace_id());
CREATE POLICY "equipment_documents_insert" ON public.equipment_documents FOR INSERT TO authenticated WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "equipment_documents_update" ON public.equipment_documents FOR UPDATE TO authenticated USING (workspace_id = public.get_my_workspace_id()) WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "equipment_documents_delete" ON public.equipment_documents FOR DELETE TO authenticated USING (workspace_id = public.get_my_workspace_id());

CREATE POLICY "lw_school_assignments_select" ON public.lw_school_assignments FOR SELECT TO authenticated USING (workspace_id = public.get_my_workspace_id() OR user_id = auth.uid());
CREATE POLICY "lw_school_assignments_insert" ON public.lw_school_assignments FOR INSERT TO authenticated WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "lw_school_assignments_update" ON public.lw_school_assignments FOR UPDATE TO authenticated USING (workspace_id = public.get_my_workspace_id()) WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "lw_school_assignments_delete" ON public.lw_school_assignments FOR DELETE TO authenticated USING (workspace_id = public.get_my_workspace_id());

CREATE POLICY "properties_select" ON public.properties FOR SELECT TO authenticated USING (workspace_id = public.get_my_workspace_id());
CREATE POLICY "properties_insert" ON public.properties FOR INSERT TO authenticated WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "properties_update" ON public.properties FOR UPDATE TO authenticated USING (workspace_id = public.get_my_workspace_id()) WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "properties_delete" ON public.properties FOR DELETE TO authenticated USING (workspace_id = public.get_my_workspace_id());

CREATE POLICY "safety_incidents_select" ON public.safety_incidents FOR SELECT TO authenticated USING (workspace_id = public.get_my_workspace_id());
CREATE POLICY "safety_incidents_insert" ON public.safety_incidents FOR INSERT TO authenticated WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "safety_incidents_update" ON public.safety_incidents FOR UPDATE TO authenticated USING (workspace_id = public.get_my_workspace_id()) WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "safety_incidents_delete" ON public.safety_incidents FOR DELETE TO authenticated USING (workspace_id = public.get_my_workspace_id());

CREATE POLICY "training_assignments_select" ON public.training_assignments FOR SELECT TO authenticated USING (workspace_id = public.get_my_workspace_id());
CREATE POLICY "training_assignments_insert" ON public.training_assignments FOR INSERT TO authenticated WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "training_assignments_update" ON public.training_assignments FOR UPDATE TO authenticated USING (workspace_id = public.get_my_workspace_id()) WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "training_assignments_delete" ON public.training_assignments FOR DELETE TO authenticated USING (workspace_id = public.get_my_workspace_id());

CREATE POLICY "training_completions_select" ON public.training_completions FOR SELECT TO authenticated USING (workspace_id = public.get_my_workspace_id());
CREATE POLICY "training_completions_insert" ON public.training_completions FOR INSERT TO authenticated WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "training_completions_update" ON public.training_completions FOR UPDATE TO authenticated USING (workspace_id = public.get_my_workspace_id()) WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "training_completions_delete" ON public.training_completions FOR DELETE TO authenticated USING (workspace_id = public.get_my_workspace_id());

CREATE POLICY "training_courses_select" ON public.training_courses FOR SELECT TO authenticated USING (workspace_id = public.get_my_workspace_id());
CREATE POLICY "training_courses_insert" ON public.training_courses FOR INSERT TO authenticated WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "training_courses_update" ON public.training_courses FOR UPDATE TO authenticated USING (workspace_id = public.get_my_workspace_id()) WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "training_courses_delete" ON public.training_courses FOR DELETE TO authenticated USING (workspace_id = public.get_my_workspace_id());

CREATE POLICY "user_invitations_select" ON public.user_invitations FOR SELECT TO authenticated USING (workspace_id = public.get_my_workspace_id());
CREATE POLICY "user_invitations_insert" ON public.user_invitations FOR INSERT TO authenticated WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "user_invitations_update" ON public.user_invitations FOR UPDATE TO authenticated USING (workspace_id = public.get_my_workspace_id()) WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "user_invitations_delete" ON public.user_invitations FOR DELETE TO authenticated USING (workspace_id = public.get_my_workspace_id());

CREATE POLICY "workspace_equipment_config_select" ON public.workspace_equipment_config FOR SELECT TO authenticated USING (workspace_id = public.get_my_workspace_id());
CREATE POLICY "workspace_equipment_config_insert" ON public.workspace_equipment_config FOR INSERT TO authenticated WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "workspace_equipment_config_update" ON public.workspace_equipment_config FOR UPDATE TO authenticated USING (workspace_id = public.get_my_workspace_id()) WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "workspace_equipment_config_delete" ON public.workspace_equipment_config FOR DELETE TO authenticated USING (workspace_id = public.get_my_workspace_id());

CREATE POLICY "workspace_modules_select" ON public.workspace_modules FOR SELECT TO authenticated USING (workspace_id = public.get_my_workspace_id());
CREATE POLICY "workspace_modules_insert" ON public.workspace_modules FOR INSERT TO authenticated WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "workspace_modules_update" ON public.workspace_modules FOR UPDATE TO authenticated USING (workspace_id = public.get_my_workspace_id()) WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "workspace_modules_delete" ON public.workspace_modules FOR DELETE TO authenticated USING (workspace_id = public.get_my_workspace_id());

-- voice_agent_config (via property_id)
CREATE POLICY "voice_agent_config_select" ON public.voice_agent_config FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = voice_agent_config.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "voice_agent_config_insert" ON public.voice_agent_config FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = voice_agent_config.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "voice_agent_config_update" ON public.voice_agent_config FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = voice_agent_config.property_id AND workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = voice_agent_config.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "voice_agent_config_delete" ON public.voice_agent_config FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = voice_agent_config.property_id AND workspace_id = public.get_my_workspace_id()));

-- TIER 2: Pattern B — Via property_id
CREATE POLICY "assets_select" ON public.assets FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = assets.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "assets_insert" ON public.assets FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = assets.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "assets_update" ON public.assets FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = assets.property_id AND workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = assets.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "assets_delete" ON public.assets FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = assets.property_id AND workspace_id = public.get_my_workspace_id()));

CREATE POLICY "daily_inspections_select" ON public.daily_inspections FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = daily_inspections.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "daily_inspections_insert" ON public.daily_inspections FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = daily_inspections.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "daily_inspections_update" ON public.daily_inspections FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = daily_inspections.property_id AND workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = daily_inspections.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "daily_inspections_delete" ON public.daily_inspections FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = daily_inspections.property_id AND workspace_id = public.get_my_workspace_id()));

CREATE POLICY "inspections_select" ON public.inspections FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = inspections.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "inspections_insert" ON public.inspections FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = inspections.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "inspections_update" ON public.inspections FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = inspections.property_id AND workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = inspections.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "inspections_delete" ON public.inspections FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = inspections.property_id AND workspace_id = public.get_my_workspace_id()));

CREATE POLICY "issues_select" ON public.issues FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = issues.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "issues_insert" ON public.issues FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = issues.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "issues_update" ON public.issues FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = issues.property_id AND workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = issues.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "issues_delete" ON public.issues FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = issues.property_id AND workspace_id = public.get_my_workspace_id()));

CREATE POLICY "permits_select" ON public.permits FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = permits.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "permits_insert" ON public.permits FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = permits.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "permits_update" ON public.permits FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = permits.property_id AND workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = permits.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "permits_delete" ON public.permits FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = permits.property_id AND workspace_id = public.get_my_workspace_id()));

CREATE POLICY "photo_gallery_select" ON public.photo_gallery FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = photo_gallery.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "photo_gallery_insert" ON public.photo_gallery FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = photo_gallery.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "photo_gallery_update" ON public.photo_gallery FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = photo_gallery.property_id AND workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = photo_gallery.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "photo_gallery_delete" ON public.photo_gallery FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = photo_gallery.property_id AND workspace_id = public.get_my_workspace_id()));

CREATE POLICY "property_archives_select" ON public.property_archives FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = property_archives.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "property_archives_insert" ON public.property_archives FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = property_archives.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "property_archives_update" ON public.property_archives FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = property_archives.property_id AND workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = property_archives.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "property_archives_delete" ON public.property_archives FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = property_archives.property_id AND workspace_id = public.get_my_workspace_id()));

CREATE POLICY "property_inventory_items_select" ON public.property_inventory_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = property_inventory_items.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "property_inventory_items_insert" ON public.property_inventory_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = property_inventory_items.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "property_inventory_items_update" ON public.property_inventory_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = property_inventory_items.property_id AND workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = property_inventory_items.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "property_inventory_items_delete" ON public.property_inventory_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = property_inventory_items.property_id AND workspace_id = public.get_my_workspace_id()));

CREATE POLICY "property_module_overrides_select" ON public.property_module_overrides FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = property_module_overrides.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "property_module_overrides_insert" ON public.property_module_overrides FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = property_module_overrides.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "property_module_overrides_update" ON public.property_module_overrides FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = property_module_overrides.property_id AND workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = property_module_overrides.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "property_module_overrides_delete" ON public.property_module_overrides FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = property_module_overrides.property_id AND workspace_id = public.get_my_workspace_id()));

CREATE POLICY "property_team_members_select" ON public.property_team_members FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = property_team_members.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "property_team_members_insert" ON public.property_team_members FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = property_team_members.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "property_team_members_update" ON public.property_team_members FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = property_team_members.property_id AND workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = property_team_members.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "property_team_members_delete" ON public.property_team_members FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = property_team_members.property_id AND workspace_id = public.get_my_workspace_id()));

CREATE POLICY "property_utility_bills_select" ON public.property_utility_bills FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = property_utility_bills.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "property_utility_bills_insert" ON public.property_utility_bills FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = property_utility_bills.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "property_utility_bills_update" ON public.property_utility_bills FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = property_utility_bills.property_id AND workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = property_utility_bills.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "property_utility_bills_delete" ON public.property_utility_bills FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = property_utility_bills.property_id AND workspace_id = public.get_my_workspace_id()));

CREATE POLICY "units_select" ON public.units FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = units.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "units_insert" ON public.units FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = units.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "units_update" ON public.units FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = units.property_id AND workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = units.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "units_delete" ON public.units FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = units.property_id AND workspace_id = public.get_my_workspace_id()));

CREATE POLICY "work_orders_select" ON public.work_orders FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = work_orders.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "work_orders_insert" ON public.work_orders FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = work_orders.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "work_orders_update" ON public.work_orders FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = work_orders.property_id AND workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = work_orders.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "work_orders_delete" ON public.work_orders FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = work_orders.property_id AND workspace_id = public.get_my_workspace_id()));

CREATE POLICY "maintenance_requests_select" ON public.maintenance_requests FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = maintenance_requests.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "maintenance_requests_insert" ON public.maintenance_requests FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = maintenance_requests.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "maintenance_requests_update" ON public.maintenance_requests FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = maintenance_requests.property_id AND workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = maintenance_requests.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "maintenance_requests_delete" ON public.maintenance_requests FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = maintenance_requests.property_id AND workspace_id = public.get_my_workspace_id()));

CREATE POLICY "inventory_transactions_select" ON public.inventory_transactions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = inventory_transactions.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "inventory_transactions_insert" ON public.inventory_transactions FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = inventory_transactions.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "inventory_transactions_update" ON public.inventory_transactions FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = inventory_transactions.property_id AND workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = inventory_transactions.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "inventory_transactions_delete" ON public.inventory_transactions FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = inventory_transactions.property_id AND workspace_id = public.get_my_workspace_id()));

-- tenants (via unit_id)
CREATE POLICY "tenants_select" ON public.tenants FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.units u JOIN public.properties p ON p.id = u.property_id WHERE u.id = tenants.unit_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "tenants_insert" ON public.tenants FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.units u JOIN public.properties p ON p.id = u.property_id WHERE u.id = tenants.unit_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "tenants_update" ON public.tenants FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.units u JOIN public.properties p ON p.id = u.property_id WHERE u.id = tenants.unit_id AND p.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.units u JOIN public.properties p ON p.id = u.property_id WHERE u.id = tenants.unit_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "tenants_delete" ON public.tenants FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.units u JOIN public.properties p ON p.id = u.property_id WHERE u.id = tenants.unit_id AND p.workspace_id = public.get_my_workspace_id()));

-- TIER 3: Pattern C — Via project_id
CREATE POLICY "projects_select" ON public.projects FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = projects.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "projects_insert" ON public.projects FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = projects.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = projects.property_id AND workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = projects.property_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "projects_delete" ON public.projects FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.properties WHERE id = projects.property_id AND workspace_id = public.get_my_workspace_id()));

CREATE POLICY "change_orders_select" ON public.change_orders FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = change_orders.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "change_orders_insert" ON public.change_orders FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = change_orders.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "change_orders_update" ON public.change_orders FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = change_orders.project_id AND pr.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = change_orders.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "change_orders_delete" ON public.change_orders FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = change_orders.project_id AND pr.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "client_action_items_select" ON public.client_action_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = client_action_items.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "client_action_items_insert" ON public.client_action_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = client_action_items.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "client_action_items_update" ON public.client_action_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = client_action_items.project_id AND pr.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = client_action_items.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "client_action_items_delete" ON public.client_action_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = client_action_items.project_id AND pr.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "client_messages_select" ON public.client_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = client_messages.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "client_messages_insert" ON public.client_messages FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = client_messages.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "client_messages_update" ON public.client_messages FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = client_messages.project_id AND pr.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = client_messages.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "client_messages_delete" ON public.client_messages FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = client_messages.project_id AND pr.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "project_action_items_select" ON public.project_action_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_action_items.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_action_items_insert" ON public.project_action_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_action_items.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_action_items_update" ON public.project_action_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_action_items.project_id AND pr.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_action_items.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_action_items_delete" ON public.project_action_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_action_items.project_id AND pr.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "project_client_updates_select" ON public.project_client_updates FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_client_updates.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_client_updates_insert" ON public.project_client_updates FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_client_updates.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_client_updates_update" ON public.project_client_updates FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_client_updates.project_id AND pr.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_client_updates.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_client_updates_delete" ON public.project_client_updates FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_client_updates.project_id AND pr.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "project_closeout_items_select" ON public.project_closeout_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_closeout_items.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_closeout_items_insert" ON public.project_closeout_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_closeout_items.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_closeout_items_update" ON public.project_closeout_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_closeout_items.project_id AND pr.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_closeout_items.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_closeout_items_delete" ON public.project_closeout_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_closeout_items.project_id AND pr.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "project_communications_select" ON public.project_communications FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_communications.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_communications_insert" ON public.project_communications FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_communications.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_communications_update" ON public.project_communications FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_communications.project_id AND pr.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_communications.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_communications_delete" ON public.project_communications FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_communications.project_id AND pr.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "project_discussions_select" ON public.project_discussions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_discussions.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_discussions_insert" ON public.project_discussions FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_discussions.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_discussions_update" ON public.project_discussions FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_discussions.project_id AND pr.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_discussions.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_discussions_delete" ON public.project_discussions FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_discussions.project_id AND pr.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "project_discussion_replies_select" ON public.project_discussion_replies FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.project_discussions pd JOIN public.projects p ON p.id = pd.project_id JOIN public.properties pr ON pr.id = p.property_id WHERE pd.id = project_discussion_replies.discussion_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_discussion_replies_insert" ON public.project_discussion_replies FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.project_discussions pd JOIN public.projects p ON p.id = pd.project_id JOIN public.properties pr ON pr.id = p.property_id WHERE pd.id = project_discussion_replies.discussion_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_discussion_replies_update" ON public.project_discussion_replies FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.project_discussions pd JOIN public.projects p ON p.id = pd.project_id JOIN public.properties pr ON pr.id = p.property_id WHERE pd.id = project_discussion_replies.discussion_id AND pr.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.project_discussions pd JOIN public.projects p ON p.id = pd.project_id JOIN public.properties pr ON pr.id = p.property_id WHERE pd.id = project_discussion_replies.discussion_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_discussion_replies_delete" ON public.project_discussion_replies FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.project_discussions pd JOIN public.projects p ON p.id = pd.project_id JOIN public.properties pr ON pr.id = p.property_id WHERE pd.id = project_discussion_replies.discussion_id AND pr.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "project_documents_select" ON public.project_documents FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_documents.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_documents_insert" ON public.project_documents FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_documents.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_documents_update" ON public.project_documents FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_documents.project_id AND pr.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_documents.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_documents_delete" ON public.project_documents FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_documents.project_id AND pr.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "project_lessons_learned_select" ON public.project_lessons_learned FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_lessons_learned.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_lessons_learned_insert" ON public.project_lessons_learned FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_lessons_learned.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_lessons_learned_update" ON public.project_lessons_learned FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_lessons_learned.project_id AND pr.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_lessons_learned.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_lessons_learned_delete" ON public.project_lessons_learned FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_lessons_learned.project_id AND pr.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "project_meetings_select" ON public.project_meetings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_meetings.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_meetings_insert" ON public.project_meetings FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_meetings.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_meetings_update" ON public.project_meetings FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_meetings.project_id AND pr.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_meetings.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_meetings_delete" ON public.project_meetings FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_meetings.project_id AND pr.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "project_milestones_select" ON public.project_milestones FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_milestones.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_milestones_insert" ON public.project_milestones FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_milestones.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_milestones_update" ON public.project_milestones FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_milestones.project_id AND pr.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_milestones.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_milestones_delete" ON public.project_milestones FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_milestones.project_id AND pr.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "project_progress_entries_select" ON public.project_progress_entries FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_progress_entries.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_progress_entries_insert" ON public.project_progress_entries FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_progress_entries.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_progress_entries_update" ON public.project_progress_entries FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_progress_entries.project_id AND pr.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_progress_entries.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_progress_entries_delete" ON public.project_progress_entries FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_progress_entries.project_id AND pr.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "project_progress_reports_select" ON public.project_progress_reports FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_progress_reports.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_progress_reports_insert" ON public.project_progress_reports FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_progress_reports.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_progress_reports_update" ON public.project_progress_reports FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_progress_reports.project_id AND pr.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_progress_reports.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_progress_reports_delete" ON public.project_progress_reports FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_progress_reports.project_id AND pr.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "project_proposals_select" ON public.project_proposals FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_proposals.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_proposals_insert" ON public.project_proposals FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_proposals.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_proposals_update" ON public.project_proposals FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_proposals.project_id AND pr.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_proposals.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_proposals_delete" ON public.project_proposals FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_proposals.project_id AND pr.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "project_purchase_orders_select" ON public.project_purchase_orders FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_purchase_orders.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_purchase_orders_insert" ON public.project_purchase_orders FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_purchase_orders.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_purchase_orders_update" ON public.project_purchase_orders FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_purchase_orders.project_id AND pr.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_purchase_orders.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_purchase_orders_delete" ON public.project_purchase_orders FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_purchase_orders.project_id AND pr.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "project_rfis_select" ON public.project_rfis FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_rfis.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_rfis_insert" ON public.project_rfis FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_rfis.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_rfis_update" ON public.project_rfis FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_rfis.project_id AND pr.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_rfis.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_rfis_delete" ON public.project_rfis FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_rfis.project_id AND pr.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "project_safety_incidents_select" ON public.project_safety_incidents FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_safety_incidents.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_safety_incidents_insert" ON public.project_safety_incidents FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_safety_incidents.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_safety_incidents_update" ON public.project_safety_incidents FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_safety_incidents.project_id AND pr.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_safety_incidents.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_safety_incidents_delete" ON public.project_safety_incidents FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_safety_incidents.project_id AND pr.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "project_submittals_select" ON public.project_submittals FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_submittals.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_submittals_insert" ON public.project_submittals FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_submittals.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_submittals_update" ON public.project_submittals FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_submittals.project_id AND pr.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_submittals.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_submittals_delete" ON public.project_submittals FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_submittals.project_id AND pr.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "project_team_members_select" ON public.project_team_members FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_team_members.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_team_members_insert" ON public.project_team_members FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_team_members.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_team_members_update" ON public.project_team_members FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_team_members.project_id AND pr.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_team_members.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_team_members_delete" ON public.project_team_members FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_team_members.project_id AND pr.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "project_toolbox_talks_select" ON public.project_toolbox_talks FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_toolbox_talks.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_toolbox_talks_insert" ON public.project_toolbox_talks FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_toolbox_talks.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_toolbox_talks_update" ON public.project_toolbox_talks FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_toolbox_talks.project_id AND pr.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_toolbox_talks.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_toolbox_talks_delete" ON public.project_toolbox_talks FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_toolbox_talks.project_id AND pr.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "project_warranties_select" ON public.project_warranties FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_warranties.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_warranties_insert" ON public.project_warranties FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_warranties.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_warranties_update" ON public.project_warranties FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_warranties.project_id AND pr.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_warranties.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "project_warranties_delete" ON public.project_warranties FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = project_warranties.project_id AND pr.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "punch_items_select" ON public.punch_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = punch_items.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "punch_items_insert" ON public.punch_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = punch_items.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "punch_items_update" ON public.punch_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = punch_items.project_id AND pr.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = punch_items.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "punch_items_delete" ON public.punch_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = punch_items.project_id AND pr.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "daily_reports_select" ON public.daily_reports FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = daily_reports.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "daily_reports_insert" ON public.daily_reports FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = daily_reports.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "daily_reports_update" ON public.daily_reports FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = daily_reports.project_id AND pr.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = daily_reports.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "daily_reports_delete" ON public.daily_reports FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = daily_reports.project_id AND pr.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "proposal_templates_select" ON public.proposal_templates FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = proposal_templates.created_by AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "proposal_templates_insert" ON public.proposal_templates FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = proposal_templates.created_by AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "proposal_templates_update" ON public.proposal_templates FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = proposal_templates.created_by AND workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = proposal_templates.created_by AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "proposal_templates_delete" ON public.proposal_templates FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = proposal_templates.created_by AND workspace_id = public.get_my_workspace_id()));

-- portal_client_uploads (has project_id, not portal_id)
CREATE POLICY "portal_client_uploads_select" ON public.portal_client_uploads FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = portal_client_uploads.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "portal_client_uploads_insert" ON public.portal_client_uploads FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = portal_client_uploads.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "portal_client_uploads_update" ON public.portal_client_uploads FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = portal_client_uploads.project_id AND pr.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = portal_client_uploads.project_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "portal_client_uploads_delete" ON public.portal_client_uploads FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p JOIN public.properties pr ON pr.id = p.property_id WHERE p.id = portal_client_uploads.project_id AND pr.workspace_id = public.get_my_workspace_id()));

-- TIER 4: Via credential_id
CREATE POLICY "credential_alerts_select" ON public.credential_alerts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.credentials WHERE id = credential_alerts.credential_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "credential_alerts_insert" ON public.credential_alerts FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.credentials WHERE id = credential_alerts.credential_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "credential_alerts_update" ON public.credential_alerts FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.credentials WHERE id = credential_alerts.credential_id AND workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.credentials WHERE id = credential_alerts.credential_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "credential_alerts_delete" ON public.credential_alerts FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.credentials WHERE id = credential_alerts.credential_id AND workspace_id = public.get_my_workspace_id()));

CREATE POLICY "credential_share_links_select" ON public.credential_share_links FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.credentials WHERE id = credential_share_links.credential_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "credential_share_links_insert" ON public.credential_share_links FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.credentials WHERE id = credential_share_links.credential_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "credential_share_links_update" ON public.credential_share_links FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.credentials WHERE id = credential_share_links.credential_id AND workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.credentials WHERE id = credential_share_links.credential_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "credential_share_links_delete" ON public.credential_share_links FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.credentials WHERE id = credential_share_links.credential_id AND workspace_id = public.get_my_workspace_id()));

-- TIER 5: Via incident_id
CREATE POLICY "safety_incident_attachments_select" ON public.safety_incident_attachments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.safety_incidents WHERE id = safety_incident_attachments.incident_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "safety_incident_attachments_insert" ON public.safety_incident_attachments FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.safety_incidents WHERE id = safety_incident_attachments.incident_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "safety_incident_attachments_update" ON public.safety_incident_attachments FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.safety_incidents WHERE id = safety_incident_attachments.incident_id AND workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.safety_incidents WHERE id = safety_incident_attachments.incident_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "safety_incident_attachments_delete" ON public.safety_incident_attachments FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.safety_incidents WHERE id = safety_incident_attachments.incident_id AND workspace_id = public.get_my_workspace_id()));

-- TIER 6: Via portal_id
CREATE POLICY "portal_access_select" ON public.portal_access FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.client_portals WHERE id = portal_access.portal_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "portal_access_insert" ON public.portal_access FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.client_portals WHERE id = portal_access.portal_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "portal_access_update" ON public.portal_access FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.client_portals WHERE id = portal_access.portal_id AND workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.client_portals WHERE id = portal_access.portal_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "portal_access_delete" ON public.portal_access FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.client_portals WHERE id = portal_access.portal_id AND workspace_id = public.get_my_workspace_id()));

CREATE POLICY "portal_activity_select" ON public.portal_activity FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.client_portals WHERE id = portal_activity.portal_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "portal_activity_insert" ON public.portal_activity FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.client_portals WHERE id = portal_activity.portal_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "portal_activity_update" ON public.portal_activity FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.client_portals WHERE id = portal_activity.portal_id AND workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.client_portals WHERE id = portal_activity.portal_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "portal_activity_delete" ON public.portal_activity FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.client_portals WHERE id = portal_activity.portal_id AND workspace_id = public.get_my_workspace_id()));

CREATE POLICY "portal_document_requests_select" ON public.portal_document_requests FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.client_portals WHERE id = portal_document_requests.portal_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "portal_document_requests_insert" ON public.portal_document_requests FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.client_portals WHERE id = portal_document_requests.portal_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "portal_document_requests_update" ON public.portal_document_requests FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.client_portals WHERE id = portal_document_requests.portal_id AND workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.client_portals WHERE id = portal_document_requests.portal_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "portal_document_requests_delete" ON public.portal_document_requests FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.client_portals WHERE id = portal_document_requests.portal_id AND workspace_id = public.get_my_workspace_id()));

CREATE POLICY "portal_exclusions_select" ON public.portal_exclusions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.client_portals WHERE id = portal_exclusions.portal_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "portal_exclusions_insert" ON public.portal_exclusions FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.client_portals WHERE id = portal_exclusions.portal_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "portal_exclusions_update" ON public.portal_exclusions FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.client_portals WHERE id = portal_exclusions.portal_id AND workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.client_portals WHERE id = portal_exclusions.portal_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "portal_exclusions_delete" ON public.portal_exclusions FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.client_portals WHERE id = portal_exclusions.portal_id AND workspace_id = public.get_my_workspace_id()));

-- TIER 7: Via work_order_id
CREATE POLICY "work_order_activity_select" ON public.work_order_activity FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.work_orders wo JOIN public.properties p ON p.id = wo.property_id WHERE wo.id = work_order_activity.work_order_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "work_order_activity_insert" ON public.work_order_activity FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.work_orders wo JOIN public.properties p ON p.id = wo.property_id WHERE wo.id = work_order_activity.work_order_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "work_order_activity_update" ON public.work_order_activity FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.work_orders wo JOIN public.properties p ON p.id = wo.property_id WHERE wo.id = work_order_activity.work_order_id AND p.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.work_orders wo JOIN public.properties p ON p.id = wo.property_id WHERE wo.id = work_order_activity.work_order_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "work_order_activity_delete" ON public.work_order_activity FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.work_orders wo JOIN public.properties p ON p.id = wo.property_id WHERE wo.id = work_order_activity.work_order_id AND p.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "work_order_comments_select" ON public.work_order_comments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.work_orders wo JOIN public.properties p ON p.id = wo.property_id WHERE wo.id = work_order_comments.work_order_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "work_order_comments_insert" ON public.work_order_comments FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.work_orders wo JOIN public.properties p ON p.id = wo.property_id WHERE wo.id = work_order_comments.work_order_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "work_order_comments_update" ON public.work_order_comments FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.work_orders wo JOIN public.properties p ON p.id = wo.property_id WHERE wo.id = work_order_comments.work_order_id AND p.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.work_orders wo JOIN public.properties p ON p.id = wo.property_id WHERE wo.id = work_order_comments.work_order_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "work_order_comments_delete" ON public.work_order_comments FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.work_orders wo JOIN public.properties p ON p.id = wo.property_id WHERE wo.id = work_order_comments.work_order_id AND p.workspace_id = public.get_my_workspace_id()));

-- TIER 8: Via issue_id
CREATE POLICY "action_item_comments_select" ON public.action_item_comments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.project_action_items pai JOIN public.projects p ON p.id = pai.project_id JOIN public.properties pr ON pr.id = p.property_id WHERE pai.id = action_item_comments.action_item_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "action_item_comments_insert" ON public.action_item_comments FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.project_action_items pai JOIN public.projects p ON p.id = pai.project_id JOIN public.properties pr ON pr.id = p.property_id WHERE pai.id = action_item_comments.action_item_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "action_item_comments_update" ON public.action_item_comments FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.project_action_items pai JOIN public.projects p ON p.id = pai.project_id JOIN public.properties pr ON pr.id = p.property_id WHERE pai.id = action_item_comments.action_item_id AND pr.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.project_action_items pai JOIN public.projects p ON p.id = pai.project_id JOIN public.properties pr ON pr.id = p.property_id WHERE pai.id = action_item_comments.action_item_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "action_item_comments_delete" ON public.action_item_comments FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.project_action_items pai JOIN public.projects p ON p.id = pai.project_id JOIN public.properties pr ON pr.id = p.property_id WHERE pai.id = action_item_comments.action_item_id AND pr.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "issue_comments_select" ON public.issue_comments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.issues i JOIN public.properties p ON p.id = i.property_id WHERE i.id = issue_comments.issue_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "issue_comments_insert" ON public.issue_comments FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.issues i JOIN public.properties p ON p.id = i.property_id WHERE i.id = issue_comments.issue_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "issue_comments_update" ON public.issue_comments FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.issues i JOIN public.properties p ON p.id = i.property_id WHERE i.id = issue_comments.issue_id AND p.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.issues i JOIN public.properties p ON p.id = i.property_id WHERE i.id = issue_comments.issue_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "issue_comments_delete" ON public.issue_comments FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.issues i JOIN public.properties p ON p.id = i.property_id WHERE i.id = issue_comments.issue_id AND p.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "issue_mentions_select" ON public.issue_mentions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.issues i JOIN public.properties p ON p.id = i.property_id WHERE i.id = issue_mentions.issue_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "issue_mentions_insert" ON public.issue_mentions FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.issues i JOIN public.properties p ON p.id = i.property_id WHERE i.id = issue_mentions.issue_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "issue_mentions_update" ON public.issue_mentions FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.issues i JOIN public.properties p ON p.id = i.property_id WHERE i.id = issue_mentions.issue_id AND p.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.issues i JOIN public.properties p ON p.id = i.property_id WHERE i.id = issue_mentions.issue_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "issue_mentions_delete" ON public.issue_mentions FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.issues i JOIN public.properties p ON p.id = i.property_id WHERE i.id = issue_mentions.issue_id AND p.workspace_id = public.get_my_workspace_id()));

-- TIER 9: User-scoped (personal)
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications_delete" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "onboarding_status_select" ON public.onboarding_status FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "onboarding_status_insert" ON public.onboarding_status FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "onboarding_status_update" ON public.onboarding_status FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "onboarding_status_delete" ON public.onboarding_status FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "push_subscriptions_select" ON public.push_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "push_subscriptions_insert" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "push_subscriptions_update" ON public.push_subscriptions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "push_subscriptions_delete" ON public.push_subscriptions FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "lw_sso_sessions_select" ON public.lw_sso_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "lw_sso_sessions_insert" ON public.lw_sso_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "lw_sso_sessions_update" ON public.lw_sso_sessions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "lw_sso_sessions_delete" ON public.lw_sso_sessions FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "course_progress_select" ON public.course_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "course_progress_insert" ON public.course_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "course_progress_update" ON public.course_progress FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "course_progress_delete" ON public.course_progress FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "training_progress_select" ON public.training_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "training_progress_insert" ON public.training_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "training_progress_update" ON public.training_progress FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "training_progress_delete" ON public.training_progress FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "user_status_history_select" ON public.user_status_history FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_status_history_insert" ON public.user_status_history FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_status_history_update" ON public.user_status_history FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_status_history_delete" ON public.user_status_history FOR DELETE TO authenticated USING (user_id = auth.uid());

-- user_roles (workspace-visible, admin-managed)
CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR (public.has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = user_roles.user_id AND workspace_id = public.get_my_workspace_id())));
CREATE POLICY "user_roles_insert" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = user_roles.user_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "user_roles_update" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = user_roles.user_id AND workspace_id = public.get_my_workspace_id())) WITH CHECK (public.has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = user_roles.user_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "user_roles_delete" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = user_roles.user_id AND workspace_id = public.get_my_workspace_id()));

-- user_module_access
CREATE POLICY "user_module_access_select" ON public.user_module_access FOR SELECT TO authenticated USING (user_id = auth.uid() OR (public.has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = user_module_access.user_id AND workspace_id = public.get_my_workspace_id())));
CREATE POLICY "user_module_access_insert" ON public.user_module_access FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = user_module_access.user_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "user_module_access_update" ON public.user_module_access FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = user_module_access.user_id AND workspace_id = public.get_my_workspace_id())) WITH CHECK (public.has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = user_module_access.user_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "user_module_access_delete" ON public.user_module_access FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = user_module_access.user_id AND workspace_id = public.get_my_workspace_id()));

-- training_requests
CREATE POLICY "training_requests_select" ON public.training_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR (public.has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = training_requests.user_id AND workspace_id = public.get_my_workspace_id())));
CREATE POLICY "training_requests_insert" ON public.training_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "training_requests_update" ON public.training_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = training_requests.user_id AND workspace_id = public.get_my_workspace_id())) WITH CHECK (public.has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = training_requests.user_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "training_requests_delete" ON public.training_requests FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- report_emails
CREATE POLICY "report_emails_select" ON public.report_emails FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "report_emails_insert" ON public.report_emails FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "report_emails_update" ON public.report_emails FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "report_emails_delete" ON public.report_emails FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND workspace_id = public.get_my_workspace_id()));

-- TIER 10: Inspection children
CREATE POLICY "daily_inspection_items_select" ON public.daily_inspection_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.daily_inspections di JOIN public.properties p ON p.id = di.property_id WHERE di.id = daily_inspection_items.daily_inspection_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "daily_inspection_items_insert" ON public.daily_inspection_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.daily_inspections di JOIN public.properties p ON p.id = di.property_id WHERE di.id = daily_inspection_items.daily_inspection_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "daily_inspection_items_update" ON public.daily_inspection_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.daily_inspections di JOIN public.properties p ON p.id = di.property_id WHERE di.id = daily_inspection_items.daily_inspection_id AND p.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.daily_inspections di JOIN public.properties p ON p.id = di.property_id WHERE di.id = daily_inspection_items.daily_inspection_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "daily_inspection_items_delete" ON public.daily_inspection_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.daily_inspections di JOIN public.properties p ON p.id = di.property_id WHERE di.id = daily_inspection_items.daily_inspection_id AND p.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "daily_inspection_addendums_select" ON public.daily_inspection_addendums FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.daily_inspections di JOIN public.properties p ON p.id = di.property_id WHERE di.id = daily_inspection_addendums.daily_inspection_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "daily_inspection_addendums_insert" ON public.daily_inspection_addendums FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.daily_inspections di JOIN public.properties p ON p.id = di.property_id WHERE di.id = daily_inspection_addendums.daily_inspection_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "daily_inspection_addendums_update" ON public.daily_inspection_addendums FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.daily_inspections di JOIN public.properties p ON p.id = di.property_id WHERE di.id = daily_inspection_addendums.daily_inspection_id AND p.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.daily_inspections di JOIN public.properties p ON p.id = di.property_id WHERE di.id = daily_inspection_addendums.daily_inspection_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "daily_inspection_addendums_delete" ON public.daily_inspection_addendums FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.daily_inspections di JOIN public.properties p ON p.id = di.property_id WHERE di.id = daily_inspection_addendums.daily_inspection_id AND p.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "defects_select" ON public.defects FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.inspections i JOIN public.properties p ON p.id = i.property_id WHERE i.id = defects.inspection_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "defects_insert" ON public.defects FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.inspections i JOIN public.properties p ON p.id = i.property_id WHERE i.id = defects.inspection_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "defects_update" ON public.defects FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.inspections i JOIN public.properties p ON p.id = i.property_id WHERE i.id = defects.inspection_id AND p.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.inspections i JOIN public.properties p ON p.id = i.property_id WHERE i.id = defects.inspection_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "defects_delete" ON public.defects FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.inspections i JOIN public.properties p ON p.id = i.property_id WHERE i.id = defects.inspection_id AND p.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "maintenance_request_activity_select" ON public.maintenance_request_activity FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.maintenance_requests mr JOIN public.properties p ON p.id = mr.property_id WHERE mr.id = maintenance_request_activity.request_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "maintenance_request_activity_insert" ON public.maintenance_request_activity FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.maintenance_requests mr JOIN public.properties p ON p.id = mr.property_id WHERE mr.id = maintenance_request_activity.request_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "maintenance_request_activity_update" ON public.maintenance_request_activity FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.maintenance_requests mr JOIN public.properties p ON p.id = mr.property_id WHERE mr.id = maintenance_request_activity.request_id AND p.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.maintenance_requests mr JOIN public.properties p ON p.id = mr.property_id WHERE mr.id = maintenance_request_activity.request_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "maintenance_request_activity_delete" ON public.maintenance_request_activity FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.maintenance_requests mr JOIN public.properties p ON p.id = mr.property_id WHERE mr.id = maintenance_request_activity.request_id AND p.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "meeting_unlock_requests_select" ON public.meeting_unlock_requests FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.project_meetings pm JOIN public.projects proj ON proj.id = pm.project_id JOIN public.properties pr ON pr.id = proj.property_id WHERE pm.id = meeting_unlock_requests.meeting_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "meeting_unlock_requests_insert" ON public.meeting_unlock_requests FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.project_meetings pm JOIN public.projects proj ON proj.id = pm.project_id JOIN public.properties pr ON pr.id = proj.property_id WHERE pm.id = meeting_unlock_requests.meeting_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "meeting_unlock_requests_update" ON public.meeting_unlock_requests FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.project_meetings pm JOIN public.projects proj ON proj.id = pm.project_id JOIN public.properties pr ON pr.id = proj.property_id WHERE pm.id = meeting_unlock_requests.meeting_id AND pr.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.project_meetings pm JOIN public.projects proj ON proj.id = pm.project_id JOIN public.properties pr ON pr.id = proj.property_id WHERE pm.id = meeting_unlock_requests.meeting_id AND pr.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "meeting_unlock_requests_delete" ON public.meeting_unlock_requests FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.project_meetings pm JOIN public.projects proj ON proj.id = pm.project_id JOIN public.properties pr ON pr.id = proj.property_id WHERE pm.id = meeting_unlock_requests.meeting_id AND pr.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "permit_requirements_select" ON public.permit_requirements FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.permits pe JOIN public.properties p ON p.id = pe.property_id WHERE pe.id = permit_requirements.permit_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "permit_requirements_insert" ON public.permit_requirements FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.permits pe JOIN public.properties p ON p.id = pe.property_id WHERE pe.id = permit_requirements.permit_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "permit_requirements_update" ON public.permit_requirements FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.permits pe JOIN public.properties p ON p.id = pe.property_id WHERE pe.id = permit_requirements.permit_id AND p.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.permits pe JOIN public.properties p ON p.id = pe.property_id WHERE pe.id = permit_requirements.permit_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "permit_requirements_delete" ON public.permit_requirements FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.permits pe JOIN public.properties p ON p.id = pe.property_id WHERE pe.id = permit_requirements.permit_id AND p.workspace_id = public.get_my_workspace_id()));

CREATE POLICY "permit_deliverables_select" ON public.permit_deliverables FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.permit_requirements pr2 JOIN public.permits pe ON pe.id = pr2.permit_id JOIN public.properties p ON p.id = pe.property_id WHERE pr2.id = permit_deliverables.requirement_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "permit_deliverables_insert" ON public.permit_deliverables FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.permit_requirements pr2 JOIN public.permits pe ON pe.id = pr2.permit_id JOIN public.properties p ON p.id = pe.property_id WHERE pr2.id = permit_deliverables.requirement_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "permit_deliverables_update" ON public.permit_deliverables FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.permit_requirements pr2 JOIN public.permits pe ON pe.id = pr2.permit_id JOIN public.properties p ON p.id = pe.property_id WHERE pr2.id = permit_deliverables.requirement_id AND p.workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.permit_requirements pr2 JOIN public.permits pe ON pe.id = pr2.permit_id JOIN public.properties p ON p.id = pe.property_id WHERE pr2.id = permit_deliverables.requirement_id AND p.workspace_id = public.get_my_workspace_id()));
CREATE POLICY "permit_deliverables_delete" ON public.permit_deliverables FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.permit_requirements pr2 JOIN public.permits pe ON pe.id = pr2.permit_id JOIN public.properties p ON p.id = pe.property_id WHERE pr2.id = permit_deliverables.requirement_id AND p.workspace_id = public.get_my_workspace_id()));

-- TIER 11: Messaging
CREATE POLICY "message_threads_select" ON public.message_threads FOR SELECT TO authenticated USING (auth.uid()::text = ANY(participant_ids::text[]) OR (public.has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND workspace_id = public.get_my_workspace_id())));
CREATE POLICY "message_threads_insert" ON public.message_threads FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = ANY(participant_ids::text[]));
CREATE POLICY "message_threads_update" ON public.message_threads FOR UPDATE TO authenticated USING (auth.uid()::text = ANY(participant_ids::text[])) WITH CHECK (auth.uid()::text = ANY(participant_ids::text[]));
CREATE POLICY "message_threads_delete" ON public.message_threads FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "thread_messages_select" ON public.thread_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.message_threads WHERE id = thread_messages.thread_id AND auth.uid()::text = ANY(participant_ids::text[])));
CREATE POLICY "thread_messages_insert" ON public.thread_messages FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.message_threads WHERE id = thread_messages.thread_id AND auth.uid()::text = ANY(participant_ids::text[])));
CREATE POLICY "thread_messages_update" ON public.thread_messages FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.message_threads WHERE id = thread_messages.thread_id AND auth.uid()::text = ANY(participant_ids::text[]))) WITH CHECK (EXISTS (SELECT 1 FROM public.message_threads WHERE id = thread_messages.thread_id AND auth.uid()::text = ANY(participant_ids::text[])));
CREATE POLICY "thread_messages_delete" ON public.thread_messages FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.message_threads WHERE id = thread_messages.thread_id AND auth.uid()::text = ANY(participant_ids::text[])));

CREATE POLICY "thread_read_status_select" ON public.thread_read_status FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "thread_read_status_insert" ON public.thread_read_status FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "thread_read_status_update" ON public.thread_read_status FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "thread_read_status_delete" ON public.thread_read_status FOR DELETE TO authenticated USING (user_id = auth.uid());

-- TIER 12: Platform global
CREATE POLICY "lw_schools_select" ON public.lw_schools FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "lw_schools_insert" ON public.lw_schools FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "lw_schools_update" ON public.lw_schools FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "lw_schools_delete" ON public.lw_schools FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "lw_courses_select" ON public.lw_courses FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "lw_courses_insert" ON public.lw_courses FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "lw_courses_update" ON public.lw_courses FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "lw_courses_delete" ON public.lw_courses FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "equipment_categories_select" ON public.equipment_categories FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "equipment_categories_insert" ON public.equipment_categories FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "equipment_categories_update" ON public.equipment_categories FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "equipment_categories_delete" ON public.equipment_categories FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "nspire_scoring_weights_select" ON public.nspire_scoring_weights FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "nspire_scoring_weights_insert" ON public.nspire_scoring_weights FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "nspire_scoring_weights_update" ON public.nspire_scoring_weights FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "nspire_scoring_weights_delete" ON public.nspire_scoring_weights FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "hud_sample_sizes_select" ON public.hud_sample_sizes FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "hud_sample_sizes_insert" ON public.hud_sample_sizes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "hud_sample_sizes_update" ON public.hud_sample_sizes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "hud_sample_sizes_delete" ON public.hud_sample_sizes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "asset_type_definitions_select" ON public.asset_type_definitions FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "asset_type_definitions_insert" ON public.asset_type_definitions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "asset_type_definitions_update" ON public.asset_type_definitions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "asset_type_definitions_delete" ON public.asset_type_definitions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "role_definitions_select" ON public.role_definitions FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "role_definitions_insert" ON public.role_definitions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "role_definitions_update" ON public.role_definitions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "role_definitions_delete" ON public.role_definitions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "role_permissions_select" ON public.role_permissions FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "role_permissions_insert" ON public.role_permissions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "role_permissions_update" ON public.role_permissions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "role_permissions_delete" ON public.role_permissions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "training_resources_select" ON public.training_resources FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "training_resources_insert" ON public.training_resources FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "training_resources_update" ON public.training_resources FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "training_resources_delete" ON public.training_resources FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- TIER 14: Documents
CREATE POLICY "document_folders_select" ON public.document_folders FOR SELECT TO authenticated USING (workspace_id = public.get_my_workspace_id() OR workspace_id IS NULL);
CREATE POLICY "document_folders_insert" ON public.document_folders FOR INSERT TO authenticated WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "document_folders_update" ON public.document_folders FOR UPDATE TO authenticated USING (workspace_id = public.get_my_workspace_id()) WITH CHECK (workspace_id = public.get_my_workspace_id());
CREATE POLICY "document_folders_delete" ON public.document_folders FOR DELETE TO authenticated USING (workspace_id = public.get_my_workspace_id());

CREATE POLICY "organization_documents_select" ON public.organization_documents FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = organization_documents.uploaded_by AND workspace_id = public.get_my_workspace_id()) OR (public.has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND workspace_id = public.get_my_workspace_id())));
CREATE POLICY "organization_documents_insert" ON public.organization_documents FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "organization_documents_update" ON public.organization_documents FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = organization_documents.uploaded_by AND workspace_id = public.get_my_workspace_id()) OR public.has_role(auth.uid(), 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "organization_documents_delete" ON public.organization_documents FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = organization_documents.uploaded_by AND workspace_id = public.get_my_workspace_id()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "training_share_links_select" ON public.training_share_links FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.training_completions WHERE id = training_share_links.completion_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "training_share_links_insert" ON public.training_share_links FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.training_completions WHERE id = training_share_links.completion_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "training_share_links_update" ON public.training_share_links FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.training_completions WHERE id = training_share_links.completion_id AND workspace_id = public.get_my_workspace_id())) WITH CHECK (EXISTS (SELECT 1 FROM public.training_completions WHERE id = training_share_links.completion_id AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "training_share_links_delete" ON public.training_share_links FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.training_completions WHERE id = training_share_links.completion_id AND workspace_id = public.get_my_workspace_id()));

-- activity_log (immutable audit log)
CREATE POLICY "activity_log_select" ON public.activity_log FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "activity_log_insert" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND workspace_id = public.get_my_workspace_id()));
CREATE POLICY "activity_log_update" ON public.activity_log FOR UPDATE TO authenticated USING (false);
CREATE POLICY "activity_log_delete" ON public.activity_log FOR DELETE TO authenticated USING (false);

-- ================================================================
-- STEP 6: PERFORMANCE INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_properties_workspace_id ON public.properties(workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_property_id ON public.projects(property_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_property_id ON public.work_orders(property_id);
CREATE INDEX IF NOT EXISTS idx_issues_property_id ON public.issues(property_id);
CREATE INDEX IF NOT EXISTS idx_units_property_id ON public.units(property_id);
CREATE INDEX IF NOT EXISTS idx_inspections_property_id ON public.inspections(property_id);
CREATE INDEX IF NOT EXISTS idx_daily_inspections_property_id ON public.daily_inspections(property_id);
CREATE INDEX IF NOT EXISTS idx_permits_property_id ON public.permits(property_id);
CREATE INDEX IF NOT EXISTS idx_assets_property_id ON public.assets(property_id);
CREATE INDEX IF NOT EXISTS idx_portal_access_portal_id ON public.portal_access(portal_id);
CREATE INDEX IF NOT EXISTS idx_portal_activity_portal_id ON public.portal_activity(portal_id);
CREATE INDEX IF NOT EXISTS idx_portal_document_requests_portal_id ON public.portal_document_requests(portal_id);
CREATE INDEX IF NOT EXISTS idx_portal_exclusions_portal_id ON public.portal_exclusions(portal_id);
CREATE INDEX IF NOT EXISTS idx_credential_alerts_credential_id ON public.credential_alerts(credential_id);
CREATE INDEX IF NOT EXISTS idx_credential_share_links_credential_id ON public.credential_share_links(credential_id);
CREATE INDEX IF NOT EXISTS idx_safety_incident_attachments_incident_id ON public.safety_incident_attachments(incident_id);
CREATE INDEX IF NOT EXISTS idx_profiles_workspace_id ON public.profiles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_workspace_id ON public.credentials(workspace_id);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_workspace_id ON public.safety_incidents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_client_portals_workspace_id ON public.client_portals(workspace_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_property_id ON public.maintenance_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_property_id ON public.inventory_transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_equipment_assets_workspace_id ON public.equipment_assets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_training_completions_workspace_id ON public.training_completions(workspace_id);

COMMIT;
