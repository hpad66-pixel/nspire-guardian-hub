import { describe, expect, it } from 'vitest';
import {
  buildPermitComplianceBrief,
  countPermitStatuses,
  groupByBuilding,
  groupOpenByOwner,
  isCityBlocked,
  permitReadiness,
} from '../projectPermitStats';

const sample = [
  {
    permit_number: 'A',
    description: 'Closed work',
    status: 'closed',
    building: 'Building 4',
    responsible_party: 'Greg',
  },
  {
    permit_number: 'B',
    description: 'Stormwater',
    status: 'open_active',
    building: 'Junkyard',
    notes: 'Pending Signoff From Public Works',
    responsible_party: 'Greg',
  },
  {
    permit_number: 'C',
    description: 'Foundation drains',
    status: 'pending',
    building: 'Building 4',
    notes: 'City To Confirm Closed',
    responsible_party: 'James',
  },
  {
    permit_number: 'D',
    description: 'Sewer conveyance',
    status: 'open_active',
    building: 'Building 7',
    responsible_party: 'Vanessa',
  },
];

describe('projectPermitStats', () => {
  it('counts closed / open / pending and city-blocked items', () => {
    const c = countPermitStatuses(sample);
    expect(c.total).toBe(4);
    expect(c.closed).toBe(1);
    expect(c.openActive).toBe(2);
    expect(c.pending).toBe(1);
    expect(c.blocked).toBe(2); // B notes + C pending
  });

  it('computes closeout readiness percent from closed / total', () => {
    const r = permitReadiness(sample);
    expect(r.percent).toBe(25);
    expect(r.label).toBe('Early / open register');
    expect(permitReadiness([
      ...sample,
      { permit_number: 'E', description: 'x', status: 'closed' },
      { permit_number: 'F', description: 'x', status: 'closed' },
      { permit_number: 'G', description: 'x', status: 'closed' },
    ]).percent).toBeCloseTo(57.1, 0);
  });

  it('flags city-blocked from pending status or signoff notes', () => {
    expect(isCityBlocked(sample[1])).toBe(true);
    expect(isCityBlocked(sample[2])).toBe(true);
    expect(isCityBlocked(sample[0])).toBe(false);
    expect(isCityBlocked(sample[3])).toBe(false);
  });

  it('groups open work by responsible party', () => {
    const buckets = groupOpenByOwner(sample);
    expect(buckets.map((b) => b.owner)).toEqual(['Greg', 'James', 'Vanessa']);
    expect(buckets[0].count).toBe(1);
  });

  it('groups by building with open counts', () => {
    const buildings = groupByBuilding(sample);
    const b4 = buildings.find((b) => b.building === 'Building 4');
    expect(b4?.total).toBe(2);
    expect(b4?.open).toBe(1);
  });

  it('builds an owner-ready compliance brief with the hot path', () => {
    const brief = buildPermitComplianceBrief(sample, {
      projectName: 'Glorieta Conveyance',
      asOf: new Date('2026-08-31T12:00:00Z'),
    });
    expect(brief).toContain('Glorieta Conveyance');
    expect(brief).toContain('25%');
    expect(brief).toContain('Waiting on the City');
    expect(brief).toContain('Stormwater');
    expect(brief).toContain('James');
    expect(brief).toContain('coordinating closure');
  });
});
