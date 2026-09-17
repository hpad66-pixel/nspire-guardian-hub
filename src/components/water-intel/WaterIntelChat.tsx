import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Copy, FileText, Loader2, Mail, ThumbsDown, ThumbsUp, X } from 'lucide-react';
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
  const [copiedMessage, setCopiedMessage] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Record<number, 'up' | 'down'>>({});
  const streamRef = useRef<number | null>(null);
  const propertyName = String(snapshot.propertyName || 'Billing review');
  const isGlorieta = /glorieta/i.test(propertyName);
  const [messages, setMessages] = useState<Msg[]>([{
    role: 'assistant',
    content: 'Ask about the billing records, spend, consumption, estimates, account numbers, dispute periods, or next steps.',
  }]);

  const starters = useMemo(
    () => isGlorieta
      ? [
          'What exactly is disputed on Building 8?',
          'What amount is supported by the formal dispute package?',
          'Which meter and account number should we cite?',
          'What happened during the vacancy period?',
          'What proof should WASD produce?',
          'How do the pre, vacancy, and post periods compare?',
          'Which other meters are only context?',
          'Why should the estimate be corrected?',
          'What should the City letter ask for?',
          'What would justify removing the rebill?',
          'What should a CFO look at first?',
          'What is the clean next action?',
        ]
      : [
          'Where is spend concentrating?',
          'What should we do this week?',
          'Which account needs attention?',
        ],
    [isGlorieta],
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

  async function copyResponse(content: string, index: number) {
    await navigator.clipboard?.writeText(toPlainText(content));
    setCopiedMessage(index);
    window.setTimeout(() => setCopiedMessage(null), 1400);
  }

  if (!open) return null;

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[#dedbd1] bg-[#fffdf8] shadow-2xl"
      data-testid="water-intel-chat"
    >
      <div className="flex items-center justify-between border-b border-[#dedbd1] px-5 py-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#C4A35A]">
            <FileText className="h-3.5 w-3.5" /> {isGlorieta ? 'Glorieta billing review' : 'Billing review'}
          </div>
          <div className="font-display text-2xl text-[#08271f]">{isGlorieta ? 'Ask the record' : 'Ask the record'}</div>
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
            {m.role === 'assistant' && (
              <ResponseActions
                content={m.content}
                copied={copiedMessage === i}
                feedback={feedback[i]}
                subject={`${isGlorieta ? 'Glorieta billing review' : 'Billing review'} - ${propertyName}`}
                onCopy={() => void copyResponse(m.content, i)}
                onFeedback={(value) => setFeedback((state) => ({ ...state, [i]: value }))}
              />
            )}
          </div>
        ))}
        {chat.isPending && (
          <div className="max-w-[92%] rounded-2xl border border-[#dedbd1] bg-white px-4 py-3 text-sm shadow-sm">
            <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#C4A35A]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Building response
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
        <div className="max-h-32 overflow-y-auto rounded-2xl border border-[#eee7d9] bg-white/70 p-2">
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
          placeholder={isGlorieta ? 'Ask about Building 8, the back-bill, the unpaid balance, the timeline, or the City letter...' : "What's happening on this property right now?"}
          className="min-h-[72px]"
        />
        <Button className="w-full bg-[#08271f] hover:bg-[#08271f]/90" disabled={chat.isPending} onClick={() => void ask(question)}>
          Ask
        </Button>
      </div>
    </aside>
  );
}

function toPlainText(content: string) {
  return content
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '- ')
    .replace(/\s+\n/g, '\n')
    .trim();
}

function ResponseActions({
  content,
  copied,
  feedback,
  subject,
  onCopy,
  onFeedback,
}: {
  content: string;
  copied: boolean;
  feedback?: 'up' | 'down';
  subject: string;
  onCopy: () => void;
  onFeedback: (value: 'up' | 'down') => void;
}) {
  const body = encodeURIComponent(toPlainText(content));
  const mailSubject = encodeURIComponent(subject);
  return (
    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#eee7d9] pt-2">
      <button type="button" onClick={onCopy} className="inline-flex items-center gap-1 rounded-full border border-[#dedbd1] bg-[#fcfbf7] px-2 py-1 text-[11px] font-semibold text-[#5c6863] hover:border-[#C4A35A]">
        {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
      <a href={`mailto:?subject=${mailSubject}&body=${body}`} className="inline-flex items-center gap-1 rounded-full border border-[#dedbd1] bg-[#fcfbf7] px-2 py-1 text-[11px] font-semibold text-[#5c6863] hover:border-[#C4A35A]">
        <Mail className="h-3.5 w-3.5" /> Email
      </a>
      <button type="button" onClick={() => onFeedback('up')} className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${feedback === 'up' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-[#dedbd1] bg-[#fcfbf7] text-[#5c6863]'}`}>
        <ThumbsUp className="h-3.5 w-3.5" /> Good
      </button>
      <button type="button" onClick={() => onFeedback('down')} className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${feedback === 'down' ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-[#dedbd1] bg-[#fcfbf7] text-[#5c6863]'}`}>
        <ThumbsDown className="h-3.5 w-3.5" /> Needs work
      </button>
    </div>
  );
}

function BriefText({ content }: { content: string }) {
  const lines = content.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return null;
  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        const heading = /^#{1,6}\s+/.test(line) || /^[A-Z][A-Za-z0-9 /&-]{3,48}:$/.test(line);
        const bullet = /^[-*]\s+/.test(line);
        const numbered = /^\d+[.)]\s+/.test(line);
        const clean = line.replace(/^#{1,6}\s+/, '').replace(/^[-*]\s+/, '').replace(/^\d+[.)]\s+/, '');
        if (heading) {
          return (
            <h4 key={`${line}-${index}`} className="rounded-xl bg-[#08271f]/5 px-3 py-2 text-sm font-bold text-[#08271f]">
              <InlineBriefText text={clean.replace(/:$/, '')} />
            </h4>
          );
        }
        return (
          <p key={`${line}-${index}`} className={bullet || numbered ? 'flex gap-2' : ''}>
            {(bullet || numbered) && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C4A35A]" />}
            <span><InlineBriefText text={clean} /></span>
          </p>
        );
      })}
    </div>
  );
}

function InlineBriefText({ text }: { text: string }) {
  const clean = text.replace(/#{1,6}\s*/g, '');
  const parts = clean.split(/(\*\*[^*]+\*\*|\b(?:Account|Acct|Meter|Document|Doc|Invoice|Bill|Ref)\s+#?\s*[A-Za-z0-9-]+|\$[0-9][0-9,]*(?:\.[0-9]{2})?|\b\d{7,}\b)/gi);
  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;
        const boldMarkdown = /^\*\*[^*]+\*\*$/.test(part);
        const important = boldMarkdown || /\b(?:Account|Acct|Meter|Document|Doc|Invoice|Bill|Ref)\s+#?\s*[A-Za-z0-9-]+/i.test(part) || /^\$/.test(part) || /^\d{7,}$/.test(part);
        return important ? <strong key={`${part}-${index}`} className="font-bold text-[#08271f]">{part.replace(/^\*\*|\*\*$/g, '')}</strong> : <span key={`${part}-${index}`}>{part}</span>;
      })}
    </>
  );
}
