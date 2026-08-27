import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TrelloStatus {
  connected: boolean;
  memberName: string | null;
  boardId: string | null;
  boardName: string | null;
  listId: string | null;
  listName: string | null;
  autoPush: boolean;
}

export interface TrelloList {
  id: string;
  name: string;
  boardId: string;
  boardName: string;
  path: string;
}

async function invokeTrello<T = Record<string, unknown>>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('trello', { body });
  if (error) {
    let detail = error.message || 'Trello request failed';
    try {
      const context = (error as unknown as { context?: { clone?: () => { text: () => Promise<string> } } }).context;
      if (context && typeof context.clone === 'function') {
        const raw = await context.clone().text().catch(() => '');
        if (raw) {
          try { detail = JSON.parse(raw)?.error || detail; }
          catch { detail = raw.slice(0, 240); }
        }
      }
    } catch { /* retain the safe fallback */ }
    throw new Error(detail);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export function useTrelloStatus() {
  return useQuery({
    queryKey: ['trello-status'],
    queryFn: () => invokeTrello<TrelloStatus>({ action: 'status' }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTrelloLists() {
  return useMutation({
    mutationFn: (credentials?: { apiKey: string; token: string }) => invokeTrello<{ lists: TrelloList[] }>({
      action: 'lists',
      apiKey: credentials?.apiKey,
      token: credentials?.token,
    }),
    onError: (error: Error) => toast.error(`Couldn't load Trello lists: ${error.message}`),
  });
}

export function useConnectTrello() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { apiKey: string; token: string; listId: string }) =>
      invokeTrello({ action: 'connect', ...params }),
    onSuccess: (result: { listName?: string }) => {
      queryClient.invalidateQueries({ queryKey: ['trello-status'] });
      toast.success(`Trello connected${result?.listName ? ` · ${result.listName}` : ''}`);
    },
    onError: (error: Error) => toast.error(`Couldn't connect Trello: ${error.message}`),
  });
}

export function useDisconnectTrello() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => invokeTrello({ action: 'disconnect' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trello-status'] });
      toast.success('Trello disconnected');
    },
    onError: (error: Error) => toast.error(`Couldn't disconnect Trello: ${error.message}`),
  });
}

export function useSetTrelloAutoPush() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (value: boolean) => invokeTrello({ action: 'set-auto-push', value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trello-status'] }),
    onError: (error: Error) => toast.error(`Couldn't update Trello auto-push: ${error.message}`),
  });
}

export interface TrelloProjectList {
  project_id: string;
  board_id: string;
  board_name: string | null;
  list_id: string;
  list_name: string | null;
}

export function useTrelloProjectList(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['trello-project-list', projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('trello_project_lists' as never) as any)
        .select('project_id,board_id,board_name,list_id,list_name')
        .eq('project_id', projectId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as TrelloProjectList | null;
    },
  });
}

export function useSetTrelloProjectList(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (list: TrelloList) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('trello_project_lists' as never) as any).upsert({
        project_id: projectId,
        board_id: list.boardId,
        board_name: list.boardName,
        list_id: list.id,
        list_name: list.name,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'project_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trello-project-list', projectId] });
      toast.success('Trello list set for this project');
    },
    onError: (error: Error) => toast.error(`Couldn't set the project list: ${error.message}`),
  });
}

export function usePushToTrello() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (actionItemId: string) => invokeTrello<{ ok: boolean; cardId: string; url: string | null }>({ action: 'push', actionItemId }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['action-items'] });
      toast.success('Sent to Trello', result.url ? { action: { label: 'Open card', onClick: () => window.open(result.url!, '_blank') } } : undefined);
    },
    onError: (error: Error) => toast.error(`Couldn't send to Trello: ${error.message}`),
  });
}
