import {
  Megaphone, Loader2, Images, AlertCircle, FileDiff,
  CalendarClock, MessagesSquare, Check, DollarSign, Clock, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { PortalQuestions } from '@/components/portal/PortalQuestions';
import {
  usePortalData, usePortalAction, PHASE_LABEL,
  type PortalActionItem, type PortalChangeOrder,
} from '@/hooks/usePortalData';

const HEALTH: Record<string, { label: string; bg: string; fg: string }> = {
  on_track: { label: 'On track', bg: '#E1F5EE', fg: '#0F6E56' },
  at_risk:  { label: 'At risk',  bg: '#FAEEDA', fg: '#854F0B' },
  delayed:  { label: 'Delayed',  bg: '#FCEBEB', fg: '#A32D2D' },
};

const fmtDate = (d?: string | null) => {
  if (!d) return null;
  try { return new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch { return null; }
};
const money = (n?: number | null) => (n == null ? null : `${n < 0 ? '-' : '+'}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
const isOverdue = (d?: string | null) => { if (!d) return false; try { return new Date(d + 'T23:59:59') < new Date(); } catch { return false; } };

function SectionHeader({ icon, title, right }: { icon: React.ReactNode; title: string; right?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-[15px] font-semibold text-foreground">{icon} {title}</div>
      {right}
    </div>
  );
}

export function PortalProjectOverview({ slug, accent }: { slug?: string; accent: string }) {
  const { data, isLoading } = usePortalData(slug);

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!data?.project) return null;

  const { phases, project, milestones, latest_update, punch, photos, action_items, change_orders, schedule } = data;
  const curIdx = Math.max(0, phases.indexOf(project.phase));
  const punchTotal = punch.open + punch.closed;
  const punchPct = punchTotal ? Math.round((punch.closed / punchTotal) * 100) : 0;
  const nextMilestone = milestones.find((m) => m.status !== 'completed' && m.date);
  const openItems = action_items.filter((a) => a.status === 'pending' || a.status === 'viewed');

  return (
    <div className="space-y-5">
      {/* Phase tracker */}
      <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Project phase</p>
        <div className="flex items-center">
          {phases.map((p, i) => (
            <div key={p} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <span className="rounded-full" style={{ height: i === curIdx ? 11 : 9, width: i === curIdx ? 11 : 9, background: i <= curIdx ? accent : '#E5E7EB' }} />
                <span className="whitespace-nowrap text-[10px] font-medium" style={{ color: i === curIdx ? accent : i < curIdx ? '#0F6E56' : '#9CA3AF' }}>
                  {PHASE_LABEL[p] ?? p}
                </span>
              </div>
              {i < phases.length - 1 && <span className="mx-1 h-[3px] flex-1 rounded-full" style={{ background: i < curIdx ? accent : '#E5E7EB' }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Needs your attention */}
      {openItems.length > 0 && (
        <div>
          <SectionHeader
            icon={<AlertCircle className="h-[18px] w-[18px] text-[#BA7517]" />}
            title="Needs your attention"
            right={<span className="rounded-full bg-[#FAEEDA] px-2.5 py-0.5 text-[12px] font-semibold text-[#854F0B]">{openItems.length} open</span>}
          />
          <div className="space-y-2.5">
            {action_items.map((a) => <ActionItemCard key={a.id} item={a} slug={slug} accent={accent} co={change_orders.find((c) => c.id === a.linked_change_order_id)} />)}
          </div>
        </div>
      )}

      {/* Potential change orders */}
      {change_orders.length > 0 && (
        <div>
          <SectionHeader
            icon={<FileDiff className="h-[18px] w-[18px] text-muted-foreground" />}
            title="Potential change orders"
            right={schedule.pending_exposure > 0
              ? <span className="text-[12px] text-muted-foreground">Pending: <b className="font-semibold text-foreground">{money(schedule.pending_exposure)} · +{schedule.pending_days}d</b></span>
              : undefined}
          />
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            {change_orders.map((c, i) => <ChangeOrderRow key={c.id} co={c} last={i === change_orders.length - 1} />)}
          </div>
        </div>
      )}

      {/* Schedule & impacts */}
      <div>
        <SectionHeader icon={<CalendarClock className="h-[18px] w-[18px] text-muted-foreground" />} title="Schedule & impacts" />
        <div className="grid grid-cols-3 gap-2.5">
          <StatTile label="Target completion" value={fmtDate(project.target_end_date) ?? 'TBD'} sub={schedule.approved_impact_days > 0 ? `+${schedule.approved_impact_days} days` : undefined} subTone="danger" />
          <StatTile label="Next milestone" value={nextMilestone?.title ?? '—'} sub={fmtDate(nextMilestone?.date) ?? undefined} />
          <StatTile label="Punch items" value={`${punch.open} open`} sub={punchTotal ? `${punchPct}% done` : undefined} accent={accent} progress={punchTotal ? punchPct : undefined} />
        </div>
      </div>

      {/* Latest update */}
      {latest_update && (
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Megaphone className="h-4 w-4" style={{ color: accent }} /> Latest update{latest_update.period ? ` · ${latest_update.period}` : ''}
            </div>
            {HEALTH[latest_update.health] && (
              <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: HEALTH[latest_update.health].bg, color: HEALTH[latest_update.health].fg }}>
                {HEALTH[latest_update.health].label}
              </span>
            )}
          </div>
          {latest_update.summary && <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{latest_update.summary}</p>}
          {latest_update.next_steps.length > 0 && (
            <div className="mt-3 border-t border-border pt-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">What's next</p>
              <ul className="space-y-1">
                {latest_update.next_steps.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[13px] text-foreground"><ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: accent }} />{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Questions & concerns */}
      <div>
        <SectionHeader icon={<MessagesSquare className="h-[18px] w-[18px] text-muted-foreground" />} title="Your questions & concerns" />
        <PortalQuestions slug={slug} accent={accent} />
      </div>

      {/* Progress photos */}
      {photos.length > 0 && (
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Images className="h-4 w-4" style={{ color: accent }} /> Progress photos</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.map((ph, i) => (
              <a key={i} href={ph.url} target="_blank" rel="noopener noreferrer" className="group relative shrink-0" title={ph.caption ?? undefined}>
                <img src={ph.url} alt={ph.caption ?? 'Progress photo'} loading="lazy" className="h-24 w-32 rounded-lg object-cover ring-1 ring-border transition-transform group-hover:scale-[1.02]" />
                {ph.caption && <span className="absolute inset-x-0 bottom-0 truncate rounded-b-lg bg-black/55 px-1.5 py-0.5 text-[10px] text-white">{ph.caption}</span>}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, sub, subTone, accent, progress }: { label: string; value: string; sub?: string; subTone?: 'danger'; accent?: string; progress?: number }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-[15px] font-bold text-foreground" title={value}>{value}</div>
      {sub && <div className={`text-[11px] ${subTone === 'danger' ? 'text-[#A32D2D]' : 'text-muted-foreground'}`}>{sub}</div>}
      {progress != null && (
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${progress}%`, background: accent }} /></div>
      )}
    </div>
  );
}

function statusPill(status: string, approved: boolean): { label: string; bg: string; fg: string } {
  if (approved || status === 'approved') return { label: 'Approved', bg: '#E1F5EE', fg: '#0F6E56' };
  if (status === 'rejected') return { label: 'Declined', bg: '#FCEBEB', fg: '#A32D2D' };
  return { label: 'Awaiting you', bg: '#FAEEDA', fg: '#854F0B' };
}

function ChangeOrderRow({ co, last }: { co: PortalChangeOrder; last: boolean }) {
  const pill = statusPill(co.status, co.approved);
  const reviewable = !co.approved && co.status !== 'rejected' && co.sign_token;
  return (
    <div className={`flex items-center gap-2.5 px-3.5 py-2.5 ${last ? '' : 'border-b border-border'}`}>
      <span className="w-9 shrink-0 text-[12px] text-muted-foreground">#{co.co_no ?? '—'}</span>
      <span className="flex-1 truncate text-[13px] text-foreground" title={co.title}>{co.title}</span>
      <span className="shrink-0 text-[13px] text-muted-foreground">{money(co.amount) ?? '$0'} · {co.days_impact ? `+${co.days_impact}d` : '0d'}</span>
      {reviewable ? (
        <a href={`/sign/co/${co.sign_token}`} className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: '#FAEEDA', color: '#854F0B' }}>Review</a>
      ) : (
        <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: pill.bg, color: pill.fg }}>{pill.label}</span>
      )}
    </div>
  );
}

const ACTION_VERB: Record<string, string> = {
  approval: 'Approve', change_order: 'Approve', payment: 'Acknowledge',
  decision: 'Confirm', information: 'Got it', rfi_response: 'Respond', acknowledgment: 'Got it',
};

function ActionItemCard({ item, slug, accent, co }: { item: PortalActionItem; slug?: string; accent: string; co?: PortalChangeOrder }) {
  const act = usePortalAction(slug);
  const responded = item.status === 'responded';
  const overdue = isOverdue(item.due_date);
  const barColor = responded ? '#0F6E56' : item.priority === 'urgent' || overdue ? '#A32D2D' : '#BA7517';

  const respond = (patch: { response?: string; selection?: string }) =>
    act.mutate({ action: 'respond_action_item', item_id: item.id, ...patch }, {
      onSuccess: () => toast.success('Sent to your builder'),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not submit'),
    });

  return (
    <div className="rounded-r-xl border border-l-[3px] border-border bg-white p-3.5 shadow-sm" style={{ borderLeftColor: barColor }}>
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-foreground">{item.title}</div>
          {item.description && <div className="mt-0.5 text-[13px] text-muted-foreground">{item.description}</div>}
        </div>
        {item.due_date && !responded && (
          <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={overdue ? { background: '#FCEBEB', color: '#A32D2D' } : { background: '#F1EFE8', color: '#5F5E5A' }}>
            {overdue ? 'Overdue' : 'Due'} {fmtDate(item.due_date)}
          </span>
        )}
      </div>

      {(item.amount != null || (co && (co.amount || co.days_impact))) && (
        <div className="mt-2.5 flex items-center gap-3.5 text-[13px]">
          {(item.amount ?? co?.amount) != null && <span className="inline-flex items-center gap-1"><DollarSign className="h-3.5 w-3.5 text-muted-foreground" /><b className="font-semibold">{money(item.amount ?? co?.amount)}</b></span>}
          {co?.days_impact ? <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-muted-foreground" /><b className="font-semibold">+{co.days_impact} days</b></span> : null}
        </div>
      )}

      {responded ? (
        <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#E1F5EE] px-2.5 py-1 text-[12px] font-semibold text-[#0F6E56]">
          <Check className="h-3.5 w-3.5" /> {item.client_selection ? `You chose: ${item.client_selection}` : 'Response sent'}
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {item.options && item.options.length > 0 ? (
            item.options.map((opt) => (
              <button key={opt} disabled={act.isPending} onClick={() => respond({ selection: opt })}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60">
                {opt}
              </button>
            ))
          ) : (
            <>
              {co?.sign_token && (item.action_type === 'change_order' || item.action_type === 'approval') && (
                <a href={`/sign/co/${co.sign_token}`} className="rounded-lg border border-border bg-background px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted">Review</a>
              )}
              <button disabled={act.isPending} onClick={() => respond({ response: 'Approved' })}
                className="rounded-lg px-3 py-1.5 text-[13px] font-semibold text-white transition-opacity disabled:opacity-60" style={{ background: accent }}>
                {act.isPending ? '…' : (ACTION_VERB[item.action_type] ?? 'Acknowledge')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
