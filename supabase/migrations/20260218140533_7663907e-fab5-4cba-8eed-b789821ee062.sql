
-- ============================================================
-- CLIENT COMMUNICATION LAYER
-- Two-way messaging + client action items for the client portal
-- ============================================================

-- TABLE 1: client_messages
CREATE TABLE IF NOT EXISTS public.client_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Who wrote it
  sent_by uuid REFERENCES auth.users(id),
  direction text NOT NULL CHECK (direction IN ('client_to_pm', 'pm_to_client')),

  -- Content
  subject text,
  body text NOT NULL,
  photo_urls text[] DEFAULT '{}',

  -- Threading
  parent_id uuid REFERENCES public.client_messages(id) ON DELETE SET NULL,
  thread_id uuid,

  -- PM read/response tracking
  read_by_pm boolean NOT NULL DEFAULT false,
  read_by_pm_at timestamptz,
  read_by_pm_user uuid REFERENCES auth.users(id),

  -- Client read tracking
  read_by_client boolean NOT NULL DEFAULT false,
  read_by_client_at timestamptz,

  -- Response required flag
  requires_response boolean NOT NULL DEFAULT false,
  responded_at timestamptz,

  -- FK to client_action_items added after that table is created
  resolves_action_item_id uuid,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_messages ENABLE ROW LEVEL SECURITY;

-- PM team: full access to messages for projects they created
CREATE POLICY "client_messages_pm_access" ON public.client_messages
  FOR ALL USING (
    project_id IN (
      SELECT id FROM public.projects WHERE created_by = auth.uid()
    )
  );

-- Client: can read and write messages for their project
-- Uses profiles.client_id → projects.client_id join
CREATE POLICY "client_messages_client_access" ON public.client_messages
  FOR ALL USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.profiles pr ON pr.client_id = p.client_id
      WHERE pr.user_id = auth.uid()
    )
  );

-- ============================================================
-- TABLE 2: client_action_items
-- ============================================================
CREATE TABLE IF NOT EXISTS public.client_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  -- Action type
  action_type text NOT NULL DEFAULT 'decision' CHECK (
    action_type IN ('decision', 'approval', 'payment', 'information', 'rfi_response', 'change_order', 'acknowledgment')
  ),

  -- Content
  title text NOT NULL,
  description text,

  -- Options for 'decision' type
  options jsonb,
  client_selection text,

  -- Financial fields
  amount numeric(10,2),
  due_date date,

  -- Links to existing records
  linked_rfi_id uuid REFERENCES public.project_rfis(id) ON DELETE SET NULL,
  linked_change_order_id uuid REFERENCES public.change_orders(id) ON DELETE SET NULL,
  linked_document_id uuid REFERENCES public.project_documents(id) ON DELETE SET NULL,

  -- Attachments
  attachment_urls text[] DEFAULT '{}',

  -- Status lifecycle
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'viewed', 'responded', 'resolved', 'cancelled')
  ),

  -- Priority
  priority text NOT NULL DEFAULT 'normal' CHECK (
    priority IN ('urgent', 'normal', 'low')
  ),

  -- Dates
  sent_at timestamptz DEFAULT now(),
  viewed_at timestamptz,
  responded_at timestamptz,
  resolved_at timestamptz,

  -- Who
  created_by uuid REFERENCES auth.users(id),
  resolved_by uuid REFERENCES auth.users(id),

  -- Client response
  client_response text,

  -- PM notes (internal)
  pm_notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_action_items ENABLE ROW LEVEL SECURITY;

-- PM team: full access to their project action items
CREATE POLICY "client_action_items_pm_access" ON public.client_action_items
  FOR ALL USING (
    project_id IN (
      SELECT id FROM public.projects WHERE created_by = auth.uid()
    )
  );

-- Client: can read non-cancelled items for their project
CREATE POLICY "client_action_items_client_read" ON public.client_action_items
  FOR SELECT USING (
    status NOT IN ('cancelled') AND
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.profiles pr ON pr.client_id = p.client_id
      WHERE pr.user_id = auth.uid()
    )
  );

-- Client: can update only response fields
CREATE POLICY "client_action_items_client_respond" ON public.client_action_items
  FOR UPDATE USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.profiles pr ON pr.client_id = p.client_id
      WHERE pr.user_id = auth.uid()
    )
  )
  WITH CHECK (
    pm_notes IS NOT DISTINCT FROM pm_notes AND
    created_by IS NOT DISTINCT FROM created_by
  );

-- ============================================================
-- ADD FK: resolves_action_item_id now that both tables exist
-- ============================================================
ALTER TABLE public.client_messages
  ADD CONSTRAINT client_messages_resolves_action_item_fkey
  FOREIGN KEY (resolves_action_item_id)
  REFERENCES public.client_action_items(id)
  ON DELETE SET NULL;

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE TRIGGER update_client_messages_updated_at
  BEFORE UPDATE ON public.client_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_action_items_updated_at
  BEFORE UPDATE ON public.client_action_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- NOTIFY PM ON CLIENT MESSAGE
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_pm_on_client_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project RECORD;
BEGIN
  IF NEW.direction = 'client_to_pm' THEN
    SELECT id, name, created_by INTO v_project
    FROM public.projects
    WHERE id = NEW.project_id;

    IF v_project.created_by IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        entity_id,
        entity_type
      ) VALUES (
        v_project.created_by,
        'New client message',
        'Your client sent a message on project: ' || v_project.name,
        'client_message',
        NEW.id,
        'client_message'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_pm_on_client_message
  AFTER INSERT ON public.client_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_pm_on_client_message();

-- ============================================================
-- NOTIFY PM ON NEW ACTION ITEM RESPONSE
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_pm_on_client_action_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project RECORD;
BEGIN
  -- Fire when status changes to 'responded'
  IF NEW.status = 'responded' AND (OLD.status IS DISTINCT FROM 'responded') THEN
    SELECT id, name, created_by INTO v_project
    FROM public.projects
    WHERE id = NEW.project_id;

    IF v_project.created_by IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        entity_id,
        entity_type
      ) VALUES (
        v_project.created_by,
        'Client responded to action item',
        'Client responded to "' || NEW.title || '" on project: ' || v_project.name,
        'client_action_response',
        NEW.id,
        'client_action_item'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_pm_on_client_action_response
  AFTER UPDATE ON public.client_action_items
  FOR EACH ROW EXECUTE FUNCTION public.notify_pm_on_client_action_response();

-- ============================================================
-- AUTO-MARK ACTION ITEM AS VIEWED WHEN CLIENT OPENS IT
-- (Status transitions: pending → viewed on first client access)
-- This is handled in application code, but index for performance:
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_client_messages_project_id
  ON public.client_messages(project_id);

CREATE INDEX IF NOT EXISTS idx_client_messages_thread_id
  ON public.client_messages(thread_id);

CREATE INDEX IF NOT EXISTS idx_client_messages_direction
  ON public.client_messages(direction);

CREATE INDEX IF NOT EXISTS idx_client_action_items_project_id
  ON public.client_action_items(project_id);

CREATE INDEX IF NOT EXISTS idx_client_action_items_status
  ON public.client_action_items(status);

CREATE INDEX IF NOT EXISTS idx_client_action_items_priority
  ON public.client_action_items(priority);
