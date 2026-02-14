/**
 * NSPIRE Scoring Engine
 * Implements HUD scoring logic per the NSPIRE Standards Book.
 *
 * Key concepts:
 *  - Start at 100 points, subtract deductions
 *  - Point loss = Category Weight / Sample Size (per unique defect type)
 *  - Duplicate defects (same nspire_item_id in same unit/area) count only once
 *  - Unit Performance Score >=30 = automatic inspection failure
 *  - Smoke/CO detectors are "unscored" (H&S items, 24hr fix, no point impact)
 */

import type { SeverityLevel, InspectionArea } from '@/types/modules';

// ============================================================================
// HUD Sample Size Table (from the book)
// ============================================================================
const HUD_SAMPLE_SIZE_TABLE: Array<{ minUnits: number; maxUnits: number; sampleSize: number }> = [
  { minUnits: 1, maxUnits: 4, sampleSize: 1 },
  { minUnits: 5, maxUnits: 24, sampleSize: 5 },
  { minUnits: 25, maxUnits: 49, sampleSize: 10 },
  { minUnits: 50, maxUnits: 74, sampleSize: 15 },
  { minUnits: 75, maxUnits: 99, sampleSize: 18 },
  { minUnits: 100, maxUnits: 149, sampleSize: 22 },
  { minUnits: 150, maxUnits: 199, sampleSize: 27 },
  { minUnits: 200, maxUnits: 249, sampleSize: 31 },
  { minUnits: 250, maxUnits: 299, sampleSize: 35 },
  { minUnits: 300, maxUnits: 399, sampleSize: 40 },
  { minUnits: 400, maxUnits: 499, sampleSize: 45 },
  { minUnits: 500, maxUnits: 624, sampleSize: 50 },
  { minUnits: 625, maxUnits: 749, sampleSize: 55 },
  { minUnits: 750, maxUnits: 920, sampleSize: 60 },
  { minUnits: 921, maxUnits: Infinity, sampleSize: 65 },
];

export function getHudSampleSize(unitCount: number): number {
  const entry = HUD_SAMPLE_SIZE_TABLE.find(
    (e) => unitCount >= e.minUnits && unitCount <= e.maxUnits
  );
  return entry?.sampleSize ?? 1;
}

// ============================================================================
// Scoring Category Weights (12 categories from the book)
// ============================================================================
export interface ScoringWeight {
  category: string;
  area: InspectionArea;
  weight: number;
}

export const SCORING_WEIGHTS: ScoringWeight[] = [
  { category: 'Electrical', area: 'outside', weight: 2.5 },
  { category: 'Safety', area: 'outside', weight: 2.5 },
  { category: 'Fire Safety', area: 'outside', weight: 3.0 },
  { category: 'HVAC', area: 'outside', weight: 2.0 },
  { category: 'Signage', area: 'outside', weight: 1.0 },
  { category: 'Site', area: 'outside', weight: 1.5 },
  { category: 'Plumbing', area: 'outside', weight: 2.0 },
  { category: 'Structure', area: 'outside', weight: 2.5 },
  { category: 'Egress', area: 'inside', weight: 3.0 },
  { category: 'Lead Paint', area: 'inside', weight: 3.0 },
  { category: 'Health', area: 'unit', weight: 2.5 },
  { category: 'Security', area: 'unit', weight: 1.5 },
];

export function getCategoryWeight(category: string): number {
  // Find exact match first
  const exact = SCORING_WEIGHTS.find((w) => w.category === category);
  if (exact) return exact.weight;

  // Fallback: map common categories to their closest weight
  const categoryMap: Record<string, number> = {
    'Electrical': 2.5,
    'Safety': 2.5,
    'Fire Safety': 3.0,
    'HVAC': 2.0,
    'Signage': 1.0,
    'Site': 1.5,
    'Plumbing': 2.0,
    'Structure': 2.5,
    'Egress': 3.0,
    'Lead Paint': 3.0,
    'Health': 2.5,
    'Security': 1.5,
    'Bathroom': 2.0,
    'Kitchen': 2.0,
    'Doors': 1.5,
    'Windows': 1.5,
  };

  return categoryMap[category] ?? 2.0;
}

// ============================================================================
// Defect Input for Scoring
// ============================================================================
export interface DefectForScoring {
  id: string;
  nspireItemId: string;
  category: string;
  severity: SeverityLevel;
  lifeThreatening: boolean;
  area: InspectionArea;
  unitId?: string | null;
  isUnscored: boolean;
  pointValue?: number | null;
}

// ============================================================================
// Score Calculation
// ============================================================================
export interface ScoreBreakdown {
  totalScore: number;
  deductions: CategoryDeduction[];
  totalDeductions: number;
  defectCount: number;
  uniqueDefectCount: number; // after dedup
}

export interface CategoryDeduction {
  category: string;
  weight: number;
  uniqueDefects: number;
  totalPoints: number;
}

/**
 * Calculate the NSPIRE property score.
 *
 * Rules:
 * 1. Start at 100
 * 2. For each unique defect type (by nspire_item_id per unit for unit defects,
 *    per property for outside/inside), deduct Weight / SampleSize
 * 3. Unscored items (smoke/CO) are excluded from point deductions
 * 4. No caps on any area
 */
export function calculatePropertyScore(
  defects: DefectForScoring[],
  sampleSize: number
): ScoreBreakdown {
  // Filter out unscored items
  const scoredDefects = defects.filter((d) => !d.isUnscored);

  // Deduplicate: same nspire_item_id per unit (unit defects) or per property (outside/inside)
  const deduped = deduplicateDefects(scoredDefects);

  // Group by category and calculate deductions
  const categoryGroups = new Map<string, DefectForScoring[]>();
  for (const defect of deduped) {
    const existing = categoryGroups.get(defect.category) ?? [];
    existing.push(defect);
    categoryGroups.set(defect.category, existing);
  }

  const deductions: CategoryDeduction[] = [];
  let totalDeductions = 0;

  for (const [category, categoryDefects] of categoryGroups) {
    const weight = getCategoryWeight(category);
    const pointsPerDefect = weight / Math.max(sampleSize, 1);
    const totalPoints = pointsPerDefect * categoryDefects.length;

    deductions.push({
      category,
      weight,
      uniqueDefects: categoryDefects.length,
      totalPoints,
    });

    totalDeductions += totalPoints;
  }

  return {
    totalScore: Math.max(0, 100 - totalDeductions),
    deductions,
    totalDeductions,
    defectCount: scoredDefects.length,
    uniqueDefectCount: deduped.length,
  };
}

/**
 * Deduplicate defects per the NSPIRE rule:
 * - Unit defects: same nspire_item_id in same unit counts once
 * - Outside/Inside defects: same nspire_item_id counts once for the property
 */
function deduplicateDefects(defects: DefectForScoring[]): DefectForScoring[] {
  const seen = new Set<string>();
  const result: DefectForScoring[] = [];

  for (const defect of defects) {
    const key =
      defect.area === 'unit'
        ? `${defect.nspireItemId}:${defect.unitId ?? 'no-unit'}`
        : `${defect.nspireItemId}:${defect.area}`;

    if (!seen.has(key)) {
      seen.add(key);
      result.push(defect);
    }
  }

  return result;
}

/**
 * Calculate Unit Performance Score (UPS).
 * Sum of all unit defect point values across all inspected units.
 * If UPS >= 30, the entire inspection is an automatic failure.
 */
export function calculateUnitPerformanceScore(
  defects: DefectForScoring[],
  sampleSize: number
): { score: number; isAutoFail: boolean } {
  const unitDefects = defects.filter((d) => d.area === 'unit' && !d.isUnscored);
  const deduped = deduplicateDefects(unitDefects);

  let score = 0;
  for (const defect of deduped) {
    const weight = getCategoryWeight(defect.category);
    score += weight / Math.max(sampleSize, 1);
  }

  return {
    score,
    isAutoFail: score >= 30,
  };
}

/**
 * Get the Priority Pyramid rank for a defect (1 = highest impact, 12 = lowest).
 */
export function getPriorityRank(
  area: InspectionArea,
  severity: SeverityLevel,
  lifeThreatening: boolean
): number {
  if (lifeThreatening && severity === 'severe') {
    return area === 'unit' ? 1 : area === 'inside' ? 2 : 3;
  }
  if (severity === 'severe') {
    return area === 'unit' ? 4 : area === 'inside' ? 5 : 6;
  }
  if (severity === 'moderate') {
    return area === 'unit' ? 7 : area === 'inside' ? 8 : 9;
  }
  // low
  return area === 'unit' ? 10 : area === 'inside' ? 11 : 12;
}
