-- Enable realtime events for mailbox updates without manual refresh
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'report_emails'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.report_emails;
  END IF;
END
$$;
