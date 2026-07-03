import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Circle, Clock, CalendarDays, ListChecks, Receipt, FileText, ChevronDown, Loader2, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (s?: string | null) => s ? new Date(s.length <= 10 ? s + 'T00:00:00' : s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

const SCOPE_STATE: Record<string, { label: string; cls: string }> = {
  complete: { label: 'Complete', cls: 'text-[var(--apas-emerald)]' },
  in_progress: { label: 'In progress', cls: 'text-[var(--apas-sapphire)]' },
  blocked: { label: 'Blocked', cls: 'text-[var(--apas-rose)]' },
  not_started: { label: 'Not started', cls: 'text-muted-foreground' },
};
const INV_STATE: Record<string, string> = {
  paid: 'bg-[var(--apas-emerald)]/10 text-[var(--apas-emerald)]',
  sent: 'bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)]',
  draft: 'bg-muted text-muted-foreground',
  void: 'bg-muted text-muted-foreground line-through',
};

function Section({ icon: Icon, title, children, count }: { icon: any; title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-[var(--apas-sapphire)]" />
        <h2 className="text-sm font-semibold uppercase tracking-wide">{title}</h2>
        {count != null && <span className="text-xs text-muted-foreground">· {count}</span>}
      </div>
      {children}
    </section>
  );
}

export default function ClientPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [openMeeting, setOpenMeeting] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['client-portal', token],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('client-portal', { body: { token } });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as any;
    },
    enabled: !!token,
    retry: false,
  });

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading…</div>;
  }
  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted"><ShieldAlert className="h-7 w-7 text-muted-foreground" /></div>
          <h1 className="text-xl font-semibold">Link unavailable</h1>
          <p className="mt-2 text-muted-foreground text-sm">This client link is invalid or has been revoked. Please contact your project team for a new one.</p>
        </div>
      </div>
    );
  }

  const d = data;
  return (
    <div className="min-h-screen bg-background">
      {/* Brand header */}
      <header className="border-b bg-card">
        <div className="mx-auto max-w-4xl px-5 py-4 flex items-center justify-between">
          <div className="font-[Georgia,'Playfair_Display',serif] text-lg font-bold">{d.brand}</div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--accent)] font-bold">Client portal</div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-6 space-y-5">
        {/* Title + overall progress */}
        <div className="rounded-2xl border bg-card p-5">
          <div className="text-xs uppercase tracking-[0.14em] text-[var(--accent)] font-bold">{d.client ? `${d.client} · ` : ''}Engagement</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{d.project.name}</h1>
          <div className="mt-1 text-sm text-muted-foreground">
            {[d.project.status, d.project.start_date ? `Started ${fmtDate(d.project.start_date)}` : '', d.project.target_end_date ? `Target ${fmtDate(d.project.target_end_date)}` : ''].filter(Boolean).join(' · ')}
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1"><span className="font-medium">Overall progress</span><span className="font-bold">{d.overallPct}%</span></div>
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-[var(--apas-sapphire)]" style={{ width: `${d.overallPct}%` }} /></div>
          </div>
          {d.project.description && <p className="mt-4 text-sm text-foreground/80 leading-relaxed">{d.project.description}</p>}
        </div>

        {/* Scopes */}
        {d.scopes.length > 0 && (
          <Section icon={ListChecks} title="Scope of work" count={d.scopes.length}>
            <div className="space-y-3">
              {d.scopes.map((s: any) => {
                const st = SCOPE_STATE[s.status] ?? SCOPE_STATE.not_started;
                return (
                  <div key={s.id}>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium">{s.title}</span>
                      <span className={cn('text-xs font-medium', st.cls)}>{s.pct}% · {st.label}</span>
                    </div>
                    {s.description && <div className="text-xs text-muted-foreground mt-0.5">{s.description}</div>}
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-[var(--apas-emerald)]" style={{ width: `${Math.min(100, s.pct)}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Milestones */}
        {d.milestones.length > 0 && (
          <Section icon={CalendarDays} title="Milestones" count={d.milestones.length}>
            <div className="space-y-2">
              {d.milestones.map((m: any, i: number) => {
                const done = m.status === 'completed' || m.status === 'complete';
                return (
                  <div key={i} className="flex items-center gap-2.5 text-sm">
                    {done ? <CheckCircle2 className="h-4 w-4 text-[var(--apas-emerald)] shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <span className={cn('flex-1', done && 'text-muted-foreground line-through')}>{m.name}</span>
                    {m.due_date && <span className="text-xs text-muted-foreground">{fmtDate(m.due_date)}</span>}
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Action items */}
        {d.actionItems.length > 0 && (
          <Section icon={Clock} title="Action items" count={d.actionItems.length}>
            <div className="space-y-1.5">
              {d.actionItems.map((a: any, i: number) => {
                const done = a.status === 'done';
                return (
                  <div key={i} className="flex items-center gap-2.5 text-sm py-1 border-b last:border-0">
                    {done ? <CheckCircle2 className="h-4 w-4 text-[var(--apas-emerald)] shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <span className={cn('flex-1', done && 'text-muted-foreground line-through')}>{a.title}</span>
                    {a.due_date && <span className="text-xs text-muted-foreground">{fmtDate(a.due_date)}</span>}
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Meetings */}
        {d.meetings.length > 0 && (
          <Section icon={FileText} title="Meetings & recaps" count={d.meetings.length}>
            <div className="space-y-2">
              {d.meetings.map((m: any) => {
                const open = openMeeting === m.id;
                const body = m.minutes || m.agenda;
                return (
                  <div key={m.id} className="rounded-lg border">
                    <button onClick={() => setOpenMeeting(open ? null : m.id)} className="w-full flex items-center gap-2 p-3 text-left">
                      <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
                      <span className="font-medium text-sm flex-1">{m.title}</span>
                      <span className="text-xs text-muted-foreground">{fmtDate(m.date)}</span>
                    </button>
                    {open && body && <div className="px-4 pb-4 pt-0 prose prose-sm max-w-none text-sm text-foreground/85 [&_h1]:text-base [&_h2]:text-sm [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: body }} />}
                    {open && !body && <div className="px-4 pb-4 text-sm text-muted-foreground">No recap recorded for this meeting.</div>}
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Invoices */}
        {d.showFinancials && d.invoices.length > 0 && (
          <Section icon={Receipt} title="Invoices" count={d.invoices.length}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b"><th className="py-2 font-medium">Invoice</th><th className="py-2 font-medium">Issued</th><th className="py-2 font-medium">Status</th><th className="py-2 font-medium text-right">Amount</th></tr></thead>
                <tbody>
                  {d.invoices.map((inv: any, i: number) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 font-medium">#{inv.invoice_no}</td>
                      <td className="py-2 text-muted-foreground">{fmtDate(inv.issue_date)}</td>
                      <td className="py-2"><span className={cn('text-[10px] font-bold uppercase rounded-full px-2 py-0.5', INV_STATE[inv.status] ?? 'bg-muted text-muted-foreground')}>{inv.status}</span></td>
                      <td className="py-2 text-right tabular-nums font-semibold">{money(inv.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        <div className="pt-2 pb-8 text-center text-xs text-muted-foreground">Powered by {d.brand} · projos.ai</div>
      </main>
    </div>
  );
}
