import { useState, KeyboardEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ContactPicker } from '@/components/crm/ContactPicker';
import { useSendEmail } from '@/hooks/useSendEmail';
import {
  Mail,
  X,
  ChevronDown,
  ChevronUp,
  Send,
  Paperclip,
  Users,
  FileText,
  ReceiptText,
  ClipboardList,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────
export type ExternalEmailDocType =
  | 'rfi'
  | 'submittal'
  | 'change_order'
  | 'progress_report'
  | 'proposal';

export interface SendExternalEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: ExternalEmailDocType;
  documentTitle: string;
  documentId: string;
  projectName: string;
  /** Optional pre-filled subject (overrides the auto-generated one) */
  defaultSubject?: string;
  /** HTML snippet representing the document body in the email */
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
};

// ── Email tag input (inline, no extra dep) ────────────────────────────────────
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
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-destructive transition-colors"
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
          className="flex-1 min-w-[180px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
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
  const [showCcBcc, setShowCcBcc] = useState(false);

  const sendEmail = useSendEmail();

  // Reset state when dialog opens fresh
  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setToEmails([]);
      setCcEmails([]);
      setBccEmails([]);
      setSubject(autoSubject);
      setMessage('');
      setShowCcBcc(false);
    }
    onOpenChange(v);
  };

  // Build the email HTML body
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
  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%); padding:28px 32px 24px;">
    <p style="margin:0 0 4px; font-size:11px; text-transform:uppercase; letter-spacing:1.5px; color:#94A3B8;">${cfg.label}</p>
    <h1 style="margin:0; font-size:20px; font-weight:700; color:#F8FAFC; line-height:1.3;">${documentTitle}</h1>
    <p style="margin:8px 0 0; font-size:13px; color:#64748B;">Project: ${projectName}</p>
  </div>
  <!-- Body -->
  <div style="padding:28px 32px;">
    ${greeting}
    ${docBlock}
  </div>
  <!-- Footer -->
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
        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', cfg.bg)}>
              <Mail className={cn('h-5 w-5', cfg.color)} />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-base flex items-center gap-2">
                Send via Email
                <Badge
                  variant="secondary"
                  className={cn('text-xs font-medium', cfg.color, cfg.bg)}
                >
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
            {/* Document preview chip */}
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

            {/* To field */}
            <div className="space-y-2">
              <div className="flex items-end justify-between">
                <div className="flex-1">
                  <EmailTagInput
                    label="To"
                    tags={toEmails}
                    onChange={setToEmails}
                    placeholder="Enter email address and press Enter..."
                  />
                </div>
                <ContactPicker
                  selectedEmails={toEmails}
                  onSelect={setToEmails}
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-2 h-9 shrink-0 text-xs gap-1.5"
                    >
                      <Users className="h-3.5 w-3.5" />
                      Contacts
                    </Button>
                  }
                />
              </div>

              {/* CC/BCC toggle */}
              <button
                type="button"
                onClick={() => setShowCcBcc(!showCcBcc)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showCcBcc ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                {showCcBcc ? 'Hide CC / BCC' : 'Add CC / BCC'}
              </button>

              {showCcBcc && (
                <div className="space-y-3 pt-1">
                  <EmailTagInput label="CC" tags={ccEmails} onChange={setCcEmails} />
                  <EmailTagInput label="BCC" tags={bccEmails} onChange={setBccEmails} />
                </div>
              )}
            </div>

            <Separator />

            {/* Subject */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Subject
              </Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="text-sm"
              />
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

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t bg-muted/20 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {toEmails.length === 0
              ? 'Add at least one recipient to send'
              : `Sending to ${toEmails.length} recipient${toEmails.length > 1 ? 's' : ''}${ccEmails.length > 0 ? ` + ${ccEmails.length} CC` : ''}`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={toEmails.length === 0 || sendEmail.isPending}
              className="gap-2"
            >
              {sendEmail.isPending ? (
                <>Sending...</>
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
