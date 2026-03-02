import { useState, useMemo, useRef } from 'react';
import { format, isToday, isTomorrow, isPast, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, CheckSquare, ChevronDown, ChevronRight, MessageSquare,
  Calendar, User, UserPlus, Flag, Trash2, Send, Loader2, Filter, Check,
  AlertCircle, Clock, Circle, MoreHorizontal, Mail, FileText,
} from 'lucide-react';
import { SendExternalEmailDialog } from './SendExternalEmailDialog';
import { ActionItemReportDialog } from './ActionItemReportDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useProjectTeamMembers, useAddProjectTeamMember } from '@/hooks/useProjectTeam';
import { useSearchProfiles } from '@/hooks/useProfiles';
import {
  useActionItemsByProject,
  useCreateActionItem,
  useUpdateActionItem,
  useDeleteActionItem,
  useActionItemComments,
  useCreateActionItemComment,
  type ActionItem,
  type ActionItemComment,
} from '@/hooks/useActionItems';

// ── Design tokens ──────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  urgent: {
    label: 'Urgent', dot: 'bg-red-500', border: 'border-l-red-500',
    badge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
    icon: <AlertCircle className="h-3 w-3" />,
  },
  high: {
    label: 'High', dot: 'bg-orange-500', border: 'border-l-orange-500',
    badge: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800',
    icon: <Flag className="h-3 w-3" />,
  },
  medium: {
    label: 'Medium', dot: 'bg-blue-500', border: 'border-l-blue-500',
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
    icon: <Circle className="h-3 w-3" />,
  },
  low: {
    label: 'Low', dot: 'bg-slate-400', border: 'border-l-slate-300',
    badge: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700',
    icon: <Circle className="h-3 w-3" />,
  },
} as const;

const STATUS_CONFIG = {
  todo:        { label: 'To Do',       class: 'bg-muted text-muted-foreground', next: 'in_progress' },
  in_progress: { label: 'In Progress', class: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400', next: 'in_review' },
  in_review:   { label: 'In Review',   class: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400', next: 'done' },
  done:        { label: 'Done',        class: 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400', next: 'todo' },
  cancelled:   { label: 'Cancelled',   class: 'bg-muted text-muted-foreground line-through', next: 'todo' },
} as const;

const PRIORITY_ORDER = ['urgent', 'high', 'medium', 'low'] as const;

// ── helpers ────────────────────────────────────────────────────────────────

function getDueDateLabel(dueDate: string | null) {
  if (!dueDate) return null;
  const d = new Date(dueDate + 'T00:00:00');
  if (isPast(d) && !isToday(d)) return { label: 'Overdue', class: 'text-red-600 dark:text-red-400' };
  if (isToday(d)) return { label: 'Today', class: 'text-orange-600 dark:text-orange-400' };
  if (isTomorrow(d)) return { label: 'Tomorrow', class: 'text-amber-600 dark:text-amber-400' };
  const diff = differenceInDays(d, new Date());
  if (diff <= 3) return { label: format(d, 'MMM d'), class: 'text-amber-600 dark:text-amber-400' };
  return { label: format(d, 'MMM d'), class: 'text-muted-foreground' };
}

function getInitials(name: string | null | undefined) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

// ── Sub-components ─────────────────────────────────────────────────────────

function CommentThread({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const { data: comments = [], isLoading } = useActionItemComments(itemId);
  const createComment = useCreateActionItemComment();
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const handleSend = async () => {
    if (!text.trim()) return;
    await createComment.mutateAsync({ actionItemId: itemId, content: text.trim() });
    setText('');
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  return (
    <div className="mt-3 border-t pt-3 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
        <MessageSquare className="h-3 w-3" /> Comments ({comments.length})
      </p>
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-8 bg-muted/50 rounded-lg animate-pulse" />)}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No comments yet. Start the conversation.</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {comments.map((c: ActionItemComment) => (
            <div key={c.id} className="flex gap-2">
              <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                <AvatarImage src={c.creator?.avatar_url ?? undefined} />
                <AvatarFallback className="text-[9px]">{getInitials(c.creator?.full_name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-[11px] font-semibold">{c.creator?.full_name || 'Unknown'}</span>
                  <span className="text-[10px] text-muted-foreground">{format(new Date(c.created_at), 'MMM d, h:mm a')}</span>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed mt-0.5">{c.content}</p>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Add a comment…"
          className="h-8 text-xs flex-1"
        />
        <Button
          size="icon"
          className="h-8 w-8 shrink-0 bg-module-projects hover:bg-module-projects/90"
          onClick={handleSend}
          disabled={!text.trim() || createComment.isPending}
        >
          {createComment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}

function AddMemberInlineDropdown({ projectId, existingUserIds, onAdded }: { projectId: string; existingUserIds: Set<string>; onAdded: (userId: string) => void }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const { data: results = [] } = useSearchProfiles(search);
  const addMember = useAddProjectTeamMember();
  const addable = results.filter(p => !existingUserIds.has(p.user_id));

  if (!open) {
    return (
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setOpen(true); }} className="gap-2 text-xs text-primary">
        <UserPlus className="h-3.5 w-3.5" /> Add team member...
      </DropdownMenuItem>
    );
  }

  return (
    <div className="px-2 py-1 space-y-1" onClick={e => e.stopPropagation()}>
      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search users..."
        className="h-7 text-xs"
        autoFocus
        onKeyDown={e => e.stopPropagation()}
      />
      {addable.slice(0, 5).map(p => (
        <button
          key={p.user_id}
          type="button"
          className="w-full flex items-center gap-2 px-1 py-1 rounded text-xs hover:bg-accent transition-colors text-left"
          disabled={addMember.isPending}
          onClick={async () => {
            try {
              await addMember.mutateAsync({ projectId, userId: p.user_id, role: 'subcontractor' });
              onAdded(p.user_id);
            } catch {}
          }}
        >
          <Avatar className="h-5 w-5">
            <AvatarImage src={p.avatar_url ?? undefined} />
            <AvatarFallback className="text-[8px]">{(p.full_name || '?').charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="truncate">{p.full_name || p.email}</span>
        </button>
      ))}
      {addable.length === 0 && search && <p className="text-[10px] text-muted-foreground text-center py-1">No users found</p>}
    </div>
  );
}

function TaskCard({
  item,
  projectId,
  projectName,
  currentUserId,
  expanded,
  onToggleExpand,
}: {
  item: ActionItem;
  projectId: string;
  projectName?: string;
  currentUserId: string;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const updateItem = useUpdateActionItem(projectId);
  const deleteItem = useDeleteActionItem(projectId);
  const { data: teamMembers = [] } = useProjectTeamMembers(projectId);
  const profiles = teamMembers.map(m => ({
    user_id: m.user_id,
    full_name: m.profile?.full_name ?? null,
    email: m.profile?.email ?? null,
    avatar_url: m.profile?.avatar_url ?? null,
  }));

  const [editTitle, setEditTitle] = useState(item.title);
  const [editDesc, setEditDesc] = useState(item.description || '');
  const [editingTitle, setEditingTitle] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const pri = PRIORITY_CONFIG[item.priority];
  const sta = STATUS_CONFIG[item.status];
  const dueInfo = getDueDateLabel(item.due_date);
  const isDone = item.status === 'done';
  const isCreator = item.created_by === currentUserId;

  const handleCheck = () => {
    const newStatus = isDone ? 'todo' : 'done';
    updateItem.mutate({ id: item.id, status: newStatus, previous_assigned_to: item.assigned_to });
  };

  const handleStatusCycle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = sta.next as ActionItem['status'];
    updateItem.mutate({ id: item.id, status: next, previous_assigned_to: item.assigned_to });
  };

  const handleAssign = (userId: string | null) => {
    updateItem.mutate({ id: item.id, assigned_to: userId, previous_assigned_to: item.assigned_to });
  };

  const handlePriority = (p: ActionItem['priority']) => {
    updateItem.mutate({ id: item.id, priority: p, previous_assigned_to: item.assigned_to });
  };

  const handleDueDate = (date: Date | undefined) => {
    updateItem.mutate({ id: item.id, due_date: date ? format(date, 'yyyy-MM-dd') : null, previous_assigned_to: item.assigned_to });
  };

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle !== item.title) {
      updateItem.mutate({ id: item.id, title: editTitle.trim(), previous_assigned_to: item.assigned_to });
    }
    setEditingTitle(false);
  };

  const handleSaveDesc = () => {
    if (editDesc !== (item.description || '')) {
      updateItem.mutate({ id: item.id, description: editDesc.trim() || null, previous_assigned_to: item.assigned_to });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return;
    await deleteItem.mutateAsync(item.id);
    toast.success('Task deleted');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
      className={cn(
        'rounded-xl border bg-card border-l-4 transition-shadow hover:shadow-md',
        pri.border,
        isDone && 'opacity-60'
      )}
    >
      {/* ── Main row ── */}
      <div className="flex items-start gap-2.5 p-3 cursor-pointer" onClick={onToggleExpand}>
        {/* Checkbox */}
        <button
          onClick={e => { e.stopPropagation(); handleCheck(); }}
          className={cn(
            'mt-0.5 h-4.5 w-4.5 rounded border-2 shrink-0 flex items-center justify-center transition-all',
            isDone
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-border hover:border-module-projects'
          )}
          style={{ minWidth: 18, minHeight: 18 }}
        >
          {isDone && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
        </button>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium leading-snug', isDone && 'line-through text-muted-foreground')}>
            {item.title}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {/* Status pill */}
            <button
              onClick={handleStatusCycle}
              className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold border transition-all hover:opacity-80', sta.class)}
            >
              {sta.label}
            </button>

            {/* Assignee */}
            {item.assignee && (
              <div className="flex items-center gap-1">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={item.assignee.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[8px]">{getInitials(item.assignee.full_name)}</AvatarFallback>
                </Avatar>
                <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                  {item.assignee.full_name?.split(' ')[0]}
                </span>
              </div>
            )}

            {/* Due date */}
            {dueInfo && (
              <span className={cn('text-[10px] flex items-center gap-0.5 font-medium', dueInfo.class)}>
                <Clock className="h-2.5 w-2.5" />
                {dueInfo.label}
              </span>
            )}

            {/* Comment count */}
            {(item.comment_count || 0) > 0 && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <MessageSquare className="h-2.5 w-2.5" />
                {item.comment_count}
              </span>
            )}
          </div>
        </div>

        {/* Expand chevron */}
        <button className="shrink-0 text-muted-foreground hover:text-foreground mt-1" onClick={onToggleExpand}>
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* ── Expanded detail ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t"
          >
            <div className="p-3 pt-3 space-y-3 bg-muted/20">
              {/* Editable title */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Title</p>
                {editingTitle ? (
                  <Input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                    className="h-7 text-sm"
                    autoFocus
                  />
                ) : (
                  <p
                    className="text-sm font-medium cursor-text hover:bg-muted rounded px-1.5 py-0.5 -mx-1.5"
                    onClick={() => setEditingTitle(true)}
                  >
                    {item.title}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Description</p>
                <Textarea
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  onBlur={handleSaveDesc}
                  placeholder="Add details…"
                  className="text-xs min-h-[60px] resize-none bg-background"
                  rows={3}
                />
              </div>

              {/* Controls row */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Priority picker */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className={cn('h-7 text-[11px] gap-1.5 border', pri.badge)}>
                      {pri.icon}
                      {pri.label}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-36">
                    {PRIORITY_ORDER.map(p => (
                      <DropdownMenuItem key={p} onClick={() => handlePriority(p)} className="gap-2 text-xs">
                        <span className={cn('h-2 w-2 rounded-full', PRIORITY_CONFIG[p].dot)} />
                        {PRIORITY_CONFIG[p].label}
                        {item.priority === p && <Check className="h-3 w-3 ml-auto" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Assignee picker */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1.5">
                      <User className="h-3 w-3" />
                      {item.assignee?.full_name?.split(' ')[0] || 'Assign'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 max-h-52 overflow-y-auto">
                    <DropdownMenuItem onClick={() => handleAssign(null)} className="text-xs text-muted-foreground">
                      Unassign
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {profiles.map(p => (
                      <DropdownMenuItem key={p.user_id} onClick={() => handleAssign(p.user_id)} className="gap-2 text-xs">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={p.avatar_url ?? undefined} />
                          <AvatarFallback className="text-[8px]">{getInitials(p.full_name)}</AvatarFallback>
                        </Avatar>
                        {p.full_name || p.email}
                        {item.assigned_to === p.user_id && <Check className="h-3 w-3 ml-auto" />}
                      </DropdownMenuItem>
                    ))}
                    {profiles.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">No team members yet</p>
                    )}
                    <DropdownMenuSeparator />
                    <AddMemberInlineDropdown projectId={projectId} existingUserIds={new Set(profiles.map(p => p.user_id))} onAdded={handleAssign} />
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Due date picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn('h-7 text-[11px] gap-1.5', dueInfo && dueInfo.class)}>
                      <Calendar className="h-3 w-3" />
                      {item.due_date ? format(new Date(item.due_date + 'T00:00:00'), 'MMM d') : 'Due date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={item.due_date ? new Date(item.due_date + 'T00:00:00') : undefined}
                      onSelect={handleDueDate}
                    />
                  </PopoverContent>
                </Popover>

                {/* Spacer + email + delete */}
                <div className="flex-1" />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] gap-1.5"
                  onClick={() => setEmailOpen(true)}
                >
                  <Mail className="h-3 w-3" />
                  Email
                </Button>
                {isCreator && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={handleDelete}
                    disabled={deleteItem.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {/* Linked entity */}
              {item.linked_entity_type && (
                <p className="text-[10px] text-muted-foreground">
                  Linked to: <span className="font-medium capitalize">{item.linked_entity_type}</span>
                </p>
              )}

              {/* Comments */}
              <CommentThread itemId={item.id} onClose={() => {}} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SendExternalEmailDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        documentType="action_item"
        documentTitle={item.title}
        documentId={item.id}
        projectName={projectName || 'Project'}
        defaultSubject={`Action Item: ${item.title}`}
        contentHtml={`
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;">
            <div style="border-left:4px solid ${PRIORITY_CONFIG[item.priority].dot === 'bg-red-500' ? '#EF4444' : PRIORITY_CONFIG[item.priority].dot === 'bg-orange-500' ? '#F97316' : PRIORITY_CONFIG[item.priority].dot === 'bg-blue-500' ? '#3B82F6' : '#94A3B8'};padding-left:16px;margin-bottom:20px;">
              <p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6B7280;margin:0 0 4px;">Action Item · ${PRIORITY_CONFIG[item.priority].label} Priority</p>
              <h2 style="font-size:20px;font-weight:700;color:#111827;margin:0;">${item.title}</h2>
            </div>
            ${item.description ? `<p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">${item.description}</p>` : ''}
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px 12px;background:#F9FAFB;border-radius:6px 0 0 6px;font-size:12px;color:#6B7280;font-weight:600;">Status</td><td style="padding:8px 12px;background:#F9FAFB;border-radius:0 6px 6px 0;font-size:14px;color:#111827;">${STATUS_CONFIG[item.status].label}</td></tr>
              ${item.due_date ? `<tr><td style="padding:8px 12px;font-size:12px;color:#6B7280;font-weight:600;">Due Date</td><td style="padding:8px 12px;font-size:14px;color:#111827;">${format(new Date(item.due_date + 'T00:00:00'), 'MMMM d, yyyy')}</td></tr>` : ''}
              ${item.assignee?.full_name ? `<tr><td style="padding:8px 12px;background:#F9FAFB;border-radius:6px 0 0 6px;font-size:12px;color:#6B7280;font-weight:600;">Assigned To</td><td style="padding:8px 12px;background:#F9FAFB;border-radius:0 6px 6px 0;font-size:14px;color:#111827;">${item.assignee.full_name}</td></tr>` : ''}
            </table>
            <div style="border-top:1px solid #E5E7EB;padding-top:16px;margin-top:16px;">
              <p style="font-size:14px;color:#374151;"><strong>To respond:</strong> Simply reply to this email. Your response will be logged automatically.</p>
            </div>
          </div>
        `}
      />
    </motion.div>
  );
}

// ── Quick-add bar ──────────────────────────────────────────────────────────

function QuickAddBar({ projectId, onCreated }: { projectId: string; onCreated?: () => void }) {
  const createItem = useCreateActionItem(projectId);
  const { data: teamMembers = [] } = useProjectTeamMembers(projectId);
  const profiles = teamMembers.map(m => ({
    user_id: m.user_id,
    full_name: m.profile?.full_name ?? null,
    email: m.profile?.email ?? null,
    avatar_url: m.profile?.avatar_url ?? null,
  }));
  const [title, setTitle] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [priority, setPriority] = useState<ActionItem['priority']>('medium');
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | undefined>();

  const handleQuickAdd = async () => {
    if (!title.trim()) return;
    await createItem.mutateAsync({
      title: title.trim(),
      priority,
      assigned_to: assignedTo,
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
    });
    setTitle('');
    setExpanded(false);
    setPriority('medium');
    setAssignedTo(null);
    setDueDate(undefined);
    onCreated?.();
    toast.success('Task created');
  };

  const assigneeName = profiles.find(p => p.user_id === assignedTo)?.full_name;
  const pri = PRIORITY_CONFIG[priority];

  return (
    <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && title.trim()) handleQuickAdd();
            if (e.key === 'Escape') { setTitle(''); setExpanded(false); }
          }}
          onFocus={() => setExpanded(true)}
          placeholder="Add a task… press Enter to save"
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
        />
        {title.trim() && (
          <Button
            size="sm"
            className="h-7 text-xs bg-module-projects hover:bg-module-projects/90 text-white shrink-0"
            onClick={handleQuickAdd}
            disabled={createItem.isPending}
          >
            {createItem.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Add'}
          </Button>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-t"
          >
            <div className="flex items-center gap-2 px-3 py-2 flex-wrap bg-muted/30">
              {/* Priority */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className={cn('h-6 text-[11px] gap-1 border', pri.badge)}>
                    {pri.icon} {pri.label}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-36">
                  {PRIORITY_ORDER.map(p => (
                    <DropdownMenuItem key={p} onClick={() => setPriority(p)} className="gap-2 text-xs">
                      <span className={cn('h-2 w-2 rounded-full', PRIORITY_CONFIG[p].dot)} />
                      {PRIORITY_CONFIG[p].label}
                      {priority === p && <Check className="h-3 w-3 ml-auto" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Assignee */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-6 text-[11px] gap-1">
                    <User className="h-3 w-3" />
                    {assigneeName?.split(' ')[0] || 'Assign'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 max-h-52 overflow-y-auto">
                  <DropdownMenuItem onClick={() => setAssignedTo(null)} className="text-xs text-muted-foreground">
                    No assignee
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {profiles.map(p => (
                    <DropdownMenuItem key={p.user_id} onClick={() => setAssignedTo(p.user_id)} className="gap-2 text-xs">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={p.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[8px]">{getInitials(p.full_name)}</AvatarFallback>
                      </Avatar>
                      {p.full_name || p.email}
                      {assignedTo === p.user_id && <Check className="h-3 w-3 ml-auto" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Due date */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-6 text-[11px] gap-1">
                    <Calendar className="h-3 w-3" />
                    {dueDate ? format(dueDate, 'MMM d') : 'Due date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker mode="single" selected={dueDate} onSelect={setDueDate} />
                </PopoverContent>
              </Popover>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────────

interface ActionItemsPanelProps {
  projectId: string;
  projectName?: string;
  open: boolean;
  onClose: () => void;
}

export function ActionItemsPanel({ projectId, projectName, open, onClose }: ActionItemsPanelProps) {
  const { user } = useAuth();
  const { data: items = [], isLoading } = useActionItemsByProject(open ? projectId : null);
  const [tab, setTab] = useState<'all' | 'mine'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [filterPriority, setFilterPriority] = useState<ActionItem['priority'] | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ActionItem['status'] | 'all'>('all');
  const [reportOpen, setReportOpen] = useState(false);

  const filtered = useMemo(() => {
    return items.filter(i => {
      if (tab === 'mine' && i.assigned_to !== user?.id) return false;
      if (filterPriority !== 'all' && i.priority !== filterPriority) return false;
      if (filterStatus !== 'all' && i.status !== filterStatus) return false;
      return true;
    });
  }, [items, tab, filterPriority, filterStatus, user]);

  const activeItems = filtered.filter(i => i.status !== 'done' && i.status !== 'cancelled');
  const doneItems = filtered.filter(i => i.status === 'done' || i.status === 'cancelled');

  const grouped = useMemo(() => {
    return PRIORITY_ORDER.map(p => ({
      priority: p,
      items: activeItems.filter(i => i.priority === p),
    })).filter(g => g.items.length > 0);
  }, [activeItems]);

  const openTaskCount = items.filter(i => i.status !== 'done' && i.status !== 'cancelled').length;

  if (!open) return null;

  return (
    <div className="w-full bg-background flex flex-col h-full overflow-hidden border-l">
      {/* ── Header ── */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b bg-gradient-to-br from-emerald-500/5 to-background">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm leading-none">Action Items</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {openTaskCount} open · {doneItems.length} done
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Filter dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Filter className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 py-1">Priority</p>
                {(['all', ...PRIORITY_ORDER] as const).map(p => (
                  <DropdownMenuItem key={p} onClick={() => setFilterPriority(p)} className="text-xs gap-2">
                    {p !== 'all' && <span className={cn('h-2 w-2 rounded-full', PRIORITY_CONFIG[p].dot)} />}
                    {p === 'all' ? 'All priorities' : PRIORITY_CONFIG[p].label}
                    {filterPriority === p && <Check className="h-3 w-3 ml-auto" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 py-1">Status</p>
                {(['all', 'todo', 'in_progress', 'in_review'] as const).map(s => (
                  <DropdownMenuItem key={s} onClick={() => setFilterStatus(s as typeof filterStatus)} className="text-xs">
                    {s === 'all' ? 'All statuses' : STATUS_CONFIG[s].label}
                    {filterStatus === s && <Check className="h-3 w-3 ml-auto" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setReportOpen(true)} title="Generate Report">
              <FileText className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
          {(['all', 'mine'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 text-[11px] font-semibold py-1 rounded-md transition-all',
                tab === t ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t === 'all' ? 'All Tasks' : 'Assigned to Me'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Quick Add ── */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <QuickAddBar projectId={projectId} />
      </div>

      {/* ── Task List ── */}
      <ScrollArea className="flex-1">
        <div className="px-3 pb-6 space-y-4">
          {isLoading ? (
            <div className="space-y-3 pt-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse border-l-4 border-muted" />
              ))}
            </div>
          ) : activeItems.length === 0 && doneItems.length === 0 ? (
            <div className="py-16 text-center">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckSquare className="h-7 w-7 text-emerald-500/60" />
              </div>
              <p className="text-sm font-semibold text-foreground/70">No tasks yet</p>
              <p className="text-xs text-muted-foreground mt-1">Use the quick-add above to create your first task</p>
            </div>
          ) : (
            <>
              {/* Priority groups */}
              {grouped.map(({ priority, items: groupItems }) => {
                const pc = PRIORITY_CONFIG[priority];
                return (
                  <div key={priority} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full', pc.dot)} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {pc.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">({groupItems.length})</span>
                    </div>
                    <AnimatePresence>
                      {groupItems.map(item => (
                        <TaskCard
                          key={item.id}
                          item={item}
                          projectId={projectId}
                          projectName={projectName}
                          currentUserId={user?.id || ''}
                          expanded={expandedId === item.id}
                          onToggleExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                );
              })}

              {/* Done / Cancelled */}
              {doneItems.length > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowDone(v => !v)}
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showDone ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    Completed ({doneItems.length})
                  </button>
                  <AnimatePresence>
                    {showDone && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-2"
                      >
                        {doneItems.map(item => (
                          <TaskCard
                            key={item.id}
                            item={item}
                            projectId={projectId}
                            projectName={projectName}
                            currentUserId={user?.id || ''}
                            expanded={expandedId === item.id}
                            onToggleExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      <ActionItemReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        defaultProjectId={projectId}
        defaultProjectName={projectName}
      />
    </div>
  );
}
