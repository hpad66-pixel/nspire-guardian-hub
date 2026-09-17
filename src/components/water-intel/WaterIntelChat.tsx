import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Sparkles, X } from 'lucide-react';
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
  const [streamingContent, setStreamingContent] = useState('');
  const [briefStage, setBriefStage] = useState(0);
  const streamRef = useRef<number | null>(null);
  const propertyName = String(snapshot.propertyName || 'Water Intelligence');
  const isGlorieta = /glorieta/i.test(propertyName);
  const [messages, setMessages] = useState<Msg[]>([{
    role: 'assistant',
    content: 'I am the Water Intelligence brief for this property. Ask about spend, consumption, estimates, GPCD, or what to do next on any service account.',
  }]);

  const starters = useMemo(
    () => [
      'What is happening with Building 8?',
      'Where is spend concentrating?',
      'What should we do this week?',
    ],
    [],
  );

  const stages = useMemo(
    () => [
      'Reading source-backed water ledger',
      'Checking estimates, disputes, and account rollups',
      'Formatting the executive explanation',
    ],
    [],
  );

  useEffect(() => {
    if (!chat.isPending) {
      setBriefStage(0);
      return;
    }
    const id = window.setInterval(() => {
      setBriefStage((stage) => (stage + 1) % stages.length);
    }, 1200);
    return () => window.clearInterval(id);
  }, [chat.isPending, stages.length]);

  useEffect(() => () => {
    if (streamRef.current) window.clearInterval(streamRef.current);
  }, []);

  function streamAnswer(answer: string) {
    if (streamRef.current) window.clearInterval(streamRef.current);
    setStreamingContent('');
    let index = 0;
    streamRef.current = window.setInterval(() => {
      index = Math.min(answer.length, index + 18);
      setStreamingContent(answer.slice(0, index));
      if (index >= answer.length) {
        if (streamRef.current) window.clearInterval(streamRef.current);
        streamRef.current = null;
        setMessages((m) => [...m, { role: 'assistant', content: answer }]);
        setStreamingContent('');
      }
    }, 22);
  }

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text) return;
    setQuestion('');
    setStreamingContent('');
    setMessages((m) => [...m, { role: 'user', content: text }]);
    try {
      const res = await chat.mutateAsync({
        question: text,
        snapshot,
        history: messages.slice(-6),
      });
      streamAnswer(res.answer);
    } catch {
      streamAnswer(localChatAnswer(text, snapshot));
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
            <Sparkles className="h-3.5 w-3.5" /> {isGlorieta ? 'Glorieta Intelligence Brief' : 'Water Intelligence Brief'}
          </div>
          <div className="font-display text-2xl text-[#08271f]">{isGlorieta ? 'Live Brief' : 'Ask Water Intel'}</div>
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
            {m.role === 'assistant' ? <BriefText content={m.content} /> : m.content}
          </div>
        ))}
        {chat.isPending && (
          <div className="max-w-[92%] rounded-2xl border border-[#dedbd1] bg-white px-4 py-3 text-sm shadow-sm">
            <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#C4A35A]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Building live brief
            </div>
            <div className="space-y-1">
              {stages.map((stage, index) => (
                <div key={stage} className={`flex items-center gap-2 text-xs ${index <= briefStage ? 'text-[#08271f]' : 'text-[#8a8478]'}`}>
                  {index < briefStage ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <span className="h-3.5 w-3.5 rounded-full border border-[#dedbd1]" />}
                  {stage}
                </div>
              ))}
            </div>
          </div>
        )}
        {streamingContent && (
          <div className="max-w-[92%] rounded-2xl bg-white px-4 py-3 text-sm leading-relaxed text-[#3d4a45] shadow-sm ring-1 ring-[#dedbd1]">
            <BriefText content={streamingContent} />
            <span className="ml-1 inline-block h-4 w-1 animate-pulse rounded-full bg-[#C4A35A] align-middle" />
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
          placeholder={isGlorieta ? 'Ask about the $1.1M target, GPCD, Building 8, or the City letter...' : "What's happening on this property right now?"}
          className="min-h-[72px]"
        />
        <Button className="w-full bg-[#08271f] hover:bg-[#08271f]/90" disabled={chat.isPending} onClick={() => void ask(question)}>
          Ask the brief
        </Button>
      </div>
    </aside>
  );
}

function BriefText({ content }: { content: string }) {
  const lines = content.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return null;
  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        const bullet = /^[-*]\s+/.test(line);
        const numbered = /^\d+[.)]\s+/.test(line);
        const clean = line.replace(/^[-*]\s+/, '').replace(/^\d+[.)]\s+/, '');
        return (
          <p key={`${line}-${index}`} className={bullet || numbered ? 'flex gap-2' : ''}>
            {(bullet || numbered) && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C4A35A]" />}
            <span>{clean}</span>
          </p>
        );
      })}
    </div>
  );
}
