import { useEffect, useState, type KeyboardEvent } from 'react';
import { CheckCircle2, FileText, Loader2, Mail, Paperclip, Send, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { ContactPicker } from '@/components/crm/ContactPicker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSendEmail } from '@/hooks/useSendEmail';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface PreparedReportDelivery {
  bodyHtml: string;
  bodyText: string;
  pdfBase64: string;
  pdfSize: number;
}

interface BrandedReportEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportTitle: string;
  projectName: string;
  filename: string;
  defaultSubject: string;
  defaultMessage?: string;
  projectId?: string | null;
  sourceModule: string;
  reportType: string;
  prepareDelivery: (message: string) => Promise<PreparedReportDelivery>;
}

function normalizedEmails(entries: string[]) {
  return [...new Set(entries.map((entry) => entry.trim().toLowerCase()).filter(Boolean))];
}

function RecipientField({
  id,
  label,
  hint,
  value,
  onChange,
  projectId,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string[];
  onChange: (emails: string[]) => void;
  projectId?: string | null;
}) {
  const [input, setInput] = useState('');

  const addInput = () => {
    const candidates = input.split(/[,;\s]+/).map((entry) => entry.trim().toLowerCase()).filter(Boolean);
    if (!candidates.length) return;
    const invalid = candidates.filter((entry) => !EMAIL_PATTERN.test(entry));
    if (invalid.length) {
      toast.error(`Check the email address: ${invalid[0]}`);
      return;
    }
    onChange(normalizedEmails([...value, ...candidates]));
    setInput('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',' || event.key === ';') {
      event.preventDefault();
      addInput();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}{hint && <span className="ml-1 font-normal text-muted-foreground">{hint}</span>}</Label>
        <ContactPicker
          selectedEmails={value}
          onSelect={(emails) => onChange(normalizedEmails(emails))}
          projectId={projectId || undefined}
          defaultScope={projectId ? 'project' : 'workspace'}
          trigger={<Button type="button" variant="ghost" size="sm" className="h-7 gap-1.5 text-xs"><Users className="h-3.5 w-3.5" />Contacts</Button>}
        />
      </div>
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border bg-background px-2.5 py-2 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        {value.map((email) => (
          <Badge key={email} variant={id === 'report-bcc' ? 'outline' : 'secondary'} className="max-w-full gap-1 py-1">
            <span className="truncate">{email}</span>
            <button type="button" aria-label={`Remove ${email}`} onClick={() => onChange(value.filter((entry) => entry !== email))} className="rounded-full p-0.5 hover:bg-black/5"><X className="h-3 w-3" /></button>
          </Badge>
        ))}
        <input
          id={id}
          type="email"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={addInput}
          placeholder={value.length ? 'Add another…' : 'name@example.com'}
          className="h-7 min-w-[170px] flex-1 bg-transparent text-sm outline-none"
        />
      </div>
    </div>
  );
}

export function BrandedReportEmailDialog({
  open,
  onOpenChange,
  reportTitle,
  projectName,
  filename,
  defaultSubject,
  defaultMessage = '',
  projectId,
  sourceModule,
  reportType,
  prepareDelivery,
}: BrandedReportEmailDialogProps) {
  const sendEmail = useSendEmail();
  const [to, setTo] = useState<string[]>([]);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);
  const [preparing, setPreparing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSubject(defaultSubject);
    setMessage(defaultMessage);
  }, [defaultMessage, defaultSubject, open]);

  async function handleSend() {
    const recipients = normalizedEmails(to);
    if (!recipients.length) {
      toast.error('Add at least one client or recipient.');
      return;
    }
    if (!subject.trim()) {
      toast.error('Add an email subject.');
      return;
    }

    const ccRecipients = normalizedEmails(cc).filter((entry) => !recipients.includes(entry));
    const bccRecipients = normalizedEmails(bcc).filter((entry) => !recipients.includes(entry) && !ccRecipients.includes(entry));
    setPreparing(true);
    const progress = toast.loading('Preparing the HTML report and matching PDF…');
    try {
      const delivery = await prepareDelivery(message.trim());
      await sendEmail.mutateAsync({
        recipients,
        ccRecipients,
        bccRecipients,
        subject: subject.trim(),
        bodyHtml: delivery.bodyHtml,
        bodyText: delivery.bodyText,
        attachments: [{
          filename,
          contentBase64: delivery.pdfBase64,
          contentType: 'application/pdf',
          size: delivery.pdfSize,
        }],
        projectId: projectId || undefined,
        sourceModule,
        reportType,
        attachmentFilename: filename,
        attachmentSize: delivery.pdfSize,
      });
      toast.success(`Sent ${reportTitle} as HTML and PDF.`, { id: progress });
      onOpenChange(false);
      setTo([]);
      setCc([]);
      setBcc([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The report could not be sent.', { id: progress });
    } finally {
      setPreparing(false);
    }
  }

  const busy = preparing || sendEmail.isPending;
  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl" data-testid="branded-report-email-dialog">
        <DialogHeader>
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#082b23] text-amber-300"><Mail className="h-5 w-5" /></div>
          <DialogTitle className="font-display text-2xl text-[#082b23]">Email the client-ready report</DialogTitle>
          <DialogDescription>{projectName} · {reportTitle}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 sm:grid-cols-2">
          <div className="flex items-start gap-2.5 rounded-xl bg-white p-3"><FileText className="mt-0.5 h-4 w-4 text-emerald-700" /><div><p className="text-sm font-semibold text-[#082b23]">Branded HTML email</p><p className="text-xs text-muted-foreground">The report is readable directly in the message.</p></div><CheckCircle2 className="ml-auto h-4 w-4 text-emerald-600" /></div>
          <div className="flex items-start gap-2.5 rounded-xl bg-white p-3"><Paperclip className="mt-0.5 h-4 w-4 text-emerald-700" /><div className="min-w-0"><p className="text-sm font-semibold text-[#082b23]">Matching PDF attached</p><p className="truncate text-xs text-muted-foreground">{filename}</p></div><CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-600" /></div>
        </div>

        <div className="space-y-4 py-1">
          <RecipientField id="report-to" label="To" value={to} onChange={setTo} projectId={projectId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <RecipientField id="report-cc" label="CC" hint="(optional)" value={cc} onChange={setCc} projectId={projectId} />
            <RecipientField id="report-bcc" label="BCC" hint="(private)" value={bcc} onChange={setBcc} projectId={projectId} />
          </div>
          <div className="space-y-2"><Label htmlFor="report-subject">Subject</Label><Input id="report-subject" value={subject} onChange={(event) => setSubject(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="report-message">Personal note <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id="report-message" rows={4} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Add the decision, response, or next action you want from the client…" /></div>
          <p className="text-xs leading-relaxed text-muted-foreground">BCC recipients remain hidden. Your configured sender copy is added automatically, and the delivery is recorded in the project email audit trail.</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={() => void handleSend()} disabled={busy || !to.length} className="bg-[#082b23] text-white hover:bg-[#0d493c]">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {busy ? 'Preparing and sending…' : 'Send HTML + PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
