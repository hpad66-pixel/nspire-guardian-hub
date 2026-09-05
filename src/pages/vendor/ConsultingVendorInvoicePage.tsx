import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, FileCheck2, Loader2, LockKeyhole, ShieldCheck, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { validateFinancialEvidenceFile } from '@/lib/secureFinancialUpload';

type RequestInfo = {
  projectName: string;
  vendorName: string;
  dueDate: string | null;
  message: string | null;
  expiresAt: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const moneyInput = (value: string) => value.replace(/[^0-9.]/g, '');

export default function ConsultingVendorInvoicePage() {
  const { token = '' } = useParams<{ token: string }>();
  const [request, setRequest] = useState<RequestInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [attestedName, setAttestedName] = useState('');
  const [attested, setAttested] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error: loadError } = await supabase.functions.invoke('consulting-vendor-invoice', {
        body: { action: 'load', token },
      });
      if (!active) return;
      if (loadError || !data?.ok) setError(data?.error || loadError?.message || 'This secure invoice link is unavailable.');
      else {
        setRequest(data as RequestInfo);
        setDueDate(data.dueDate ?? '');
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [token]);

  async function submit() {
    if (!file || !invoiceNo.trim() || !(Number(amount) > 0) || attestedName.trim().length < 3 || !attested) return;
    setSubmitting(true);
    setError(null);
    try {
      await validateFinancialEvidenceFile(file);
      const body = new FormData();
      body.append('action', 'submit');
      body.append('token', token);
      body.append('file', file);
      body.append('invoiceNo', invoiceNo.trim());
      body.append('invoiceDate', invoiceDate);
      body.append('dueDate', dueDate);
      body.append('amount', amount);
      body.append('description', description.trim());
      body.append('attestedName', attestedName.trim());
      const { data, error: submitError } = await supabase.functions.invoke('consulting-vendor-invoice', { body });
      if (submitError || !data?.ok) throw new Error(data?.error || submitError?.message || 'Invoice submission failed');
      setDone(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Invoice submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Centered><Loader2 className="h-8 w-8 animate-spin text-emerald-700" /><p>Opening your secure request…</p></Centered>;
  if (error && !request) return <Centered><LockKeyhole className="h-10 w-10 text-amber-600" /><h1 className="text-xl font-bold">This link is not available</h1><p className="max-w-md text-center text-sm text-muted-foreground">{error} Contact APAS Project Controls for a new invoice request.</p></Centered>;
  if (done) return <Centered><CheckCircle2 className="h-14 w-14 text-emerald-600" /><h1 className="text-2xl font-bold">Invoice securely submitted</h1><p className="max-w-md text-center text-muted-foreground">Thank you. APAS will verify the invoice, complete its approval controls, and contact you if anything is needed. Submission does not authorize or guarantee payment.</p></Centered>;

  const canSubmit = Boolean(file && invoiceNo.trim() && Number(amount) > 0 && invoiceDate && attestedName.trim().length >= 3 && attested);
  return (
    <div className="min-h-screen bg-[#f4f2ec] px-4 py-8 text-[#132c25] sm:py-12">
      <main className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_22px_70px_rgba(19,44,37,.12)]">
        <header className="bg-gradient-to-br from-[#082c24] to-[#17614e] px-6 py-8 text-white sm:px-10">
          <p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-[#e5c979]">APAS Project Controls</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Submit your invoice</h1>
          <p className="mt-2 text-sm text-emerald-50/85">{request?.projectName} · {request?.vendorName}</p>
        </header>

        <div className="space-y-7 p-6 sm:p-10">
          <div className="grid gap-3 sm:grid-cols-3">
            <TrustItem icon={LockKeyhole} title="Private link" detail="One-time and time-limited" />
            <TrustItem icon={ShieldCheck} title="Human review" detail="No automatic payment" />
            <TrustItem icon={FileCheck2} title="Audit ready" detail="Document stays with project" />
          </div>

          {(request?.message || request?.dueDate) && (
            <div className="rounded-2xl border border-[#d8cfb5] bg-[#fcfaf4] p-4 text-sm">
              {request?.message && <p>{request.message}</p>}
              {request?.dueDate && <p className="mt-2 font-semibold">Requested by {new Date(`${request.dueDate}T00:00:00`).toLocaleDateString()}</p>}
            </div>
          )}

          <section className="space-y-5">
            <div>
              <h2 className="text-lg font-bold">Invoice details</h2>
              <p className="text-sm text-muted-foreground">Complete the fields exactly as they appear on your invoice.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Invoice number *"><Input value={invoiceNo} onChange={(event) => setInvoiceNo(event.target.value)} placeholder="INV-1001" /></Field>
              <Field label="Invoice amount *"><Input inputMode="decimal" value={amount} onChange={(event) => setAmount(moneyInput(event.target.value))} placeholder="0.00" /></Field>
              <Field label="Invoice date *"><Input type="date" max={today()} value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} /></Field>
              <Field label="Due date"><Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></Field>
            </div>
            <Field label="Description of services"><Textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Services, billing period, or deliverables included" /></Field>
          </section>

          <section>
            <Label className="mb-2 block">Invoice document *</Label>
            <label className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-[#b9c8c2] bg-[#f8faf9] px-5 py-8 text-center transition hover:border-[#17614e]">
              <Upload className="h-7 w-7 text-[#17614e]" />
              <span className="mt-2 font-semibold">{file ? file.name : 'Choose a PDF or invoice image'}</span>
              <span className="mt-1 text-xs text-muted-foreground">PDF, JPG, PNG, or WebP · maximum 12 MB</span>
              <input className="hidden" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            </label>
          </section>

          <section className="rounded-2xl border bg-muted/20 p-4">
            <Field label="Authorized submitter name *"><Input value={attestedName} onChange={(event) => setAttestedName(event.target.value)} placeholder="Your full name" /></Field>
            <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
              <Checkbox checked={attested} onCheckedChange={(value) => setAttested(value === true)} className="mt-0.5" />
              <span>I certify that I am authorized to submit this invoice for {request?.vendorName}, and that the invoice and amount are accurate to the best of my knowledge.</span>
            </label>
          </section>

          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <Button className="h-12 w-full bg-[#17614e] text-base hover:bg-[#0f4b3c]" disabled={!canSubmit || submitting} onClick={submit}>
            {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
            {submitting ? 'Submitting securely…' : 'Submit invoice for review'}
          </Button>
          <p className="text-center text-xs text-muted-foreground">Payment authorization happens separately after APAS review. Banking credentials are never requested on this page.</p>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function TrustItem({ icon: Icon, title, detail }: { icon: typeof ShieldCheck; title: string; detail: string }) {
  return <div className="rounded-xl border bg-white p-3"><Icon className="h-4 w-4 text-emerald-700" /><p className="mt-2 text-sm font-semibold">{title}</p><p className="text-[11px] text-muted-foreground">{detail}</p></div>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f4f2ec] px-6 text-[#132c25]">{children}</div>;
}
