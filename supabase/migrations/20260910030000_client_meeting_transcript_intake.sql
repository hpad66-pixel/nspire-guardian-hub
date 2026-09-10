-- Recoverable journal management and private transcript source intake.
ALTER TABLE public.client_meetings ADD COLUMN archived_at timestamptz, ADD COLUMN archived_by uuid REFERENCES auth.users(id);
ALTER TABLE public.client_meeting_publications ADD COLUMN archived_at timestamptz;
ALTER TABLE public.client_meeting_actions ADD COLUMN archived_at timestamptz;
ALTER TABLE public.report_emails ADD COLUMN client_meeting_publication_id uuid REFERENCES public.client_meeting_publications(id);
ALTER TABLE public.report_emails DROP CONSTRAINT report_reference_check;
ALTER TABLE public.report_emails ADD CONSTRAINT report_reference_check CHECK (
 source_module='mailbox' OR report_id IS NOT NULL OR daily_inspection_id IS NOT NULL OR project_id IS NOT NULL OR property_id IS NOT NULL OR proposal_id IS NOT NULL OR work_order_id IS NOT NULL OR client_meeting_publication_id IS NOT NULL
);

CREATE TABLE public.client_meeting_sources (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
 client_id uuid NOT NULL REFERENCES public.clients(id), meeting_id uuid NOT NULL REFERENCES public.client_meetings(id),
 original_name text NOT NULL, mime_type text NOT NULL DEFAULT 'application/octet-stream', byte_size bigint NOT NULL CHECK(byte_size BETWEEN 1 AND 26214400),
 storage_path text NOT NULL UNIQUE, sha256 text NOT NULL, extracted_text text NOT NULL DEFAULT '', manifest jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(manifest)='array'),
 uploaded_by uuid NOT NULL REFERENCES auth.users(id), archived_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(meeting_id,sha256)
);
CREATE TABLE public.client_meeting_email_dismissals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
 client_id uuid NOT NULL REFERENCES public.clients(id), email_id uuid NOT NULL REFERENCES public.report_emails(id), dismissed_by uuid NOT NULL REFERENCES auth.users(id),
 dismissed_at timestamptz NOT NULL DEFAULT now(), UNIQUE(client_id,email_id)
);
ALTER TABLE public.client_meeting_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_meeting_email_dismissals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.client_meeting_sources,public.client_meeting_email_dismissals FROM anon,authenticated;
GRANT SELECT ON public.client_meeting_sources,public.client_meeting_email_dismissals TO authenticated;
CREATE POLICY client_meeting_sources_staff_select ON public.client_meeting_sources FOR SELECT TO authenticated USING(client_meeting_can_edit(client_id) AND (tenant_id=current_tenant_id() OR is_super_admin()));
CREATE POLICY client_meeting_email_dismissals_staff_select ON public.client_meeting_email_dismissals FOR SELECT TO authenticated USING(client_meeting_can_edit(client_id) AND (tenant_id=current_tenant_id() OR is_super_admin()));

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES(
 'client-meeting-sources','client-meeting-sources',false,26214400,
 ARRAY['application/zip','application/x-zip-compressed','text/plain','text/csv','text/markdown','text/html','application/json','application/xml','text/xml','text/vtt','application/rtf','message/rfc822','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT(id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.guard_client_meeting_source()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM client_meetings m JOIN clients c ON c.id=m.client_id WHERE m.id=NEW.meeting_id AND m.client_id=NEW.client_id AND m.tenant_id=NEW.tenant_id AND c.workspace_id=NEW.tenant_id)
 THEN RAISE EXCEPTION 'Meeting source boundary mismatch'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER client_meeting_source_boundary BEFORE INSERT OR UPDATE ON client_meeting_sources FOR EACH ROW EXECUTE FUNCTION guard_client_meeting_source();

CREATE OR REPLACE FUNCTION public.guard_client_meeting_email_dismissal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM clients c JOIN client_meeting_publications p ON p.client_id=c.id JOIN report_emails e ON e.client_meeting_publication_id=p.id
   WHERE c.id=NEW.client_id AND c.workspace_id=NEW.tenant_id AND e.id=NEW.email_id AND e.source_module='client-meetings')
 THEN RAISE EXCEPTION 'Meeting email boundary mismatch'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER client_meeting_email_dismissal_boundary BEFORE INSERT OR UPDATE ON client_meeting_email_dismissals FOR EACH ROW EXECUTE FUNCTION guard_client_meeting_email_dismissal();

CREATE OR REPLACE FUNCTION public.client_meeting_manage_bundle(p_client uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT client_meeting_can_edit(p_client) THEN RAISE EXCEPTION 'Meeting edit permission required'; END IF;
 RETURN jsonb_build_object(
  'sources',COALESCE((SELECT jsonb_agg(to_jsonb(s)-'storage_path'-'extracted_text' ORDER BY created_at) FROM client_meeting_sources s WHERE client_id=p_client AND archived_at IS NULL),'[]'::jsonb),
  'archivedMeetings',COALESCE((SELECT jsonb_agg(to_jsonb(m) ORDER BY archived_at DESC) FROM client_meetings m WHERE client_id=p_client AND archived_at IS NOT NULL),'[]'::jsonb),
  'archivedSources',COALESCE((SELECT jsonb_agg(to_jsonb(s)-'storage_path'-'extracted_text' ORDER BY archived_at DESC) FROM client_meeting_sources s WHERE client_id=p_client AND archived_at IS NOT NULL),'[]'::jsonb),
  'emails',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',e.id,'report_id',e.client_meeting_publication_id,'subject',e.subject,'recipients',e.recipients,'sent_at',e.sent_at,'status',e.status) ORDER BY e.sent_at DESC)
    FROM report_emails e JOIN client_meeting_publications p ON p.id=e.client_meeting_publication_id
    WHERE p.client_id=p_client AND e.source_module='client-meetings' AND NOT EXISTS(SELECT 1 FROM client_meeting_email_dismissals d WHERE d.client_id=p_client AND d.email_id=e.id)),'[]'::jsonb),
  'dismissedEmails',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',e.id,'report_id',e.client_meeting_publication_id,'subject',e.subject,'recipients',e.recipients,'sent_at',e.sent_at,'status',e.status) ORDER BY e.sent_at DESC)
    FROM report_emails e JOIN client_meeting_publications p ON p.id=e.client_meeting_publication_id JOIN client_meeting_email_dismissals d ON d.email_id=e.id AND d.client_id=p_client WHERE p.client_id=p_client AND e.source_module='client-meetings'),'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.client_meeting_manage_bundle(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.client_meeting_manage_bundle(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.client_meeting_manage_command(p_client uuid,p_operation text,p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE tid uuid; uid uuid:=auth.uid();
BEGIN
 IF NOT client_meeting_can_edit(p_client) THEN RAISE EXCEPTION 'Meeting edit permission required'; END IF;
 SELECT workspace_id INTO tid FROM clients WHERE id=p_client;
 IF p_operation='archive_meeting' THEN
  UPDATE client_meetings SET archived_at=now(),archived_by=uid WHERE id=p_id AND client_id=p_client;
  IF NOT FOUND THEN RAISE EXCEPTION 'Meeting not found'; END IF;
  UPDATE client_meeting_publications SET archived_at=now() WHERE meeting_id=p_id AND client_id=p_client;
  UPDATE client_meeting_actions SET archived_at=now() WHERE meeting_id=p_id AND client_id=p_client;
 ELSIF p_operation='restore_meeting' THEN
  UPDATE client_meetings SET archived_at=NULL,archived_by=NULL WHERE id=p_id AND client_id=p_client;
  IF NOT FOUND THEN RAISE EXCEPTION 'Meeting not found'; END IF;
  UPDATE client_meeting_publications SET archived_at=NULL WHERE meeting_id=p_id AND client_id=p_client;
  UPDATE client_meeting_actions SET archived_at=NULL WHERE meeting_id=p_id AND client_id=p_client;
 ELSIF p_operation='archive_source' THEN
  UPDATE client_meeting_sources SET archived_at=now() WHERE id=p_id AND client_id=p_client;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transcript source not found'; END IF;
 ELSIF p_operation='restore_source' THEN
  UPDATE client_meeting_sources SET archived_at=NULL WHERE id=p_id AND client_id=p_client;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transcript source not found'; END IF;
 ELSIF p_operation='dismiss_email' THEN
  IF NOT EXISTS(SELECT 1 FROM report_emails e JOIN client_meeting_publications p ON p.id=e.client_meeting_publication_id WHERE e.id=p_id AND p.client_id=p_client AND e.source_module='client-meetings') THEN RAISE EXCEPTION 'Email not found'; END IF;
  INSERT INTO client_meeting_email_dismissals(tenant_id,client_id,email_id,dismissed_by) VALUES(tid,p_client,p_id,uid) ON CONFLICT(client_id,email_id) DO NOTHING;
 ELSIF p_operation='restore_email' THEN
  DELETE FROM client_meeting_email_dismissals WHERE client_id=p_client AND email_id=p_id;
 ELSE RAISE EXCEPTION 'Unsupported meeting management command'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.client_meeting_manage_command(uuid,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.client_meeting_manage_command(uuid,text,uuid) TO authenticated;

-- Keep archived records out of both staff and owner bundles. Staff retrieve the
-- recoverable journal separately through client_meeting_manage_bundle().
CREATE OR REPLACE FUNCTION public.client_meeting_bundle(p_client_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE edit boolean:=client_meeting_can_edit(p_client_id); result jsonb;
BEGIN
 IF NOT client_meeting_can_read(p_client_id) THEN RAISE EXCEPTION 'Client meeting access denied'; END IF;
 SELECT jsonb_build_object('client',jsonb_build_object('id',id,'name',name),'canEdit',edit) INTO result FROM clients WHERE id=p_client_id;
 RETURN result || jsonb_build_object(
 'projects',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'name',name)) FROM projects WHERE client_id=p_client_id AND deleted_at IS NULL AND (edit OR owner_can_access_project(id))),'[]'::jsonb),
 'members',CASE WHEN edit THEN COALESCE((SELECT jsonb_agg(jsonb_build_object('id',user_id,'name',COALESCE(full_name,email))) FROM profiles WHERE workspace_id=(SELECT workspace_id FROM clients WHERE id=p_client_id) AND COALESCE(status,'active')='active'),'[]'::jsonb) ELSE '[]'::jsonb END,
 'meetings',CASE WHEN edit THEN COALESCE((SELECT jsonb_agg(to_jsonb(m) ORDER BY meeting_date DESC,created_at DESC) FROM client_meetings m WHERE client_id=p_client_id AND archived_at IS NULL),'[]'::jsonb) ELSE '[]'::jsonb END,
 'publications',COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY published_at DESC) FROM client_meeting_publications p WHERE client_id=p_client_id AND archived_at IS NULL AND (edit OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(p.snapshot->'project_ids') x WHERE NOT owner_can_access_project(x::uuid)))),'[]'::jsonb),
 'actions',COALESCE((SELECT jsonb_agg((CASE WHEN edit THEN to_jsonb(a) ELSE to_jsonb(a)-'source_quote'-'source_locator' END)||jsonb_build_object('state',w.state,'step',w.current_step) ORDER BY a.created_at) FROM client_meeting_actions a LEFT JOIN workflow_instances w ON w.id=a.workflow_id WHERE a.client_id=p_client_id AND a.archived_at IS NULL AND (edit OR (a.published AND owner_can_access_project(a.project_id)))),'[]'::jsonb),
 'comments',COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.created_at) FROM client_meeting_comments c JOIN client_meeting_actions a ON a.id=c.action_id WHERE c.client_id=p_client_id AND a.archived_at IS NULL AND (edit OR (a.published AND owner_can_access_project(a.project_id)))),'[]'::jsonb),
 'delivery',CASE WHEN edit THEN (SELECT to_jsonb(s) FROM client_meeting_delivery_settings s WHERE client_id=p_client_id) ELSE NULL END,
 'deliveries',CASE WHEN edit THEN COALESCE((SELECT jsonb_agg(to_jsonb(d)) FROM client_meeting_deliveries d WHERE client_id=p_client_id),'[]'::jsonb) ELSE '[]'::jsonb END);
END $$;
