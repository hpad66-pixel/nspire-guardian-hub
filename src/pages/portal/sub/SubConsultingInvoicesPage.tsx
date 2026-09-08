import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, FileText, Loader2, ShieldCheck, Upload } from 'lucide-react';
import { useSubPortalData } from '@/hooks/usePortals';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { validateFinancialEvidenceFile } from '@/lib/secureFinancialUpload';
import { toast } from 'sonner';

const today = () => new Date().toISOString().slice(0, 10);
const usd = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);

interface ConsultingAssignment {
  id: string;
  project_id: string;
  organization_id: string;
  project?: { id: string; name: string; status?: string | null } | null;
}
interface PortalConsultingInvoice {
  id: string;
  project_id: string;
  reference_no: string | null;
  bill_date: string;
  amount: number;
  status: string;
  rejection_reason: string | null;
}

export default function SubConsultingInvoicesPage() {
  const { data, isLoading } = useSubPortalData();
  const qc = useQueryClient();
  const assignments = useMemo(() => (data?.consultingAssignments ?? []) as ConsultingAssignment[], [data?.consultingAssignments]);
  const invoices = (data?.consultingInvoices ?? []) as PortalConsultingInvoice[];
  const [open, setOpen] = useState(false);
  const [assignmentId, setAssignmentId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [attestedName, setAttestedName] = useState('');
  const [attested, setAttested] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const assignment = useMemo(() => assignments.find((item) => item.id === assignmentId), [assignmentId, assignments]);

  function reset() {
    setAssignmentId(assignments.length === 1 ? assignments[0].id : '');
    setInvoiceNo(''); setInvoiceDate(today()); setDueDate(''); setAmount('');
    setDescription(''); setAttestedName(''); setAttested(false); setFile(null);
  }

  function show() { reset(); setOpen(true); }

  async function submit() {
    if (!assignment || !file) return;
    setBusy(true);
    try {
      await validateFinancialEvidenceFile(file);
      const body = new FormData();
      body.append('action', 'portal-submit');
      body.append('projectId', assignment.project_id);
      body.append('organizationId', assignment.organization_id);
      body.append('invoiceNo', invoiceNo.trim());
      body.append('invoiceDate', invoiceDate);
      body.append('dueDate', dueDate);
      body.append('amount', amount);
      body.append('description', description.trim());
      body.append('attestedName', attestedName.trim());
      body.append('file', file);
      const { data: response, error } = await supabase.functions.invoke('consulting-vendor-invoice', { body });
      if (error || !response?.ok) throw new Error(response?.error || error?.message || 'Invoice submission failed');
      await qc.invalidateQueries({ queryKey: ['sub-portal-data'] });
      toast.success('Invoice submitted for APAS review');
      setOpen(false);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Invoice submission failed');
    } finally { setBusy(false); }
  }

  const canSubmit = Boolean(assignment && file && invoiceNo.trim() && invoiceDate && Number(amount) > 0 && attestedName.trim().length >= 3 && attested);
  return <div className="container mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-3xl font-bold">Consulting invoices</h1><p className="mt-1 text-muted-foreground">Submit invoices and follow their review and payment status.</p></div><Button onClick={show} disabled={!assignments.length}><Upload className="mr-2 h-4 w-4" />Submit invoice</Button></div>
    <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /><p>Your invoice is securely attached to the selected project. APAS reviews and approves it separately before any payment is released.</p></div>
    {isLoading ? <p className="text-muted-foreground">Loading…</p> : assignments.length === 0 ? <Card><CardContent className="p-10 text-center text-muted-foreground">Your company has not been assigned to a consulting project. Ask APAS to provision the project assignment.</CardContent></Card> : <div className="grid gap-3">{invoices.length === 0 ? <Card><CardContent className="p-10 text-center"><FileText className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-2 font-semibold">No consulting invoices submitted</p></CardContent></Card> : invoices.map((invoice) => <Card key={invoice.id}><CardContent className="flex flex-wrap items-center justify-between gap-4 p-4"><div><p className="font-semibold">Invoice {invoice.reference_no || '—'}</p><p className="text-xs text-muted-foreground">{invoice.bill_date} · {assignments.find((item) => item.project_id === invoice.project_id)?.project?.name || 'Consulting project'}</p>{invoice.rejection_reason && <p className="mt-2 text-sm text-red-700">Correction requested: {invoice.rejection_reason}</p>}</div><div className="text-right"><p className="font-semibold tabular-nums">{usd(invoice.amount)}</p><Badge variant="outline" className={invoice.status === 'paid' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : invoice.status === 'rejected' ? 'border-red-200 bg-red-50 text-red-700' : ''}>{invoice.status === 'paid' && <CheckCircle2 className="mr-1 h-3 w-3" />}{String(invoice.status).replace(/_/g, ' ')}</Badge></div></CardContent></Card>)}</div>}

    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[640px]"><DialogHeader><DialogTitle>Submit a consulting invoice</DialogTitle><DialogDescription>Upload the invoice exactly as issued by your company.</DialogDescription></DialogHeader><div className="space-y-4">
      <Field label="Project *"><Select value={assignmentId} onValueChange={setAssignmentId}><SelectTrigger><SelectValue placeholder="Choose assigned project" /></SelectTrigger><SelectContent>{assignments.map((item) => <SelectItem key={item.id} value={item.id}>{item.project?.name || 'Consulting project'}</SelectItem>)}</SelectContent></Select></Field>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Invoice number *"><Input value={invoiceNo} onChange={(event) => setInvoiceNo(event.target.value)} /></Field><Field label="Amount *"><Input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ''))} /></Field><Field label="Invoice date *"><Input type="date" max={today()} value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} /></Field><Field label="Due date"><Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></Field></div>
      <Field label="Description"><Textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-4"><Upload className="h-5 w-5 text-emerald-700" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file?.name || 'Choose invoice PDF or image'}</p><p className="text-xs text-muted-foreground">PDF, JPG, PNG, or WebP · 12 MB maximum</p></div><input className="hidden" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
      <Field label="Authorized submitter name *"><Input value={attestedName} onChange={(event) => setAttestedName(event.target.value)} /></Field>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-muted/40 p-3 text-sm"><Checkbox checked={attested} onCheckedChange={(value) => setAttested(value === true)} className="mt-0.5" /><span>I certify that I am authorized to submit this invoice for my company and that the information is accurate.</span></label>
    </div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={!canSubmit || busy} onClick={submit}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit for review</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
