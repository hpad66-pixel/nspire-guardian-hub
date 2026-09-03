import { useEffect, useMemo, useState } from 'react';
import { Camera, Expand, MapPin, MessageCircle, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { signedUrlFor } from '@/lib/pdf-viewer';
import type { FieldAnnotation, FieldPhoto } from '@/hooks/useFieldAccountability';
import { cn } from '@/lib/utils';

interface AccountabilityPhotoViewerProps {
  link: FieldPhoto;
  annotations?: FieldAnnotation[];
  compact?: boolean;
  canAnnotate?: boolean;
  onAnnotate?: (input: { photoId: string; x: number; y: number; label: string }) => Promise<unknown>;
  onAsk?: (photoId: string) => void;
}
export function AccountabilityPhotoViewer({
  link,
  annotations = [],
  compact = false,
  canAnnotate = true,
  onAnnotate,
  onAsk,
}: AccountabilityPhotoViewerProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pinMode, setPinMode] = useState(false);
  const [draftPin, setDraftPin] = useState<{ x: number; y: number } | null>(null);
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const photoAnnotations = useMemo(
    () => annotations.filter((annotation) => annotation.photo_id === link.photo_id),
    [annotations, link.photo_id],
  );

  useEffect(() => {
    let live = true;
    signedUrlFor('project-photos', link.photo.thumb_path || link.photo.storage_path, 1800)
      .then((next) => { if (live) setUrl(next); })
      .catch(() => { if (live) setUrl(null); });
    return () => { live = false; };
  }, [link.photo.storage_path, link.photo.thumb_path]);

  function placePin(event: React.MouseEvent<HTMLDivElement>) {
    if (!pinMode || !canAnnotate) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setDraftPin({
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    });
    setLabel('');
  }

  async function savePin() {
    if (!draftPin || !label.trim() || !onAnnotate) return;
    setSaving(true);
    try {
      await onAnnotate({ photoId: link.photo_id, ...draftPin, label: label.trim() });
      setDraftPin(null);
      setLabel('');
      setPinMode(false);
    } finally {
      setSaving(false);
    }
  }

  const taken = link.photo.taken_at || link.photo.created_at;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md',
          compact ? 'aspect-[4/3]' : 'aspect-[16/11]',
        )}
      >
        {url ? (
          <img src={url} alt={link.photo.caption || `${link.evidence_type} evidence`} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-slate-400"><Camera className="h-7 w-7" /></span>
        )}
        <span className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent p-3 pt-10 text-white">
          <span>
            <small className="block text-[10px] font-bold uppercase tracking-[.15em] text-white/75">{link.evidence_type}</small>
            <span className="line-clamp-1 text-xs font-medium">{link.photo.caption || new Date(taken).toLocaleDateString()}</span>
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 backdrop-blur"><Expand className="h-4 w-4" /></span>
        </span>
        {photoAnnotations.length > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-1 text-[10px] font-bold text-amber-950 shadow">
            {photoAnnotations.length} annotation{photoAnnotations.length === 1 ? '' : 's'}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[96dvh] max-w-6xl overflow-y-auto border-0 bg-slate-950 p-0 text-white sm:rounded-3xl">
          <DialogHeader className="sr-only"><DialogTitle>Photo evidence</DialogTitle></DialogHeader>
          <div className="grid min-h-[70dvh] lg:grid-cols-[1fr_320px]">
            <div className="relative flex min-h-[50dvh] items-center justify-center bg-black p-2 sm:p-5">
              <div
                className={cn('relative max-h-[82dvh] max-w-full overflow-hidden', pinMode && 'cursor-crosshair ring-2 ring-amber-400')}
                onClick={placePin}
              >
                {url && <img src={url} alt={link.photo.caption || 'Site evidence'} className="max-h-[82dvh] max-w-full object-contain" />}
                {photoAnnotations.map((annotation, index) => (
                  <button
                    key={annotation.id}
                    type="button"
                    title={annotation.label}
                    className="absolute grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-amber-400 text-xs font-black text-amber-950 shadow-lg"
                    style={{ left: `${annotation.x * 100}%`, top: `${annotation.y * 100}%` }}
                  >{index + 1}</button>
                ))}
                {draftPin && (
                  <span
                    className="absolute grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-sky-400 text-xs font-black text-sky-950 shadow-lg"
                    style={{ left: `${draftPin.x * 100}%`, top: `${draftPin.y * 100}%` }}
                  >+</span>
                )}
              </div>
            </div>

            <aside className="space-y-5 border-l border-white/10 bg-slate-900 p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-amber-300">{link.evidence_type} evidence</p>
                <h3 className="mt-2 text-xl font-semibold">{link.photo.caption || 'Site photograph'}</h3>
                <div className="mt-3 space-y-1 text-xs text-slate-300">
                  <p>{new Date(taken).toLocaleString()}</p>
                  {link.photo.lat != null && link.photo.lng != null && (
                    <p className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {Number(link.photo.lat).toFixed(5)}, {Number(link.photo.lng).toFixed(5)}</p>
                  )}
                </div>
              </div>

              {canAnnotate && onAnnotate && (
                <Button
                  type="button"
                  variant={pinMode ? 'default' : 'outline'}
                  className={cn('w-full', !pinMode && 'border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white')}
                  onClick={() => { setPinMode((value) => !value); setDraftPin(null); }}
                >
                  {pinMode ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                  {pinMode ? 'Cancel annotation' : 'Annotate photograph'}
                </Button>
              )}

              {pinMode && !draftPin && <p className="rounded-xl bg-amber-300/10 p-3 text-xs text-amber-100">Tap the exact spot on the photograph you want to explain or question.</p>}
              {draftPin && (
                <div className="space-y-2 rounded-2xl border border-sky-400/30 bg-sky-400/10 p-3">
                  <label className="text-xs font-semibold text-sky-100">What should people notice here?</label>
                  <Input value={label} onChange={(event) => setLabel(event.target.value)} autoFocus className="border-white/20 bg-black/20 text-white" placeholder="Describe this point…" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={savePin} disabled={!label.trim() || saving}>Save pin</Button>
                    <Button size="sm" variant="ghost" className="text-white" onClick={() => setDraftPin(null)}>Cancel</Button>
                  </div>
                </div>
              )}

              {photoAnnotations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Annotations</h4>
                  {photoAnnotations.map((annotation, index) => (
                    <div key={annotation.id} className="flex gap-2 rounded-xl bg-white/5 p-3 text-sm text-slate-200">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-400 text-[11px] font-black text-amber-950">{index + 1}</span>
                      <span>{annotation.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {onAsk && (
                <Button type="button" variant="ghost" className="w-full justify-start text-slate-200 hover:bg-white/10 hover:text-white" onClick={() => { onAsk(link.photo_id); setOpen(false); }}>
                  <MessageCircle className="mr-2 h-4 w-4" /> Ask about this photograph
                </Button>
              )}
            </aside>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
