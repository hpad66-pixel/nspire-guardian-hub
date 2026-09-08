import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Mail, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useOrganizations } from '@/hooks/useDirectory';
import { useCRMContacts } from '@/hooks/useCRMContacts';
import { useConsultingInvoiceRequests } from '@/hooks/useConsultingCashFlow';
import { buildVendorInvoiceRecipients } from '@/lib/financial/vendorInvoiceRecipients';
import { toast } from 'sonner';

type Result = {
  link: string;
  emailSent: boolean;
  deliveryError: string | null;
  linkedContactCount: number;
  crmSyncStatus: 'synced' | 'failed';
  crmSyncError: string | null;
};

export function ConsultingInvoiceRequestDialog({
  open, onOpenChange, projectId, initialOrganizationId,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  projectId: string;
  initialOrganizationId?: string;
}) {
  const { data: organizations = [] } = useOrganizations();
  const { data: contacts = [] } = useCRMContacts();
  const { requestInvoice } = useConsultingInvoiceRequests(projectId);
  const recipients = useMemo(() => buildVendorInvoiceRecipients(organizations, contacts), [organizations, contacts]);
  const contactRecipients = useMemo(() => recipients.filter((item) => item.source === 'contact'), [recipients]);
  const organizationRecipients = useMemo(() => recipients.filter((item) => item.source === 'organization'), [recipients]);
  const [recipientKey, setRecipientKey] = useState(initialOrganizationId ? `organization:${initialOrganizationId}` : '');
  const [email, setEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);
  const initializedForOpen = useRef(false);

  useEffect(() => {
    if (!open) {
      initializedForOpen.current = false;
      return;
    }
    if (initializedForOpen.current) return;
    initializedForOpen.current = true;
    const initialKey = initialOrganizationId ? `organization:${initialOrganizationId}` : '';
    const initial = recipients.find((item) => item.key === initialKey);
    setRecipientKey(initialKey);
    setEmail(initial?.email ?? '');
    setRecipientName('');
    setDueDate('');
    setMessage('');
    setResult(null);
    setCopied(false);
  }, [open, initialOrganizationId, recipients]);

  function chooseVendor(key: string) {
    setRecipientKey(key);
    const vendor = recipients.find((item) => item.key === key);
    setEmail(vendor?.email ?? '');
    setRecipientName(vendor?.contactName ?? '');
  }

  async function request() {
    const selected = recipients.find((item) => item.key === recipientKey);
    if (!selected) return;
    const response = await requestInvoice.mutateAsync({
      organizationId: selected.organizationId,
      contactId: selected.contactId,
      email,
      recipientName,
      dueDate,
      message,
    });
    setResult(response);
    if (response.emailSent && response.crmSyncStatus === 'synced') toast.success('Invoice request sent and vendor synchronized');
    else if (response.emailSent) toast.success('Secure invoice request emailed');
    else toast.success('Secure request created - copy or share the link');
  }

  async function copy() {
    if (!result?.link) return;
    await navigator.clipboard.writeText(result.link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const selected = recipients.find((item) => item.key === recipientKey);
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
            <Field label="Vendor company or CRM contact *"><Select value={recipientKey} onValueChange={chooseVendor}><SelectTrigger><SelectValue placeholder="Choose from contacts or vendor companies" /></SelectTrigger><SelectContent>
              {contactRecipients.length > 0 && <SelectGroup><SelectLabel>CRM contacts</SelectLabel>{contactRecipients.map((item) => <SelectItem key={item.key} value={item.key}>{item.vendorName}{item.contactName && item.contactName !== item.vendorName ? ` - ${item.contactName}` : ''}</SelectItem>)}</SelectGroup>}
              {organizationRecipients.length > 0 && <SelectGroup><SelectLabel>Vendor companies</SelectLabel>{organizationRecipients.map((item) => <SelectItem key={item.key} value={item.key}>{item.vendorName}</SelectItem>)}</SelectGroup>}
            </SelectContent></Select><p className="text-xs text-muted-foreground">Existing CRM contacts are automatically attached to this project and resolved to a reusable vendor company.</p></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Recipient email *"><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="billing@vendor.com" /></Field>
              <Field label="Recipient name"><Input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} placeholder="Accounts receivable" /></Field>
              <Field label="Requested by"><Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></Field>
              <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground"><span className="font-semibold text-foreground">Record on file</span><br />{selected?.detail || 'Choose an existing contact or company.'}</div>
            </div>
            <Field label="Instructions"><Textarea rows={3} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Billing period, deliverable, or other invoice instructions" /></Field>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 font-semibold text-emerald-900"><Check className="h-4 w-4" /> Request ready</div>
              <p className="mt-1 text-sm text-emerald-800">{result.emailSent ? `Email sent to ${email}.` : 'Email delivery is not configured, so share the secure link below.'}</p>
              <p className="mt-1 text-xs text-emerald-800">{result.linkedContactCount > 0 ? `${result.linkedContactCount} contact${result.linkedContactCount === 1 ? '' : 's'} attached to the project. ` : ''}{result.crmSyncStatus === 'synced' ? 'APAS CRM is synchronized.' : 'The ProjOS link is complete; APAS CRM synchronization needs attention.'}</p>
              {result.deliveryError && <p className="mt-1 text-xs text-amber-700">Delivery note: {result.deliveryError}</p>}
              {result.crmSyncError && <p className="mt-1 text-xs text-amber-700">CRM note: {result.crmSyncError}</p>}
            </div>
            <div className="flex items-center gap-2 rounded-xl border p-3">
              <code className="min-w-0 flex-1 break-all text-xs">{result.link}</code>
              <Button size="sm" variant="outline" onClick={copy}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}<span className="ml-1">{copied ? 'Copied' : 'Copy'}</span></Button>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{result ? 'Done' : 'Cancel'}</Button>
          {!result && <Button onClick={request} disabled={requestInvoice.isPending || !recipientKey || !/^\S+@\S+\.\S+$/.test(email)}><Mail className="mr-2 h-4 w-4" />{requestInvoice.isPending ? 'Creating…' : 'Send secure request'}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
