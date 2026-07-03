import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Globe, Plus, Copy, Check, Trash2, ExternalLink, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useConsultingClientLinks, type ClientLink } from '@/hooks/useConsultingClientLinks';

export function ConsultingClientPortalCard({ projectId }: { projectId: string }) {
  const { data: links = [], isLoading, create, update, remove } = useConsultingClientLinks(projectId);
  const [label, setLabel] = useState('');
  const [showFin, setShowFin] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const urlFor = (t: string) => `${window.location.origin}/client/${t}`;
  const copy = async (t: string) => {
    try { await navigator.clipboard.writeText(urlFor(t)); setCopied(t); toast.success('Link copied'); setTimeout(() => setCopied(null), 1800); }
    catch { toast.error('Copy failed — select and copy manually'); }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-2xl bg-[var(--apas-sapphire)]/12 flex items-center justify-center shrink-0"><Globe className="h-5 w-5 text-[var(--apas-sapphire)]" /></div>
        <div>
          <h2 className="text-lg font-semibold">Client portal</h2>
          <p className="text-sm text-muted-foreground">Share a live, read-only view of this engagement — scope progress, milestones, action items, meeting recaps{`, and invoices`}. No account needed; revoke anytime.</p>
        </div>
      </div>

      {/* Create */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">New client link</div>
        <div className="flex flex-wrap items-center gap-2">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (optional) — e.g. Glorieta exec view" className="h-9 flex-1 min-w-[200px]" />
          <label className="flex items-center gap-2 text-sm"><Switch checked={showFin} onCheckedChange={setShowFin} /><span className="text-muted-foreground">Show invoices &amp; fees</span></label>
          <Button size="sm" onClick={() => create.mutate({ label: label.trim() || undefined, show_financials: showFin }, { onSuccess: () => setLabel('') })} disabled={create.isPending} className="gap-1.5 h-9">
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Create link
          </Button>
        </div>
      </div>

      {/* Existing links */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : links.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No client links yet. Create one above to share this engagement with your client.</div>
      ) : (
        <div className="space-y-2">
          {links.map((l: ClientLink) => (
            <div key={l.id} className="rounded-lg border p-3 flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{l.label || 'Client link'}</span>
                  {l.is_active ? <Badge variant="secondary" className="text-[10px]">Active</Badge> : <Badge variant="outline" className="text-[10px] text-muted-foreground">Revoked</Badge>}
                  {!l.show_financials && <Badge variant="outline" className="text-[10px] gap-1"><Eye className="h-3 w-3" />No financials</Badge>}
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-muted-foreground truncate">{urlFor(l.token)}</div>
                {l.last_viewed_at && <div className="text-[11px] text-muted-foreground">Last viewed {new Date(l.last_viewed_at).toLocaleString()}</div>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => copy(l.token)}>{copied === l.token ? <Check className="h-3.5 w-3.5 text-[var(--apas-emerald)]" /> : <Copy className="h-3.5 w-3.5" />}Copy</Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Open" onClick={() => window.open(urlFor(l.token), '_blank')}><ExternalLink className="h-4 w-4" /></Button>
                <label className="flex items-center gap-1.5 text-xs px-1"><Switch checked={l.is_active} onCheckedChange={(v) => update.mutate({ id: l.id, is_active: v })} /></label>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" title="Revoke" onClick={() => remove.mutate(l.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
