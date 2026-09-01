/** Pure KPI helpers for the live Voice Complaints dashboard. */

export type VoiceRequestLike = {
  status: string;
  is_emergency?: boolean | null;
  work_order_id?: string | null;
  created_at: string;
  call_ended_at?: string | null;
  updated_at?: string | null;
  demo_seed?: boolean | null;
};

export type VoiceLiveKpis = {
  /** Calls / tickets created today (local day). */
  todayCalls: number;
  /** Tickets moved out of new/reviewed today (assigned / in progress / completed / closed). */
  todayProcessed: number;
  /** Open backlog still waiting (new / reviewed / assigned). */
  backlog: number;
  /** Tickets that already have a work order linked. */
  withWorkOrder: number;
  /** Open emergencies. */
  emergencyOpen: number;
  /** Currently in progress. */
  inProgress: number;
  /** Total tickets in the scoped set. */
  total: number;
};

function startOfLocalDay(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isToday(iso: string | null | undefined, now = new Date()): boolean {
  if (!iso) return false;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return false;
  return t >= startOfLocalDay(now);
}

const OPEN_BACKLOG = new Set(['new', 'reviewed', 'assigned']);
const PROCESSED = new Set(['assigned', 'in_progress', 'completed', 'closed']);

/**
 * Compute live dashboard KPIs from a list of maintenance requests.
 * Excludes demo_seed rows when `includeDemo` is false (default true for demos).
 */
export function computeVoiceLiveKpis(
  requests: VoiceRequestLike[],
  opts?: { includeDemo?: boolean; now?: Date },
): VoiceLiveKpis {
  const includeDemo = opts?.includeDemo ?? true;
  const now = opts?.now ?? new Date();
  const rows = includeDemo ? requests : requests.filter((r) => !r.demo_seed);

  const todayCalls = rows.filter((r) => isToday(r.created_at, now)).length;
  const todayProcessed = rows.filter(
    (r) =>
      PROCESSED.has(r.status) &&
      (isToday(r.updated_at, now) || isToday(r.call_ended_at, now) || isToday(r.created_at, now)),
  ).length;
  const backlog = rows.filter((r) => OPEN_BACKLOG.has(r.status)).length;
  const withWorkOrder = rows.filter((r) => !!r.work_order_id).length;
  const emergencyOpen = rows.filter(
    (r) => r.is_emergency && !['completed', 'closed'].includes(r.status),
  ).length;
  const inProgress = rows.filter((r) => r.status === 'in_progress').length;

  return {
    todayCalls,
    todayProcessed,
    backlog,
    withWorkOrder,
    emergencyOpen,
    inProgress,
    total: rows.length,
  };
}

export type VoicePipelineStage =
  | 'idle'
  | 'call_active'
  | 'processing'
  | 'ticket_created'
  | 'wo_linked'
  | 'ready';

export function nextPipelineStage(
  current: VoicePipelineStage,
  event: 'call_start' | 'call_end' | 'ticket' | 'work_order' | 'reset',
): VoicePipelineStage {
  if (event === 'reset') return 'idle';
  if (event === 'call_start') return 'call_active';
  if (event === 'call_end') return 'processing';
  if (event === 'ticket') return 'ticket_created';
  if (event === 'work_order') return 'wo_linked';
  return current;
}
