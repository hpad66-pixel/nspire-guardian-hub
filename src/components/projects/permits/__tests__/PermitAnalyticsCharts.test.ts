import { describe, expect, it } from 'vitest';
import { applyPermitAnalyticsFilter } from '../PermitAnalyticsCharts';

const sample = [
  {
    permit_number: 'A',
    description: 'Closed',
    status: 'closed',
    building: 'Building 4',
    trade: 'Plumbing',
    issued_on: '2024-01-01',
  },
  {
    permit_number: 'B',
    description: 'Open old',
    status: 'open_active',
    building: 'Junkyard',
    trade: 'Plumbing',
    notes: 'Pending Signoff From Public Works',
    issued_on: '2024-01-15',
  },
  {
    permit_number: 'C',
    description: 'Pending',
    status: 'pending',
    building: 'Building 4',
    trade: 'Building',
    issued_on: '2026-08-01',
  },
];

describe('applyPermitAnalyticsFilter', () => {
  it('returns all when filter is all', () => {
    expect(applyPermitAnalyticsFilter(sample, { type: 'all' })).toHaveLength(3);
  });

  it('filters by status / trade / building', () => {
    expect(applyPermitAnalyticsFilter(sample, { type: 'status', key: 'pending' })).toHaveLength(1);
    expect(applyPermitAnalyticsFilter(sample, { type: 'trade', key: 'plumbing' })).toHaveLength(2);
    expect(
      applyPermitAnalyticsFilter(sample, { type: 'building', key: 'building 4' }).map((p) => p.permit_number),
    ).toEqual(['A', 'C']);
  });

  it('filters pipeline city wait and aging buckets', () => {
    const asOf = new Date('2026-08-31T12:00:00Z');
    const city = applyPermitAnalyticsFilter(sample, { type: 'pipeline', key: 'city_wait' }, { asOf });
    expect(city.map((p) => p.permit_number)).toContain('B');
    expect(city.map((p) => p.permit_number)).toContain('C');

    const aged = applyPermitAnalyticsFilter(sample, { type: 'aging', key: '61_plus' }, { asOf });
    expect(aged.map((p) => p.permit_number)).toEqual(['B']);
  });
});
