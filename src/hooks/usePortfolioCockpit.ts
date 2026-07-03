import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjects, type Project } from '@/hooks/useProjects';
import { useMyDay } from '@/hooks/useMyDay';
import { useAllProjectFinancials, type ProjectFin } from '@/hooks/useAllProjectFinancials';
import { isActiveProject } from '@/lib/projects';
import { computeHealth, type HealthStatus } from '@/lib/projectHealth';
import { projectKind, type ProjectKind } from '@/lib/projectKind';

export interface RiskSnapshot {
  project_id: string;
  overdue_rfis: number;
  aging_submittals: number;
  open_punch: number;
  pending_co_value: number;
  flagged: boolean;
  generated_at: string;
}

export type Rag = 'red' | 'amber' | 'green';

export interface CockpitProject {
  project: Project;
  kind: ProjectKind;
  health: HealthStatus;
  rag: Rag;
  openItems: number;
  overdueItems: number;
  revisedBudget: number;
  billed: number;
  billedPct: number;
  snapshot: RiskSnapshot | null;
  flags: string[];        // human-readable attention flags
  attentionScore: number; // higher = needs attention more
}

const num = (v: unknown) => { const x = typeof v === 'number' ? v : parseFloat(String(v ?? '')); return Number.isFinite(x) ? x : 0; };

function useRiskSnapshots() {
  return useQuery({
    queryKey: ['project-risk-snapshots'],
    queryFn: async () => {
      const { data, error } = await supabase.from('project_risk_snapshots' as any).select('*');
      if (error) throw error;
      const map = new Map<string, RiskSnapshot>();
      for (const r of (data ?? []) as any[]) map.set(r.project_id, {
        project_id: r.project_id,
        overdue_rfis: num(r.overdue_rfis), aging_submittals: num(r.aging_submittals),
        open_punch: num(r.open_punch), pending_co_value: num(r.pending_co_value),
        flagged: !!r.flagged, generated_at: r.generated_at,
      });
      return map;
    },
    staleTime: 5 * 60_000,
  });
}

function buildFlags(p: Project, fin: ProjectFin | undefined, snap: RiskSnapshot | null, overdueItems: number, health: HealthStatus): string[] {
  const flags: string[] = [];
  if (overdueItems > 0) flags.push(`${overdueItems} overdue action${overdueItems > 1 ? 's' : ''}`);
  if (snap?.overdue_rfis) flags.push(`${snap.overdue_rfis} overdue RFI${snap.overdue_rfis > 1 ? 's' : ''}`);
  if (snap?.aging_submittals) flags.push(`${snap.aging_submittals} aging submittal${snap.aging_submittals > 1 ? 's' : ''}`);
  if (snap?.open_punch) flags.push(`${snap.open_punch} open punch`);
  if (snap && snap.pending_co_value > 0) flags.push(`pending COs`);
  if (health === 'overdue') flags.push('past due date');
  else if (health === 'stalled') flags.push('stalled');
  if (p.status === 'on_hold') flags.push('on hold');
  if (fin && fin.revised_contract > 0 && fin.billed_to_date > fin.revised_contract) flags.push('billed over budget');
  return flags;
}

export function usePortfolioCockpit() {
  const { data: projects, isLoading: pLoading } = useProjects();
  const myDay = useMyDay();
  const { financials } = useAllProjectFinancials();
  const { data: snapshots } = useRiskSnapshots();

  const active = (projects ?? []).filter(isActiveProject);

  const rows: CockpitProject[] = active.map((project) => {
    const kind = projectKind(project);
    const health = computeHealth(project);
    const counts = myDay.byProject.get(project.id) ?? { open: 0, overdue: 0 };
    const fin = financials.get(project.id);
    const snap = snapshots?.get(project.id) ?? null;
    const revisedBudget = fin?.revised_contract ?? num((project as any).budget);
    const billed = fin?.billed_to_date ?? num((project as any).spent);
    const billedPct = revisedBudget > 0 ? Math.round((billed / revisedBudget) * 100) : 0;
    const flags = buildFlags(project, fin, snap, counts.overdue, health);

    // RAG: red if past-due/overdue items/flagged risk/over budget; amber if any softer flag; else green.
    const hardRisk = health === 'overdue' || counts.overdue > 0 || (snap?.overdue_rfis ?? 0) > 0 || (revisedBudget > 0 && billed > revisedBudget);
    const softRisk = flags.length > 0 || health === 'at_risk' || health === 'stalled' || (snap?.flagged ?? false);
    const rag: Rag = hardRisk ? 'red' : softRisk ? 'amber' : 'green';

    const attentionScore =
      counts.overdue * 10 + (snap?.overdue_rfis ?? 0) * 6 + (snap?.aging_submittals ?? 0) * 3 +
      (snap?.open_punch ?? 0) * 1 + (health === 'overdue' ? 8 : health === 'stalled' ? 4 : 0) +
      (revisedBudget > 0 && billed > revisedBudget ? 12 : 0) + (rag === 'red' ? 5 : 0);

    return { project, kind, health, rag, openItems: counts.open, overdueItems: counts.overdue, revisedBudget, billed, billedPct, snapshot: snap, flags, attentionScore };
  }).sort((a, b) => b.attentionScore - a.attentionScore);

  const totals = {
    projects: rows.length,
    construction: rows.filter((r) => r.kind === 'construction').length,
    consulting: rows.filter((r) => r.kind === 'consulting').length,
    contractValue: rows.reduce((s, r) => s + r.revisedBudget, 0),
    billed: rows.reduce((s, r) => s + r.billed, 0),
    openItems: rows.reduce((s, r) => s + r.openItems, 0),
    overdueItems: rows.reduce((s, r) => s + r.overdueItems, 0),
    atRisk: rows.filter((r) => r.rag === 'red').length,
    watch: rows.filter((r) => r.rag === 'amber').length,
    healthy: rows.filter((r) => r.rag === 'green').length,
  };

  return { rows, totals, isLoading: pLoading || myDay.isLoading };
}
