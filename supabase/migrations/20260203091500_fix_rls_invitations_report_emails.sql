-- Fix overly permissive RLS policies for user_invitations and report_emails

-- Remove public access to invitations
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.user_invitations;

-- Secure function to fetch invitation by token for unauthenticated users
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token TEXT)
RETURNS SETOF public.user_invitations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.user_invitations
  WHERE token = p_token
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(TEXT) TO anon, authenticated;

-- Tighten report_emails visibility
DROP POLICY IF EXISTS "Authenticated users can view report emails" ON public.report_emails;

CREATE POLICY "Users can view their sent or received emails"
ON public.report_emails
FOR SELECT
USING (
  auth.uid() = sent_by
  OR auth.uid() = from_user_id
  OR auth.uid() = ANY(recipient_user_ids)
  OR has_role(auth.uid(), 'admin'::app_role)
);
