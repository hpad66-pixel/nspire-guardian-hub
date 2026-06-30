import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, Wrench, CheckCircle2, StickyNote, Printer, Loader2, ShieldCheck, Paperclip } from 'lucide-react';
import { useUnitTurnDetail, useAddTurnLog, useCloseTurn } from '@/hooks/useUnitTurns';
import { unitPhotoUrl } from '@/hooks/useUnitPhoto';
import { openTurnCertificate } from '@/lib/units/turnCertificate';

const fmt = (ts?: string | null) => { if (!ts) return '—'; try { return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch { return '—'; } };
const KIND_META: Record<string, { label: string; icon: any; color: string }> = {
  turn_started: { label: 'Turn opened', icon: StickyNote, color: '#6b7280' },
  inspection_triggered: { label: 'NSPIRE inspection started', icon: ShieldCheck, color: '#1558b0' },
  inspection_deferred: { label: 'Inspection deferred', icon: StickyNote, color: '#854F0B' },
  inspection_done: { label: 'Inspection completed', icon: CheckCircle2, color: '#0F6E56' },
  finding_addressed: { label: 'Finding addressed', icon: CheckCircle2, color: '#0F6E56' },
  equipment: { label: 'Equipment repaired / replaced', icon: Wrench, color: '#1558b0' },
  document: { label: 'Document uploaded', icon: Paperclip, color: '#6b7280' },
  signed_off: { label: 'Signed off', icon: ShieldCheck, color: '#0F6E56' },
  closed: { label: 'Turn closed', icon: CheckCircle2, color: '#0F6E56' },
  note: { label: 'Note', icon: StickyNote, color: '#6b7280' },
};

export function UnitTurnDrawer({ turnId, open, onClose, propertyId }: { turnId: string; open: boolean; onClose: () => void; propertyId: string | null }) {
  const { data } = useUnitTurnDetail(turnId);
  const addLog = useAddTurnLog();
  const closeTurn = useCloseTurn();
  const fileRef = useRef<HTMLInputElement>(null);
  const [actor, setActor] = useState('');
  const [kind, setKind] = useState<'note' | 'finding_addressed' | 'equipment'>('finding_addressed');
  const [body, setBody] = useState('');
  const [signoff, setSignoff] = useState('');

  const turn = data?.turn;
  const closed = turn?.status === 'closed';

  const logEntry = () => {
    if (!body.trim()) return;
    addLog.mutate({ turnId, kind, body: body.trim(), actorName: actor.trim() || undefined }, { onSuccess: () => setBody('') });
  };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) addLog.mutate({ turnId, kind: 'document', file: f, actorName: actor.trim() || undefined });
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Unit {data?.unitNumber ?? '…'} · Turn
            {turn && <Badge variant={closed ? 'secondary' : 'outline'} className={closed ? 'bg-emerald-100 text-emerald-800' : ''}>{closed ? 'Closed' : turn.status}</Badge>}
          </DialogTitle>
        </DialogHeader>

        {!data ? <p className="text-sm text-muted-foreground">Loading…</p> : (
          <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1">
            {/* Key dates */}
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3 text-[12.5px] sm:grid-cols-4">
              <div><div className="text-[10px] uppercase text-muted-foreground">Vacated</div><div className="font-semibold">{fmt(turn?.vacated_at)}</div></div>
              <div><div className="text-[10px] uppercase text-muted-foreground">Turned over</div><div className="font-semibold">{fmt(turn?.turned_over_at)}</div></div>
              <div><div className="text-[10px] uppercase text-muted-foreground">Inspected</div><div className="font-semibold">{fmt(turn?.inspection_done_at)}</div></div>
              <div><div className="text-[10px] uppercase text-muted-foreground">Closed</div><div className="font-semibold">{fmt(turn?.closed_at)}</div></div>
            </div>

            {/* Add to log */}
            {!closed && (
              <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Input value={actor} onChange={(e) => setActor(e.target.value)} placeholder="Who (name)" className="h-9 w-36" />
                  <Select value={kind} onValueChange={(v) => setKind(v as any)}>
                    <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="finding_addressed">Finding addressed</SelectItem>
                      <SelectItem value="equipment">Equipment repaired/replaced</SelectItem>
                      <SelectItem value="note">Note</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="What was done…" className="h-9 flex-1" onKeyDown={(e) => { if (e.key === 'Enter') logEntry(); }} />
                  <Button size="sm" onClick={logEntry} disabled={addLog.isPending || !body.trim()}>Log</Button>
                  <input ref={fileRef} type="file" className="hidden" onChange={onFile} />
                  <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={addLog.isPending} title="Upload invoice / warranty / manual">
                    {addLog.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            {/* Audit timeline */}
            <div>
              <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Audit log</h3>
              <div className="space-y-2">
                {data.log.map((l) => {
                  const m = KIND_META[l.kind] ?? { label: l.kind, icon: StickyNote, color: '#6b7280' };
                  const Icon = m.icon;
                  const url = unitPhotoUrl(l.artifact_path);
                  return (
                    <div key={l.id} className="flex gap-2.5 text-[13px]">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: m.color }} />
                      <div className="flex-1">
                        <div><b>{m.label}</b>{l.body ? ` — ${l.body}` : ''}</div>
                        <div className="text-[11px] text-muted-foreground">{fmt(l.created_at)}{l.actor_name ? ` · ${l.actor_name}` : ''}{url && <> · <a href={url} target="_blank" rel="noreferrer" className="text-[var(--apas-sapphire)] underline">view doc</a></>}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Close / certificate */}
            <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
              {!closed ? (
                <>
                  <div className="flex-1">
                    <Label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Sign-off name</Label>
                    <Input value={signoff} onChange={(e) => setSignoff(e.target.value)} placeholder="Your name" className="h-9" />
                  </div>
                  <Button onClick={() => { if (signoff.trim()) closeTurn.mutate({ turnId, signoffName: signoff.trim(), propertyId }); }} disabled={closeTurn.isPending || !signoff.trim()} className="gap-1.5">
                    {closeTurn.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Close turn (all findings addressed)
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-2 text-[13px] text-emerald-700"><ShieldCheck className="h-4 w-4" /> Closed &amp; signed off.</div>
              )}
              <Button variant="outline" className="gap-1.5" onClick={() => openTurnCertificate(data)}><Printer className="h-4 w-4" /> Certificate</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
