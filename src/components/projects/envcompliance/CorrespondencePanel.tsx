import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Plus, Sparkles, Loader2, Printer, Trash2, ArrowLeft, PenLine, Send, CheckCircle2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useComplianceCorrespondence, LETTER_TYPE_LABEL, type ComplianceLetter, type LetterType } from '@/hooks/useComplianceCorrespondence';
import { buildLetterHtml } from '@/lib/envcompliance/letterDocument';
import { cn } from '@/lib/utils';

const TYPES: LetterType[] = ['regulatory_notice', 'response', 'transmittal', 'request', 'general'];
const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-muted text-muted-foreground' },
  signed: { label: 'Signed', cls: 'bg-[var(--apas-amber)]/10 text-[var(--apas-amber)]' },
  submitted: { label: 'Submitted', cls: 'bg-[var(--apas-emerald)]/10 text-[var(--apas-emerald)]' },
};
const fmtDT = (s: string | null) => s ? new Date(s).toLocaleString() : '';

export function CorrespondencePanel({ projectId, projectName }: { projectId: string; projectName?: string }) {
  const api = useComplianceCorrespondence(projectId);
  const letters = api.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = letters.find((l) => l.id === selectedId) ?? null;

  const newLetter = () => {
    api.create.mutate({ subject: 'New regulatory letter', letter_type: 'general' } as any, { onSuccess: (row: ComplianceLetter) => setSelectedId(row.id) });
  };

  if (selected) return <LetterEditor letter={selected} api={api} projectName={projectName} onBack={() => setSelectedId(null)} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Draft agency letters, capture sign-off, and track submission — with the timestamped trail.</div>
        <Button size="sm" className="gap-1.5" onClick={newLetter} disabled={api.create.isPending}><Plus className="h-4 w-4" />New letter</Button>
      </div>

      {letters.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <Mail className="mx-auto h-9 w-9 text-muted-foreground mb-3" />
          <p className="font-medium">No correspondence yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Draft a regulatory notice, a response to an agency, or a transmittal — AI writes the first draft, you edit and sign off.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {letters.map((l) => (
            <button key={l.id} onClick={() => setSelectedId(l.id)} className="group w-full text-left rounded-lg border p-3 hover:border-primary/40 hover:shadow-sm transition-all">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate flex-1">{l.subject}</span>
                <Badge className={cn('text-[10px]', STATUS[l.status]?.cls)}>{STATUS[l.status]?.label}</Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground flex flex-wrap gap-x-3">
                <span>{LETTER_TYPE_LABEL[l.letter_type]}</span>
                {l.agency && <span>{l.agency}</span>}
                {l.submitted_at ? <span>Submitted {fmtDT(l.submitted_at)}</span> : l.signed_at ? <span>Signed {fmtDT(l.signed_at)}</span> : <span>Updated {new Date(l.updated_at).toLocaleDateString()}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LetterEditor({ letter, api, projectName, onBack }: { letter: ComplianceLetter; api: ReturnType<typeof useComplianceCorrespondence>; projectName?: string; onBack: () => void }) {
  const [f, setF] = useState({ ...letter });
  const [context, setContext] = useState('');
  const [drafting, setDrafting] = useState(false);
  useEffect(() => { setF({ ...letter }); }, [letter.id]);

  const set = (patch: Partial<ComplianceLetter>) => setF((p) => ({ ...p, ...patch }));
  const dirty = ['subject', 'letter_type', 'agency', 'recipient', 'recipient_address', 'reference_no', 'body'].some((k) => (f as any)[k] !== (letter as any)[k]);

  const save = () => api.update.mutate({ id: letter.id, subject: f.subject, letter_type: f.letter_type, agency: f.agency, recipient: f.recipient, recipient_address: f.recipient_address, reference_no: f.reference_no, body: f.body });

  const aiDraft = async () => {
    setDrafting(true);
    try {
      const body = await api.draft({ projectName, letterType: f.letter_type, agency: f.agency ?? undefined, recipient: f.recipient ?? undefined, subject: f.subject, context });
      set({ body });
      toast.success('Draft ready — review and edit');
    } catch (e) { toast.error(`Couldn't draft: ${e instanceof Error ? e.message : 'try again'}`); }
    finally { setDrafting(false); }
  };

  const markSigned = () => {
    const who = window.prompt('Signed by (name / title):', f.signed_by || '');
    if (who == null) return;
    api.update.mutate({ id: letter.id, status: 'signed', signed_by: who, signed_at: new Date().toISOString() });
  };
  const markSubmitted = () => {
    const method = window.prompt('Submission method (portal, email, certified mail…):', f.submission_method || '');
    if (method == null) return;
    api.update.mutate({ id: letter.id, status: 'submitted', submitted_at: new Date().toISOString(), submission_method: method });
  };
  const revert = () => api.update.mutate({ id: letter.id, status: 'draft' });

  const printLetter = () => {
    const html = buildLetterHtml({ subject: f.subject, agency: f.agency, recipient: f.recipient, recipientAddress: f.recipient_address, referenceNo: f.reference_no, body: f.body, signedBy: letter.signed_by, projectName, date: letter.signed_at || undefined });
    const w = window.open('', '_blank', 'width=760,height=920'); if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${f.subject}</title></head><body style="padding:40px;background:#fff;">${html}</body></html>`);
    w.document.close(); setTimeout(() => { try { w.print(); } catch {} }, 300);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2" onClick={onBack}><ArrowLeft className="h-4 w-4" />All letters</Button>
        <div className="flex items-center gap-2">
          <Badge className={cn('text-[10px]', STATUS[letter.status]?.cls)}>{STATUS[letter.status]?.label}</Badge>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={printLetter}><Printer className="h-4 w-4" />Print / PDF</Button>
          <Button size="sm" className="gap-1.5" onClick={save} disabled={!dirty || api.update.isPending}>{api.update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Save</Button>
        </div>
      </div>

      {/* Metadata */}
      <div className="grid gap-2 sm:grid-cols-2">
        <Input placeholder="Subject" value={f.subject} onChange={(e) => set({ subject: e.target.value })} />
        <Select value={f.letter_type} onValueChange={(v) => set({ letter_type: v as LetterType })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{LETTER_TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
        </Select>
        <Input placeholder="Agency (e.g. FDEP)" value={f.agency ?? ''} onChange={(e) => set({ agency: e.target.value })} />
        <Input placeholder="Recipient (name, title)" value={f.recipient ?? ''} onChange={(e) => set({ recipient: e.target.value })} />
        <Input placeholder="Recipient address" value={f.recipient_address ?? ''} onChange={(e) => set({ recipient_address: e.target.value })} />
        <Input placeholder="Reference no. (permit / case #)" value={f.reference_no ?? ''} onChange={(e) => set({ reference_no: e.target.value })} />
      </div>

      {/* AI draft */}
      <div className="rounded-lg border p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Sparkles className="h-3.5 w-3.5" />AI draft</div>
        <Textarea placeholder="Points to cover / context for the letter (facts, permit numbers, what happened, what you're requesting)…" value={context} onChange={(e) => setContext(e.target.value)} rows={2} />
        <Button size="sm" variant="outline" className="gap-1.5" onClick={aiDraft} disabled={drafting || !f.subject.trim()}>{drafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Draft with AI</Button>
      </div>

      {/* Body */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Letter body</div>
        <Textarea value={f.body ?? ''} onChange={(e) => set({ body: e.target.value })} rows={14} placeholder="The letter body — AI drafts it above, or write it here." className="font-[Georgia,serif] leading-relaxed" />
      </div>

      {/* Workflow + audit */}
      <div className="rounded-lg border p-3">
        <div className="flex items-center gap-2 flex-wrap">
          {letter.status === 'draft' && <Button size="sm" className="gap-1.5" onClick={markSigned}><PenLine className="h-4 w-4" />Mark signed</Button>}
          {letter.status === 'signed' && <Button size="sm" className="gap-1.5" onClick={markSubmitted}><Send className="h-4 w-4" />Mark submitted</Button>}
          {letter.status !== 'draft' && <Button size="sm" variant="ghost" onClick={revert}>Revert to draft</Button>}
          <div className="flex-1" />
          <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive gap-1.5" onClick={() => { api.remove.mutate(letter.id); onBack(); }}><Trash2 className="h-4 w-4" />Delete</Button>
        </div>
        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[var(--apas-emerald)]" />Created {fmtDT(letter.created_at)}</div>
          {letter.signed_at && <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[var(--apas-amber)]" />Signed by {letter.signed_by} · {fmtDT(letter.signed_at)}</div>}
          {letter.submitted_at && <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[var(--apas-sapphire)]" />Submitted {letter.submission_method ? `via ${letter.submission_method}` : ''} · {fmtDT(letter.submitted_at)}</div>}
        </div>
      </div>
    </div>
  );
}
