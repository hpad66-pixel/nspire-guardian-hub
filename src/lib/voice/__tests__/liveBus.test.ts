import { describe, expect, it, vi } from 'vitest';
import { emitVoiceLive, subscribeVoiceLive } from '@/lib/voice/liveBus';

describe('voice liveBus', () => {
  it('delivers events to subscribers and supports unsubscribe', () => {
    const seen: string[] = [];
    const unsub = subscribeVoiceLive((e) => seen.push(e.kind));

    emitVoiceLive({ kind: 'call_ended', title: 'Call ended' });
    emitVoiceLive({ kind: 'ticket_created', title: 'Ticket', ticketNumber: 'MR-0001' });
    unsub();
    emitVoiceLive({ kind: 'wo_linked', title: 'WO' });

    expect(seen).toEqual(['call_ended', 'ticket_created']);
  });

  it('isolates listener errors', () => {
    const bad = vi.fn(() => {
      throw new Error('boom');
    });
    const good = vi.fn();
    const u1 = subscribeVoiceLive(bad);
    const u2 = subscribeVoiceLive(good);

    expect(() => emitVoiceLive({ kind: 'processing', title: 'Working' })).not.toThrow();
    expect(good).toHaveBeenCalledTimes(1);

    u1();
    u2();
  });
});
