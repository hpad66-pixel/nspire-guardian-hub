import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type UsageRange = '7d' | '30d' | '90d' | 'all';

export interface AiUsageEvent {
  id: string;
  tenant_id: string | null;
  project_id: string | null;
  user_id: string | null;
  skill: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  cost_usd: number;
  created_at: string;
}

const table = () => supabase.from('ai_usage_events' as never) as any;

const daysFor = (r: UsageRange) => (r === '7d' ? 7 : r === '30d' ? 30 : r === '90d' ? 90 : null);

export function useAiUsage(range: UsageRange) {
  const superQ = useQuery({
    queryKey: ['is-super-admin'],
    queryFn: async () => {
      const { data } = await supabase.rpc('is_super_admin');
      return !!data;
    },
    staleTime: 5 * 60_000,
  });

  const eventsQ = useQuery({
    queryKey: ['ai-usage', range],
    queryFn: async () => {
      let q = table()
        .select('id,tenant_id,project_id,user_id,skill,model,input_tokens,output_tokens,cache_read_tokens,cache_write_tokens,cost_usd,created_at')
        .order('created_at', { ascending: false })
        .limit(50000);
      const days = daysFor(range);
      if (days) q = q.gte('created_at', new Date(Date.now() - days * 864e5).toISOString());
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AiUsageEvent[];
    },
  });

  const events = eventsQ.data ?? [];
  const projectIds = [...new Set(events.map((e) => e.project_id).filter(Boolean))] as string[];
  const tenantIds = [...new Set(events.map((e) => e.tenant_id).filter(Boolean))] as string[];

  const projQ = useQuery({
    queryKey: ['ai-usage-project-names', projectIds.sort().join(',')],
    enabled: projectIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('id,name').in('id', projectIds);
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });
  const wsQ = useQuery({
    queryKey: ['ai-usage-workspace-names', tenantIds.sort().join(',')],
    enabled: tenantIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from('workspaces').select('id,name').in('id', tenantIds);
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });

  const projectNames: Record<string, string> = Object.fromEntries((projQ.data ?? []).map((p) => [p.id, p.name]));
  const tenantNames: Record<string, string> = Object.fromEntries((wsQ.data ?? []).map((w) => [w.id, w.name]));

  return {
    events,
    isLoading: eventsQ.isLoading,
    error: eventsQ.error as Error | null,
    isSuperAdmin: !!superQ.data,
    projectNames,
    tenantNames,
  };
}
