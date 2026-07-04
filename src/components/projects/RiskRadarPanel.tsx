import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, Sparkles, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAiEnabled } from '@/hooks/useAiEnabled';

interface Risk { title: string; severity: 'high' | 'medium' | 'low'; area: string; detail: string; action: string; }

const sev: Record<string, { dot: string; badge: string; label: string }> = {
  high:   { dot: 'bg-rose-500',  badge: 'bg-rose-500/10 text-rose-700 border-rose-200',   label: 'High' },
  medium: { dot: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-700 border-amber-200', label: 'Medium' },
  low:    { dot: 'bg-slate-400', badge: 'bg-slate-500/10 text-slate-600 border-slate-200', label: 'Low' },
};

function useRiskRadar(projectId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['risk-radar', projectId],
    enabled: enabled && !!projectId,
    staleTime: 1000 * 60 * 60 * 6, // 6h — proactive but not chatty
    refetchOnWindowFocus: false,
    retry: false,
    queryFn: async (): Promise<{ risks: Risk[]; generated_at: string }> => {
      const { data, error } = await supabase.functions.invoke('risk-radar', { body: { projectId } });
      if (error || !data?.ok) throw new Error(data?.error || 'Could not analyze risks.');
      return { risks: data.risks ?? [], generated_at: data.generated_at };
    },
  });
}

export function RiskRadarPanel({ projectId }: { projectId: string }) {
  const aiEnabled = useAiEnabled();
  const { data, isLoading, isError, error, refetch, isFetching } = useRiskRadar(projectId, aiEnabled);
  const risks = data?.risks ?? [];

  if (!aiEnabled) return null;

  return (
    <Card className="border-border/70">
      <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="h-4 w-4 text-[var(--apas-sapphire)]" /> Risk Radar
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--apas-sapphire)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--apas-sapphire)]"><Sparkles className="h-2.5 w-2.5" /> AI</span>
        </CardTitle>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn('h-3.5 w-3.5 mr-1', isFetching && 'animate-spin')} /> {isFetching ? 'Scanning…' : 'Refresh'}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Scanning RFIs, submittals, punch, change orders, and daily logs…</div>
        ) : isError ? (
          <div className="py-4 text-sm text-muted-foreground">Couldn’t analyze right now. {(error as Error)?.message} <button className="underline" onClick={() => refetch()}>Try again</button>.</div>
        ) : risks.length === 0 ? (
          <div className="flex items-center gap-2 py-4 text-sm"><CheckCircle2 className="h-4 w-4 text-[var(--apas-emerald)]" /> Nothing flagged — the project looks healthy.</div>
        ) : (
          <div className="space-y-2">
            {risks.map((r, i) => {
              const s = sev[r.severity] ?? sev.medium;
              return (
                <div key={i} className="flex gap-3 rounded-lg border bg-card p-3">
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', s.dot)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{r.title}</span>
                      <Badge variant="outline" className={cn('text-[10px]', s.badge)}>{s.label}</Badge>
                      <Badge variant="outline" className="text-[10px]">{r.area}</Badge>
                    </div>
                    {r.detail && <p className="mt-0.5 text-sm text-muted-foreground">{r.detail}</p>}
                    {r.action && <p className="mt-1 text-xs"><span className="font-semibold text-foreground">Next:</span> <span className="text-muted-foreground">{r.action}</span></p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
