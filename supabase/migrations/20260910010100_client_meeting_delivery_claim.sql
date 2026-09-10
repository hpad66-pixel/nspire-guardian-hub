ALTER TABLE client_meeting_deliveries ADD COLUMN scheduled_date date NOT NULL DEFAULT current_date;
CREATE UNIQUE INDEX client_meeting_delivery_slot ON client_meeting_deliveries(client_id,scheduled_date);
CREATE OR REPLACE FUNCTION public.claim_client_meeting_delivery(p_publication uuid,p_slot date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result uuid;
BEGIN
 IF EXISTS(SELECT 1 FROM client_meeting_deliveries WHERE publication_id=p_publication AND scheduled_date<>p_slot) THEN RETURN NULL; END IF;
 INSERT INTO client_meeting_deliveries(tenant_id,client_id,publication_id,status,scheduled_date)
 SELECT tenant_id,client_id,id,'sending',p_slot FROM client_meeting_publications WHERE id=p_publication
 ON CONFLICT(client_id,scheduled_date) DO UPDATE SET status='sending',updated_at=now(),error=NULL
 WHERE client_meeting_deliveries.publication_id=p_publication
 AND client_meeting_deliveries.status<>'sent'
 AND client_meeting_deliveries.created_at>now()-interval '23 hours'
 AND client_meeting_deliveries.updated_at<now()-interval '10 minutes'
 RETURNING id INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION claim_client_meeting_delivery(uuid,date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION claim_client_meeting_delivery(uuid,date) TO service_role;
