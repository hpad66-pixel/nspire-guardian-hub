import { useSamplingResults } from '@/hooks/useSampling';
import { usePermitObligations } from '@/hooks/usePermitObligations';
import { computeComplianceScore, type ComplianceScore } from '@/lib/envcompliance/complianceScore';

const daysUntil = (s: string | null) => { if (!s) return null; const d = new Date(s + 'T00:00:00'); const t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((d.getTime() - t.getTime()) / 864e5); };

// Live compliance score for one engagement from its sampling + obligations data.
// Reusable by the Portfolio Cockpit later (same pure model).
export function useComplianceScore(projectId: string | null | undefined): { data: ComplianceScore; isLoading: boolean } {
  const results = useSamplingResults(projectId);
  const obligations = usePermitObligations(projectId);

  const rows = results.data ?? [];
  const obs = (obligations.data ?? []).filter((o) => o.status !== 'complete' && o.status !== 'waived');
  let overdue = 0, dueSoon = 0;
  for (const o of obs) { const du = daysUntil(o.next_due_date); if (du == null) continue; if (du < 0) overdue++; else if (du <= 30) dueSoon++; }

  const data = computeComplianceScore({
    sampling: { total: rows.length, exceedances: rows.filter((r) => r.is_exceedance).length },
    obligations: { total: obs.length, overdue, dueSoon },
  });

  return { data, isLoading: results.isLoading || obligations.isLoading };
}
