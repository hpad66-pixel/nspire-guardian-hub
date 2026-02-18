import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, ImageIcon, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  useClientMessages,
  useClientMessagesRealtime,
  useSendMessage,
  useMarkMessageRead,
  type ClientMessage,
} from '@/hooks/useClientCommunication';

interface PortalMessagesProps {
  projectId: string;
  companyName: string;
  accentColor: string;
}

function bubble(direction: 'client_to_pm' | 'pm_to_client', isMe: boolean, accentColor: string) {
  if (isMe) {
    return { bg: accentColor, text: 'white', align: 'items-end' as const };
  }
  return { bg: 'rgba(255,255,255,0.07)', text: '#E2E8F0', align: 'items-start' as const };
}

export function PortalMessages({ projectId, companyName, accentColor }: PortalMessagesProps) {
  const { user } = useAuth();
  const { data: messages = [], isLoading } = useClientMessages(projectId);
  useClientMessagesRealtime(projectId);

  const markRead  = useMarkMessageRead();
  const sendMsg   = useSendMessage();

  const [draft, setDraft] = useState('');
  const bottomRef  = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Mark all pm_to_client messages as read on mount / when messages change
  useEffect(() => {
    if (!user) return;
    messages
      .filter((m) => m.direction === 'pm_to_client' && !m.read_by_client)
      .forEach((m) => {
        markRead.mutate({ messageId: m.id, projectId, side: 'client' });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, user]);

  // Auto-resize textarea
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
    await sendMsg.mutateAsync({
      projectId,
      body: text,
      direction: 'client_to_pm',
    });
  }

  // Group consecutive messages from same direction
  function isSameGroupAsPrev(index: number): boolean {
    if (index === 0) return false;
    return messages[index].direction === messages[index - 1].direction;
  }

  function isMe(msg: ClientMessage) {
    return msg.direction === 'client_to_pm';
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px-64px)] md:h-screen">
      {/* Header */}
      <div
        className="px-4 py-3.5 border-b border-white/[0.06] shrink-0"
        style={{ background: '#0D1117' }}
      >
        <p className="text-sm font-semibold text-white">Messages</p>
        <p className="text-xs text-slate-500">{companyName}</p>
      </div>

      {/* Messages scroll area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1" style={{ background: '#0D1117' }}>
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-slate-500" />
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
            <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center">
              <Send size={18} className="text-slate-500" />
            </div>
            <p className="text-sm text-slate-500 text-center">
              No messages yet.<br />
              Send a note to the team below.
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => {
            const mine     = isMe(msg);
            const grouped  = isSameGroupAsPrev(i);
            const { bg, text, align } = bubble(msg.direction, mine, accentColor);
            const showName = !grouped && !mine;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className={cn('flex flex-col', align, grouped ? 'mt-0.5' : 'mt-4')}
              >
                {showName && (
                  <p className="text-[10px] text-slate-500 ml-1 mb-1 font-medium">{companyName}</p>
                )}

                {/* Bubble */}
                <div
                  className={cn('max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed', mine ? 'rounded-br-sm' : 'rounded-bl-sm')}
                  style={{ background: bg, color: text }}
                >
                  {msg.requires_response && !msg.responded_at && !mine && (
                    <div className="flex items-center gap-1.5 mb-2 text-amber-400 text-xs font-medium">
                      <AlertCircle size={11} />
                      The team is awaiting your response
                    </div>
                  )}
                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                  {msg.photo_urls && msg.photo_urls.length > 0 && (
                    <div className={cn('flex flex-wrap gap-1.5 mt-2', mine ? 'justify-end' : 'justify-start')}>
                      {msg.photo_urls.map((url, pi) => (
                        <a key={pi} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt="attachment" className="w-20 h-20 rounded-lg object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <p className={cn('text-[10px] text-slate-600 mt-0.5', mine ? 'text-right mr-1' : 'ml-1')}>
                  {format(new Date(msg.created_at), 'h:mm a')}
                  {i === messages.length - 1 && msg.direction === 'client_to_pm' && (
                    <span className="ml-1">{msg.read_by_pm ? '· Seen' : '· Sent'}</span>
                  )}
                </p>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Compose bar */}
      <div
        className="shrink-0 border-t border-white/[0.06] px-3 py-2"
        style={{ background: '#0D1117' }}
      >
        <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
          <button className="shrink-0 p-1 text-slate-600 hover:text-slate-400 transition-colors mb-0.5">
            <ImageIcon size={16} />
          </button>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-slate-600 outline-none leading-relaxed py-0.5 max-h-[120px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || sendMsg.isPending}
            className={cn(
              'shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all mb-0.5',
              draft.trim() ? 'text-white' : 'text-slate-600 cursor-not-allowed',
            )}
            style={draft.trim() ? { background: accentColor } : { background: 'rgba(255,255,255,0.05)' }}
          >
            {sendMsg.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={13} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
