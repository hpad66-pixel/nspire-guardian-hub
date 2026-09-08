import { describe, expect, it } from 'vitest';
import { chooseReportPhotos, type EvidenceSource } from '../../../../supabase/functions/_shared/reportEvidence';

const photo = (id: string, group: string, score: number, extra: Partial<EvidenceSource> = {}): EvidenceSource => ({
  id, included: true, mime_type: 'image/jpeg', placement_mode: 'supporting', visual_analysis: { group, score }, ...extra,
});

describe('report evidence selection', () => {
  it('retains mandatory photos and receipt PDFs even with no optional photo allowance', () => {
    const rows = [photo('optional', 'wall', 99), photo('required', 'wall', 0, { placement_mode: 'mandatory', included: false }), photo('receipt', '', 0, { placement_mode: 'mandatory', mime_type: 'application/pdf' })];
    expect(chooseReportPhotos(rows, 0).map(s => s.id)).toEqual(['required', 'receipt']);
  });

  it('selects a useful spread of issues before repeated views', () => {
    const rows = [photo('wall1', 'wall', 95), photo('wall2', 'wall', 94), photo('drain', 'drain', 85)];
    expect(chooseReportPhotos(rows, 2).map(s => s.id)).toEqual(['wall1', 'drain']);
  });

  it('excludes unchecked, unreviewed and irrelevant photos', () => {
    const rows = [photo('unchecked', 'wall', 100, { included: false }), photo('unreviewed', 'wall', 100, { visual_analysis: {} }), photo('irrelevant', 'wall', 0)];
    expect(chooseReportPhotos(rows, 8)).toEqual([]);
  });
});
