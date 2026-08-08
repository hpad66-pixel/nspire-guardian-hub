import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, CheckCircle2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Line { sov_line_id: string; line_no?: number; description: string; scheduled_value: number; from_previous: number; this_period: number; materials: number }
const usd = (n: number) => `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const numIn = (v: string) => { const n = parseFloat(v.replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) ? n : 0; };

export default function VendorSubmitPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [accent, setAccent] = useState('#1D6FE8');
  const [projectName, setProjectName] = useState('Project');
  const [commitment, setCommitment] = useState<{ title: string; no: string | null; value: number; retainage_pct: number; sov_lines: Line[] } | null>(null);
  const [vendorName, setVendorName] = useState('');
  const [appNo, setAppNo] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [signName, setSignName] = useState('');
  const [ackWaiver, setAckWaiver] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('vendor-submit', { body: { token, action: 'load' } });
        if (error || !data?.ok) throw new Error(data?.error || 'Could not load');
        setAccent(data.accent || '#1D6FE8');
        setProjectName(data.project_name || 'Project');
        setCommitment(data.commitment);
        const s = data.submission;
        if (s) {
          setVendorName(s.vendor_name || '');
          setAppNo(s.app_no ? String(s.app_no) : '');
          setPeriodTo(s.period_to || '');
          const saved = new Map<string, Line>(
            (Array.isArray(s.lines) ? s.lines : [])
              .filter((line: Line) => line?.sov_line_id)
              .map((line: Line) => [line.sov_line_id, line]),
          );
          const contractLines = Array.isArray(data.commitment?.sov_lines) ? data.commitment.sov_lines : [];
          setLines(contractLines.map((line: Line) => ({
            ...line,
            this_period: Number(saved.get(line.sov_line_id)?.this_period ?? 0),
            materials: Number(saved.get(line.sov_line_id)?.materials ?? 0),
          })));
          if (s.submitted) setDone(true);
        }
      } catch (e) { setErr(e instanceof Error ? e.message : 'Error'); }
      finally { setLoading(false); }
    })();
  }, [token]);

  const totals = useMemo(() => {
    const previousCompleted = lines.reduce((t, l) => t + Number(l.from_previous || 0), 0);
    const currentGross = lines.reduce((t, l) => t + Number(l.this_period || 0) + Number(l.materials || 0), 0);
    const totalCompleted = previousCompleted + currentGross;
    const scheduled = lines.reduce((t, l) => t + Number(l.scheduled_value || 0), 0);
    const currentRetainage = currentGross * (Number(commitment?.retainage_pct ?? 0) / 100);
    return { totalCompleted, scheduled, currentGross, currentRetainage, currentDue: currentGross - currentRetainage };
  }, [commitment?.retainage_pct, lines]);

  const setLine = (i: number, patch: Partial<Line>) => setLines(ls => ls.map((l, k) => k === i ? { ...l, ...patch } : l));

  const submit = async () => {
    if (!vendorName.trim()) return toast.error('Enter your company name.');
    if (!signName.trim()) return toast.error('Type your name to sign the conditional lien waiver.');
    if (!ackWaiver) return toast.error("Acknowledge APAS Consulting's lien-waiver form before submitting.");
    if (totals.currentDue <= 0) return toast.error('Add current-period work or materials before submitting.');
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('vendor-submit', {
        body: {
          token, action: 'submit', lines,
          app_no: appNo ? Number(appNo) : null, period_to: periodTo || null,
          vendor_name: vendorName.trim(), conditional_signed_name: signName.trim(),
          apas_waiver_ack: ackWaiver, waiver_type: 'conditional_progress',
        },
      });
      if (error || !data?.ok) throw new Error(data?.error || 'Submit failed');
      setDone(true);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Submit failed'); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (err) return <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center"><div><p className="text-lg font-semibold">This link isn't available</p><p className="mt-1 text-sm text-muted-foreground">{err}. Contact APAS Consulting for a new link.</p></div></div>;

  if (done) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto h-12 w-12" style={{ color: accent }} />
        <h1 className="mt-3 text-xl font-bold">Invoice submitted</h1>
        <p className="mt-1 text-sm text-muted-foreground">Thanks{vendorName ? `, ${vendorName}` : ''}. Your AIA pay application and conditional lien waiver were sent to APAS Consulting. You'll receive an unconditional waiver to sign once payment is issued.</p>
        <p className="mt-3 text-[15px] font-semibold">Payment requested: {usd(totals.currentDue)}</p>
      </div>
    </div>
  );

  const inputCls = 'w-full rounded-md border border-input bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20';

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <header className="px-4 py-5 text-white" style={{ background: accent }}>
        <div className="mx-auto max-w-3xl">
          <div className="text-[19px] font-bold">Submit your pay application</div>
          <div className="text-[13px] opacity-90">{projectName} · to APAS Consulting</div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-4 px-4 pt-5">
        {commitment && <div className="rounded-xl border border-border bg-white p-3 text-[13px] text-muted-foreground shadow-sm">Your contract: <b className="text-foreground">{commitment.no ? commitment.no + ' · ' : ''}{commitment.title}</b> · value {usd(commitment.value)}</div>}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Your company"><input className={inputCls} value={vendorName} onChange={e => setVendorName(e.target.value)} placeholder="D'Shin Plumbing" /></Field>
          <Field label="Application #"><input className={inputCls} value={appNo} onChange={e => setAppNo(e.target.value)} placeholder="5" /></Field>
          <Field label="Period to"><input type="date" className={inputCls} value={periodTo} onChange={e => setPeriodTo(e.target.value)} /></Field>
        </div>

        {/* G703 continuation */}
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <div className="border-b border-border bg-muted/40 px-3 py-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Schedule of values (AIA G703)</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[12.5px]">
              <thead><tr className="border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="p-2 text-left">Description of work</th><th className="p-2 text-right">Scheduled</th><th className="p-2 text-right">From previous</th><th className="p-2 text-right">This period</th><th className="p-2 text-right">Materials</th><th className="p-2 text-right">% </th></tr></thead>
              <tbody>
                {lines.length === 0 && <tr><td colSpan={6} className="p-5 text-center text-amber-700">This subcontract needs a Schedule of Values before you can submit a pay application.</td></tr>}
                {lines.map((l, i) => {
                  const completed = Number(l.from_previous || 0) + Number(l.this_period || 0) + Number(l.materials || 0);
                  const pct = l.scheduled_value ? Math.round((completed / Number(l.scheduled_value)) * 100) : 0;
                  return (
                    <tr key={i} className="border-b border-border">
                      <td className="p-2"><span className="mr-1 text-muted-foreground">{l.line_no ?? i + 1}.</span>{l.description}</td>
                      <td className="p-2 text-right tabular-nums">{usd(l.scheduled_value)}</td>
                      <td className="p-2 text-right tabular-nums text-muted-foreground">{usd(l.from_previous)}</td>
                      <td className="p-1.5"><input className={`${inputCls} text-right`} value={l.this_period || ''} onChange={e => setLine(i, { this_period: numIn(e.target.value) })} /></td>
                      <td className="p-1.5"><input className={`${inputCls} text-right`} value={l.materials || ''} onChange={e => setLine(i, { materials: numIn(e.target.value) })} /></td>
                      <td className="p-2 text-right text-muted-foreground">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* G702 summary */}
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
          <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Application summary (AIA G702)</div>
          <Row label="Total completed & stored to date" value={usd(totals.totalCompleted)} />
          <Row label="Current-period gross" value={usd(totals.currentGross)} />
          <Row label={`Current retainage (${Number(commitment?.retainage_pct ?? 0)}%)`} value={`(${usd(totals.currentRetainage)})`} />
          <div className="mt-1 flex items-center justify-between border-t border-border pt-2 text-[15px] font-bold"><span>Current payment due</span><span style={{ color: accent }}>{usd(totals.currentDue)}</span></div>
          <p className="mt-2 text-[11.5px] text-muted-foreground">Contract retainage and prior certified work are supplied by projOS and cannot be changed on this form.</p>
        </div>

        {/* Conditional lien waiver */}
        <div className="rounded-xl border-2 bg-white p-4 shadow-sm" style={{ borderColor: `${accent}55` }}>
          <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Conditional waiver &amp; release on progress payment</div>
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            Upon receipt of the payment of <b className="text-foreground">{usd(totals.currentDue)}</b>, the undersigned ({vendorName || 'vendor'}) waives and releases any mechanic's lien, stop-notice, or bond right for labor and materials furnished through this billing period on {projectName}. This waiver is <b>conditional</b> on actual receipt of payment. An unconditional waiver will be requested once payment clears.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1"><label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Type your full name to sign</label><input className={inputCls} value={signName} onChange={e => setSignName(e.target.value)} placeholder="Donnell …" /></div>
            <div className="text-[11px] text-muted-foreground">Electronic signature · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          </div>
          <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-lg bg-muted/40 p-2.5 text-[12px] text-muted-foreground">
            <input type="checkbox" checked={ackWaiver} onChange={e => setAckWaiver(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" style={{ accentColor: accent }} />
            <span>I acknowledge I am using <b className="text-foreground">APAS Consulting's</b> standard lien-waiver document (the form above) for this release. Required before payment processing.</span>
          </label>
        </div>

        <button onClick={submit} disabled={busy || lines.length === 0} className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-[15px] font-semibold text-white transition-opacity disabled:opacity-60" style={{ background: accent }}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4" />} Submit invoice &amp; conditional waiver
        </button>
        <p className="text-center text-[11px] text-muted-foreground">APAS Project Controls · Powered by projOS</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-[11px] font-semibold text-muted-foreground">{label}</label>{children}</div>;
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between py-1 text-[13px]"><span className="text-muted-foreground">{label}</span><span className="tabular-nums">{value}</span></div>;
}
