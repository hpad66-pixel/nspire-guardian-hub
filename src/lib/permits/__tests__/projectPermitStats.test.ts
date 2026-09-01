import { describe, expect, it } from 'vitest';
import {
  agingBreakdown,
  buildPermitComplianceBrief,
  buildStatusAdvancePatch,
  buildingReadiness,
  closeoutPipeline,
  countPermitStatuses,
  daysOpen,
  groupByBuilding,
  groupByTrade,
  groupOpenByOwner,
  groupPermitsByPipelineBoard,
  isCityBlocked,
  nextPipelineAction,
  permitReadiness,
  statusBreakdown,
} from '../projectPermitStats';

const sample = [
  {
    permit_number: 'A',
    description: 'Closed work',
    status: 'closed',
    building: 'Building 4',
    trade: 'Plumbing',
    responsible_party: 'Greg',
    issued_on: '2024-01-01',
    closed_on: '2024-06-01',
  },
  {
    permit_number: 'B',
    description: 'Stormwater',
    status: 'open_active',
    building: 'Junkyard',
    trade: 'Plumbing',
    notes: 'Pending Signoff From Public Works',
    responsible_party: 'Greg',
    issued_on: '2024-01-15',
  },
  {
    permit_number: 'C',
    description: 'Foundation drains',
    status: 'pending',
    building: 'Building 4',
    trade: 'Building',
    notes: 'City To Confirm Closed',
    responsible_party: 'James',
    issued_on: '2026-08-01',
  },
  {
    permit_number: 'D',
    description: 'Sewer conveyance',
    status: 'open_active',
    building: 'Building 7',
    trade: 'Plumbing',
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

  it('builds the construction open-permits board columns', () => {
    const cols = groupPermitsByPipelineBoard(sample);
    expect(cols.map((c) => c.key)).toEqual(['open_active', 'pending', 'closed']);
    expect(cols[0].permits).toHaveLength(2);
    expect(cols[1].permits).toHaveLength(1);
    expect(cols[2].permits).toHaveLength(1);
    expect(cols[0].label).toBe('Open · Active');
    expect(cols[2].label).toBe('Closed');
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

  it('builds status / trade / building chart slices', () => {
    const status = statusBreakdown(sample);
    expect(status.find((s) => s.key === 'closed')?.value).toBe(1);
    expect(status.find((s) => s.key === 'open_active')?.value).toBe(2);

    const trades = groupByTrade(sample);
    expect(trades[0].name).toBe('Plumbing');
    expect(trades[0].value).toBe(3);

    const buildings = buildingReadiness(sample);
    const b4 = buildings.find((b) => b.name === 'Building 4');
    expect(b4?.percent).toBe(50);
    expect(b4?.closed).toBe(1);
  });

  it('computes open-permit aging and closeout pipeline', () => {
    const asOf = new Date('2026-08-31T12:00:00Z');
    expect(daysOpen(sample[0], asOf)).toBeNull();
    expect(daysOpen(sample[1], asOf)).toBeGreaterThan(60);
    expect(daysOpen(sample[3], asOf)).toBeNull(); // no issued_on

    const aging = agingBreakdown(sample, asOf);
    expect(aging.find((b) => b.key === '61_plus')?.value).toBeGreaterThanOrEqual(1);
    expect(aging.find((b) => b.key === 'unknown')?.value).toBe(1);

    const pipe = closeoutPipeline(sample);
    expect(pipe.map((p) => p.key)).toEqual(['open_active', 'city_wait', 'closed']);
    expect(pipe[2].count).toBe(1);
  });

  it('advances closeout pipeline with status patches', () => {
    expect(nextPipelineAction('open_active')).toEqual({
      next: 'pending',
      actionLabel: 'Send to City',
    });
    expect(nextPipelineAction('pending')?.next).toBe('closed');
    expect(nextPipelineAction('closed')).toBeNull();

    const pending = buildStatusAdvancePatch(sample[3], 'pending', new Date('2026-08-31'));
    expect(pending.status).toBe('pending');
    expect(pending.next_action).toContain('City');

    const closed = buildStatusAdvancePatch(sample[2], 'closed', new Date('2026-08-31'));
    expect(closed.status).toBe('closed');
    expect(closed.closed_on).toBe('2026-08-31');
    expect(closed.city_confirmed_on).toBeTruthy();
  });
});
