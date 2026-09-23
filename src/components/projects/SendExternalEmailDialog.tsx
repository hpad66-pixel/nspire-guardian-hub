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

export interface SendExternalEmailPreviewAttachment {
  filename: string;
  url: string;
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
  contentText?: string;
  deliveryMode?: 'branded' | 'attachment_only';
  onSent?: () => void;
  /** Optional PDF (or other) attachment — used by consulting invoices. */
  pdfAttachment?: SendExternalEmailAttachment;
  /** Optional multiple attachments. Takes precedence over pdfAttachment. */
  attachments?: SendExternalEmailAttachment[];
  previewAttachments?: SendExternalEmailPreviewAttachment[];
  fromName?: string;
  fromEmail?: string;
  fromEmailVerified?: boolean;
  senderNotice?: string;
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
      <PopoverContent className="w-72 border border-[#d9d4c9] bg-white p-4 text-[#1A1714] shadow-xl" side="top" align="start">
        <p className="text-sm font-semibold mb-0.5 text-[#1A1714]">Save to Contacts</p>
        <p className="text-xs text-[#60615d] mb-3">{email}</p>

        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-[#1A1714]">First name *</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
                className="h-8 bg-white text-sm text-[#1A1714] placeholder:text-[#8a857c]"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[#1A1714]">Last name</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
                className="h-8 bg-white text-sm text-[#1A1714] placeholder:text-[#8a857c]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-[#1A1714]">Company</Label>
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Corp"
              className="h-8 bg-white text-sm text-[#1A1714] placeholder:text-[#8a857c]"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-[#1A1714]">Contact type</Label>
            <Select value={contactType} onValueChange={(v) => setContactType(v as ContactType)}>
              <SelectTrigger className="h-8 bg-white text-sm text-[#1A1714]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white text-[#1A1714]">
                {(Object.keys(CONTACT_TYPE_LABELS) as ContactType[]).map((t) => (
                  <SelectItem key={t} value={t} className="text-sm text-[#1A1714]">
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
  contentText,
  deliveryMode = 'branded',
  onSent,
  pdfAttachment,
  attachments,
  previewAttachments = [],
  fromName,
  fromEmail,
  fromEmailVerified = true,
  senderNotice,
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
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

  const sendEmail = useSendEmail();
  const outboundAttachments = attachments?.length ? attachments : pdfAttachment ? [pdfAttachment] : [];
  const firstAttachment = outboundAttachments[0];
  const activePreview = previewAttachments[activePreviewIndex] ?? previewAttachments[0];
  const attachmentOnly = deliveryMode === 'attachment_only';

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

  const buildPlainBodyText = () =>
    [
      message.trim(),
      contentText?.trim() ||
        (outboundAttachments.length
          ? `Attached: ${outboundAttachments.map((attachment) => attachment.filename).join(', ')}`
          : `Attached: ${documentTitle}`),
    ]
      .filter(Boolean)
      .join('\n\n');

  const buildSimpleAttachmentBody = () => {
    const bodyText = buildPlainBodyText();
    const paragraphs = bodyText
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .map(
        (paragraph) =>
          `<p style="margin:0 0 14px; font-size:15px; line-height:1.55; color:#111827;">${escapeEmailHtml(paragraph).replace(/\n/g, '<br/>')}</p>`,
      )
      .join('');
    return `
<div style="font-family:Arial,sans-serif; color:#111827; max-width:620px;">
  ${paragraphs}
</div>`;
  };

  const buildEmailBody = () => {
    if (attachmentOnly) return buildSimpleAttachmentBody();

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
    if (attachmentOnly && outboundAttachments.length === 0) {
      toast.error('Attach the invoice PDF before sending');
      return;
    }
    await sendEmail.mutateAsync({
      recipients: toEmails,
      ccRecipients: ccEmails.length > 0 ? ccEmails : undefined,
      bccRecipients: bccEmails.length > 0 ? bccEmails : undefined,
      subject,
      bodyHtml: buildEmailBody(),
      bodyText: attachmentOnly ? buildPlainBodyText() : undefined,
      fromName,
      fromEmail,
      attachments: outboundAttachments.length
        ? outboundAttachments.map((attachment) => ({
            filename: attachment.filename,
            contentBase64: attachment.contentBase64,
            contentType: attachment.contentType,
            size: Math.round((attachment.contentBase64.length * 3) / 4),
          }))
        : undefined,
      projectId,
      sourceModule: 'project-client-email',
      reportType: documentType,
      attachmentFilename: firstAttachment?.filename,
      attachmentSize: firstAttachment ? Math.round((firstAttachment.contentBase64.length * 3) / 4) : undefined,
    });
    handleOpenChange(false);
    onSent?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
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

        <ScrollArea className="min-h-0 flex-1">
          <div className="grid gap-5 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-5">
            {/* Document preview */}
            <div className="grid gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 sm:grid-cols-2">
              <div className="flex items-start gap-2.5 rounded-xl bg-white p-3">
                <DocIcon className="mt-0.5 h-4 w-4 text-emerald-700" />
                <div>
                  <p className="text-sm font-semibold text-[#082b23]">
                    {attachmentOnly ? 'Simple email cover note' : 'Branded email body'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {attachmentOnly ? 'The client deliverable is the attached PDF.' : 'The document summary is readable in the message.'}
                  </p>
                </div>
                <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex items-start gap-2.5 rounded-xl bg-white p-3">
                <Paperclip className="mt-0.5 h-4 w-4 text-emerald-700" />
                <div className="min-w-0"><p className="text-sm font-semibold text-[#082b23]">{outboundAttachments.length ? 'PDF attached' : 'Project document included'}</p><p className="truncate text-xs text-muted-foreground">{outboundAttachments.length ? outboundAttachments.map((a) => a.filename).join(', ') : documentTitle}</p></div>
                <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-600" />
              </div>
            </div>

            {(fromEmail || senderNotice) && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="font-semibold">Sender identity</p>
                {fromName && fromEmail && (
                  <p className="mt-0.5">{fromName} &lt;{fromEmail}&gt;</p>
                )}
                {!fromEmailVerified && (
                  <p className="mt-1">This address is staged in ProjOS, but the sending provider must verify the domain before email can truly leave from it.</p>
                )}
                {senderNotice && <p className="mt-1">{senderNotice}</p>}
              </div>
            )}

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

            <aside className="lg:sticky lg:top-0 lg:self-start">
              <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="border-b bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Client preview</p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{subject}</p>
                </div>
                <div className="max-h-[520px] overflow-auto p-4">
                  <div
                    className="origin-top-left scale-[0.82] rounded-xl border bg-white"
                    style={{ width: '122%', transformOrigin: 'top left' }}
                    dangerouslySetInnerHTML={{ __html: buildEmailBody() }}
                  />
                </div>
                <div className="border-t bg-slate-50 px-4 py-3 text-xs text-slate-500">
                  {outboundAttachments.length
                    ? `PDF attachment${outboundAttachments.length === 1 ? '' : 's'}: ${outboundAttachments.map((a) => a.filename).join(', ')}`
                    : 'No PDF attachment is currently bundled.'}
                </div>
              </div>
              {previewAttachments.length > 0 && (
                <div className="mt-3 overflow-hidden rounded-2xl border bg-white shadow-sm">
                  <div className="border-b bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Attachment preview</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {previewAttachments.map((attachment, index) => (
                        <button
                          key={`${attachment.filename}-${index}`}
                          type="button"
                          onClick={() => setActivePreviewIndex(index)}
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${index === activePreviewIndex ? 'bg-[#082b23] text-white' : 'bg-white text-slate-600 border'}`}
                        >
                          {attachment.filename}
                        </button>
                      ))}
                    </div>
                  </div>
                  {activePreview?.contentType.includes('pdf') ? (
                    <iframe title={activePreview.filename} src={activePreview.url} className="h-[360px] w-full bg-slate-100" />
                  ) : activePreview?.contentType.startsWith('image/') ? (
                    <img src={activePreview.url} alt={activePreview.filename} className="max-h-[360px] w-full object-contain bg-slate-100" />
                  ) : (
                    <div className="p-4 text-xs text-muted-foreground">Preview is not available for this file type.</div>
                  )}
                </div>
              )}
            </aside>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="shrink-0 border-t bg-[#fbfaf5] px-6 py-4 shadow-[0_-12px_28px_rgba(37,44,57,0.08)] flex flex-wrap items-center justify-between gap-3">
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
              disabled={toEmails.length === 0 || sendEmail.isPending || (attachmentOnly && outboundAttachments.length === 0)}
              className="gap-2 bg-[#082b23] text-white hover:bg-[#0d493c]"
            >
              {sendEmail.isPending ? (
                'Sending...'
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  {attachmentOnly ? 'Send PDF invoice' : outboundAttachments.length ? 'Send email with attachment' : 'Send branded email'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
