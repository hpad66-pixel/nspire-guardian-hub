-- Create message_threads table
CREATE TABLE public.message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  participant_ids UUID[] NOT NULL DEFAULT '{}',
  is_group BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false
);

-- Create thread_messages table
CREATE TABLE public.thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES public.message_threads(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  content_html TEXT,
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  attachments TEXT[] DEFAULT '{}'
);

-- Create thread_read_status table
CREATE TABLE public.thread_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES public.message_threads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  last_read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(thread_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_message_threads_participant_ids ON public.message_threads USING GIN(participant_ids);
CREATE INDEX idx_message_threads_last_message_at ON public.message_threads(last_message_at DESC);
CREATE INDEX idx_thread_messages_thread_id ON public.thread_messages(thread_id);
CREATE INDEX idx_thread_messages_created_at ON public.thread_messages(created_at DESC);
CREATE INDEX idx_thread_read_status_user_id ON public.thread_read_status(user_id);

-- Enable RLS on all tables
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_read_status ENABLE ROW LEVEL SECURITY;

-- RLS policies for message_threads
CREATE POLICY "Users can view threads they participate in"
ON public.message_threads FOR SELECT
USING (auth.uid() = ANY(participant_ids));

CREATE POLICY "Authenticated users can create threads"
ON public.message_threads FOR INSERT
WITH CHECK (auth.uid() = created_by AND auth.uid() = ANY(participant_ids));

CREATE POLICY "Participants can update their threads"
ON public.message_threads FOR UPDATE
USING (auth.uid() = ANY(participant_ids));

-- RLS policies for thread_messages
CREATE POLICY "Users can view messages in their threads"
ON public.thread_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.message_threads
  WHERE message_threads.id = thread_messages.thread_id
  AND auth.uid() = ANY(participant_ids)
));

CREATE POLICY "Users can send messages to their threads"
ON public.thread_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.message_threads
    WHERE message_threads.id = thread_messages.thread_id
    AND auth.uid() = ANY(participant_ids)
  )
);

CREATE POLICY "Senders can update their messages"
ON public.thread_messages FOR UPDATE
USING (auth.uid() = sender_id);

-- RLS policies for thread_read_status
CREATE POLICY "Users manage own read status"
ON public.thread_read_status FOR ALL
USING (auth.uid() = user_id);

-- Trigger to update last_message_at on thread when new message is sent
CREATE OR REPLACE FUNCTION public.update_thread_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.message_threads
  SET last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_thread_message_insert
AFTER INSERT ON public.thread_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_thread_last_message_at();

-- Trigger to create notifications for new messages
CREATE OR REPLACE FUNCTION public.notify_new_thread_message()
RETURNS TRIGGER AS $$
DECLARE
  v_thread RECORD;
  v_sender_name TEXT;
  v_participant UUID;
BEGIN
  -- Get thread details
  SELECT * INTO v_thread FROM public.message_threads WHERE id = NEW.thread_id;
  
  -- Get sender name
  SELECT COALESCE(full_name, email, 'Unknown') INTO v_sender_name 
  FROM public.profiles WHERE user_id = NEW.sender_id;
  
  -- Create notification for each participant except sender
  FOREACH v_participant IN ARRAY v_thread.participant_ids
  LOOP
    IF v_participant != NEW.sender_id THEN
      INSERT INTO public.notifications (
        user_id, 
        type, 
        title, 
        message, 
        entity_type, 
        entity_id
      ) VALUES (
        v_participant,
        'message',
        'New message from ' || v_sender_name,
        substring(NEW.content, 1, 100),
        'thread',
        NEW.thread_id
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_thread_message_notify
AFTER INSERT ON public.thread_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_thread_message();

-- Enable realtime for thread_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.thread_messages;