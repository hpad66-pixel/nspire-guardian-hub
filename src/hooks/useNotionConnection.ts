import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NotionMapping {
  id: string;
  client_id: string | null;
  project_id: string | null;
  notion_object_id: string;
  notion_object_type: 'page' | 'database';
  notion_title: string;
  notion_url: string | null;
  mapping_purpose: string;
  status: string;
  last_synced_at: string | null;
  last_error: string | null;
}

export interface NotionStatus {
  connected: boolean;
  connection: {
    notion_workspace_id: string;
    workspace_name: string | null;
    workspace_icon: string | null;
    status: string;
    last_error: string | null;
    updated_at: string;
  } | null;
  mappings: NotionMapping[];
}

export interface NotionSearchResult {
  id: string;
  object: 'page' | 'database';
  title: string;
  url: string | null;
  last_edited_time: string | null;
}

async function invokeNotion<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('notion', { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export function useNotionConnection() {
  const qc = useQueryClient();
  const status = useQuery({
    queryKey: ['notion-connection'],
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    queryFn: () => invokeNotion<NotionStatus>({ action: 'status' }),
  });

  const connect = useMutation({
    mutationFn: async (returnTo?: string) => {
      const data = await invokeNotion<{ url: string }>({
        action: 'start',
        returnTo: returnTo ?? window.location.pathname,
        origin: window.location.origin,
      });
      if (!data.url) throw new Error('Could not start the Notion connection.');
      window.location.href = data.url;
    },
  });

  const search = useMutation({
    mutationFn: (input: { query?: string; kind?: 'page' | 'database' | 'all' }) =>
      invokeNotion<{ results: NotionSearchResult[] }>({
        action: 'search',
        query: input.query ?? '',
        kind: input.kind === 'all' ? '' : input.kind,
        pageSize: 20,
      }),
  });

  const map = useMutation({
    mutationFn: (input: {
      clientId?: string;
      projectId?: string;
      mappingPurpose: string;
      source: NotionSearchResult;
    }) =>
      invokeNotion<{ ok: true; mappingId: string | null }>({
        action: 'map',
        clientId: input.clientId || null,
        projectId: input.projectId || null,
        mappingPurpose: input.mappingPurpose,
        notionObjectId: input.source.id,
        notionObjectType: input.source.object,
        notionTitle: input.source.title,
        notionUrl: input.source.url,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notion-connection'] }),
  });

  const sync = useMutation({
    mutationFn: (mappingId: string) =>
      invokeNotion<{ ok: true; meetingId: string; title: string; status: 'needs_review'; sourceUrl?: string | null }>({
        action: 'sync',
        mappingId,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notion-connection'] }),
  });

  const disconnect = useMutation({
    mutationFn: () => invokeNotion<{ connected: false }>({ action: 'disconnect' }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['notion-connection'] }),
  });

  return { status, connect, search, map, sync, disconnect };
}
