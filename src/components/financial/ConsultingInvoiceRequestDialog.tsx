import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Mail, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useOrganizations, type Organization } from '@/hooks/useDirectory';
import { useConsultingInvoiceRequests } from '@/hooks/useConsultingCashFlow';
import { toast } from 'sonner';

type Result = { link: string; emailSent: boolean; deliveryError: string | null };

export function ConsultingInvoiceRequestDialog({
  open, onOpenChange, projectId, initialOrganizationId,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  projectId: string;
  initialOrganizationId?: string;
}) {
  const { data: organizations = [] } = useOrganizations();
  const { requestInvoice } = useConsultingInvoiceRequests(projectId);
  const vendors = useMemo(() => organizations.filter((item) => ['sub', 'vendor', 'consultant', 'other'].includes(item.kind)), [organizations]);
  const [organizationId, setOrganizationId] = useState(initialOrganizationId ?? '');
  const [email, setEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOrganizationId(initialOrganizationId ?? '');
    const initial = organizations.find((item) => item.id === initialOrganizationId);
    setEmail(initial?.email ?? '');
    setRecipientName('');
    setDueDate('');
    setMessage('');
    setResult(null);
    setCopied(false);
  }, [open, initialOrganizationId, organizations]);

  function chooseVendor(id: string) {
    setOrganizationId(id);
    const vendor = vendors.find((item) => item.id === id);
    setEmail(vendor?.email ?? '');
  }

  async function request() {
    const response = await requestInvoice.mutateAsync({ organizationId, email, recipientName, dueDate, message });
    setResult(response);
    if (response.emailSent) toast.success('Secure invoice request emailed');
    else toast.success('Secure request created — copy or share the link');
  }

  async function copy() {
    if (!result?.link) return;
    await navigator.clipboard.writeText(result.link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const selected = vendors.find((item) => item.id === organizationId) as Organization | undefined;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>Request a subcontractor invoice</DialogTitle>
          <DialogDescription>A private one-time link lets the vendor upload and attest their invoice without creating a password.</DialogDescription>
        </DialogHeader>
        {!result ? (
          <div className="space-y-4 py-1">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-sm text-emerald-950">
              <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" /> Secure by design</div>
              <p className="mt-1 text-xs text-emerald-800">The raw link token is never stored. It expires after 14 days and stops working immediately after submission.</p>
            </div>
            <Field label="Vendor company *"><Select value={organizationId} onValueChange={chooseVendor}><SelectTrigger><SelectValue placeholder="Choose a vendor or consultant" /></SelectTrigger><SelectContent>{vendors.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Recipient email *"><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="billing@vendor.com" /></Field>
              <Field label="Recipient name"><Input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} placeholder="Accounts receivable" /></Field>
              <Field label="Requested by"><Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></Field>
              <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground"><span className="font-semibold text-foreground">Company on record</span><br />{selected?.email || 'No company email saved—use the recipient field.'}</div>
            </div>
            <Field label="Instructions"><Textarea rows={3} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Billing period, deliverable, or other invoice instructions" /></Field>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 font-semibold text-emerald-900"><Check className="h-4 w-4" /> Request ready</div>
              <p className="mt-1 text-sm text-emerald-800">{result.emailSent ? `Email sent to ${email}.` : 'Email delivery is not configured, so share the secure link below.'}</p>
              {result.deliveryError && <p className="mt-1 text-xs text-amber-700">Delivery note: {result.deliveryError}</p>}
            </div>
            <div className="flex items-center gap-2 rounded-xl border p-3">
              <code className="min-w-0 flex-1 break-all text-xs">{result.link}</code>
              <Button size="sm" variant="outline" onClick={copy}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}<span className="ml-1">{copied ? 'Copied' : 'Copy'}</span></Button>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{result ? 'Done' : 'Cancel'}</Button>
          {!result && <Button onClick={request} disabled={requestInvoice.isPending || !organizationId || !/^\S+@\S+\.\S+$/.test(email)}><Mail className="mr-2 h-4 w-4" />{requestInvoice.isPending ? 'Creating…' : 'Send secure request'}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
