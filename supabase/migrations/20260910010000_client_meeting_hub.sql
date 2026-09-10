-- Client-level meeting records. Writes go through checked commands, not table grants.
CREATE OR REPLACE FUNCTION public.client_meeting_can_edit(p_client uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS (
 SELECT 1 FROM clients c WHERE c.id=p_client
 AND (c.workspace_id=current_tenant_id() OR is_super_admin())
 AND (current_portal_kind()='main' OR is_super_admin())
 AND (is_super_admin() OR (can_manage_client_projects(auth.uid(),c.id)
 AND public.can(auth.uid(),'meetings','edit','standard'))));
$$;
CREATE OR REPLACE FUNCTION public.client_meeting_can_read(p_client uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT client_meeting_can_edit(p_client) OR EXISTS (
 SELECT 1 FROM clients c WHERE c.id=p_client
 AND c.workspace_id=COALESCE(current_portal_tenant_id(),current_tenant_id())
 AND EXISTS (SELECT 1 FROM projects p WHERE p.client_id=c.id AND p.workspace_id=c.workspace_id
 AND p.deleted_at IS NULL AND owner_can_access_project(p.id)));
$$;

CREATE TABLE public.client_meetings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 client_id uuid NOT NULL REFERENCES clients(id),
 title text NOT NULL CHECK(length(trim(title))>0), meeting_date date NOT NULL,
 attendees text NOT NULL DEFAULT '', transcript text NOT NULL DEFAULT '',
 project_ids uuid[] NOT NULL DEFAULT '{}',
 sections jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(sections)='array'),
 revision integer NOT NULL DEFAULT 1, created_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.client_meeting_publications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 client_id uuid NOT NULL REFERENCES clients(id), meeting_id uuid NOT NULL REFERENCES client_meetings(id),
 revision integer NOT NULL, snapshot jsonb NOT NULL,
 published_by uuid NOT NULL REFERENCES auth.users(id), published_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(meeting_id,revision)
);
CREATE TABLE public.client_meeting_actions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 client_id uuid NOT NULL REFERENCES clients(id), meeting_id uuid NOT NULL REFERENCES client_meetings(id),
 project_id uuid NOT NULL REFERENCES projects(id), title text NOT NULL CHECK(length(trim(title))>0),
 assignee_id uuid REFERENCES auth.users(id), assignee_name text NOT NULL DEFAULT '',
 ball_in_court text NOT NULL DEFAULT '', due_date date, source_quote text NOT NULL DEFAULT '',
 source_locator text NOT NULL DEFAULT '', published boolean NOT NULL DEFAULT false,
 workflow_id uuid REFERENCES workflow_instances(id), revision integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.client_meeting_comments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 client_id uuid NOT NULL REFERENCES clients(id), action_id uuid NOT NULL REFERENCES client_meeting_actions(id),
 author_id uuid NOT NULL REFERENCES auth.users(id), author_name text NOT NULL,
 body text NOT NULL CHECK(length(trim(body))>0), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.client_meeting_delivery_settings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 client_id uuid NOT NULL UNIQUE REFERENCES clients(id), enabled boolean NOT NULL DEFAULT false,
 weekday integer NOT NULL DEFAULT 5 CHECK(weekday BETWEEN 0 AND 6),
 hour integer NOT NULL DEFAULT 9 CHECK(hour BETWEEN 0 AND 23), timezone text NOT NULL DEFAULT 'America/New_York',
 recipients text[] NOT NULL DEFAULT '{}', cc text[] NOT NULL DEFAULT '{}', bcc text[] NOT NULL DEFAULT '{}',
 configured_by uuid NOT NULL REFERENCES auth.users(id), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.client_meeting_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 client_id uuid NOT NULL REFERENCES clients(id), publication_id uuid NOT NULL REFERENCES client_meeting_publications(id),
 status text NOT NULL CHECK(status IN ('sending','sent','failed')), provider_id text, error text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(publication_id)
);
CREATE INDEX ON client_meetings(client_id,meeting_date DESC);
CREATE INDEX ON client_meeting_publications(client_id,published_at DESC);
CREATE INDEX ON client_meeting_actions(client_id,created_at);
CREATE INDEX ON client_meeting_comments(action_id,created_at);

CREATE OR REPLACE FUNCTION public.guard_client_meeting_boundary()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid; tid uuid;
BEGIN
 SELECT workspace_id INTO tid FROM clients WHERE id=NEW.client_id;
 IF tid IS DISTINCT FROM NEW.tenant_id THEN RAISE EXCEPTION 'Client workspace mismatch'; END IF;
 IF TG_TABLE_NAME IN ('client_meeting_publications','client_meeting_actions') THEN
   SELECT client_id INTO cid FROM client_meetings WHERE id=NEW.meeting_id AND tenant_id=NEW.tenant_id;
   IF cid IS DISTINCT FROM NEW.client_id THEN RAISE EXCEPTION 'Meeting client mismatch'; END IF;
 END IF;
 IF TG_TABLE_NAME='client_meeting_actions' THEN
   IF NOT EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND client_id=NEW.client_id
     AND workspace_id=NEW.tenant_id AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Project client mismatch'; END IF;
   IF NEW.assignee_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM profiles WHERE user_id=NEW.assignee_id
     AND workspace_id=NEW.tenant_id AND COALESCE(status,'active')='active') THEN RAISE EXCEPTION 'Assignee workspace mismatch'; END IF;
 END IF;
 IF TG_TABLE_NAME='client_meetings' THEN
   IF EXISTS(SELECT 1 FROM unnest(NEW.project_ids) x WHERE NOT EXISTS(SELECT 1 FROM projects p
     WHERE p.id=x AND p.client_id=NEW.client_id AND p.workspace_id=NEW.tenant_id AND p.deleted_at IS NULL))
     THEN RAISE EXCEPTION 'Meeting projects must belong to this client'; END IF;
 END IF;
 IF TG_TABLE_NAME='client_meeting_comments' THEN
   SELECT client_id INTO cid FROM client_meeting_actions WHERE id=NEW.action_id AND tenant_id=NEW.tenant_id;
   IF cid IS DISTINCT FROM NEW.client_id THEN RAISE EXCEPTION 'Action client mismatch'; END IF;
 END IF;
 IF TG_TABLE_NAME='client_meeting_deliveries' THEN
   SELECT client_id INTO cid FROM client_meeting_publications WHERE id=NEW.publication_id AND tenant_id=NEW.tenant_id;
   IF cid IS DISTINCT FROM NEW.client_id THEN RAISE EXCEPTION 'Publication client mismatch'; END IF;
 END IF;
 RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['client_meetings','client_meeting_publications','client_meeting_actions','client_meeting_comments','client_meeting_delivery_settings','client_meeting_deliveries'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',t);
 EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
 EXECUTE format('CREATE TRIGGER boundary BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_client_meeting_boundary()',t);
 EXECUTE format('CREATE POLICY staff_select ON public.%I FOR SELECT TO authenticated USING ((tenant_id=current_tenant_id() OR is_super_admin()) AND client_meeting_can_edit(client_id))',t);
 END LOOP;
END $$;
CREATE POLICY portal_select ON client_meeting_publications FOR SELECT TO authenticated USING(client_meeting_can_read(client_id) AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(snapshot->'project_ids') x WHERE NOT owner_can_access_project(x::uuid)));
-- External clients use the curated bundle, which omits internal source quotes.

-- Prevent the generic workflow table/API from bypassing meeting-action permissions.
CREATE OR REPLACE FUNCTION public.guard_client_meeting_workflow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a client_meeting_actions;
BEGIN
 IF OLD.record_type <> 'client_meeting_action' AND NEW.record_type <> 'client_meeting_action' THEN RETURN NEW; END IF;
 SELECT * INTO a FROM client_meeting_actions WHERE id=OLD.record_id;
 IF NEW.record_id IS DISTINCT FROM OLD.record_id OR NEW.record_type<>OLD.record_type
 OR NEW.tenant_id<>OLD.tenant_id OR NEW.definition_id<>OLD.definition_id OR NEW.project_id IS DISTINCT FROM OLD.project_id
 THEN RAISE EXCEPTION 'Immutable action workflow identity'; END IF;
 IF client_meeting_can_edit(a.client_id) THEN RETURN NEW; END IF;
 IF a.published AND client_meeting_can_read(a.client_id) AND a.assignee_id=auth.uid()
 AND OLD.state='open' AND NEW.state='open' AND OLD.current_step=1 AND NEW.current_step=2
 THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'Only the assigned client can submit; only staff can confirm completion';
END $$;
CREATE TRIGGER client_meeting_workflow_guard BEFORE UPDATE ON workflow_instances
FOR EACH ROW EXECUTE FUNCTION guard_client_meeting_workflow();

CREATE OR REPLACE FUNCTION public.client_meeting_bundle(p_client_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE edit boolean:=client_meeting_can_edit(p_client_id); result jsonb;
BEGIN
 IF NOT client_meeting_can_read(p_client_id) THEN RAISE EXCEPTION 'Client meeting access denied'; END IF;
 SELECT jsonb_build_object('client',jsonb_build_object('id',id,'name',name),'canEdit',edit) INTO result FROM clients WHERE id=p_client_id;
 RETURN result || jsonb_build_object(
 'projects',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'name',name)) FROM projects WHERE client_id=p_client_id AND deleted_at IS NULL AND (edit OR owner_can_access_project(id))),'[]'::jsonb),
 'members',CASE WHEN edit THEN COALESCE((SELECT jsonb_agg(jsonb_build_object('id',user_id,'name',COALESCE(full_name,email))) FROM profiles WHERE workspace_id=(SELECT workspace_id FROM clients WHERE id=p_client_id) AND COALESCE(status,'active')='active'),'[]'::jsonb) ELSE '[]'::jsonb END,
 'meetings',CASE WHEN edit THEN COALESCE((SELECT jsonb_agg(to_jsonb(m) ORDER BY meeting_date DESC,created_at DESC) FROM client_meetings m WHERE client_id=p_client_id),'[]'::jsonb) ELSE '[]'::jsonb END,
 'publications',COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY published_at DESC) FROM client_meeting_publications p WHERE client_id=p_client_id
 AND (edit OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(p.snapshot->'project_ids') x WHERE NOT owner_can_access_project(x::uuid)))),'[]'::jsonb),
 'actions',COALESCE((SELECT jsonb_agg((CASE WHEN edit THEN to_jsonb(a) ELSE to_jsonb(a)-'source_quote'-'source_locator' END)||jsonb_build_object('state',w.state,'step',w.current_step) ORDER BY a.created_at) FROM client_meeting_actions a LEFT JOIN workflow_instances w ON w.id=a.workflow_id WHERE a.client_id=p_client_id AND (edit OR (a.published AND owner_can_access_project(a.project_id)))),'[]'::jsonb),
 'comments',COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.created_at) FROM client_meeting_comments c JOIN client_meeting_actions a ON a.id=c.action_id WHERE c.client_id=p_client_id AND (edit OR (a.published AND owner_can_access_project(a.project_id)))),'[]'::jsonb),
 'delivery',CASE WHEN edit THEN (SELECT to_jsonb(s) FROM client_meeting_delivery_settings s WHERE client_id=p_client_id) ELSE NULL END,
 'deliveries',CASE WHEN edit THEN COALESCE((SELECT jsonb_agg(to_jsonb(d)) FROM client_meeting_deliveries d WHERE client_id=p_client_id),'[]'::jsonb) ELSE '[]'::jsonb END);
END $$;

CREATE OR REPLACE FUNCTION public.client_meeting_command(p_client_id uuid,p_operation text,p_payload jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m client_meetings; a client_meeting_actions; w workflow_instances;
 tid uuid; uid uuid:=auth.uid(); rid uuid; def uuid; expected integer; sec jsonb; result jsonb; name text;
BEGIN
 IF uid IS NULL OR NOT client_meeting_can_read(p_client_id) THEN RAISE EXCEPTION 'Client meeting access denied'; END IF;
 IF p_operation NOT IN ('comment','submit') AND NOT client_meeting_can_edit(p_client_id) THEN RAISE EXCEPTION 'Meeting edit permission required'; END IF;
 SELECT workspace_id INTO tid FROM clients WHERE id=p_client_id;
 IF p_operation='create' THEN
   rid:=COALESCE(NULLIF(p_payload->>'id','')::uuid,gen_random_uuid());
   INSERT INTO client_meetings(id,tenant_id,client_id,title,meeting_date,created_by)
   VALUES(rid,tid,p_client_id,COALESCE(NULLIF(trim(p_payload->>'title'),''),'Portfolio coordination'),COALESCE(NULLIF(p_payload->>'meeting_date','')::date,current_date),uid);
   RETURN jsonb_build_object('id',rid);
 ELSIF p_operation IN ('save','publish') THEN
   SELECT * INTO m FROM client_meetings WHERE id=(p_payload->>'id')::uuid AND client_id=p_client_id FOR UPDATE;
   IF m.id IS NULL THEN RAISE EXCEPTION 'Meeting not found'; END IF;
   IF m.revision IS DISTINCT FROM (p_payload->>'revision')::integer THEN RAISE EXCEPTION 'This meeting changed. Reload before saving your edits.'; END IF;
   IF p_operation='save' THEN
     sec:=COALESCE(p_payload->'sections','[]');
     IF jsonb_typeof(sec)<>'array' OR EXISTS(SELECT 1 FROM jsonb_array_elements(sec) x WHERE jsonb_typeof(x)<>'object' OR x->>'heading' IS NULL OR x->>'text' IS NULL OR COALESCE(x->>'basis','') NOT IN ('verified','interpretation','needs_review')) THEN RAISE EXCEPTION 'Invalid report sections'; END IF;
     UPDATE client_meetings SET title=trim(p_payload->>'title'),meeting_date=(p_payload->>'meeting_date')::date,
       attendees=COALESCE(p_payload->>'attendees',''),transcript=COALESCE(p_payload->>'transcript',''),sections=sec,
       project_ids=ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_payload->'project_ids','[]')))::uuid[],revision=revision+1,updated_at=now()
     WHERE id=m.id RETURNING revision INTO expected;
     RETURN jsonb_build_object('id',m.id,'revision',expected);
   END IF;
   IF cardinality(m.project_ids)=0 OR jsonb_array_length(m.sections)=0 THEN RAISE EXCEPTION 'Select projects and write the report before release'; END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(m.sections) x WHERE x->>'basis'='needs_review') THEN RAISE EXCEPTION 'Review all flagged sections before release'; END IF;
   IF EXISTS(SELECT 1 FROM client_meeting_actions WHERE meeting_id=m.id AND NOT project_id=ANY(m.project_ids)) THEN RAISE EXCEPTION 'Include every action project before releasing'; END IF;
   UPDATE client_meeting_actions SET published=true WHERE meeting_id=m.id;
   SELECT jsonb_build_object('title',m.title,'meeting_date',m.meeting_date,'attendees',m.attendees,
     'project_ids',to_jsonb(m.project_ids),'sections',m.sections,'client_name',(SELECT c.name FROM clients c WHERE c.id=p_client_id),
     'actions',COALESCE(jsonb_agg(jsonb_build_object('id',x.id,'title',x.title,'project',p.name,'assignee',x.assignee_name,'ball_in_court',x.ball_in_court,'due_date',x.due_date,'state',wf.state,'step',wf.current_step)), '[]'::jsonb)) INTO result
     FROM client_meeting_actions x JOIN projects p ON p.id=x.project_id LEFT JOIN workflow_instances wf ON wf.id=x.workflow_id
     WHERE x.client_id=p_client_id AND x.published AND x.project_id=ANY(m.project_ids);
   INSERT INTO client_meeting_publications(tenant_id,client_id,meeting_id,revision,snapshot,published_by)
     VALUES(tid,p_client_id,m.id,m.revision,result,uid) RETURNING id INTO rid;
   RETURN jsonb_build_object('id',rid);
 ELSIF p_operation='action' THEN
   SELECT * INTO m FROM client_meetings WHERE id=(p_payload->>'meeting_id')::uuid AND client_id=p_client_id FOR UPDATE;
   IF m.id IS NULL THEN RAISE EXCEPTION 'Meeting not found'; END IF;
   rid:=NULLIF(p_payload->>'id','')::uuid;
   IF rid IS NULL THEN
     INSERT INTO client_meeting_actions(tenant_id,client_id,meeting_id,project_id,title,assignee_id,assignee_name,ball_in_court,due_date,source_quote,source_locator)
     VALUES(tid,p_client_id,m.id,(p_payload->>'project_id')::uuid,p_payload->>'title',NULLIF(p_payload->>'assignee_id','')::uuid,
       COALESCE(p_payload->>'assignee_name',''),COALESCE(p_payload->>'ball_in_court',''),NULLIF(p_payload->>'due_date','')::date,COALESCE(p_payload->>'source_quote',''),COALESCE(p_payload->>'source_locator','')) RETURNING id INTO rid;
     INSERT INTO workflow_definitions(tenant_id,module,name,version,is_default) VALUES(tid,'client_meeting_action','Client meeting accountability',1,true)
       ON CONFLICT(tenant_id,module,version) DO NOTHING;
     SELECT id INTO def FROM workflow_definitions WHERE tenant_id=tid AND module='client_meeting_action' AND version=1;
     INSERT INTO workflow_steps(definition_id,sequence,state_name,assignee_rule) VALUES(def,1,'Action in progress','explicit'),(def,2,'Completion review','explicit') ON CONFLICT DO NOTHING;
     UPDATE client_meeting_actions SET workflow_id=create_workflow_instance(rid,'client_meeting_action','client_meeting_action',(p_payload->>'project_id')::uuid,NULLIF(p_payload->>'assignee_id','')::uuid) WHERE id=rid;
   ELSE
     SELECT * INTO a FROM client_meeting_actions WHERE id=rid AND meeting_id=m.id FOR UPDATE;
     IF a.id IS NULL OR a.revision IS DISTINCT FROM (p_payload->>'revision')::integer THEN RAISE EXCEPTION 'Action changed. Reload before editing.'; END IF;
     IF a.project_id IS DISTINCT FROM (p_payload->>'project_id')::uuid THEN RAISE EXCEPTION 'Project cannot change after action creation'; END IF;
     UPDATE client_meeting_actions SET title=p_payload->>'title',assignee_id=NULLIF(p_payload->>'assignee_id','')::uuid,
       assignee_name=COALESCE(p_payload->>'assignee_name',''),ball_in_court=COALESCE(p_payload->>'ball_in_court',''),due_date=NULLIF(p_payload->>'due_date','')::date,
       source_quote=COALESCE(p_payload->>'source_quote',''),source_locator=COALESCE(p_payload->>'source_locator',''),revision=revision+1,updated_at=now() WHERE id=rid;
     INSERT INTO client_meeting_comments(tenant_id,client_id,action_id,author_id,author_name,body) VALUES(tid,p_client_id,rid,uid,'Project team','Action details updated: '||(p_payload->>'title'));
   END IF;
   UPDATE client_meetings SET revision=revision+1,updated_at=now() WHERE id=m.id;
   RETURN jsonb_build_object('id',rid);
 ELSIF p_operation IN ('comment','submit','confirm','reopen') THEN
   SELECT * INTO a FROM client_meeting_actions WHERE id=(p_payload->>'id')::uuid AND client_id=p_client_id FOR UPDATE;
   IF a.id IS NULL OR (NOT client_meeting_can_edit(p_client_id) AND (NOT a.published OR NOT owner_can_access_project(a.project_id))) THEN RAISE EXCEPTION 'Action not accessible'; END IF;
   IF p_operation='submit' AND NOT client_meeting_can_edit(p_client_id) AND a.assignee_id IS DISTINCT FROM uid THEN RAISE EXCEPTION 'Only the assigned person may submit completion'; END IF;
   IF p_operation='submit' THEN
     SELECT * INTO w FROM workflow_instances WHERE id=a.workflow_id FOR UPDATE;
     IF w.current_step<>1 OR w.state<>'open' THEN RAISE EXCEPTION 'Completion is already submitted or confirmed'; END IF;
     PERFORM advance_workflow(a.workflow_id,'submit','Completion submitted');
   ELSIF p_operation='confirm' THEN PERFORM advance_workflow(a.workflow_id,'close','Completion confirmed by staff');
   ELSIF p_operation='reopen' THEN
     -- The shared engine cannot advance a closed instance. Reopen that same
     -- instance explicitly and append a standard workflow event, preserving history.
     UPDATE workflow_instances SET state='open',current_step=1,closed_at=NULL,current_assignee_id=a.assignee_id WHERE id=a.workflow_id;
     INSERT INTO workflow_events(instance_id,actor_id,action,from_step,to_step,comment) VALUES(a.workflow_id,uid,'return',2,1,'Action reopened by staff');
   END IF;
   SELECT COALESCE(full_name,email,'Portal member') INTO name FROM profiles WHERE user_id=uid LIMIT 1;
   INSERT INTO client_meeting_comments(tenant_id,client_id,action_id,author_id,author_name,body)
     VALUES(tid,p_client_id,a.id,uid,COALESCE(name,'Portal member'),CASE p_operation WHEN 'comment' THEN trim(p_payload->>'body') WHEN 'submit' THEN 'Completion submitted for staff review.' WHEN 'confirm' THEN 'Completion confirmed.' ELSE 'Action reopened.' END);
   RETURN jsonb_build_object('id',a.id);
 ELSIF p_operation='schedule' THEN
   IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=p_payload->>'timezone') THEN RAISE EXCEPTION 'Choose a valid time zone'; END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(COALESCE(p_payload->'recipients','[]')||COALESCE(p_payload->'cc','[]')||COALESCE(p_payload->'bcc','[]')) e WHERE e !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') THEN RAISE EXCEPTION 'Invalid email recipient'; END IF;
   IF COALESCE((p_payload->>'enabled')::boolean,false) AND jsonb_array_length(COALESCE(p_payload->'recipients','[]'))=0 THEN RAISE EXCEPTION 'Add at least one To recipient'; END IF;
   INSERT INTO client_meeting_delivery_settings(tenant_id,client_id,enabled,weekday,hour,timezone,recipients,cc,bcc,configured_by)
   VALUES(tid,p_client_id,(p_payload->>'enabled')::boolean,(p_payload->>'weekday')::integer,(p_payload->>'hour')::integer,p_payload->>'timezone',
     ARRAY(SELECT jsonb_array_elements_text(p_payload->'recipients')),ARRAY(SELECT jsonb_array_elements_text(p_payload->'cc')),ARRAY(SELECT jsonb_array_elements_text(p_payload->'bcc')),uid)
   ON CONFLICT(client_id) DO UPDATE SET enabled=excluded.enabled,weekday=excluded.weekday,hour=excluded.hour,timezone=excluded.timezone,recipients=excluded.recipients,cc=excluded.cc,bcc=excluded.bcc,configured_by=uid,updated_at=now();
   RETURN jsonb_build_object('saved',true);
 END IF;
 RAISE EXCEPTION 'Unsupported meeting command';
END $$;
REVOKE ALL ON FUNCTION client_meeting_can_edit(uuid),client_meeting_can_read(uuid),client_meeting_bundle(uuid),client_meeting_command(uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION client_meeting_can_edit(uuid),client_meeting_can_read(uuid),client_meeting_bundle(uuid),client_meeting_command(uuid,text,jsonb) TO authenticated;

-- API gateway delegates to the same permission-checked command under a verified
-- API client's creator. Never callable by browser clients or anonymous users.
CREATE OR REPLACE FUNCTION public.agent_client_meeting(p_tenant uuid,p_actor uuid,p_client uuid,p_operation text,p_payload jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM clients WHERE id=p_client AND workspace_id=p_tenant) OR NOT EXISTS(SELECT 1 FROM profiles WHERE user_id=p_actor AND workspace_id=p_tenant AND COALESCE(status,'active')='active') THEN RAISE EXCEPTION 'Agent workspace mismatch'; END IF;
 IF p_operation NOT IN ('read','create','save','action','comment') THEN RAISE EXCEPTION 'Agent access is draft-only'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',p_actor,'role','authenticated','tenant_id',p_tenant)::text,true);
 IF NOT client_meeting_can_edit(p_client) THEN RAISE EXCEPTION 'Agent actor lacks meeting permission'; END IF;
 IF p_operation='read' THEN RETURN client_meeting_bundle(p_client); END IF;
 RETURN client_meeting_command(p_client,p_operation,p_payload);
END $$;
REVOKE ALL ON FUNCTION agent_client_meeting(uuid,uuid,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION agent_client_meeting(uuid,uuid,uuid,text,jsonb) TO service_role;
