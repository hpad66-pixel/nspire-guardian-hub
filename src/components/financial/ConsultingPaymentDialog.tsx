import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Check, ClipboardCopy, Landmark, Loader2, LockKeyhole, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useConsultingCosts, type ConsultingCostWithPayments } from '@/hooks/useConsultingCashFlow';
import { useProjectArtifacts } from '@/hooks/useProjectArtifacts';
import { money } from '@/components/projects/invoicing/invoiceMeta';
import type { Organization } from '@/hooks/useDirectory';
import { validateFinancialEvidenceFile } from '@/lib/secureFinancialUpload';
import { toast } from 'sonner';

const today = () => new Date().toISOString().slice(0, 10);
const methods = [
  ['zelle', 'Zelle'], ['ach', 'ACH'], ['wire', 'Wire'], ['check', 'Check'],
  ['card', 'Credit card'], ['cash', 'Cash'], ['other', 'Other'],
] as const;

export function ConsultingPaymentDialog({
  cost, projectId, organization, onOpenChange,
}: {
  cost: ConsultingCostWithPayments | null;
  projectId: string;
  organization?: Organization;
  onOpenChange: (value: boolean) => void;
}) {
  const { addPayment } = useConsultingCosts(projectId);
  const artifacts = useProjectArtifacts(projectId);
  const [amount, setAmount] = useState('');
  const [paidDate, setPaidDate] = useState(today());
  const [method, setMethod] = useState('zelle');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const balance = Number(cost?.balance_due ?? cost?.amount ?? 0);
  useEffect(() => {
    if (!cost?.id) return;
    setAmount(balance.toFixed(2));
    setPaidDate(today());
    setMethod('zelle');
    setReference('');
    setNote('');
    setProof(null);
    setConfirmed(false);
    setCopied(false);
    setIdempotencyKey(crypto.randomUUID());
  }, [cost?.id, balance]);

  const packet = useMemo(() => {
    if (!cost) return '';
    const recipient = method === 'zelle'
      ? organization?.email || organization?.phone || 'VERIFY IN WELLS FARGO'
      : organization?.name || cost.vendor_name;
    return [
      `Project payment — ${cost.vendor_name}`,
      `Invoice: ${cost.reference_no || 'No reference'}`,
      `Amount: ${money(Number(amount) || 0)}`,
      `Method: ${methods.find(([value]) => value === method)?.[1] || method}`,
      `Recipient: ${recipient}`,
      `Memo: ${cost.description || cost.reference_no || 'Consulting services'}`,
      'Control: verify the recipient in Wells Fargo before sending.',
    ].join('\n');
  }, [amount, cost, method, organization]);

  async function copyPacket() {
    await navigator.clipboard.writeText(packet);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function recordPayment() {
    if (!cost || !proof) return;
    let uploaded: Awaited<ReturnType<typeof artifacts.upload.mutateAsync>> | null = null;
    try {
      await validateFinancialEvidenceFile(proof);
      uploaded = await artifacts.upload.mutateAsync({
        file: proof,
        projectId,
        input: {
          artifact_type: 'other',
          source_system: 'manual',
          title: `${cost.vendor_name} payment evidence — ${reference.trim()}`,
          description: `Bank-generated evidence for ${method.toUpperCase()} payment against invoice ${cost.reference_no || cost.id}`,
          period_date: paidDate,
          reference_no: reference.trim(),
          amount: Number(amount),
          tags: ['consulting', 'payment-evidence', method],
        },
      });
      await addPayment.mutateAsync({
        costId: cost.id,
        amount: Number(amount),
        paid_date: paidDate,
        method,
        reference: reference.trim(),
        proof_artifact_id: uploaded.id,
        idempotency_key: idempotencyKey,
        note: note.trim() || null,
      });
      toast.success(`${money(Number(amount))} recorded with bank evidence`);
      onOpenChange(false);
    } catch (caught) {
      if (uploaded) await artifacts.remove.mutateAsync(uploaded).catch(() => undefined);
      toast.error(caught instanceof Error ? caught.message.replace(/^[A-Z_]+:\s*/, '') : 'Payment could not be recorded');
    }
  }

  const amountNumber = Number(amount);
  const canRecord = Boolean(
    cost && amountNumber > 0 && amountNumber <= balance + 0.004 && paidDate && paidDate <= today()
    && reference.trim().length >= 3 && proof && confirmed && !addPayment.isPending && !artifacts.upload.isPending,
  );

  return (
    <Dialog open={!!cost} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Secure payment handoff</DialogTitle>
          <DialogDescription>ProjOS prepares and documents the payment. You authorize the actual transaction inside Wells Fargo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-1">
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" />
            <div><p className="font-semibold">Bank credentials stay out of ProjOS</p><p className="mt-0.5 text-xs text-amber-800">Never paste a Wells Fargo password or security code here. Confirm the recipient again in the bank before sending.</p></div>
          </div>

          <section className="rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Approved invoice</p><p className="font-semibold">{cost?.vendor_name} · {cost?.reference_no || 'No reference'}</p></div><p className="text-xl font-bold tabular-nums">{money(balance)}</p></div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between"><div><h3 className="font-semibold">1. Copy the payment packet</h3><p className="text-xs text-muted-foreground">Use it while completing the payment in Wells Fargo.</p></div><Button variant="outline" size="sm" onClick={copyPacket}>{copied ? <Check className="mr-1 h-4 w-4" /> : <ClipboardCopy className="mr-1 h-4 w-4" />}{copied ? 'Copied' : 'Copy packet'}</Button></div>
            <pre className="whitespace-pre-wrap rounded-xl border bg-slate-950 p-4 text-xs leading-5 text-slate-100">{packet}</pre>
            {method === 'zelle' && !organization?.email && !organization?.phone && <p className="text-xs font-medium text-amber-700">No Zelle contact is saved for this company. Verify and update the vendor organization before paying.</p>}
            <Button variant="outline" asChild><a href="https://www.wellsfargo.com/biz/online-banking/zelle/" target="_blank" rel="noopener noreferrer"><Landmark className="mr-2 h-4 w-4" />Open Wells Fargo Zelle information<ArrowUpRight className="ml-1 h-3.5 w-3.5" /></a></Button>
          </section>

          <section className="space-y-3 border-t pt-5">
            <div><h3 className="font-semibold">2. Record the completed bank transaction</h3><p className="text-xs text-muted-foreground">Only continue after Wells Fargo shows the transaction confirmation.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Amount"><Input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></Field>
              <Field label="Paid date"><Input type="date" max={today()} value={paidDate} onChange={(event) => setPaidDate(event.target.value)} /></Field>
              <Field label="Method"><Select value={method} onValueChange={setMethod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{methods.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Bank reference / confirmation *"><Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Zelle or bank confirmation" /></Field>
            </div>
            <Field label="Internal note"><Textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional reconciliation note" /></Field>
            <div>
              <Label className="mb-2 block">Bank-generated payment evidence *</Label>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-4 hover:border-emerald-600/50">
                <Upload className="h-5 w-5 text-emerald-700" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{proof?.name || 'Upload confirmation PDF or screenshot'}</p><p className="text-xs text-muted-foreground">The evidence is stored privately with the project audit record.</p></div>
                <input className="hidden" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setProof(event.target.files?.[0] ?? null)} />
              </label>
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-muted/40 p-3 text-sm">
              <Checkbox checked={confirmed} onCheckedChange={(value) => setConfirmed(value === true)} className="mt-0.5" />
              <span>I personally verified the payee, completed this payment outside ProjOS, and confirm the uploaded evidence matches the amount, date, and reference above.</span>
            </label>
          </section>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={!canRecord} onClick={recordPayment}>{(addPayment.isPending || artifacts.upload.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Record with evidence</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
