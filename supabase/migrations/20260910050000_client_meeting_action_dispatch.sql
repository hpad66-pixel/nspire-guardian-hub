-- Portfolio meeting action dispatch, team visibility, and audience-safe updates.
ALTER TABLE public.client_meeting_comments
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'client'
  CHECK (audience IN ('internal','client'));

CREATE OR REPLACE FUNCTION public.client_meeting_internal_assignee(p_client uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL
 AND (current_portal_kind()='main' OR is_super_admin())
 AND EXISTS (
   SELECT 1 FROM clients c
   JOIN profiles pr ON pr.workspace_id=c.workspace_id AND pr.user_id=auth.uid()
   WHERE c.id=p_client AND COALESCE(pr.status,'active')='active'
 )
 AND EXISTS (
   SELECT 1 FROM client_meeting_actions a
   WHERE a.client_id=p_client AND a.assignee_id=auth.uid() AND a.published
 );
$$;

CREATE OR REPLACE FUNCTION public.client_meeting_can_read(p_client uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT client_meeting_can_edit(p_client)
 OR client_meeting_internal_assignee(p_client)
 OR EXISTS (
   SELECT 1 FROM clients c WHERE c.id=p_client
   AND c.workspace_id=COALESCE(current_portal_tenant_id(),current_tenant_id())
   AND EXISTS (SELECT 1 FROM projects p WHERE p.client_id=c.id AND p.workspace_id=c.workspace_id
     AND p.deleted_at IS NULL AND owner_can_access_project(p.id))
 );
$$;

CREATE OR REPLACE FUNCTION public.client_meeting_bundle(p_client_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
 edit boolean:=client_meeting_can_edit(p_client_id);
 team boolean:=client_meeting_internal_assignee(p_client_id);
 result jsonb;
BEGIN
 IF NOT client_meeting_can_read(p_client_id) THEN RAISE EXCEPTION 'Client meeting access denied'; END IF;
 SELECT jsonb_build_object(
   'client',jsonb_build_object('id',id,'name',name),
   'canEdit',edit,
   'canAddInternalUpdates',(edit OR team),
   'viewerKind',CASE WHEN edit THEN 'administrator' WHEN team THEN 'assigned_team' ELSE 'client' END
 ) INTO result FROM clients WHERE id=p_client_id;
 RETURN result || jsonb_build_object(
 'projects',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',p.id,'name',p.name)) FROM projects p
   WHERE p.client_id=p_client_id AND p.deleted_at IS NULL AND
   (edit OR owner_can_access_project(p.id) OR (team AND EXISTS(SELECT 1 FROM client_meeting_actions a WHERE a.project_id=p.id AND a.assignee_id=auth.uid() AND a.published)))),'[]'::jsonb),
 'members',CASE WHEN edit THEN COALESCE((SELECT jsonb_agg(jsonb_build_object('id',user_id,'name',COALESCE(full_name,email))) FROM profiles
   WHERE workspace_id=(SELECT workspace_id FROM clients WHERE id=p_client_id) AND COALESCE(status,'active')='active'),'[]'::jsonb) ELSE '[]'::jsonb END,
 'meetings',CASE WHEN edit THEN COALESCE((SELECT jsonb_agg(to_jsonb(m) ORDER BY meeting_date DESC,created_at DESC) FROM client_meetings m WHERE client_id=p_client_id),'[]'::jsonb) ELSE '[]'::jsonb END,
 'publications',COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.published_at DESC) FROM client_meeting_publications p WHERE p.client_id=p_client_id
   AND (edit OR (team AND EXISTS(SELECT 1 FROM client_meeting_actions a WHERE a.meeting_id=p.meeting_id AND a.assignee_id=auth.uid() AND a.published))
     OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(p.snapshot->'project_ids') x WHERE NOT owner_can_access_project(x::uuid)))),'[]'::jsonb),
 'actions',COALESCE((SELECT jsonb_agg((CASE WHEN edit THEN to_jsonb(a) ELSE to_jsonb(a)-'source_quote'-'source_locator' END)
   ||jsonb_build_object('state',w.state,'step',w.current_step) ORDER BY a.created_at)
   FROM client_meeting_actions a LEFT JOIN workflow_instances w ON w.id=a.workflow_id WHERE a.client_id=p_client_id
   AND (edit OR (a.published AND ((team AND a.assignee_id=auth.uid()) OR owner_can_access_project(a.project_id))))),'[]'::jsonb),
 'comments',COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.created_at)
   FROM client_meeting_comments c JOIN client_meeting_actions a ON a.id=c.action_id WHERE c.client_id=p_client_id
   AND (edit OR (a.published AND ((team AND a.assignee_id=auth.uid()) OR owner_can_access_project(a.project_id))))
   AND (edit OR c.audience='client' OR (team AND a.assignee_id=auth.uid()))),'[]'::jsonb),
 'delivery',CASE WHEN edit THEN (SELECT to_jsonb(s) FROM client_meeting_delivery_settings s WHERE client_id=p_client_id) ELSE NULL END,
 'deliveries',CASE WHEN edit THEN COALESCE((SELECT jsonb_agg(to_jsonb(d)) FROM client_meeting_deliveries d WHERE client_id=p_client_id),'[]'::jsonb) ELSE '[]'::jsonb END);
END $$;

CREATE OR REPLACE FUNCTION public.client_meeting_add_update(
 p_client_id uuid,p_action_id uuid,p_body text,p_audience text DEFAULT 'client')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a client_meeting_actions; tid uuid; name text; internal_ok boolean;
BEGIN
 IF auth.uid() IS NULL OR NOT client_meeting_can_read(p_client_id) THEN RAISE EXCEPTION 'Client meeting access denied'; END IF;
 IF p_audience NOT IN ('internal','client') OR length(trim(COALESCE(p_body,'')))=0 THEN RAISE EXCEPTION 'Add an update and choose its audience'; END IF;
 SELECT * INTO a FROM client_meeting_actions WHERE id=p_action_id AND client_id=p_client_id;
 IF a.id IS NULL THEN RAISE EXCEPTION 'Action not found'; END IF;
 internal_ok:=client_meeting_can_edit(p_client_id) OR (client_meeting_internal_assignee(p_client_id) AND a.assignee_id=auth.uid());
 IF p_audience='internal' AND NOT internal_ok THEN RAISE EXCEPTION 'Only the project team can add internal instructions'; END IF;
 IF p_audience='client' AND NOT a.published THEN RAISE EXCEPTION 'Release the action before publishing a client update'; END IF;
 IF NOT client_meeting_can_edit(p_client_id) AND NOT (owner_can_access_project(a.project_id) OR a.assignee_id=auth.uid()) THEN RAISE EXCEPTION 'Action not accessible'; END IF;
 SELECT workspace_id INTO tid FROM clients WHERE id=p_client_id;
 SELECT COALESCE(full_name,email,'Portal member') INTO name FROM profiles WHERE user_id=auth.uid() LIMIT 1;
 INSERT INTO client_meeting_comments(tenant_id,client_id,action_id,author_id,author_name,body,audience)
 VALUES(tid,p_client_id,a.id,auth.uid(),COALESCE(name,'Portal member'),trim(p_body),p_audience);
 RETURN jsonb_build_object('id',a.id);
END $$;

CREATE OR REPLACE FUNCTION public.client_meeting_submit_completion(p_client_id uuid,p_action_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a client_meeting_actions; w workflow_instances; tid uuid; name text; audience text;
BEGIN
 IF auth.uid() IS NULL OR NOT client_meeting_can_read(p_client_id) THEN RAISE EXCEPTION 'Client meeting access denied'; END IF;
 SELECT * INTO a FROM client_meeting_actions WHERE id=p_action_id AND client_id=p_client_id FOR UPDATE;
 IF a.id IS NULL OR NOT a.published OR a.assignee_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Only the assigned person may submit completion'; END IF;
 SELECT * INTO w FROM workflow_instances WHERE id=a.workflow_id FOR UPDATE;
 IF w.current_step<>1 OR w.state<>'open' THEN RAISE EXCEPTION 'Completion is already submitted or confirmed'; END IF;
 PERFORM advance_workflow(a.workflow_id,'submit','Completion submitted');
 SELECT workspace_id INTO tid FROM clients WHERE id=p_client_id;
 SELECT COALESCE(full_name,email,'Portal member') INTO name FROM profiles WHERE user_id=auth.uid() LIMIT 1;
 audience:=CASE WHEN client_meeting_internal_assignee(p_client_id) THEN 'internal' ELSE 'client' END;
 INSERT INTO client_meeting_comments(tenant_id,client_id,action_id,author_id,author_name,body,audience)
 VALUES(tid,p_client_id,a.id,auth.uid(),COALESCE(name,'Portal member'),'Completion submitted for APAS review.',audience);
 RETURN jsonb_build_object('id',a.id);
END $$;

CREATE OR REPLACE FUNCTION public.client_meeting_bulk_actions(
 p_client_id uuid,p_meeting_id uuid,p_actions jsonb,p_assignee_id uuid DEFAULT NULL,
 p_due_date date DEFAULT NULL,p_instruction text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE item jsonb; created jsonb; ids jsonb:='[]'::jsonb; assignee_name text:=''; tid uuid; action_id uuid;
BEGIN
 IF NOT client_meeting_can_edit(p_client_id) THEN RAISE EXCEPTION 'Meeting edit permission required'; END IF;
 IF jsonb_typeof(p_actions)<>'array' OR jsonb_array_length(p_actions)=0 OR jsonb_array_length(p_actions)>50 THEN RAISE EXCEPTION 'Select between 1 and 50 actions'; END IF;
 IF NOT EXISTS(SELECT 1 FROM client_meetings WHERE id=p_meeting_id AND client_id=p_client_id) THEN RAISE EXCEPTION 'Meeting not found'; END IF;
 SELECT workspace_id INTO tid FROM clients WHERE id=p_client_id;
 IF p_assignee_id IS NOT NULL THEN
   SELECT COALESCE(full_name,email,'') INTO assignee_name FROM profiles WHERE user_id=p_assignee_id AND workspace_id=tid AND COALESCE(status,'active')='active';
   IF NOT FOUND THEN RAISE EXCEPTION 'Assignee is not an active workspace member'; END IF;
 END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_actions) LOOP
   IF length(trim(COALESCE(item->>'title','')))=0 OR NOT EXISTS(SELECT 1 FROM projects p WHERE p.id=(item->>'project_id')::uuid AND p.client_id=p_client_id AND p.deleted_at IS NULL) THEN
     RAISE EXCEPTION 'Every selected action needs a title and client project';
   END IF;
   created:=client_meeting_command(p_client_id,'action',jsonb_build_object(
     'meeting_id',p_meeting_id,'project_id',item->>'project_id','title',item->>'title',
     'assignee_id',COALESCE(p_assignee_id::text,''),'assignee_name',assignee_name,
     'ball_in_court',CASE WHEN p_assignee_id IS NULL THEN COALESCE(item->>'ball_in_court','') ELSE assignee_name END,
     'due_date',COALESCE(p_due_date::text,''),'source_quote',COALESCE(item->>'source_quote',''),
     'source_locator',COALESCE(item->>'source_locator','')));
   action_id:=(created->>'id')::uuid;
   ids:=ids||jsonb_build_array(action_id);
   IF length(trim(COALESCE(p_instruction,'')))>0 THEN
     INSERT INTO client_meeting_comments(tenant_id,client_id,action_id,author_id,author_name,body,audience)
     VALUES(tid,p_client_id,action_id,auth.uid(),'Project team',trim(p_instruction),'internal');
   END IF;
 END LOOP;
 RETURN jsonb_build_object('ids',ids,'count',jsonb_array_length(ids));
END $$;

REVOKE ALL ON FUNCTION client_meeting_internal_assignee(uuid),client_meeting_add_update(uuid,uuid,text,text),client_meeting_submit_completion(uuid,uuid),client_meeting_bulk_actions(uuid,uuid,jsonb,uuid,date,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION client_meeting_internal_assignee(uuid),client_meeting_add_update(uuid,uuid,text,text),client_meeting_submit_completion(uuid,uuid),client_meeting_bulk_actions(uuid,uuid,jsonb,uuid,date,text) TO authenticated;
