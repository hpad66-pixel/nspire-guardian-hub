import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

function useOwnerClientId() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['owner-client-id', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data?.client_id ?? null;
    },
    enabled: !!user,
  });
}

export function useOwnerProperties() {
  const { data: clientId } = useOwnerClientId();
  return useQuery({
    queryKey: ['owner-properties', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('properties')
        .select('id, name, address, city, state')
        .eq('client_id', clientId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
  });
}

export function useOwnerProjects() {
  const { data: properties = [] } = useOwnerProperties();
  const ids = properties.map(p => p.id);
  return useQuery({
    queryKey: ['owner-projects', ids],
    queryFn: async () => {
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status, budget, spent, target_end_date, property:properties(name)')
        .in('property_id', ids)
        .order('target_end_date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: ids.length > 0,
  });
}

export function useOwnerComplianceEvents() {
  const { data: properties = [] } = useOwnerProperties();
  const ids = properties.map(p => p.id);
  return useQuery({
    queryKey: ['owner-compliance', ids],
    queryFn: async () => {
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from('compliance_events')
        .select('id, title, category, agency, due_date, status, priority')
        .in('property_id', ids)
        .neq('status', 'completed')
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: ids.length > 0,
  });
}

export function useOwnerDocuments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['owner-documents', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_documents')
        .select('id, name, file_url, created_at, folder')
        .eq('shared_with_owner', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export function useOwnerPortfolioScore() {
  const { data: properties = [] } = useOwnerProperties();
  const ids = properties.map(p => p.id);
  return useQuery({
    queryKey: ['owner-portfolio-score', ids],
    queryFn: async () => {
      if (!ids.length) return { score: 0, inspection: 0, compliance: 0, maintenance: 0, projects: 0 };
      const [insRes, permRes, woRes, projRes] = await Promise.all([
        supabase.from('inspections').select('status').in('property_id', ids),
        supabase.from('permits').select('status').in('property_id', ids),
        supabase.from('work_orders').select('status').in('property_id', ids),
        supabase.from('projects').select('status').in('property_id', ids),
      ]);
      const pct = (arr: { status: string | null }[], pass: (s: string) => boolean) =>
        arr.length ? Math.round(arr.filter(x => x.status && pass(x.status)).length / arr.length * 100) : 100;
      const inspection = pct(insRes.data ?? [], s => s === 'completed');
      const compliance = pct(permRes.data ?? [], s => s === 'active');
      const maintenance = pct(woRes.data ?? [], s => s !== 'overdue');
      const projects = pct(projRes.data ?? [], s => s !== 'on_hold');
      const score = Math.round(inspection * 0.40 + compliance * 0.30 + maintenance * 0.20 + projects * 0.10);
      return { score, inspection, compliance, maintenance, projects };
    },
    enabled: ids.length > 0,
  });
}
