import { useState, KeyboardEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ContactPicker } from '@/components/crm/ContactPicker';
import { useSendEmail } from '@/hooks/useSendEmail';
import { useCreateCRMContact, type ContactType, CONTACT_TYPE_LABELS } from '@/hooks/useCRMContacts';
import {
  Mail,
  X,
  Send,
  Paperclip,
  Users,
  FileText,
  ReceiptText,
  ClipboardList,
  BarChart3,
  UserPlus,
  Check,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────
export type ExternalEmailDocType =
  | 'rfi'
  | 'submittal'
  | 'change_order'
  | 'progress_report'
  | 'proposal'
  | 'invoice';

export interface SendExternalEmailAttachment {
  filename: string;
  contentBase64: string;
  contentType: string;
}

export interface SendExternalEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: ExternalEmailDocType;
  documentTitle: string;
  documentId: string;
  projectName: string;
  projectId?: string;
  defaultSubject?: string;
  contentHtml?: string;
  onSent?: () => void;
  /** Optional PDF (or other) attachment — used by consulting invoices. */
  pdfAttachment?: SendExternalEmailAttachment;
}

// ── Config per document type ──────────────────────────────────────────────────
const DOC_CONFIG: Record<
  ExternalEmailDocType,
  { label: string; color: string; bg: string; Icon: React.ElementType }
> = {
  rfi: {
    label: 'RFI',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    Icon: ClipboardList,
  },
  submittal: {
    label: 'Submittal',
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    Icon: FileText,
  },
  change_order: {
    label: 'Change Order',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    Icon: ReceiptText,
  },
  progress_report: {
    label: 'Progress Report',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    Icon: BarChart3,
  },
  proposal: {
    label: 'Proposal',
    color: 'text-primary',
    bg: 'bg-primary/10',
    Icon: FileText,
  },
  invoice: {
    label: 'Invoice',
    color: 'text-[var(--apas-sapphire)]',
    bg: 'bg-blue-500/10',
    Icon: ReceiptText,
  },
};

function escapeEmailHtml(value: unknown) {
  return String(value ?? '')
    .replace(/[—–‑]/g, '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Save-to-Contacts mini popover shown on each email tag ─────────────────────
function SaveContactPopover({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [contactType, setContactType] = useState<ContactType>('other');
  const createContact = useCreateCRMContact();

  const handleSave = async () => {
    if (!firstName.trim()) {
      toast.error('First name is required');
      return;
    }
    await createContact.mutateAsync({
      first_name: firstName.trim(),
      last_name: lastName.trim() || undefined,
      company_name: company.trim() || undefined,
      email,
      contact_type: contactType,
    });
    setSaved(true);
    setOpen(false);
  };

  if (saved) {
    return (
      <span title="Saved to Contacts" className="text-green-600 dark:text-green-400">
        <Check className="h-3 w-3" />
      </span>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Save to Contacts"
          className="hover:text-primary transition-colors"
        >
          <UserPlus className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" side="top" align="start">
        <p className="text-sm font-semibold mb-0.5">Save to Contacts</p>
        <p className="text-xs text-muted-foreground mb-3">{email}</p>

        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">First name *</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
                className="h-8 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Last name</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Company</Label>
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Corp"
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Contact type</Label>
            <Select value={contactType} onValueChange={(v) => setContactType(v as ContactType)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CONTACT_TYPE_LABELS) as ContactType[]).map((t) => (
                  <SelectItem key={t} value={t} className="text-sm">
                    {CONTACT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            size="sm"
            className="w-full gap-1.5 mt-1"
            onClick={handleSave}
            disabled={createContact.isPending || !firstName.trim()}
          >
            <Check className="h-3.5 w-3.5" />
            {createContact.isPending ? 'Saving...' : 'Save Contact'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Email tag input ────────────────────────────────────────────────────────────
function EmailTagInput({
  label,
  tags,
  onChange,
  placeholder = 'name@company.com',
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState('');

  const addTag = (raw: string) => {
    const email = raw.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email) || tags.includes(email)) return;
    onChange([...tags, email]);
    setInput('');
  };

  const removeTag = (email: string) => onChange(tags.filter((t) => t !== email));

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground uppercase tracking-wide">{label}</Label>
      <div className="min-h-[40px] flex flex-wrap gap-1.5 items-center px-3 py-2 rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
          >
            {tag}
            {/* Save-to-contacts icon on every typed email tag */}
            <SaveContactPopover email={tag} />
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-destructive transition-colors ml-0.5"
              title="Remove"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => addTag(input)}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[160px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <p className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
        Press <kbd className="px-1 rounded bg-muted text-[10px]">Enter</kbd> or{' '}
        <kbd className="px-1 rounded bg-muted text-[10px]">,</kbd> to add ·
        tap <UserPlus className="inline h-3 w-3 mx-0.5" /> on a tag to save to Contacts
      </p>
    </div>
  );
}

// ── Main Dialog ───────────────────────────────────────────────────────────────
export function SendExternalEmailDialog({
  open,
  onOpenChange,
  documentType,
  documentTitle,
  documentId: _documentId,
  projectName,
  projectId,
  defaultSubject,
  contentHtml,
  onSent,
  pdfAttachment,
}: SendExternalEmailDialogProps) {
  const cfg = DOC_CONFIG[documentType];
  const DocIcon = cfg.Icon;

  const autoSubject =
    defaultSubject ?? `${cfg.label}: ${documentTitle} | ${projectName}`;

  const [toEmails, setToEmails] = useState<string[]>([]);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [bccEmails, setBccEmails] = useState<string[]>([]);
  const [subject, setSubject] = useState(autoSubject);
  const [message, setMessage] = useState('');

  const sendEmail = useSendEmail();

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setToEmails([]);
      setCcEmails([]);
      setBccEmails([]);
      setSubject(autoSubject);
      setMessage('');
    }
    onOpenChange(v);
  };

  const buildEmailBody = () => {
    const greeting = message
      ? `<p style="margin:0 0 20px; font-size:15px; line-height:1.65; color:#374151;">${escapeEmailHtml(message).replace(/\n/g, '<br/>')}</p>`
      : '';
    const divider = '<hr style="border:none; border-top:1px solid #E5E7EB; margin:24px 0;"/>';
    const docBlock = contentHtml
      ? `${divider}${contentHtml}`
      : `${divider}<p style="font-size:13px; color:#6B7280;">Document: <strong>${escapeEmailHtml(documentTitle)}</strong> - ${escapeEmailHtml(cfg.label)} from project <strong>${escapeEmailHtml(projectName)}</strong></p>`;

    return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; max-width:620px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #E5E7EB;">
  <div style="background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%); padding:28px 32px 24px;">
    <p style="margin:0 0 4px; font-size:11px; text-transform:uppercase; letter-spacing:1.5px; color:#EDCE79;">${escapeEmailHtml(cfg.label)}</p>
    <h1 style="margin:0; font-size:22px; font-weight:700; color:#F8FAFC; line-height:1.3;">${escapeEmailHtml(documentTitle)}</h1>
    <p style="margin:8px 0 0; font-size:13px; color:#C6D9D3;">Project: ${escapeEmailHtml(projectName)}</p>
  </div>
  <div style="padding:28px 32px;">
    ${greeting}
    ${docBlock}
  </div>
  <div style="background:#F8FAFC; padding:16px 32px; border-top:1px solid #E5E7EB;">
    <p style="margin:0; font-size:11px; color:#94A3B8;">
      Sent via Proj OS Project Management Platform. This email was sent on behalf of your project team.
    </p>
  </div>
</div>`;
  };

  const handleSend = async () => {
    if (toEmails.length === 0) {
      toast.error('Please add at least one recipient');
      return;
    }
    await sendEmail.mutateAsync({
      recipients: toEmails,
      ccRecipients: ccEmails.length > 0 ? ccEmails : undefined,
      bccRecipients: bccEmails.length > 0 ? bccEmails : undefined,
      subject,
      bodyHtml: buildEmailBody(),
      attachments: pdfAttachment
        ? [{
            filename: pdfAttachment.filename,
            contentBase64: pdfAttachment.contentBase64,
            contentType: pdfAttachment.contentType,
            size: Math.round((pdfAttachment.contentBase64.length * 3) / 4),
          }]
        : undefined,
      projectId,
      sourceModule: 'project-client-email',
      reportType: documentType,
      attachmentFilename: pdfAttachment?.filename,
      attachmentSize: pdfAttachment ? Math.round((pdfAttachment.contentBase64.length * 3) / 4) : undefined,
    });
    handleOpenChange(false);
    onSent?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl gap-0 overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="border-b bg-[#f7faf8] px-6 pb-4 pt-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#082b23] text-amber-300">
              <Mail className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2 font-display text-2xl text-[#082b23]">
                Email the client-ready document
                <Badge variant="secondary" className={cn('text-xs font-medium', cfg.color, cfg.bg)}>
                  {cfg.label}
                </Badge>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {projectName} | {documentTitle}
              </p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="px-6 py-5 space-y-5">
            {/* Document preview */}
            <div className="grid gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 sm:grid-cols-2">
              <div className="flex items-start gap-2.5 rounded-xl bg-white p-3">
                <DocIcon className="mt-0.5 h-4 w-4 text-emerald-700" />
                <div><p className="text-sm font-semibold text-[#082b23]">Branded HTML email</p><p className="text-xs text-muted-foreground">The document summary is readable in the message.</p></div>
                <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex items-start gap-2.5 rounded-xl bg-white p-3">
                <Paperclip className="mt-0.5 h-4 w-4 text-emerald-700" />
                <div className="min-w-0"><p className="text-sm font-semibold text-[#082b23]">{pdfAttachment ? 'Matching file attached' : 'Project document included'}</p><p className="truncate text-xs text-muted-foreground">{pdfAttachment ? pdfAttachment.filename : documentTitle}</p></div>
                <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-600" />
              </div>
            </div>

            {/* To */}
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <EmailTagInput
                  label="To"
                  tags={toEmails}
                  onChange={setToEmails}
                  placeholder="Enter email and press Enter..."
                />
              </div>
              <div className="pt-6">
                <ContactPicker
                  selectedEmails={toEmails}
                  onSelect={setToEmails}
                  projectId={projectId}
                  defaultScope={projectId ? "project" : "workspace"}
                  trigger={
                    <Button variant="outline" size="sm" className="h-9 shrink-0 text-xs gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      Contacts
                    </Button>
                  }
                />
              </div>
            </div>

            {/* CC */}
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <EmailTagInput
                  label="CC"
                  tags={ccEmails}
                  onChange={setCcEmails}
                  placeholder="Add CC recipients..."
                />
              </div>
              <div className="pt-6">
                <ContactPicker
                  selectedEmails={ccEmails}
                  onSelect={setCcEmails}
                  projectId={projectId}
                  defaultScope={projectId ? "project" : "workspace"}
                  trigger={
                    <Button variant="outline" size="sm" className="h-9 shrink-0 text-xs gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      Contacts
                    </Button>
                  }
                />
              </div>
            </div>

            {/* BCC */}
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <EmailTagInput
                  label="BCC (private)"
                  tags={bccEmails}
                  onChange={setBccEmails}
                  placeholder="Add BCC recipients..."
                />
              </div>
              <div className="pt-6">
                <ContactPicker
                  selectedEmails={bccEmails}
                  onSelect={setBccEmails}
                  projectId={projectId}
                  defaultScope={projectId ? "project" : "workspace"}
                  trigger={
                    <Button variant="outline" size="sm" className="h-9 shrink-0 text-xs gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      Contacts
                    </Button>
                  }
                />
              </div>
            </div>

            <Separator />

            {/* Subject */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="text-sm" />
            </div>

            {/* Personal message */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Personal Message{' '}
                <span className="normal-case text-muted-foreground/60">(optional)</span>
              </Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add the decision, response, or next action you want from the client..."
                rows={3}
                className="text-sm resize-none"
              />
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/20 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {toEmails.length === 0
              ? 'Add at least one client or recipient to send'
              : [
                  `To: ${toEmails.length}`,
                  ccEmails.length > 0 ? `CC: ${ccEmails.length}` : null,
                  bccEmails.length > 0 ? `BCC: ${bccEmails.length}` : null,
                ]
                  .filter(Boolean)
                  .join(' | ')}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={toEmails.length === 0 || sendEmail.isPending}
              className="gap-2 bg-[#082b23] text-white hover:bg-[#0d493c]"
            >
              {sendEmail.isPending ? (
                'Sending...'
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  {pdfAttachment ? 'Send HTML + attachment' : 'Send branded email'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
