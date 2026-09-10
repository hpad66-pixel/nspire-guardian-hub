-- One consolidated in-app notification per meeting action batch.
CREATE OR REPLACE FUNCTION public.client_meeting_bulk_actions(
 p_client_id uuid,p_meeting_id uuid,p_actions jsonb,p_assignee_id uuid DEFAULT NULL,
 p_due_date date DEFAULT NULL,p_instruction text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE item jsonb; created_result jsonb; ids jsonb:='[]'::jsonb; assignee_name text:=''; tid uuid; action_id uuid; action_count integer;
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
   created_result:=client_meeting_command(p_client_id,'action',jsonb_build_object(
     'meeting_id',p_meeting_id,'project_id',item->>'project_id','title',item->>'title',
     'assignee_id',COALESCE(p_assignee_id::text,''),'assignee_name',assignee_name,
     'ball_in_court',CASE WHEN p_assignee_id IS NULL THEN COALESCE(item->>'ball_in_court','') ELSE assignee_name END,
     'due_date',COALESCE(p_due_date::text,''),'source_quote',COALESCE(item->>'source_quote',''),
     'source_locator',COALESCE(item->>'source_locator','')));
   action_id:=(created_result->>'id')::uuid;
   ids:=ids||jsonb_build_array(action_id);
   IF length(trim(COALESCE(p_instruction,'')))>0 THEN
     INSERT INTO client_meeting_comments(tenant_id,client_id,action_id,author_id,author_name,body,audience)
     VALUES(tid,p_client_id,action_id,auth.uid(),'Project team',trim(p_instruction),'internal');
   END IF;
 END LOOP;
 action_count:=jsonb_array_length(ids);
 IF p_assignee_id IS NOT NULL AND p_assignee_id IS DISTINCT FROM auth.uid() THEN
   INSERT INTO notifications(user_id,type,title,message,entity_type,entity_id)
   VALUES(p_assignee_id,'assignment','Meeting actions assigned',
     action_count::text||CASE WHEN action_count=1 THEN ' action is' ELSE ' actions are' END||' ready in Meetings & Actions for '||(SELECT name FROM clients WHERE id=p_client_id)||'.',
     'client_meeting',p_client_id);
 END IF;
 RETURN jsonb_build_object('ids',ids,'count',action_count);
END $$;

REVOKE ALL ON FUNCTION client_meeting_bulk_actions(uuid,uuid,jsonb,uuid,date,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION client_meeting_bulk_actions(uuid,uuid,jsonb,uuid,date,text) TO authenticated;
