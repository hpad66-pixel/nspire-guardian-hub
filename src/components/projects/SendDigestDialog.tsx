import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Loader2, Send, Megaphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useSendEmail } from '@/hooks/useSendEmail';
import { toast } from 'sonner';

const db = supabase as any;

// Gathers the recent client-facing activity for a project: latest client-visible
// log updates + count of change orders awaiting approval.
function useProjectDigest(projectId: string) {
  return useQuery({
    queryKey: ['project-digest', projectId],
    queryFn: async () => {
      const { data: items } = await db.from('tracker_items').select('id, title').eq('project_id', projectId).eq('client_visible', true);
      const titleById: Record<string, string> = {};
      (items ?? []).forEach((i: any) => { titleById[i.id] = i.title; });
      const ids = (items ?? []).map((i: any) => i.id);
      let updates: { title: string; body: string; created_at: string }[] = [];
      if (ids.length) {
        const { data } = await db.from('tracker_updates').select('item_id, body, created_at, is_client')
          .in('item_id', ids).order('created_at', { ascending: false }).limit(10);
        updates = (data ?? []).filter((u: any) => !u.is_client).map((u: any) => ({ title: titleById[u.item_id] ?? 'Update', body: u.body, created_at: u.created_at }));
      }
      const { count: pendingCO } = await db.from('change_orders').select('id', { count: 'exact', head: true })
        .eq('project_id', projectId).not('sent_to_client_at', 'is', null).is('approved_at', null).neq('status', 'rejected');
      return { updates, pendingCO: pendingCO ?? 0 };
    },
  });
}

export function SendDigestDialog({ projectId, portalName, portalSlug, accent, recipients, onClose }: {
  projectId: string; portalName: string; portalSlug: string; accent: string; recipients: string[]; onClose: () => void;
}) {
  const { data, isLoading } = useProjectDigest(projectId);
  const sendEmail = useSendEmail();
  const [intro, setIntro] = useState(`Here's the latest on ${portalName}.`);

  const portalUrl = `${window.location.origin}/portal/${portalSlug}`;
  const updates = data?.updates ?? [];
  const pendingCO = data?.pendingCO ?? 0;

  const bodyHtml = useMemo(() => {
    const rows = updates.map(u =>
      `<tr><td style="padding:7px 0;border-bottom:1px solid #f0f0f0;font-size:13.5px;color:#333"><b style="font-weight:600">${esc(u.title)}</b> — ${esc(u.body)}<div style="color:#999;font-size:11px;margin-top:2px">${fmt(u.created_at)}</div></td></tr>`
    ).join('');
    return `
      <div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff">
        <div style="background:${accent};padding:20px 26px;border-radius:14px 14px 0 0">
          <div style="color:#fff;font-size:19px;font-weight:700">${esc(portalName)}</div>
          <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:2px">Project update</div>
        </div>
        <div style="border:1px solid #eee;border-top:none;border-radius:0 0 14px 14px;padding:24px 26px">
          <p style="color:#333;font-size:14.5px;line-height:1.6;margin:0 0 16px">${esc(intro).replace(/\n/g, '<br/>')}</p>
          ${pendingCO > 0 ? `<div style="background:#FEF7EA;border:1px solid #F0C97D;border-radius:10px;padding:11px 14px;margin:0 0 16px;color:#7A4A09;font-size:13.5px"><b>${pendingCO} change order${pendingCO !== 1 ? 's' : ''} await${pendingCO === 1 ? 's' : ''} your approval.</b> Review them on your portal.</div>` : ''}
          ${rows ? `<p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:#999;margin:0 0 6px">Recent progress</p><table style="width:100%;border-collapse:collapse;margin:0 0 18px">${rows}</table>` : ''}
          <a href="${portalUrl}" style="display:inline-block;background:${accent};color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">View your portal →</a>
        </div>
        <p style="text-align:center;color:#bbb;font-size:11px;margin-top:14px">Powered by Proj OS · projos.ai</p>
      </div>`;
  }, [updates, pendingCO, intro, accent, portalName, portalUrl]);

  const send = () => {
    if (!recipients.length) { toast.error('No client email on file. Invite a contact first.'); return; }
    sendEmail.mutate({ recipients, subject: `Project update — ${portalName}`, bodyHtml }, {
      onSuccess: () => { toast.success(`Update sent to ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''}`); onClose(); },
      onError: (e: any) => toast.error(e?.message || 'Send failed'),
    });
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-[var(--apas-sapphire)]" /> Email a project update</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Intro message</label>
            <Textarea value={intro} onChange={e => setIntro(e.target.value)} rows={2} />
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-[13px]">
            {isLoading ? <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div> : (
              <>
                {pendingCO > 0 && <p className="mb-2 font-semibold text-[#854F0B]">{pendingCO} change order{pendingCO !== 1 ? 's' : ''} awaiting approval</p>}
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recent progress ({updates.length})</p>
                {updates.length === 0 ? <p className="text-muted-foreground">No recent client-visible updates — the email will still send your intro and portal link.</p> :
                  <ul className="space-y-1">{updates.slice(0, 5).map((u, i) => <li key={i} className="text-foreground/80"><b className="font-semibold">{u.title}</b> — {u.body.slice(0, 80)}{u.body.length > 80 ? '…' : ''}</li>)}{updates.length > 5 && <li className="text-muted-foreground">+ {updates.length - 5} more</li>}</ul>}
              </>
            )}
          </div>
          <p className="text-[12px] text-muted-foreground">{recipients.length ? <>Sends to: {recipients.join(', ')}</> : 'No client email on file — invite a contact first.'}</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={send} disabled={sendEmail.isPending || isLoading || !recipients.length} className="gap-1.5">
            {sendEmail.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (ts?: string) => { if (!ts) return ''; try { return format(new Date(ts), 'MMM d'); } catch { return ''; } };
