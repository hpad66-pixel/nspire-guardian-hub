import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SmsStatus {
  connected: boolean;
  fromNumber: string | null;
  messagingServiceSid: string | null;
}

export interface ProjectSmsMessage {
  id: string;
  project_id: string;
  contact_id: string | null;
  recipient_user_id: string | null;
  direction: 'inbound' | 'outbound';
  status: 'queued' | 'sent' | 'delivered' | 'undelivered' | 'failed' | 'received';
  from_phone: string;
  to_phone: string;
  body: string;
  error_message: string | null;
  created_at: string;
}

async function invokeSms(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('sms', { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useSmsStatus() {
  return useQuery<SmsStatus>({
    queryKey: ['sms-connection'],
    staleTime: 30_000,
    queryFn: () => invokeSms({ action: 'status' }),
  });
}

export function useConnectSms() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { accountSid: string; authToken: string; fromNumber?: string; messagingServiceSid?: string }) =>
      invokeSms({ action: 'connect', ...input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sms-connection'] }),
  });
}

export function useDisconnectSms() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => invokeSms({ action: 'disconnect' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sms-connection'] }),
  });
}

export function useProjectSmsMessages(projectId: string | null) {
  return useQuery<ProjectSmsMessage[]>({
    queryKey: ['project-sms-messages', projectId],
    enabled: Boolean(projectId),
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_sms_messages' as any)
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ProjectSmsMessage[];
    },
  });
}

export function useSendProjectSms(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { contactId?: string; recipientUserId?: string; message: string }) =>
      invokeSms({ action: 'send', projectId, ...input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-sms-messages', projectId] }),
  });
}
