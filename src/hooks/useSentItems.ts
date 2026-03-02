import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SentItem {
  id: string;
  subject: string;
  recipients: string[];
  cc_recipients: string[] | null;
  bcc_recipients: string[] | null;
  status: string | null;
  source_module: string | null;
  report_type: string | null;
  sent_at: string;
  sent_by: string | null;
  from_user_name: string | null;
  body_html: string | null;
  body_text: string | null;
  proposal_id: string | null;
  report_id: string | null;
  work_order_id: string | null;
  action_item_id: string | null;
  attachment_filename: string | null;
  error_message: string | null;
}

export function useSentItemsByProject(projectId: string | null) {
  return useQuery({
    queryKey: ['sent-items', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_emails')
        .select('id, subject, recipients, cc_recipients, bcc_recipients, status, source_module, report_type, sent_at, sent_by, from_user_name, body_html, body_text, proposal_id, report_id, work_order_id, action_item_id, attachment_filename, error_message')
        .eq('project_id', projectId!)
        .order('sent_at', { ascending: false });
      if (error) throw error;
      return data as SentItem[];
    },
  });
}

export function useDeleteSentItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from('report_emails').delete().eq('id', id);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: ({ projectId }) => {
      qc.invalidateQueries({ queryKey: ['sent-items', projectId] });
      toast.success('Sent item deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
