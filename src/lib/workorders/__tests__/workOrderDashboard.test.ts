import { describe, expect, it } from 'vitest';
import {
  computeWorkOrderDashboardKpis,
  sortWorkOrders,
} from '../workOrderDashboard';

const NOW = new Date('2026-09-01T15:00:00');

describe('workOrderDashboard', () => {
  it('computes created today, processed, backlog, and aging', () => {
    const kpis = computeWorkOrderDashboardKpis(
      [
        {
          status: 'pending_approval',
          priority: 'emergency',
          created_at: '2026-09-01T10:00:00',
          due_date: '2026-09-02',
        },
        {
          status: 'pending',
          priority: 'routine',
          created_at: '2026-08-28T10:00:00',
          due_date: '2026-08-20',
        },
        {
          status: 'in_progress',
          priority: 'routine',
          created_at: '2026-08-30T10:00:00',
          updated_at: '2026-09-01T12:00:00',
          due_date: '2026-09-05',
        },
        {
          status: 'verified',
          priority: 'routine',
          created_at: '2026-08-20T10:00:00',
          completed_at: '2026-09-01T11:00:00',
          due_date: '2026-08-25',
        },
      ],
      { now: NOW },
    );

    expect(kpis.createdToday).toBe(1);
    expect(kpis.processedToday).toBe(2); // in_progress + verified touched today
    expect(kpis.backlog).toBe(2); // pending_approval + pending
    expect(kpis.emergencyOpen).toBe(1);
    expect(kpis.overdue).toBe(1);
    expect(kpis.inProgress).toBe(1);
    expect(kpis.aging.find((b) => b.key === '0_1')?.count).toBe(1);
    expect(kpis.aging.find((b) => b.key === '4_7')?.count).toBe(1);
    expect(kpis.aging.find((b) => b.key === '8_plus')?.count).toBe(0);
  });

  it('sorts newest first by default', () => {
    const sorted = sortWorkOrders(
      [
        { status: 'pending', created_at: '2026-08-01T00:00:00', due_date: '2026-09-10' },
        { status: 'pending', created_at: '2026-09-01T00:00:00', due_date: '2026-09-02' },
        { status: 'pending', created_at: '2026-08-15T00:00:00', due_date: '2026-09-01' },
      ],
      'newest',
    );
    expect(sorted.map((r) => r.created_at)).toEqual([
      '2026-09-01T00:00:00',
      '2026-08-15T00:00:00',
      '2026-08-01T00:00:00',
    ]);
  });

  it('sorts emergencies ahead when priority sort is selected', () => {
    const sorted = sortWorkOrders(
      [
        {
          status: 'pending',
          priority: 'routine',
          created_at: '2026-09-01T12:00:00',
        },
        {
          status: 'pending',
          priority: 'emergency',
          created_at: '2026-09-01T08:00:00',
        },
      ],
      'priority',
    );
    expect(sorted[0].priority).toBe('emergency');
  });
});
