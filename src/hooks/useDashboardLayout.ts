import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface WidgetLayout {
  id: string;
  order: number;
  size: 'small' | 'medium' | 'large' | 'full';
}

export interface DashboardLayoutData {
  layout: WidgetLayout[];
  hidden_widgets: string[];
}

const DEFAULT_LAYOUT: WidgetLayout[] = [
  { id: 'kpi-strip', order: 0, size: 'full' },
  { id: 'alerts-critical', order: 1, size: 'full' },
  { id: 'alerts-warning', order: 2, size: 'full' },
  { id: 'coming-up', order: 3, size: 'large' },
  { id: 'team-compliance', order: 4, size: 'full' },
  { id: 'module-snapshot', order: 5, size: 'full' },
];

export function useDashboardLayout() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['dashboard-layout', user?.id],
    enabled: !!user?.id,
    staleTime: Infinity,
    queryFn: async (): Promise<DashboardLayoutData> => {
      // Use .from() with any cast since table was just created
      const { data, error } = await (supabase as any)
        .from('dashboard_layouts')
        .select('layout, hidden_widgets')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error || !data) {
        return { layout: DEFAULT_LAYOUT, hidden_widgets: [] };
      }

      return {
        layout: (data.layout as WidgetLayout[]) || DEFAULT_LAYOUT,
        hidden_widgets: (data.hidden_widgets as string[]) || [],
      };
    },
  });

  const mutation = useMutation({
    mutationFn: async (updates: Partial<DashboardLayoutData>) => {
      if (!user?.id) return;
      
      const payload: Record<string, unknown> = { user_id: user.id };
      if (updates.layout) payload.layout = updates.layout;
      if (updates.hidden_widgets !== undefined) payload.hidden_widgets = updates.hidden_widgets;
      payload.updated_at = new Date().toISOString();

      const { error } = await (supabase as any)
        .from('dashboard_layouts')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard-layout', user?.id] });
    },
  });

  const toggleWidget = (widgetId: string) => {
    const current = query.data ?? { layout: DEFAULT_LAYOUT, hidden_widgets: [] };
    const hidden = current.hidden_widgets.includes(widgetId)
      ? current.hidden_widgets.filter(id => id !== widgetId)
      : [...current.hidden_widgets, widgetId];
    
    // Optimistic update
    qc.setQueryData(['dashboard-layout', user?.id], {
      ...current,
      hidden_widgets: hidden,
    });

    mutation.mutate({ hidden_widgets: hidden });
  };

  const reorderWidgets = (newLayout: WidgetLayout[]) => {
    const current = query.data ?? { layout: DEFAULT_LAYOUT, hidden_widgets: [] };
    
    qc.setQueryData(['dashboard-layout', user?.id], {
      ...current,
      layout: newLayout,
    });

    mutation.mutate({ layout: newLayout });
  };

  const resetLayout = () => {
    const resetData: DashboardLayoutData = { layout: DEFAULT_LAYOUT, hidden_widgets: [] };
    qc.setQueryData(['dashboard-layout', user?.id], resetData);
    mutation.mutate(resetData);
  };

  return {
    layout: query.data?.layout ?? DEFAULT_LAYOUT,
    hiddenWidgets: query.data?.hidden_widgets ?? [],
    isLoading: query.isLoading,
    toggleWidget,
    reorderWidgets,
    resetLayout,
    isSaving: mutation.isPending,
  };
}
