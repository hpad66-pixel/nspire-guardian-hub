import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Loader2, MessageSquareText, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PortalQaMessage {
  id: string;
  body: string;
  created_at: string;
  sender_name: string;
  sender_role: string;
  photo_urls?: string[] | null;
}

interface PortalQAPanelProps {
  accentColor: string;
  messages: PortalQaMessage[];
  onSend: (body: string) => Promise<void>;
  sending: boolean;
}

export function PortalQAPanel({ accentColor, messages, onSend, sending }: PortalQAPanelProps) {
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function handleSend() {
    const value = draft.trim();
    if (!value || sending) return;
    setDraft('');
    try {
      await onSend(value);
    } catch {
      setDraft(value);
    }
  }

  return (
    <aside className="overflow-hidden rounded-[28px] border border-border bg-background shadow-sm lg:sticky lg:top-24">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
          >
            <MessageSquareText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Project Q&A</p>
            <p className="text-xs text-muted-foreground">Questions, clarifications, and live updates tied to this schedule.</p>
          </div>
        </div>
      </div>

      <div className="max-h-[52vh] space-y-3 overflow-y-auto px-4 py-4 lg:max-h-[calc(100vh-220px)]">
        {messages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center">
            <p className="text-sm font-medium text-foreground">No questions yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Ask the team about any milestone, timeline, or field update.</p>
          </div>
        ) : (
          messages.map((message) => {
            const isClient = message.sender_role === 'client';
            return (
              <div
                key={message.id}
                className={cn('flex flex-col gap-1', isClient ? 'items-end' : 'items-start')}
              >
                <div className={cn('flex items-center gap-2 text-[11px]', isClient ? 'flex-row-reverse' : '')}>
                  <span className="font-medium text-foreground">{message.sender_name}</span>
                  <span
                    className="rounded-full px-2 py-0.5 font-medium uppercase tracking-[0.12em]"
                    style={{
                      backgroundColor: isClient ? `${accentColor}18` : 'hsl(var(--muted))',
                      color: isClient ? accentColor : 'hsl(var(--muted-foreground))',
                    }}
                  >
                    {isClient ? 'Client' : 'Team'}
                  </span>
                </div>

                <div
                  className="max-w-full rounded-2xl px-4 py-3 text-sm leading-relaxed"
                  style={
                    isClient
                      ? { backgroundColor: accentColor, color: '#fff' }
                      : { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' }
                  }
                >
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                </div>

                <p className="px-1 text-[11px] text-muted-foreground">
                  {format(new Date(message.created_at), 'MMM d · h:mm a')}
                </p>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border bg-muted/20 p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-background px-3 py-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask a question or leave an update..."
            rows={1}
            className="min-h-[44px] flex-1 resize-none bg-transparent py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: accentColor, color: '#fff' }}
            aria-label="Send message"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
