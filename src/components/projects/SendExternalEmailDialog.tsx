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
import { ContactPicker } from '@/components/crm/ContactPicker';
import { useSendEmail } from '@/hooks/useSendEmail';
import { useCreateCRMContact } from '@/hooks/useCRMContacts';
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
  | 'action_item';

export interface SendExternalEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: ExternalEmailDocType;
  documentTitle: string;
  documentId: string;
  projectName: string;
  defaultSubject?: string;
  contentHtml?: string;
  onSent?: () => void;
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
  action_item: {
    label: 'Action Item',
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    Icon: ClipboardList,
  },
};

// ── Save-to-Contacts mini popover shown on each email tag ─────────────────────
function deriveNameFromEmail(email: string) {
  const local = email.split('@')[0] ?? '';
  const cleaned = local
    .replace(/[._-]+/g, ' ')
    .replace(/\d+/g, ' ')
    .trim();

  if (!cleaned) return '';

  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function SaveContactPopover({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(() => deriveNameFromEmail(email));
  const createContact = useCreateCRMContact();

  const handleSave = async () => {
    const fullName = name.trim();
    if (!fullName) {
      toast.error('Name is required');
      return;
    }

    const [firstName, ...rest] = fullName.split(/\s+/);
    const lastName = rest.join(' ').trim();

    await createContact.mutateAsync({
      first_name: firstName,
      last_name: lastName || undefined,
      email,
      contact_type: 'other',
    });

    setSaved(true);
    setOpen(false);
  };

  if (saved) {
    return (
      <span title="Saved to Contacts" className="text-primary">
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
          <div className="space-y-1">
            <Label className="text-xs">Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              className="h-8 text-sm"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>

          <Button
            size="sm"
            className="w-full gap-1.5 mt-1"
            onClick={handleSave}
            disabled={createContact.isPending || !name.trim()}
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
  documentId,
  projectName,
  defaultSubject,
  contentHtml,
  onSent,
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
      ? `<p style="margin:0 0 20px; font-size:15px; color:#374151;">${message.replace(/\n/g, '<br/>')}</p>`
      : '';
    const divider = '<hr style="border:none; border-top:1px solid #E5E7EB; margin:24px 0;"/>';
    const docBlock = contentHtml
      ? `${divider}${contentHtml}`
      : `${divider}<p style="font-size:13px; color:#6B7280;">Document: <strong>${documentTitle}</strong> — ${cfg.label} from project <strong>${projectName}</strong></p>`;

    return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; max-width:620px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #E5E7EB;">
  <div style="background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%); padding:28px 32px 24px;">
    <p style="margin:0 0 4px; font-size:11px; text-transform:uppercase; letter-spacing:1.5px; color:#94A3B8;">${cfg.label}</p>
    <h1 style="margin:0; font-size:20px; font-weight:700; color:#F8FAFC; line-height:1.3;">${documentTitle}</h1>
    <p style="margin:8px 0 0; font-size:13px; color:#64748B;">Project: ${projectName}</p>
  </div>
  <div style="padding:28px 32px;">
    ${greeting}
    ${docBlock}
  </div>
  <div style="background:#F8FAFC; padding:16px 32px; border-top:1px solid #E5E7EB;">
    <p style="margin:0; font-size:11px; color:#94A3B8;">
      Sent via APAS Project Management Platform &bull; This email was sent on behalf of your project team.
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
    });
    handleOpenChange(false);
    onSent?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', cfg.bg)}>
              <Mail className={cn('h-5 w-5', cfg.color)} />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-base flex items-center gap-2">
                Send via Email
                <Badge variant="secondary" className={cn('text-xs font-medium', cfg.color, cfg.bg)}>
                  {cfg.label}
                </Badge>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Send this document to any external contact
              </p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="px-6 py-5 space-y-5">
            {/* Document preview */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border">
              <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', cfg.bg)}>
                <DocIcon className={cn('h-4 w-4', cfg.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{documentTitle}</p>
                <p className="text-xs text-muted-foreground">{projectName}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground border rounded-full px-2 py-0.5 shrink-0">
                <Paperclip className="h-3 w-3" />
                Summary included
              </span>
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
                  label="BCC"
                  tags={bccEmails}
                  onChange={setBccEmails}
                  placeholder="Add BCC recipients..."
                />
              </div>
              <div className="pt-6">
                <ContactPicker
                  selectedEmails={bccEmails}
                  onSelect={setBccEmails}
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
                placeholder="Add a note to the recipient — this will appear above the document details..."
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
              ? 'Add at least one recipient to send'
              : [
                  `To: ${toEmails.length}`,
                  ccEmails.length > 0 ? `CC: ${ccEmails.length}` : null,
                  bccEmails.length > 0 ? `BCC: ${bccEmails.length}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={toEmails.length === 0 || sendEmail.isPending}
              className="gap-2"
            >
              {sendEmail.isPending ? (
                'Sending...'
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
