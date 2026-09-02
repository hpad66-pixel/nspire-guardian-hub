import { useMemo, useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { localChatAnswer } from '@/lib/water-intel';
import { useWaterChat, type WaterIntelScope } from '@/hooks/useWaterIntelligence';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

export function WaterIntelChat({
  scope,
  snapshot,
  open,
  onClose,
}: {
  scope: WaterIntelScope;
  snapshot: Record<string, unknown>;
  open: boolean;
  onClose: () => void;
}) {
  const chat = useWaterChat(scope);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Msg[]>([{
    role: 'assistant',
    content: 'I am the Water Intelligence brief for this property. Ask about spend, consumption, estimates, or what to do next on any service account.',
  }]);

  const starters = useMemo(
    () => [
      'What is happening with Building 8?',
      'Where is spend concentrating?',
      'What should we do this week?',
    ],
    [],
  );

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text) return;
    setQuestion('');
    setMessages((m) => [...m, { role: 'user', content: text }]);
    try {
      const res = await chat.mutateAsync({
        question: text,
        snapshot,
        history: messages.slice(-6),
      });
      setMessages((m) => [...m, { role: 'assistant', content: res.answer }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: localChatAnswer(text, snapshot) }]);
    }
  };

  if (!open) return null;

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[#dedbd1] bg-[#fffdf8] shadow-2xl"
      data-testid="water-intel-chat"
    >
      <div className="flex items-center justify-between border-b border-[#dedbd1] px-5 py-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#C4A35A]">
            <Sparkles className="h-3.5 w-3.5" /> Live brief
          </div>
          <div className="font-display text-2xl text-[#08271f]">Ask Water Intel</div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close chat" className="rounded-lg border border-[#dedbd1] p-2">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages.map((m, i) => (
          <div
            key={`${m.role}-${i}`}
            className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role === 'user'
                ? 'ml-auto bg-[#08271f] text-white'
                : 'bg-white text-[#3d4a45] shadow-sm ring-1 ring-[#dedbd1]'
            }`}
          >
            {m.content}
          </div>
        ))}
        {chat.isPending && (
          <div className="inline-flex items-center gap-2 text-xs text-[#8a8478]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading the ledger…
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-[#dedbd1] p-4">
        <div className="flex flex-wrap gap-2">
          {starters.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void ask(s)}
              className="rounded-full border border-[#dedbd1] bg-white px-3 py-1 text-[11px] font-medium text-[#08271f] hover:border-[#C4A35A]"
            >
              {s}
            </button>
          ))}
        </div>
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void ask(question);
            }
          }}
          placeholder="What’s happening on this property right now?"
          className="min-h-[72px]"
        />
        <Button className="w-full bg-[#08271f] hover:bg-[#08271f]/90" disabled={chat.isPending} onClick={() => void ask(question)}>
          Ask the brief
        </Button>
      </div>
    </aside>
  );
}
