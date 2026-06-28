import { useState } from 'react';
import { Send, Loader2, MessagesSquare } from 'lucide-react';
import { toast } from 'sonner';
import { usePortalData, usePortalAction } from '@/hooks/usePortalData';

// Single, consistent client Q&A — used both on the portal home and as the
// Questions tab. Reads the client's questions + builder answers from portal-data
// and submits new ones through portal-action (works for magic-link/anon clients).
export function PortalQuestions({ slug, accent, withHeader = false }: { slug?: string; accent: string; withHeader?: boolean }) {
  const { data, isLoading } = usePortalData(slug);
  const act = usePortalAction(slug);
  const [draft, setDraft] = useState('');
  const questions = data?.questions ?? [];

  const send = () => {
    const message = draft.trim();
    if (!message) return;
    act.mutate({ action: 'ask_question', message }, {
      onSuccess: () => { setDraft(''); toast.success('Sent to your builder'); },
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not send'),
    });
  };

  return (
    <div className="space-y-3">
      {withHeader && (
        <div className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
          <MessagesSquare className="h-[18px] w-[18px] text-muted-foreground" /> Questions & concerns
        </div>
      )}

      {/* Composer first on the full tab so it's the obvious action */}
      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          placeholder="Ask your builder a question…"
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button onClick={send} disabled={act.isPending || !draft.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50" style={{ background: accent }}>
          <Send className="h-3.5 w-3.5" /> Send
        </button>
      </div>

      {isLoading && questions.length === 0 ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : questions.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No questions yet. Ask anything — your builder will see it right away.</p>
      ) : (
        questions.map((q) => {
          const answered = !!q.response;
          return (
            <div key={q.id} className="rounded-2xl border border-border bg-white p-3.5 shadow-sm">
              <div className="flex items-start justify-between gap-2.5">
                <div className="text-[14px] font-semibold text-foreground">{q.subject || q.message}</div>
                <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={answered ? { background: '#E1F5EE', color: '#0F6E56' } : { background: '#F1EFE8', color: '#5F5E5A' }}>
                  {answered ? 'Answered' : 'Pending'}
                </span>
              </div>
              {q.subject && q.message !== q.subject && <p className="mt-1 text-[13px] text-muted-foreground">{q.message}</p>}
              {answered && (
                <div className="mt-2.5 rounded-lg bg-muted/50 px-3 py-2 text-[13px] text-foreground">
                  <span className="font-semibold">Builder:</span> {q.response}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
