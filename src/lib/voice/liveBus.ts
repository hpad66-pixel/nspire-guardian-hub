/** Tiny in-app bus so the call widget can tickle the Voice dashboard without prop drilling. */

export type VoiceLiveEventKind =
  | 'call_started'
  | 'call_ended'
  | 'processing'
  | 'ticket_created'
  | 'wo_linked'
  | 'error';

export type VoiceLiveEvent = {
  id: string;
  kind: VoiceLiveEventKind;
  title: string;
  detail?: string;
  ticketNumber?: string;
  requestId?: string;
  workOrderId?: string;
  at: number;
};

type Listener = (event: VoiceLiveEvent) => void;

const listeners = new Set<Listener>();

let seq = 0;

export function emitVoiceLive(
  partial: Omit<VoiceLiveEvent, 'id' | 'at'> & { at?: number },
): VoiceLiveEvent {
  const event: VoiceLiveEvent = {
    id: `vl-${Date.now().toString(36)}-${(++seq).toString(36)}`,
    at: partial.at ?? Date.now(),
    kind: partial.kind,
    title: partial.title,
    detail: partial.detail,
    ticketNumber: partial.ticketNumber,
    requestId: partial.requestId,
    workOrderId: partial.workOrderId,
  };
  listeners.forEach((fn) => {
    try {
      fn(event);
    } catch {
      /* ignore listener errors */
    }
  });
  return event;
}

export function subscribeVoiceLive(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
