import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ClickUpStatus {
  connected: boolean;
  listId: string | null;
  listName: string | null;
  teamName: string | null;
}

// supabase.functions.invoke surfaces a generic "non-2xx" error; the real reason
// is in the response body. Read it, then throw a clean message.
async function invokeClickup<T = any>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('clickup', { body });
  if (error) {
    let detail = error.message || 'ClickUp request failed';
    try {
      const ctx: any = (error as any).context;
      if (ctx && typeof ctx.clone === 'function') {
        const raw = await ctx.clone().text().catch(() => '');
        if (raw) { try { detail = JSON.parse(raw)?.error || detail; } catch { detail = raw.slice(0, 200); } }
      }
    } catch { /* keep generic */ }
    throw new Error(detail);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export function useClickUpStatus() {
  return useQuery({
    queryKey: ['clickup-status'],
    queryFn: () => invokeClickup<ClickUpStatus>({ action: 'status' }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useConnectClickUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { token: string; listId: string }) =>
      invokeClickup({ action: 'connect', token: params.token, listId: params.listId }),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['clickup-status'] });
      toast.success(`ClickUp connected${data?.listName ? ` · ${data.listName}` : ''}`);
    },
    onError: (e: Error) => toast.error(`Couldn't connect ClickUp: ${e.message}`),
  });
}

export function useDisconnectClickUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => invokeClickup({ action: 'disconnect' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clickup-status'] }); toast.success('ClickUp disconnected'); },
    onError: (e: Error) => toast.error(`Couldn't disconnect: ${e.message}`),
  });
}

export function usePushToClickUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (actionItemId: string) => invokeClickup<{ ok: boolean; url: string | null }>({ action: 'push', actionItemId }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['action-items'] });
      toast.success('Pushed to ClickUp', data?.url ? { action: { label: 'Open', onClick: () => window.open(data.url!, '_blank') } } : undefined);
    },
    onError: (e: Error) => toast.error(`Couldn't push to ClickUp: ${e.message}`),
  });
}
