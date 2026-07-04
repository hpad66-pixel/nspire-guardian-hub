// Pure compliance-score model, so the Score panel and (later) the Portfolio
// Cockpit compute the same 0-100 number the same way. Given aggregates, not raw
// rows, so it's trivially testable and reusable.

export type ScoreBand = 'strong' | 'good' | 'watch' | 'poor' | 'na';

export interface ScoreInput {
  sampling: { total: number; exceedances: number };
  obligations: { total: number; overdue: number; dueSoon: number };
}

export interface ScoreComponent { key: string; label: string; score: number; detail: string }

export interface ComplianceScore {
  score: number | null;      // null when there's nothing to score yet
  band: ScoreBand;
  components: ScoreComponent[];
  drivers: string[];         // plain-English "what's pulling it down"
  hasData: boolean;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function bandFor(score: number | null): ScoreBand {
  if (score == null) return 'na';
  if (score >= 90) return 'strong';
  if (score >= 75) return 'good';
  if (score >= 60) return 'watch';
  return 'poor';
}

export const BAND_META: Record<ScoreBand, { label: string; color: string }> = {
  strong: { label: 'Strong', color: '#10B981' },
  good:   { label: 'Good',   color: '#1D6FE8' },
  watch:  { label: 'Watch',  color: '#F59E0B' },
  poor:   { label: 'At risk', color: '#F43F5E' },
  na:     { label: 'No data', color: '#878581' },
};

const plural = (n: number, s: string) => `${n} ${s}${n === 1 ? '' : 's'}`;

export function computeComplianceScore(input: ScoreInput): ComplianceScore {
  const components: ScoreComponent[] = [];
  const drivers: string[] = [];

  // Sampling: exceedances drag the score; a fully-compliant set scores 100.
  if (input.sampling.total > 0) {
    const rate = input.sampling.exceedances / input.sampling.total;
    const s = clamp(100 - rate * 120);
    components.push({ key: 'sampling', label: 'Sampling', score: s, detail: `${plural(input.sampling.exceedances, 'exceedance')} of ${input.sampling.total} results` });
    if (input.sampling.exceedances > 0) drivers.push(`${plural(input.sampling.exceedances, 'sampling exceedance')}`);
  }

  // Obligations: overdue hurts most, due-soon a little.
  if (input.obligations.total > 0) {
    const s = clamp(100 - input.obligations.overdue * 15 - input.obligations.dueSoon * 3);
    components.push({ key: 'obligations', label: 'Obligations', score: s, detail: `${input.obligations.overdue} overdue · ${input.obligations.dueSoon} due soon` });
    if (input.obligations.overdue > 0) drivers.push(`${plural(input.obligations.overdue, 'overdue obligation')}`);
  }

  const hasData = components.length > 0;
  const score = hasData ? Math.round(components.reduce((a, c) => a + c.score, 0) / components.length) : null;
  return { score, band: bandFor(score), components, drivers, hasData };
}
