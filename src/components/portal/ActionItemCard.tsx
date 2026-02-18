import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitFork, CheckSquare, DollarSign, Info, HelpCircle,
  Receipt, Eye, ChevronDown, ChevronUp, AlertCircle,
  Download, CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { ClientActionItem, ActionItemType } from '@/hooks/useClientCommunication';

// ─── Type metadata ────────────────────────────────────────────────────────────
const TYPE_META: Record<ActionItemType, {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}> = {
  decision:       { label: 'Decision Needed',  icon: GitFork,     color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  approval:       { label: 'Approval Needed',  icon: CheckSquare, color: '#60A5FA', bg: 'rgba(96,165,250,0.12)'  },
  payment:        { label: 'Payment Due',      icon: DollarSign,  color: '#FBBF24', bg: 'rgba(251,191,36,0.12)'  },
  information:    { label: 'Info Requested',   icon: Info,        color: '#2DD4BF', bg: 'rgba(45,212,191,0.12)'  },
  rfi_response:   { label: 'RFI Response',     icon: HelpCircle,  color: '#60A5FA', bg: 'rgba(96,165,250,0.12)'  },
  change_order:   { label: 'Change Order',     icon: Receipt,     color: '#FB923C', bg: 'rgba(251,146,60,0.12)'  },
  acknowledgment: { label: 'Please Review',    icon: Eye,         color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
};

interface ActionItemCardProps {
  item: ClientActionItem;
  onRespond: (params: { itemId: string; response?: string; selection?: string }) => void;
  compact?: boolean;
  isLoading?: boolean;
}

export function ActionItemCard({ item, onRespond, compact = false, isLoading = false }: ActionItemCardProps) {
  const [expanded, setExpanded] = useState(!compact);
  const [selectedOption, setSelectedOption] = useState<string | null>(item.client_selection ?? null);
  const [textResponse, setTextResponse] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const meta = TYPE_META[item.action_type as ActionItemType];
  const Icon = meta.icon;
  const isResponded = item.status === 'responded' || item.status === 'resolved';
  const isResolved  = item.status === 'resolved';

  const borderColor = isResponded ? '#10B981' : isResolved ? '#4B5563' : meta.color;

  function handleConfirmSelection() {
    if (!selectedOption) return;
    setConfirmed(true);
    onRespond({ itemId: item.id, selection: selectedOption });
  }

  function handleTextSubmit() {
    if (!textResponse.trim()) return;
    setConfirmed(true);
    onRespond({ itemId: item.id, response: textResponse });
  }

  function handleAcknowledge() {
    setConfirmed(true);
    onRespond({ itemId: item.id, response: 'Acknowledged' });
  }

  function handleApprove() {
    setConfirmed(true);
    onRespond({ itemId: item.id, response: 'Approved' });
  }

  function handleRequestChanges() {
    setConfirmed(true);
    onRespond({ itemId: item.id, response: 'Requesting changes' });
  }

  function handlePaymentConfirm() {
    setConfirmed(true);
    onRespond({ itemId: item.id, response: "I've submitted payment" });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl overflow-hidden border border-white/[0.06] transition-all',
        isResolved && 'opacity-60',
      )}
      style={{
        background: 'rgba(255,255,255,0.04)',
        borderLeftWidth: 3,
        borderLeftColor: borderColor,
      }}
    >
      {/* ── Header ───────────────────────────────────────────── */}
      <div
        className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type badge */}
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ color: meta.color, background: meta.bg }}
          >
            <Icon size={11} />
            {meta.label}
          </span>

          {/* Urgent pill */}
          {item.priority === 'urgent' && !isResponded && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
              <AlertCircle size={9} />
              URGENT
            </span>
          )}

          {/* Due date */}
          {item.due_date && !isResponded && (
            <span className="text-xs text-slate-400">
              Due {format(new Date(item.due_date), 'MMM d')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isResponded && (
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <CheckCircle2 size={12} />
              {isResolved ? 'Closed' : 'Submitted'}
            </span>
          )}
          {expanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
        </div>
      </div>

      {/* ── Title ────────────────────────────────────────────── */}
      <div className="px-4 pb-1">
        <p className="font-semibold text-white text-[15px] leading-snug">{item.title}</p>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Description */}
              {item.description && (
                <p className="text-sm text-slate-400 leading-relaxed">{item.description}</p>
              )}

              {/* ── RESPONDED / RESOLVED state ────────────────────── */}
              {isResponded && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <p className="text-xs text-emerald-400 font-medium mb-1">
                    {isResolved ? 'Closed by PM' : `Response submitted${item.responded_at ? ' · ' + format(new Date(item.responded_at), 'MMM d, h:mm a') : ''}`}
                  </p>
                  {item.client_selection && (
                    <p className="text-sm text-white">Selected: <strong>{item.client_selection}</strong></p>
                  )}
                  {item.client_response && !item.client_selection && (
                    <p className="text-sm text-white">{item.client_response}</p>
                  )}
                </div>
              )}

              {/* ── INTERACTIVE states ───────────────────────────── */}
              {!isResponded && !confirmed && (
                <>
                  {/* DECISION — option pills */}
                  {item.action_type === 'decision' && item.options && (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Select one:</p>
                      <div className="flex flex-wrap gap-2">
                        {(item.options as string[]).map((opt) => (
                          <button
                            key={opt}
                            onClick={() => setSelectedOption(opt)}
                            className={cn(
                              'px-3.5 py-2 rounded-lg text-sm font-medium border transition-all',
                              selectedOption === opt
                                ? 'bg-violet-600 border-violet-500 text-white'
                                : 'border-white/10 text-slate-300 bg-white/5 hover:bg-white/10',
                            )}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                      {selectedOption && (
                        <Button
                          size="sm"
                          className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                          onClick={handleConfirmSelection}
                          disabled={isLoading}
                        >
                          Confirm Selection — {selectedOption}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* PAYMENT */}
                  {item.action_type === 'payment' && (
                    <div className="space-y-3">
                      {item.amount && (
                        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                          <p className="text-2xl font-bold text-amber-400">
                            ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                          {item.due_date && (
                            <p className="text-xs text-slate-400 mt-1">Due by {format(new Date(item.due_date), 'MMMM d, yyyy')}</p>
                          )}
                        </div>
                      )}
                      <Button
                        size="sm"
                        className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                        onClick={handlePaymentConfirm}
                        disabled={isLoading}
                      >
                        I've Submitted Payment
                      </Button>
                    </div>
                  )}

                  {/* APPROVAL */}
                  {item.action_type === 'approval' && (
                    <div className="space-y-3">
                      {item.attachment_urls && item.attachment_urls.length > 0 && (
                        <div className="space-y-1.5">
                          {item.attachment_urls.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-blue-400 hover:bg-white/10 transition-colors"
                            >
                              <Download size={13} />
                              View Attachment {item.attachment_urls.length > 1 ? i + 1 : ''}
                            </a>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={handleApprove}
                          disabled={isLoading}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-white/20 text-slate-300 hover:bg-white/10"
                          onClick={handleRequestChanges}
                          disabled={isLoading}
                        >
                          Request Changes
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* INFORMATION / RFI_RESPONSE */}
                  {(item.action_type === 'information' || item.action_type === 'rfi_response') && (
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Your response..."
                        value={textResponse}
                        onChange={(e) => setTextResponse(e.target.value)}
                        className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 resize-none text-sm"
                        rows={3}
                      />
                      <Button
                        size="sm"
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                        onClick={handleTextSubmit}
                        disabled={isLoading || !textResponse.trim()}
                      >
                        Submit Response
                      </Button>
                    </div>
                  )}

                  {/* CHANGE ORDER */}
                  {item.action_type === 'change_order' && (
                    <div className="space-y-3">
                      {item.amount && (
                        <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-3">
                          <p className="text-xs text-slate-400 mb-1">Change order value</p>
                          <p className="text-xl font-bold text-orange-400">
                            +${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                      {item.attachment_urls && item.attachment_urls.length > 0 && (
                        <a
                          href={item.attachment_urls[0]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-blue-400 hover:bg-white/10 transition-colors"
                        >
                          <Download size={13} />
                          View Change Order Document
                        </a>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={handleApprove}
                          disabled={isLoading}
                        >
                          Approve Change
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-white/20 text-slate-300 hover:bg-white/10"
                          onClick={handleRequestChanges}
                          disabled={isLoading}
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ACKNOWLEDGMENT */}
                  {item.action_type === 'acknowledgment' && (
                    <Button
                      size="sm"
                      className="w-full bg-slate-700 hover:bg-slate-600 text-white"
                      onClick={handleAcknowledge}
                      disabled={isLoading}
                    >
                      I've Reviewed This
                    </Button>
                  )}
                </>
              )}

              {/* Optimistic confirmed state */}
              {confirmed && !isResponded && (
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                  <CheckCircle2 size={14} />
                  Response sent — thank you!
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
