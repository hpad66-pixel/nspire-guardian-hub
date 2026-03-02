import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Link2, Copy, CheckCheck, Send, MessageCircle, ClipboardList,
  AlertCircle, Clock, CheckSquare, DollarSign, Info, HelpCircle,
  Receipt, Eye, GitFork, Loader2, Plus, Camera, Image as ImageIcon,
  ExternalLink, Users, ChevronDown, ChevronUp, Trash2, Check, Mail,
} from 'lucide-react';
import { SendExternalEmailDialog } from './SendExternalEmailDialog';
import {
  useClientMessages,
  useClientMessagesRealtime,
  useSendMessage,
  useMarkMessageRead,
  useClientActionItems,
  useCreateActionItem,
  useResolveActionItem,
  type ActionItemType,
  type ActionItemPriority,
} from '@/hooks/useClientCommunication';
import { useAuth } from '@/hooks/useAuth';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClientUpdate {
  id: string;
  title: string;
  body: string;
  photo_url: string | null;
  update_type: string | null;
  created_at: string;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

function usePortalUpdates(projectId: string) {
  return useQuery({
    queryKey: ['portal-updates-pm', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_client_updates' as any)
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) { console.warn(error.message); return [] as ClientUpdate[]; }
      return (data ?? []) as unknown as ClientUpdate[];
    },
    enabled: !!projectId,
  });
}

function useCreateUpdate(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title: string; body: string; photoUrl?: string; updateType?: string }) => {
      const { data: session } = await supabase.auth.getSession();
      const { error } = await supabase
        .from('project_client_updates' as any)
        .insert({
          project_id: projectId,
          title: payload.title,
          body: payload.body,
          photo_url: payload.photoUrl ?? null,
          update_type: payload.updateType ?? 'general',
          created_by: session.session?.user.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-updates-pm', projectId] });
      queryClient.invalidateQueries({ queryKey: ['portal-updates', projectId] });
      toast.success('Update posted to client portal');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Action type config ───────────────────────────────────────────────────────

const ACTION_TYPE_CONFIG: Record<ActionItemType, { label: string; color: string; bg: string; icon: React.FC<any> }> = {
  decision:      { label: 'Decision Needed',  color: 'text-purple-400',  bg: 'bg-purple-500/10',  icon: GitFork     },
  approval:      { label: 'Approval Needed',  color: 'text-blue-400',    bg: 'bg-blue-500/10',    icon: CheckSquare },
  payment:       { label: 'Payment Due',       color: 'text-amber-400',   bg: 'bg-amber-500/10',   icon: DollarSign  },
  information:   { label: 'Info Requested',    color: 'text-teal-400',    bg: 'bg-teal-500/10',    icon: Info        },
  rfi_response:  { label: 'RFI Response',      color: 'text-blue-400',    bg: 'bg-blue-500/10',    icon: HelpCircle  },
  change_order:  { label: 'Change Order',      color: 'text-orange-400',  bg: 'bg-orange-500/10',  icon: Receipt     },
  acknowledgment:{ label: 'Please Review',     color: 'text-slate-400',   bg: 'bg-slate-500/10',   icon: Eye         },
};

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  pending:   { label: 'Pending',   dot: 'bg-amber-400'  },
  viewed:    { label: 'Viewed',    dot: 'bg-blue-400'   },
  responded: { label: 'Responded', dot: 'bg-green-400'  },
  resolved:  { label: 'Resolved',  dot: 'bg-muted-foreground' },
  cancelled: { label: 'Cancelled', dot: 'bg-muted-foreground' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

// Copy-able portal link
function PortalLink({ projectId }: { projectId: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/portal/${projectId}`;

  function copy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Link2 className="h-3.5 w-3.5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Client Portal Link</h3>
          <p className="text-[11px] text-muted-foreground">Share this link with your client</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 bg-muted/40 rounded-lg px-3 py-2 text-xs text-muted-foreground font-mono truncate border border-border/50">
          {url}
        </div>
        <Button size="sm" variant="outline" onClick={copy} className="shrink-0">
          {copied ? <CheckCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          <span className="ml-1.5">{copied ? 'Copied!' : 'Copy'}</span>
        </Button>
        <Button size="sm" variant="ghost" onClick={() => window.open(url, '_blank')} className="shrink-0 px-2">
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        The client must be signed in (or invited) to view their portal.
      </p>
    </div>
  );
}

// PM message thread
function PMMessageThread({ projectId, accentColor }: { projectId: string; accentColor: string }) {
  const { user } = useAuth();
  const { data: messages = [], isLoading } = useClientMessages(projectId);
  useClientMessagesRealtime(projectId);
  const markRead = useMarkMessageRead();
  const sendMsg = useSendMessage();
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  // Mark unread client→pm messages as read
  useEffect(() => {
    if (!user) return;
    messages
      .filter((m) => m.direction === 'client_to_pm' && !m.read_by_pm)
      .forEach((m) => markRead.mutate({ messageId: m.id, projectId, side: 'pm' }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, user]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [draft]);

  async function handleSend() {
    if (!draft.trim()) return;
    const text = draft.trim();
    setDraft('');
    await sendMsg.mutateAsync({ projectId, body: text, direction: 'pm_to_client' });
  }

  const isMe = (dir: string) => dir === 'pm_to_client';

  return (
    <div className="rounded-xl border bg-card overflow-hidden flex flex-col" style={{ height: 420 }}>
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center gap-2 shrink-0">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <MessageCircle className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">Client Messages</h3>
          <p className="text-[11px] text-muted-foreground">Two-way conversation with your client</p>
        </div>
        {messages.filter(m => m.direction === 'client_to_pm' && !m.read_by_pm).length > 0 && (
          <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
            {messages.filter(m => m.direction === 'client_to_pm' && !m.read_by_pm).length} new
          </Badge>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={18} className="animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <MessageCircle size={24} className="text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No messages yet. Send the first one to your client.</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => {
            const mine = isMe(msg.direction);
            const showLabel = i === 0 || messages[i - 1].direction !== msg.direction;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={cn('flex flex-col', mine ? 'items-end' : 'items-start', showLabel ? 'mt-3' : 'mt-0.5')}
              >
                {showLabel && (
                  <p className="text-[10px] text-muted-foreground mb-1 px-1">
                    {mine ? 'You (PM)' : 'Client'}
                  </p>
                )}
                <div
                  className={cn('max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed', mine ? 'rounded-br-sm' : 'rounded-bl-sm')}
                  style={mine ? { background: accentColor, color: 'white' } : { background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' }}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                </div>
                <p className={cn('text-[10px] text-muted-foreground mt-0.5 px-1', mine ? 'text-right' : 'text-left')}>
                  {format(new Date(msg.created_at), 'h:mm a · MMM d')}
                  {mine && <span className="ml-1">{msg.read_by_client ? '· Seen' : '· Sent'}</span>}
                </p>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <div className="shrink-0 border-t px-3 py-2">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message your client..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground outline-none leading-relaxed py-0.5 max-h-[120px]"
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || sendMsg.isPending}
            className={cn(
              'shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all',
              draft.trim() ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            {sendMsg.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// Create action item dialog
function buildActionItemEmailHtml({
  type, title, description, priority, dueDate, amount, options,
}: {
  type: ActionItemType; title: string; description?: string;
  priority: string; dueDate?: string; amount?: number; options?: string[];
}) {
  const typeLabel = ACTION_TYPE_CONFIG[type]?.label ?? type;
  const priorityColors: Record<string, string> = {
    urgent: '#EF4444', normal: '#3B82F6', low: '#6B7280',
  };
  const priorityColor = priorityColors[priority] ?? '#3B82F6';
  const dueDateStr = dueDate ? new Date(dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null;

  return `
  <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff;">
    <div style="border-left:4px solid ${priorityColor};padding-left:16px;margin-bottom:24px;">
      <p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6B7280;margin:0 0 4px 0;">${typeLabel}</p>
      <h1 style="font-size:22px;font-weight:700;color:#111827;margin:0;line-height:1.3;">${title}</h1>
    </div>
    ${description ? `<p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 20px 0;">${description}</p>` : ''}
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr>
        <td style="padding:8px 12px;background:#F9FAFB;border-radius:6px 0 0 6px;font-size:12px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Priority</td>
        <td style="padding:8px 12px;background:#F9FAFB;border-radius:0 6px 6px 0;font-size:14px;color:${priorityColor};font-weight:600;">${priority.charAt(0).toUpperCase() + priority.slice(1)}</td>
      </tr>
      ${dueDateStr ? `<tr><td style="padding:8px 12px;font-size:12px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Due Date</td><td style="padding:8px 12px;font-size:14px;color:#111827;">${dueDateStr}</td></tr>` : ''}
      ${amount ? `<tr><td style="padding:8px 12px;background:#F9FAFB;border-radius:6px 0 0 6px;font-size:12px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Amount</td><td style="padding:8px 12px;background:#F9FAFB;border-radius:0 6px 6px 0;font-size:14px;color:#111827;font-weight:600;">$${amount.toLocaleString()}</td></tr>` : ''}
    </table>
    ${options && options.length > 0 ? `
      <div style="margin-bottom:20px;">
        <p style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#6B7280;font-weight:600;margin:0 0 8px 0;">Options</p>
        ${options.map(o => `<div style="display:inline-block;padding:6px 14px;margin:0 6px 6px 0;background:#EFF6FF;color:#1D4ED8;border-radius:20px;font-size:13px;font-weight:500;">${o}</div>`).join('')}
      </div>
    ` : ''}
    <div style="border-top:1px solid #E5E7EB;padding-top:20px;margin-top:8px;">
      <p style="font-size:14px;color:#374151;line-height:1.6;margin:0;">
        <strong>To respond:</strong> Simply reply to this email with your answer or selection. Your response will be automatically logged and the team will be notified.
      </p>
    </div>
    <p style="font-size:11px;color:#9CA3AF;margin:24px 0 0 0;">Sent via APAS — Project Management Platform</p>
  </div>`;
}

function CreateActionItemDialog({
  projectId, open, onOpenChange,
}: { projectId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const createItem = useCreateActionItem();
  const [type, setType] = useState<ActionItemType>('information');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<ActionItemPriority>('normal');
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');
  const [options, setOptions] = useState('');
  const [sendExternal, setSendExternal] = useState(false);
  const [externalEmail, setExternalEmail] = useState('');
  const [isSending, setIsSending] = useState(false);

  function reset() {
    setType('information'); setTitle(''); setDescription('');
    setPriority('normal'); setDueDate(''); setAmount(''); setOptions('');
    setSendExternal(false); setExternalEmail(''); setIsSending(false);
  }

  async function handleSubmit() {
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (sendExternal && !externalEmail.trim()) { toast.error('Recipient email is required'); return; }

    setIsSending(true);
    try {
      // Create in DB
      await createItem.mutateAsync({
        projectId,
        actionType: type,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
        amount: amount ? Number(amount) : undefined,
        options: type === 'decision' && options.trim()
          ? options.split(',').map(o => o.trim()).filter(Boolean)
          : undefined,
      });

      // Send external email if toggled
      if (sendExternal && externalEmail.trim()) {
        const parsedOptions = type === 'decision' && options.trim()
          ? options.split(',').map(o => o.trim()).filter(Boolean) : undefined;

        const bodyHtml = buildActionItemEmailHtml({
          type, title: title.trim(), description: description.trim() || undefined,
          priority, dueDate: dueDate || undefined,
          amount: amount ? Number(amount) : undefined, options: parsedOptions,
        });

        const typeLabel = ACTION_TYPE_CONFIG[type]?.label ?? type;
        const { error } = await supabase.functions.invoke('send-email', {
          body: {
            recipients: externalEmail.split(',').map(e => e.trim()).filter(Boolean),
            subject: `Action Required: ${title.trim()} — ${typeLabel}`,
            bodyHtml,
            bodyText: `${typeLabel}: ${title.trim()}\n\n${description || ''}\n\nPriority: ${priority}\n${dueDate ? `Due: ${dueDate}` : ''}\n\nPlease reply to this email with your response.`,
          },
        });

        if (error) {
          console.error('External email failed:', error);
          toast.error('Action item created, but email delivery failed');
        } else {
          toast.success('Action item created & email sent!');
        }
      }

      reset();
      onOpenChange(false);
    } catch (err) {
      // createItem already toasts on error
    } finally {
      setIsSending(false);
    }
  }

  const isPending = createItem.isPending || isSending;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Action Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Type */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as ActionItemType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(ACTION_TYPE_CONFIG) as [ActionItemType, typeof ACTION_TYPE_CONFIG[ActionItemType]][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    <span className={cn('font-medium', v.color)}>{v.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Title */}
          <div className="space-y-1.5">
            <Label>Title <span className="text-destructive">*</span></Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Please select your flooring material" />
          </div>
          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Provide context for the client..." rows={3} />
          </div>
          {/* Decision options */}
          {type === 'decision' && (
            <div className="space-y-1.5">
              <Label>Options (comma-separated)</Label>
              <Input value={options} onChange={e => setOptions(e.target.value)} placeholder="White Oak, Engineered Hardwood, Tile" />
            </div>
          )}
          {/* Amount for payment */}
          {type === 'payment' && (
            <div className="space-y-1.5">
              <Label>Amount ($)</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="4200" />
            </div>
          )}
          {/* Priority + Due date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as ActionItemPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent"><span className="text-destructive font-medium">Urgent</span></SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>

          {/* ── External Email Toggle ─────────────────────────────── */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sendExternal}
                onChange={e => setSendExternal(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <div>
                <span className="text-sm font-medium">Also email externally</span>
                <p className="text-[11px] text-muted-foreground">Send a formatted email to contractors outside the system. They can reply directly by email.</p>
              </div>
            </label>
            {sendExternal && (
              <div className="space-y-1.5">
                <Label>Recipient Email(s)</Label>
                <Input
                  type="email"
                  value={externalEmail}
                  onChange={e => setExternalEmail(e.target.value)}
                  placeholder="contractor@example.com, another@example.com"
                />
                <p className="text-[10px] text-muted-foreground">Separate multiple emails with commas. Replies sync back to your dashboard.</p>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending || !title.trim()}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            {sendExternal ? 'Send & Email' : 'Send to Client'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Post update dialog
function PostUpdateDialog({
  projectId, open, onOpenChange,
}: { projectId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const createUpdate = useCreateUpdate(projectId);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [updateType, setUpdateType] = useState('general');

  function reset() { setTitle(''); setBody(''); setUpdateType('general'); }

  async function handleSubmit() {
    if (!title.trim() || !body.trim()) { toast.error('Title and body are required'); return; }
    await createUpdate.mutateAsync({ title: title.trim(), body: body.trim(), updateType });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Post Update to Client Portal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Update Type</Label>
            <Select value={updateType} onValueChange={setUpdateType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Update</SelectItem>
                <SelectItem value="progress">Progress</SelectItem>
                <SelectItem value="milestone">Milestone</SelectItem>
                <SelectItem value="photo">Photo Update</SelectItem>
                <SelectItem value="issue">Issue / Alert</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Title <span className="text-destructive">*</span></Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Foundation pour completed" />
          </div>
          <div className="space-y-1.5">
            <Label>Message <span className="text-destructive">*</span></Label>
            <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Describe what happened, what was accomplished, or what the client should know..." rows={5} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createUpdate.isPending || !title.trim() || !body.trim()}>
            {createUpdate.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
            Post Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Action item row (PM view)
function PMActionItemRow({ item, projectId, projectName }: { item: any; projectId: string; projectName?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const resolve = useResolveActionItem();
  const cfg = ACTION_TYPE_CONFIG[item.action_type as ActionItemType] ?? ACTION_TYPE_CONFIG.information;
  const TypeIcon = cfg.icon;
  const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
  const isResolved = item.status === 'resolved' || item.status === 'cancelled';

  const emailContentHtml = buildActionItemEmailHtml({
    type: item.action_type as ActionItemType,
    title: item.title,
    description: item.description || undefined,
    priority: item.priority || 'normal',
    dueDate: item.due_date || undefined,
    amount: item.amount ? Number(item.amount) : undefined,
    options: item.options || undefined,
  });

  return (
    <>
    <div className={cn(
      'rounded-xl border transition-all',
      isResolved ? 'opacity-60 bg-muted/20' : 'bg-card'
    )}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', cfg.bg)}>
          <TypeIcon className={cn('h-4 w-4', cfg.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold truncate">{item.title}</p>
            {item.priority === 'urgent' && (
              <Badge variant="destructive" className="text-[9px] h-4 px-1">URGENT</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={cn('inline-block w-1.5 h-1.5 rounded-full', statusCfg.dot)} />
            <span className="text-[11px] text-muted-foreground">{statusCfg.label}</span>
            {item.due_date && (
              <span className="text-[11px] text-muted-foreground">· Due {format(new Date(item.due_date), 'MMM d')}</span>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t pt-3">
              {item.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              )}
              {item.options && item.options.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {item.options.map((opt: string) => (
                    <span
                      key={opt}
                      className={cn(
                        'text-xs px-2 py-1 rounded-full border',
                        item.client_selection === opt
                          ? 'bg-primary/10 border-primary/30 text-primary font-medium'
                          : 'bg-muted/30 border-border text-muted-foreground'
                      )}
                    >
                      {item.client_selection === opt && <Check className="inline h-2.5 w-2.5 mr-1" />}
                      {opt}
                    </span>
                  ))}
                </div>
              )}
              {item.amount && (
                <div className="text-sm font-semibold text-amber-500">
                  ${Number(item.amount).toLocaleString()} due
                </div>
              )}
              {/* Client response */}
              {item.client_response && (
                <div className="bg-green-500/5 border border-green-500/20 rounded-lg px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-green-500 mb-1">Client Response</p>
                  <p className="text-sm text-foreground">{item.client_response}</p>
                  {item.responded_at && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(item.responded_at), 'MMM d, yyyy · h:mm a')}
                    </p>
                  )}
                </div>
              )}
              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {!isResolved && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-muted-foreground"
                    onClick={() => resolve.mutate({ itemId: item.id, projectId })}
                    disabled={resolve.isPending}
                  >
                    {resolve.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckSquare className="h-3.5 w-3.5" />}
                    <span className="ml-1.5">Mark Resolved</span>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setEmailOpen(true)}
                >
                  <Mail className="h-3.5 w-3.5" />
                  Send via Email
                </Button>
              </div>
              {isResolved && item.resolved_at && (
                <p className="text-[11px] text-muted-foreground">
                  Resolved {format(new Date(item.resolved_at), 'MMM d, yyyy')}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    <SendExternalEmailDialog
      open={emailOpen}
      onOpenChange={setEmailOpen}
      documentType="action_item"
      documentTitle={item.title}
      documentId={item.id}
      projectName={projectName || 'Project'}
      defaultSubject={`Action Required: ${item.title} — ${cfg.label}`}
      contentHtml={emailContentHtml}
    />
    </>
  );
}

// Updates feed (PM view)
function PMUpdatesFeed({ projectId }: { projectId: string }) {
  const { data: updates = [], isLoading } = usePortalUpdates(projectId);

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={18} className="animate-spin text-muted-foreground" />
    </div>
  );

  if (updates.length === 0) return (
    <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
      <Camera size={24} className="text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">No updates posted yet.</p>
      <p className="text-xs text-muted-foreground/60">Use "Post Update" to share job site progress with your client.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {updates.map((u) => (
        <div key={u.id} className="rounded-xl border bg-card overflow-hidden">
          {u.photo_url && (
            <img src={u.photo_url} alt="Update" className="w-full aspect-video object-cover" />
          )}
          <div className="p-4 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">{format(new Date(u.created_at), 'MMM d, yyyy')}</span>
              {u.update_type && (
                <span className="text-[10px] bg-muted/40 px-1.5 py-0.5 rounded text-muted-foreground capitalize">{u.update_type}</span>
              )}
            </div>
            <p className="font-semibold text-sm">{u.title}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{u.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ClientPortalTabProps {
  projectId: string;
  projectName?: string;
  accentColor?: string;
}

type PMView = 'overview' | 'messages' | 'action-items' | 'updates';

export function ClientPortalTab({ projectId, projectName, accentColor = 'hsl(217, 91%, 60%)' }: ClientPortalTabProps) {
  const [activeView, setActiveView] = useState<PMView>('overview');
  const [createActionOpen, setCreateActionOpen] = useState(false);
  const [postUpdateOpen, setPostUpdateOpen] = useState(false);

  const { data: allItems = [], isLoading: itemsLoading } = useClientActionItems(projectId);
  const { data: messages = [] } = useClientMessages(projectId);
  const { data: updates = [] } = usePortalUpdates(projectId);

  const pendingItems = allItems.filter(i => i.status === 'pending' || i.status === 'viewed');
  const resolvedItems = allItems.filter(i => i.status === 'resolved' || i.status === 'responded' || i.status === 'cancelled');
  const unreadFromClient = messages.filter(m => m.direction === 'client_to_pm' && !m.read_by_pm).length;

  const PM_VIEWS: { key: PMView; label: string; badge?: number }[] = [
    { key: 'overview',      label: 'Overview' },
    { key: 'messages',      label: 'Messages',     badge: unreadFromClient > 0 ? unreadFromClient : undefined },
    { key: 'action-items',  label: 'Action Items', badge: pendingItems.length > 0 ? pendingItems.length : undefined },
    { key: 'updates',       label: 'Updates' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Client Portal</h2>
          <p className="text-sm text-muted-foreground">Manage what your client sees and how they interact with the project.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setPostUpdateOpen(true)}>
            <Camera className="h-3.5 w-3.5 mr-1.5" />
            Post Update
          </Button>
          <Button size="sm" onClick={() => setCreateActionOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Send Action Item
          </Button>
        </div>
      </div>

      {/* Sub-nav */}
      <div className="flex items-center gap-1 border-b pb-0 overflow-x-auto">
        {PM_VIEWS.map(v => (
          <button
            key={v.key}
            onClick={() => setActiveView(v.key)}
            className={cn(
              'relative flex items-center gap-1.5 px-3 pb-2.5 text-sm font-medium whitespace-nowrap transition-colors',
              activeView === v.key
                ? 'text-primary border-b-2 border-primary -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {v.label}
            {v.badge !== undefined && (
              <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full">
                {v.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Views */}
      {activeView === 'overview' && (
        <div className="space-y-5">
          {/* Portal link */}
          <PortalLink projectId={projectId} />

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Pending Items', value: pendingItems.length, color: pendingItems.length > 0 ? 'text-amber-500' : 'text-muted-foreground' },
              { label: 'Unread Messages', value: unreadFromClient, color: unreadFromClient > 0 ? 'text-destructive' : 'text-muted-foreground' },
              { label: 'Updates Posted', value: updates.length, color: 'text-foreground' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border bg-card p-4 text-center">
                <p className={cn('text-2xl font-bold leading-none', s.color)}>{s.value}</p>
                <p className="text-[11px] text-muted-foreground mt-1.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Pending action items preview */}
          {pendingItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <h3 className="font-medium text-sm">Awaiting Client Response</h3>
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{pendingItems.length}</Badge>
              </div>
              <div className="space-y-2">
                {pendingItems.slice(0, 3).map(item => (
                  <PMActionItemRow key={item.id} item={item} projectId={projectId} projectName={projectName} />
                ))}
                {pendingItems.length > 3 && (
                  <button
                    className="text-sm text-primary hover:underline"
                    onClick={() => setActiveView('action-items')}
                  >
                    View all {pendingItems.length} items →
                  </button>
                )}
              </div>
            </div>
          )}

          {pendingItems.length === 0 && (
            <div className="flex items-center gap-2 text-green-600 text-sm bg-green-500/5 border border-green-500/20 rounded-xl px-4 py-3">
              <CheckSquare className="h-4 w-4" />
              <span>No items awaiting client response.</span>
            </div>
          )}
        </div>
      )}

      {activeView === 'messages' && (
        <PMMessageThread projectId={projectId} accentColor={accentColor} />
      )}

      {activeView === 'action-items' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">All Action Items</h3>
            <Button size="sm" onClick={() => setCreateActionOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />Send Item
            </Button>
          </div>
          {itemsLoading && <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>}
          {!itemsLoading && allItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
              <ClipboardList size={24} className="text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No action items sent yet.</p>
            </div>
          )}
          {pendingItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Awaiting Response</p>
              {pendingItems.map(item => <PMActionItemRow key={item.id} item={item} projectId={projectId} projectName={projectName} />)}
            </div>
          )}
          {resolvedItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Completed</p>
              {resolvedItems.map(item => <PMActionItemRow key={item.id} item={item} projectId={projectId} projectName={projectName} />)}
            </div>
          )}
        </div>
      )}

      {activeView === 'updates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Posted Updates</h3>
            <Button size="sm" variant="outline" onClick={() => setPostUpdateOpen(true)}>
              <Camera className="h-3.5 w-3.5 mr-1.5" />Post Update
            </Button>
          </div>
          <PMUpdatesFeed projectId={projectId} />
        </div>
      )}

      {/* Dialogs */}
      <CreateActionItemDialog projectId={projectId} open={createActionOpen} onOpenChange={setCreateActionOpen} />
      <PostUpdateDialog projectId={projectId} open={postUpdateOpen} onOpenChange={setPostUpdateOpen} />
    </div>
  );
}
