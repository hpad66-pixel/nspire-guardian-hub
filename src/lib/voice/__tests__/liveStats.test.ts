import { describe, expect, it } from 'vitest';
import {
  computeVoiceLiveKpis,
  nextPipelineStage,
  type VoiceRequestLike,
} from '@/lib/voice/liveStats';

const now = new Date('2026-09-01T15:00:00');

function req(partial: Partial<VoiceRequestLike> & { status: string; created_at: string }): VoiceRequestLike {
  return {
    work_order_id: null,
    is_emergency: false,
    ...partial,
  };
}

describe('computeVoiceLiveKpis', () => {
  it('counts today calls, backlog, processed, and work orders', () => {
    const rows: VoiceRequestLike[] = [
      req({ status: 'new', created_at: '2026-09-01T10:00:00', work_order_id: 'wo-1' }),
      req({ status: 'assigned', created_at: '2026-09-01T11:00:00', updated_at: '2026-09-01T12:00:00' }),
      req({ status: 'completed', created_at: '2026-08-30T10:00:00', updated_at: '2026-09-01T09:00:00' }),
      req({ status: 'new', created_at: '2026-08-20T10:00:00' }),
      req({ status: 'in_progress', created_at: '2026-09-01T08:00:00', is_emergency: true, work_order_id: 'wo-2' }),
    ];

    const kpis = computeVoiceLiveKpis(rows, { now });
    expect(kpis.todayCalls).toBe(3);
    expect(kpis.backlog).toBe(3); // new, assigned, new
    expect(kpis.withWorkOrder).toBe(2);
    expect(kpis.emergencyOpen).toBe(1);
    expect(kpis.inProgress).toBe(1);
    expect(kpis.todayProcessed).toBeGreaterThanOrEqual(2);
    expect(kpis.total).toBe(5);
  });

  it('can exclude demo seed rows', () => {
    const rows: VoiceRequestLike[] = [
      req({ status: 'new', created_at: '2026-09-01T10:00:00', demo_seed: true }),
      req({ status: 'new', created_at: '2026-09-01T11:00:00', demo_seed: false }),
    ];
    const kpis = computeVoiceLiveKpis(rows, { now, includeDemo: false });
    expect(kpis.total).toBe(1);
    expect(kpis.todayCalls).toBe(1);
  });
});

describe('nextPipelineStage', () => {
  it('advances call → processing → ticket → work order', () => {
    let stage = nextPipelineStage('idle', 'call_start');
    expect(stage).toBe('call_active');
    stage = nextPipelineStage(stage, 'call_end');
    expect(stage).toBe('processing');
    stage = nextPipelineStage(stage, 'ticket');
    expect(stage).toBe('ticket_created');
    stage = nextPipelineStage(stage, 'work_order');
    expect(stage).toBe('wo_linked');
    stage = nextPipelineStage(stage, 'reset');
    expect(stage).toBe('idle');
  });
});
