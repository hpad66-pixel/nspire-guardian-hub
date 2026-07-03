import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Printer, Mail, RefreshCw, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ProRichTextEditor } from '@/components/ui/rich-text-editor';
import { useProjectScopes, summarizeScopes } from '@/hooks/useProjectScopes';
import { useActionItemsByProject } from '@/hooks/useActionItems';
import { useSendEmail } from '@/hooks/useSendEmail';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  clientName?: string | null;
}

const withinDays = (iso: string | null, days: number, dir: 'past' | 'future') => {
  if (!iso) return false;
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso).getTime();
  const now = Date.now();
  return dir === 'past' ? d >= now - days * 864e5 && d <= now : d >= now && d <= now + days * 864e5;
};

const brandedShell = (inner: string, title: string) =>
  `<div style="max-width:640px;margin:0 auto;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1A1714;line-height:1.6;">
    <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#C4A35A;font-weight:700;">Progress update</div>
    <h1 style="font-size:22px;margin:4px 0 16px;font-weight:700;">${title}</h1>
    ${inner}
    <div style="margin-top:24px;padding-top:12px;border-top:1px solid #eceae4;font-size:12px;color:#a8a49c;">Sent from Build OS · projos.ai</div>
  </div>`;

export function ConsultingUpdateDialog({ open, onOpenChange, projectId, projectName, clientName }: Props) {
  const { data: scopes } = useProjectScopes(projectId);
  const { data: items } = useActionItemsByProject(projectId);
  const sendEmail = useSendEmail();

  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');

  const payload = useMemo(() => {
    const summary = summarizeScopes(scopes);
    const doneRecently = (items ?? []).filter((i) => i.status === 'done' && withinDays(i.completed_at, 7, 'past')).map((i) => i.title);
    const dueSoon = (items ?? [])
      .filter((i) => i.status !== 'done' && i.status !== 'cancelled' && withinDays(i.due_date, 7, 'future'))
      .map((i) => ({ title: i.title, due: i.due_date }));
    return {
      projectName,
      overallPct: summary.pctComplete,
      scopes: (scopes ?? []).map((s) => ({ title: s.title, pct: Number(s.pct_complete) || 0, status: s.status })),
      doneRecently,
      dueSoon,
    };
  }, [scopes, items, projectName]);

  const generate = async () => {
    if (!payload.scopes.length) { toast.error('Add some scopes first — there is no progress to report.'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-consulting-update', { body: payload });
      if (error) throw new Error(error.message || 'AI request failed');
      if ((data as any)?.error) throw new Error((data as any).error);
      setDraft((data as any)?.html ?? '');
    } catch (e) {
      toast.error(`Couldn't generate: ${e instanceof Error ? e.message : 'try again'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (open) { setDraft(''); setEmailOpen(false); setEmailTo(''); generate(); } }, [open]);

  const title = `${projectName} — progress update`;
  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=720,height=900');
    if (!w) return;
    w.document.write(`<!doctype html><html><body style="background:#FDFCF9;padding:28px 20px;">${brandedShell(draft, title)}</body></html>`);
    w.document.close(); w.focus();
    setTimeout(() => { try { w.print(); } catch { /* manual */ } }, 300);
  };
  const handleSend = async () => {
    const to = emailTo.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    if (!to.length) return;
    try {
      await sendEmail.mutateAsync({ recipients: to, subject: title, bodyHtml: brandedShell(draft, title) });
      setEmailOpen(false);
    } catch { /* handled */ }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[var(--apas-sapphire)]" />Client update{clientName ? ` · ${clientName}` : ''}</DialogTitle>
          <DialogDescription>A progress update drafted from your scope completion and action items. Edit it, then send or print.</DialogDescription>
        </DialogHeader>

        {loading && !draft ? (
          <div className="py-16 text-center text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Drafting your update…</div>
        ) : (
          <div className="space-y-3">
            <ProRichTextEditor content={draft} onChange={setDraft} minHeight="300px" placeholder="Your client update…" />

            {emailOpen && (
              <div className="border-t pt-3 space-y-2">
                <Label className="text-xs">Send to</Label>
                <Input value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="client@company.com" className="h-9" />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEmailOpen(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleSend} disabled={sendEmail.isPending || !emailTo.trim()} className="gap-1.5">
                    {sendEmail.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Send
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t pt-3">
              <Button variant="ghost" size="sm" onClick={generate} disabled={loading} className="gap-1.5">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Regenerate
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint} disabled={!draft} className="gap-1.5"><Printer className="h-4 w-4" />Print</Button>
                <Button variant="outline" size="sm" onClick={() => setEmailOpen((v) => !v)} disabled={!draft} className="gap-1.5"><Mail className="h-4 w-4" />Email</Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
