import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronRight, Send, AlertTriangle, ImageIcon, Loader2, ChevronDown } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { ActionItemCard } from './ActionItemCard';
import {
  useClientActionItems,
  useRespondToActionItem,
  useSendMessage,
} from '@/hooks/useClientCommunication';
import { toast } from 'sonner';
import type { CompanyBranding } from '@/hooks/useCompanyBranding';

interface Milestone {
  id: string;
  name: string;
  due_date: string;
  status: string;
  completed_at?: string | null;
}

interface Project {
  id: string;
  name: string;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  milestones?: Milestone[];
}

interface ClientUpdate {
  id: string;
  title: string;
  body: string;
  photo_url?: string | null;
  update_type?: string;
  created_at: string;
}

interface PortalHomeProps {
  project: Project;
  companyBranding: CompanyBranding | null;
  updates: ClientUpdate[];
  onNavigate: (tab: string) => void;
  accentColor: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  active:      { label: 'In Progress',   color: '#60A5FA', bg: 'rgba(96,165,250,0.15)'  },
  in_progress: { label: 'In Progress',   color: '#60A5FA', bg: 'rgba(96,165,250,0.15)'  },
  completed:   { label: 'Completed',     color: '#10B981', bg: 'rgba(16,185,129,0.15)'  },
  on_hold:     { label: 'On Hold',       color: '#FBBF24', bg: 'rgba(251,191,36,0.15)'  },
  planning:    { label: 'Planning',      color: '#A78BFA', bg: 'rgba(167,139,250,0.15)' },
  cancelled:   { label: 'Cancelled',     color: '#F87171', bg: 'rgba(248,113,113,0.15)' },
};

const PHASES = ['Not Started', 'In Progress', 'Final Review', 'Complete'];

export function PortalHome({ project, companyBranding, updates, onNavigate, accentColor }: PortalHomeProps) {
  const [showAllItems, setShowAllItems] = useState(false);
  const [showAllUpdates, setShowAllUpdates] = useState(false);
  const [messageText, setMessageText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: pendingItems = [], isLoading: itemsLoading } = useClientActionItems(project.id, ['pending', 'viewed']);
  const respondMutation = useRespondToActionItem();
  const sendMessage     = useSendMessage();

  const displayedItems = showAllItems ? pendingItems : pendingItems.slice(0, 3);

  // Auto-expand textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 100) + 'px';
  }, [messageText]);

  function handleRespond(params: { itemId: string; response?: string; selection?: string }) {
    respondMutation.mutate({ ...params, projectId: project.id });
  }

  async function handleSendMessage() {
    if (!messageText.trim()) return;
    try {
      await sendMessage.mutateAsync({ projectId: project.id, body: messageText.trim(), direction: 'client_to_pm' });
      setMessageText('');
      toast.success('Sent! The team will respond shortly.');
    } catch {
      toast.error('Failed to send. Please try again.');
    }
  }

  // Progress calculations
  const today     = new Date();
  const startDate = project.start_date ? new Date(project.start_date) : null;
  const endDate   = project.end_date   ? new Date(project.end_date)   : null;
  const elapsed   = startDate ? Math.max(0, differenceInDays(today, startDate)) : null;
  const total     = startDate && endDate ? differenceInDays(endDate, startDate) : null;
  const progress  = elapsed !== null && total && total > 0 ? Math.min(100, (elapsed / total) * 100) : null;

  const phaseIndex = progress == null ? 0 : progress >= 100 ? 3 : progress >= 75 ? 2 : progress >= 20 ? 1 : 0;

  const milestones = [...(project.milestones ?? [])].sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime(),
  ).slice(0, 4);

  const statusMeta = STATUS_MAP[project.status] ?? STATUS_MAP['active'];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

      {/* ── BLOCK 1: Project Identity ─────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs text-slate-500 mb-1">{companyBranding?.company_name ?? 'Your Contractor'}</p>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-white leading-tight">{project.name}</h1>
          <span
            className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold"
            style={{ color: statusMeta.color, background: statusMeta.bg }}
          >
            {statusMeta.label}
          </span>
        </div>
      </motion.div>

      {/* ── BLOCK 2: Action Items ─────────────────────────────── */}
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        {itemsLoading ? (
          <div className="flex items-center gap-2 py-3 text-slate-500 text-sm">
            <Loader2 size={14} className="animate-spin" />
            Checking for action items...
          </div>
        ) : pendingItems.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-400" />
              <span className="text-sm font-semibold text-white">Needs Your Attention</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400">
                {pendingItems.length}
              </span>
            </div>

            <div className="space-y-3">
              {displayedItems.map((item) => (
                <ActionItemCard
                  key={item.id}
                  item={item}
                  onRespond={handleRespond}
                  isLoading={respondMutation.isPending}
                />
              ))}
            </div>

            {pendingItems.length > 3 && !showAllItems && (
              <button
                onClick={() => setShowAllItems(true)}
                className="flex items-center gap-1 text-sm font-medium transition-colors"
                style={{ color: accentColor }}
              >
                View all {pendingItems.length} items <ChevronRight size={14} />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <p className="text-sm text-emerald-300">
              You're all caught up — nothing needs your attention right now.
            </p>
          </div>
        )}
      </motion.section>

      {/* ── BLOCK 3: Project Progress ─────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-4"
      >
        <h2 className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Project Progress</h2>

        {/* Phase strip */}
        <div className="flex items-start">
          {PHASES.map((phase, i) => {
            const isActive = i === phaseIndex;
            const isDone   = i < phaseIndex;
            return (
              <div key={phase} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <div
                    className={cn(
                      'w-2.5 h-2.5 rounded-full border-2 transition-all',
                      isActive ? 'border-blue-400 bg-blue-400' : isDone ? 'border-emerald-400 bg-emerald-400' : 'border-white/20',
                    )}
                  />
                  <span className={cn('text-[9px] text-center leading-tight px-0.5', isActive ? 'text-white font-semibold' : isDone ? 'text-emerald-500' : 'text-slate-600')}>
                    {phase}
                  </span>
                </div>
                {i < PHASES.length - 1 && (
                  <div className={cn('h-px w-full mx-[-1px] mt-[-14px]', isDone ? 'bg-emerald-400/40' : 'bg-white/10')} />
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar + timing */}
        {elapsed !== null && total !== null && total > 0 && (
          <div className="space-y-1.5">
            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: accentColor }}
                initial={{ width: 0 }}
                animate={{ width: `${progress ?? 0}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            <p className="text-xs text-slate-500">{elapsed} of {total} days elapsed</p>
          </div>
        )}

        {/* Milestones */}
        {milestones.length > 0 && (
          <div className="space-y-2.5 pt-1 border-t border-white/[0.06]">
            {milestones.map((m) => {
              const isComplete = m.status === 'completed';
              const isCurrent  = m.status === 'in_progress' || m.status === 'active';
              return (
                <div key={m.id} className="flex items-center gap-2.5">
                  <div className={cn(
                    'w-2 h-2 rounded-full shrink-0 transition-colors',
                    isComplete ? 'bg-emerald-400' : isCurrent ? 'bg-blue-400' : 'bg-white/20',
                  )} />
                  <span className={cn(
                    'text-sm flex-1 leading-tight',
                    isComplete ? 'line-through text-slate-500' : isCurrent ? 'text-white font-medium' : 'text-slate-400',
                  )}>
                    {m.name}
                  </span>
                  <span className="text-xs text-slate-500 shrink-0">
                    {format(new Date(m.due_date), 'MMM d')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </motion.section>

      {/* ── BLOCK 4: Updates ─────────────────────────────────── */}
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <h2 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-3">
          {updates.length > 1 ? 'Recent Updates' : 'Latest Update'}
        </h2>

        {updates.length > 0 ? (
          <div className="space-y-3">
            {(showAllUpdates ? updates : updates.slice(0, 3)).map((update) => (
              <div
                key={update.id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.03] overflow-hidden"
              >
                {update.photo_url && (
                  <div className="aspect-video w-full overflow-hidden">
                    <img src={update.photo_url} alt={update.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-4">
                  <p className="text-xs text-slate-500 mb-1">
                    {format(new Date(update.created_at), 'MMMM d, yyyy')}
                  </p>
                  <p className="font-semibold text-white text-sm mb-1">{update.title}</p>
                  <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">{update.body}</p>
                </div>
              </div>
            ))}

            {updates.length > 3 && !showAllUpdates && (
              <button
                onClick={() => setShowAllUpdates(true)}
                className="flex items-center gap-1.5 text-sm font-medium transition-colors"
                style={{ color: accentColor }}
              >
                <ChevronDown size={14} />
                Show {updates.length - 3} more update{updates.length - 3 !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-10 gap-3">
            <ImageIcon size={28} className="text-slate-600" />
            <p className="text-sm text-slate-500 text-center max-w-xs">
              Updates from the job site appear here.
            </p>
          </div>
        )}
      </motion.section>

      {/* ── BLOCK 5: Quick Message ───────────────────────────── */}
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div
          className="rounded-xl border border-white/[0.08] overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <div className="flex items-end gap-2 p-3">
            <textarea
              ref={textareaRef}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Ask a question or send a note to the team..."
              className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-slate-600 outline-none leading-relaxed py-1 min-h-[36px]"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!messageText.trim() || sendMessage.isPending}
              className={cn(
                'shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all',
                messageText.trim() ? 'text-white' : 'text-slate-600 cursor-not-allowed',
              )}
              style={messageText.trim() ? { background: accentColor } : { background: 'rgba(255,255,255,0.06)' }}
            >
              {sendMessage.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </div>
      </motion.section>

      <div className="h-4" />
    </div>
  );
}
