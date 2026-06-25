-- Auto-fill clients.workspace_id from the same source the RLS policy checks.
--
-- The clients_insert policy enforces:
--   WITH CHECK (workspace_id = public.get_my_workspace_id())
-- so any insert that omits workspace_id (NULL) or sends a value resolved from a
-- different precedence order than get_my_workspace_id() is rejected with
-- "new row violates row-level security policy for table clients".
--
-- This trigger guarantees the row carries exactly get_my_workspace_id() whenever
-- the caller does not supply a workspace_id, making the WITH CHECK pass by
-- construction for every legitimate caller (UI, edge functions, imports).

CREATE OR REPLACE FUNCTION public.set_clients_workspace_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.workspace_id IS NULL THEN
    NEW.workspace_id := public.get_my_workspace_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clients_set_workspace_id ON public.clients;

CREATE TRIGGER clients_set_workspace_id
  BEFORE INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.set_clients_workspace_id();
