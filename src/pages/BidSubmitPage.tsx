/**
 * Public, no-login bid submission page reached via a tokenized link (/bid/:token).
 * A subcontractor sees the package scope and submits their bid via the bid-submit
 * edge function. The bid lands in the GC's bidding board as a submitted invitee.
 */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Gavel, Loader2, CheckCircle2 } from 'lucide-react';

const GOLD = '#C9A227', SAPPHIRE = '#1D6FE8', INK = '#15233B';

export default function BidSubmitPage() {
  const { token = '' } = useParams();
  const [phase, setPhase] = useState<'loading' | 'ready' | 'invalid' | 'closed'>('loading');
  const [pkg, setPkg] = useState<{ title: string; trade: string | null; scope: string | null; due_date: string | null; projectName: string } | null>(null);
  const [form, setForm] = useState({ vendor_name: '', vendor_company: '', vendor_email: '', bid_amount: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.functions.invoke('bid-submit', { body: { token } });
      if (error || !data?.ok) { setPhase('invalid'); return; }
      setPkg({ title: data.title, trade: data.trade, scope: data.scope, due_date: data.due_date, projectName: data.projectName });
      setPhase(data.open ? 'ready' : 'closed');
    })();
  }, [token]);

  const submit = async () => {
    if (!form.vendor_name.trim()) { setError('Please enter your name.'); return; }
    if (!form.bid_amount || Number(form.bid_amount) <= 0) { setError('Please enter your bid amount.'); return; }
    setBusy(true); setError('');
    try {
      const { data, error } = await supabase.functions.invoke('bid-submit', {
        body: { token, vendor_name: form.vendor_name, vendor_company: form.vendor_company, vendor_email: form.vendor_email, bid_amount: Number(form.bid_amount), notes: form.notes },
      });
      if (error || !data?.ok) throw new Error(data?.error || 'Could not submit your bid.');
      setDone(true);
    } catch (e: any) { setError(e?.message || 'Could not submit your bid.'); }
    finally { setBusy(false); }
  };

  if (phase === 'loading') return <div className="flex min-h-dvh items-center justify-center bg-[#FDFCF9]"><Loader2 className="h-7 w-7 animate-spin text-[#1D6FE8]" /></div>;
  if (phase === 'invalid') return <Centered title="Link unavailable" body="This bid link is invalid. Ask the general contractor for a new one." />;

  return (
    <div className="min-h-dvh bg-[#FDFCF9]" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div className="mx-auto max-w-md px-4 pb-10" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top,0px))' }}>
        <div style={{ borderTop: `5px solid ${GOLD}` }} className="rounded-t-xl bg-white px-5 pt-4">
          <div className="text-[20px] font-bold" style={{ color: INK }}>APAS Consulting</div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: SAPPHIRE }}><Gavel className="h-3.5 w-3.5" /> Invitation to Bid</div>
          <div className="mt-1 text-sm text-muted-foreground">{pkg?.projectName}</div>
          <div className="mt-3 h-[2px]" style={{ background: SAPPHIRE }} />
        </div>

        <div className="rounded-b-xl bg-white px-5 pb-6 pt-4 shadow-sm">
          <h1 className="text-lg font-bold" style={{ color: INK }}>{pkg?.title}</h1>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {pkg?.trade && <>{pkg.trade} · </>}{pkg?.due_date ? `Bids due ${pkg.due_date}` : 'No deadline set'}
          </div>
          {pkg?.scope && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-sm">{pkg.scope}</p>}

          {done ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <p className="mt-3 text-lg font-semibold" style={{ color: INK }}>Bid submitted</p>
              <p className="mt-1 text-sm text-muted-foreground">Thank you. {pkg?.projectName}’s team has received your bid for {pkg?.title}.</p>
            </div>
          ) : phase === 'closed' ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">This package is no longer accepting bids.</div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Your name *</Label><Input value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} className="mt-1" /></div>
                <div><Label className="text-xs">Company</Label><Input value={form.vendor_company} onChange={(e) => setForm({ ...form, vendor_company: e.target.value })} className="mt-1" /></div>
              </div>
              <div><Label className="text-xs">Email</Label><Input type="email" value={form.vendor_email} onChange={(e) => setForm({ ...form, vendor_email: e.target.value })} className="mt-1" /></div>
              <div><Label className="text-xs">Your bid (USD) *</Label><Input type="number" inputMode="decimal" value={form.bid_amount} onChange={(e) => setForm({ ...form, bid_amount: e.target.value })} placeholder="0.00" className="mt-1" /></div>
              <div><Label className="text-xs">Notes / inclusions</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Exclusions, alternates, lead time…" className="mt-1" /></div>
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <Button className="w-full" onClick={submit} disabled={busy}>
                {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</> : 'Submit bid'}
              </Button>
            </div>
          )}
        </div>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">Powered by APAS Consulting · projos.ai</p>
      </div>
    </div>
  );
}

function Centered({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#FDFCF9] p-6">
      <div className="max-w-sm text-center">
        <p className="text-lg font-semibold" style={{ color: INK }}>{title}</p>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
