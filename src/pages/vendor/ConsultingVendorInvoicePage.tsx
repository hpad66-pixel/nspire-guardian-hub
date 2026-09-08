import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, FileCheck2, Loader2, LockKeyhole, Minus, Plus, ShieldCheck, Upload } from 'lucide-react';
import { jsPDF } from 'jspdf';
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
type ServiceLine = { id: string; description: string; quantity: string; rate: string };
const newLine = (): ServiceLine => ({ id: crypto.randomUUID(), description: '', quantity: '1', rate: '' });
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

function generatedInvoiceFile(input: {
  invoiceNo: string; invoiceDate: string; dueDate: string; vendor: string; project: string;
  lines: ServiceLine[]; notes: string; attestedName: string;
}) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const total = input.lines.reduce((sum, line) => sum + Number(line.quantity) * Number(line.rate), 0);
  const drawPageHeader = (continued = false) => {
    doc.setFillColor(8, 44, 36); doc.rect(0, 0, 612, continued ? 72 : 112, 'F');
    doc.setTextColor(229, 201, 121); doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('APAS PROJECT CONTROLS', 44, continued ? 29 : 42);
    doc.setTextColor(255, 255, 255); doc.setFontSize(continued ? 18 : 25); doc.text(`Professional Services Invoice${continued ? ' | Continued' : ''}`, 44, continued ? 52 : 75);
    if (!continued) {
      doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text(`${input.project} | ${input.vendor}`, 44, 96);
      doc.setTextColor(19, 44, 37); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      doc.text(`Invoice ${input.invoiceNo}`, 44, 146); doc.text(`Invoice date: ${input.invoiceDate}`, 390, 146);
      if (input.dueDate) doc.text(`Due date: ${input.dueDate}`, 390, 164);
    }
  };
  const drawTableHeader = (top: number) => {
    doc.setTextColor(19, 44, 37); doc.setFillColor(241, 244, 242); doc.rect(44, top, 524, 26, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text('DESCRIPTION', 52, top + 17); doc.text('QTY', 382, top + 17); doc.text('RATE', 437, top + 17); doc.text('AMOUNT', 508, top + 17);
    return top + 26;
  };
  drawPageHeader();
  let y = drawTableHeader(198);
  input.lines.forEach((line) => {
    const lineAmount = Number(line.quantity) * Number(line.rate);
    const wrapped = doc.splitTextToSize(line.description, 310);
    const rowHeight = Math.max(30, wrapped.length * 13 + 10);
    if (y + rowHeight > 650) {
      doc.addPage(); drawPageHeader(true); y = drawTableHeader(94);
    }
    doc.setTextColor(19, 44, 37); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.setDrawColor(220, 216, 207); doc.line(44, y + rowHeight, 568, y + rowHeight);
    doc.text(wrapped, 52, y + 18); doc.text(String(Number(line.quantity)), 382, y + 18);
    doc.text(money(Number(line.rate)), 437, y + 18); doc.text(money(lineAmount), 508, y + 18);
    y += rowHeight;
  });
  const noteLines = input.notes ? doc.splitTextToSize(input.notes, 524) : [];
  const endingHeight = 36 + (noteLines.length ? 34 + noteLines.length * 12 : 0) + 74;
  if (y + endingHeight > 720) { doc.addPage(); drawPageHeader(true); y = 100; }
  y += 20; doc.setTextColor(19, 44, 37); doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text(`Total due: ${money(total)}`, 568, y, { align: 'right' });
  if (noteLines.length) {
    y += 32; doc.setFontSize(9); doc.text('NOTES', 44, y); doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text(noteLines, 44, y + 16); y += 20 + noteLines.length * 12;
  }
  y += 20; doc.setDrawColor(23, 97, 78); doc.roundedRect(44, y, 524, 54, 8, 8);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('VENDOR CERTIFICATION', 56, y + 20);
  doc.setFont('helvetica', 'normal'); doc.text(`Submitted and certified by ${input.attestedName}`, 56, y + 38);
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page); doc.setTextColor(100, 115, 110); doc.setFontSize(8);
    doc.text('Generated from vendor-entered values in the secure ProjOS invoice portal.', 44, 770);
    doc.text(`Page ${page} of ${pages}`, 568, 770, { align: 'right' });
  }
  return new File([doc.output('arraybuffer')], `${input.vendor}-${input.invoiceNo}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '-'), { type: 'application/pdf' });
}

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
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<ServiceLine[]>([newLine()]);
  const [attestedName, setAttestedName] = useState('');
  const [attested, setAttested] = useState(false);
  const total = useMemo(() => lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.rate || 0), 0), [lines]);
  const validLines = lines.length > 0 && lines.every((line) => line.description.trim() && Number(line.quantity) > 0 && Number(line.rate) >= 0);

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
    if (!invoiceNo.trim() || !(total > 0) || !validLines || attestedName.trim().length < 3 || !attested || !request) return;
    setSubmitting(true);
    setError(null);
    try {
      const invoiceFile = file ?? generatedInvoiceFile({
        invoiceNo: invoiceNo.trim(), invoiceDate, dueDate, vendor: request.vendorName,
        project: request.projectName, lines, notes: description.trim(), attestedName: attestedName.trim(),
      });
      await validateFinancialEvidenceFile(invoiceFile);
      const body = new FormData();
      body.append('action', 'submit');
      body.append('token', token);
      body.append('file', invoiceFile);
      body.append('invoiceNo', invoiceNo.trim());
      body.append('invoiceDate', invoiceDate);
      body.append('dueDate', dueDate);
      body.append('amount', total.toFixed(2));
      body.append('description', [
        ...lines.map((line) => `${line.description.trim()}: ${Number(line.quantity)} x ${money(Number(line.rate))} = ${money(Number(line.quantity) * Number(line.rate))}`),
        description.trim(),
      ].filter(Boolean).join('\n'));
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

  const canSubmit = Boolean(invoiceNo.trim() && total > 0 && validLines && invoiceDate && attestedName.trim().length >= 3 && attested);
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
              <p className="text-sm text-muted-foreground">Enter the services and amounts below. Consulting invoices do not use a Schedule of Values.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Invoice number *"><Input value={invoiceNo} onChange={(event) => setInvoiceNo(event.target.value)} placeholder="INV-1001" /></Field>
              <Field label="Invoice date *"><Input type="date" max={today()} value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} /></Field>
              <Field label="Due date"><Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></Field>
            </div>
            <div className="overflow-hidden rounded-2xl border">
              <div className="flex items-center justify-between border-b bg-[#f5f7f5] px-4 py-3"><div><p className="text-sm font-bold">Services billed</p><p className="text-xs text-muted-foreground">Add each service or deliverable and its price.</p></div><Button type="button" size="sm" variant="outline" onClick={() => setLines((current) => [...current, newLine()])}><Plus className="mr-1 h-4 w-4" />Add line</Button></div>
              <div className="space-y-3 p-4">
                {lines.map((line, index) => <div key={line.id} className="grid gap-2 rounded-xl bg-muted/20 p-3 sm:grid-cols-[1fr_90px_120px_36px]">
                  <Field label={`Service ${index + 1} *`}><Input value={line.description} onChange={(event) => setLines((current) => current.map((item) => item.id === line.id ? { ...item, description: event.target.value } : item))} placeholder="Site inspection, design review, consulting services..." /></Field>
                  <Field label="Quantity *"><Input inputMode="decimal" value={line.quantity} onChange={(event) => setLines((current) => current.map((item) => item.id === line.id ? { ...item, quantity: moneyInput(event.target.value) } : item))} /></Field>
                  <Field label="Rate *"><Input inputMode="decimal" value={line.rate} onChange={(event) => setLines((current) => current.map((item) => item.id === line.id ? { ...item, rate: moneyInput(event.target.value) } : item))} placeholder="0.00" /></Field>
                  <Button type="button" size="icon" variant="ghost" className="self-end" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}><Minus className="h-4 w-4" /><span className="sr-only">Remove line</span></Button>
                  <p className="text-right text-xs font-semibold tabular-nums text-[#17614e] sm:col-span-4">Line total: {money(Number(line.quantity || 0) * Number(line.rate || 0))}</p>
                </div>)}
              </div>
              <div className="flex items-center justify-between border-t bg-[#082c24] px-4 py-3 text-white"><span className="text-sm font-semibold">Invoice total</span><span className="text-xl font-bold tabular-nums">{money(total)}</span></div>
            </div>
            <Field label="Additional notes"><Textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Billing period, deliverables, or payment notes" /></Field>
          </section>

          <section>
            <Label className="mb-2 block">Your invoice document <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <label className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-[#b9c8c2] bg-[#f8faf9] px-5 py-8 text-center transition hover:border-[#17614e]">
              <Upload className="h-7 w-7 text-[#17614e]" />
              <span className="mt-2 font-semibold">{file ? file.name : 'Upload your own PDF or invoice image'}</span>
              <span className="mt-1 text-xs text-muted-foreground">If you do not upload one, ProjOS generates a polished invoice from the values above. PDF, JPG, PNG, or WebP, maximum 12 MB.</span>
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
