/**
 * Action items / review comments panel for a daily field report. An admin/PM types
 * comments and sends them back to the field; staff acknowledge each one. Shown in the
 * report view drawer (both per-project and the cross-project hub).
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { ClipboardList, Check, Trash2, Plus, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useDailyReportActionItems } from '@/hooks/useDailyReportActionItems';

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

export function DailyReportActionItems({ reportId, projectId }: { reportId: string; projectId: string }) {
  const { data: items = [], add, acknowledge, remove, notify } = useDailyReportActionItems(reportId);
  const [body, setBody] = useState('');
  const open = items.filter((i) => i.status === 'open').length;

  const submit = async () => {
    if (!body.trim()) return;
    try { await add.mutateAsync({ projectId, body }); setBody(''); toast.success('Action item added ✓'); }
    catch (e: any) { toast.error(e?.message ?? 'Could not add'); }
  };

  const emailCrew = async () => {
    try {
      const r = await notify.mutateAsync(body.trim() || undefined);
      toast.success(`Emailed ${r.count} item${r.count === 1 ? '' : 's'} to ${r.sentTo}`);
    } catch (e: any) { toast.error(e?.message ?? 'Could not email the submitter'); }
  };

  return (
    <div className="px-6 py-5 border-t bg-muted/20">
      <div className="flex items-center gap-2 mb-3">
        <ClipboardList className="h-4 w-4 text-[var(--apas-sapphire)]" />
        <span className="text-sm font-semibold">Action items &amp; comments</span>
        {open > 0 && <span className="text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 bg-amber-100 text-amber-700">{open} open</span>}
      </div>

      <div className="space-y-2 mb-3">
        {items.length === 0 && <p className="text-xs text-muted-foreground">No comments yet. Add an action item below to send it back to the crew.</p>}
        {items.map((i) => (
          <div key={i.id} className="rounded-md border bg-card p-2.5 text-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="whitespace-pre-wrap flex-1">{i.body}</p>
              {i.status === 'open' ? (
                <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1 border-[var(--apas-emerald)] text-[var(--apas-emerald)]" onClick={() => acknowledge.mutate(i.id)} disabled={acknowledge.isPending}>
                  <Check className="h-3.5 w-3.5" /> Acknowledge
                </Button>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-700 shrink-0">✓ Acknowledged</span>
              )}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-2">
              <span>{i.created_by_name || 'Reviewer'} · {fmt(i.created_at)}</span>
              {i.status === 'acknowledged' && <span className="text-emerald-600">· ack by {i.acknowledged_by_name || 'staff'} {fmt(i.acknowledged_at)}</span>}
              <button className="ml-auto text-muted-foreground hover:text-[var(--apas-rose)]" title="Delete" onClick={() => remove.mutate(i.id)}><Trash2 className="h-3 w-3" /></button>
            </div>
          </div>
        ))}
      </div>

      <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Comment on this report — add it as an action item the crew must acknowledge…" className="text-sm mb-2" />
      <div className="flex items-center gap-2">
        <Button onClick={submit} disabled={!body.trim() || add.isPending} variant="outline" className="gap-1.5"><Plus className="h-4 w-4" /> Add action item</Button>
        <Button onClick={emailCrew} disabled={open === 0 || notify.isPending} className="gap-1.5 ml-auto">
          <Mail className="h-4 w-4" /> {notify.isPending ? 'Sending…' : `Email submitter${open > 0 ? ` (${open})` : ''}`}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground mt-1.5">Add items, then “Email submitter” to send the open ones to the crew member who filed this report. Any text above is included as a note.</p>
    </div>
  );
}
