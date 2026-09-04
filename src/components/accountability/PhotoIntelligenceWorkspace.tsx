import { useMemo, useRef, useState } from 'react';
import { CheckCircle2, FileText, Filter, Images, Loader2, Pencil, RotateCcw, Search, Sparkles, Square } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VoiceDictationTextareaWithAI } from '@/components/ui/voice-dictation-textarea-ai';
import { AccountabilityPhotoViewer } from './AccountabilityPhotoViewer';
import type { FieldItem, FieldPhoto, FieldSeverity } from '@/hooks/useFieldAccountability';
import { openFieldPhotoScopeReport, photoCategory, photoObservation, photoRecommendedAction, photoSeverity } from '@/lib/accountability/photoScopeReport';
import { toast } from 'sonner';

const CATEGORIES = ['life_safety','water_intrusion','building_envelope','grounds','cleanliness','electrical','plumbing','hvac','structural','accessibility','security','other'];
const SEVERITIES: FieldSeverity[] = ['low', 'medium', 'high', 'critical'];

function fileLabel(photo: FieldPhoto) {
  const source = photo.photo.exif?.source_filename;
  return typeof source === 'string' && source ? source : photo.photo.storage_path.split('/').at(-1) || 'Photograph';
}

function draftValue(photo: FieldPhoto, key: string) {
  const value = photo.ai_suggestion?.[key];
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.filter((entry) => typeof entry === 'string').join(' ');
  return '';
}

export function PhotoIntelligenceWorkspace({
  projectName,
  photos,
  items,
  onAnalyze,
  onReview,
  onCaptionUpdate,
  onAnnotate,
}: {
  projectName: string;
  photos: FieldPhoto[];
  items: FieldItem[];
  onAnalyze: (photoLinkId: string) => Promise<unknown>;
  onReview: (input: { photoLinkId: string; reviewStatus: 'unreviewed' | 'ai_drafted' | 'needs_clarification' | 'confirmed'; category: string; severity: FieldSeverity; narrative: string; action: string; location: string }) => Promise<unknown>;
  onCaptionUpdate: (photoId: string, caption: string) => Promise<unknown>;
  onAnnotate: (input: { itemId: string; photoId: string; x: number; y: number; label: string }) => Promise<unknown>;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [reviewing, setReviewing] = useState<FieldPhoto | null>(null);
  const [visibleCount, setVisibleCount] = useState(24);
  const [progress, setProgress] = useState<{ done: number; total: number; failed: number } | null>(null);
  const cancelRef = useRef(false);
  const itemMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const metrics = useMemo(() => ({
    total: photos.length,
    drafted: photos.filter((photo) => photo.ai_status === 'drafted' || Object.keys(photo.ai_suggestion || {}).length > 0).length,
    confirmed: photos.filter((photo) => photo.review_status === 'confirmed').length,
    clarification: photos.filter((photo) => photo.review_status === 'needs_clarification').length,
  }), [photos]);
  const filtered = useMemo(() => photos.filter((photo) => {
    const item = photo.item_id ? itemMap.get(photo.item_id) : null;
    const haystack = `${fileLabel(photo)} ${photoObservation(photo)} ${photoRecommendedAction(photo)} ${item?.title || ''} ${photo.reviewed_location || item?.location_label || ''}`.toLowerCase();
    return (!query || haystack.includes(query.toLowerCase()))
      && (status === 'all' || (photo.review_status || 'unreviewed') === status)
      && (category === 'all' || photoCategory(photo) === category)
      && (severity === 'all' || photoSeverity(photo) === severity);
  }), [category, itemMap, photos, query, severity, status]);
  const visible = filtered.slice(0, visibleCount);

  async function analyzeAll(reanalyze = false) {
    const queue = photos.filter((photo) => reanalyze || !Object.keys(photo.ai_suggestion || {}).length || photo.ai_status === 'failed');
    if (!queue.length) { toast.success('Every photograph already has an AI starting assessment'); return; }
    cancelRef.current = false;
    let done = 0;
    let failed = 0;
    setProgress({ done, total: queue.length, failed });
    for (let index = 0; index < queue.length && !cancelRef.current; index += 3) {
      const batch = queue.slice(index, index + 3);
      const results = await Promise.allSettled(batch.map((photo) => onAnalyze(photo.id)));
      failed += results.filter((result) => result.status === 'rejected').length;
      done += results.length;
      setProgress({ done, total: queue.length, failed });
    }
    const cancelled = cancelRef.current;
    setProgress(null);
    toast[failed ? 'warning' : 'success'](cancelled ? `Analysis paused after ${done} photographs. Saved results will remain.` : `Analysis pass complete: ${done - failed} saved${failed ? `, ${failed} need retry` : ''}.`);
  }

  function generateReport() {
    try { openFieldPhotoScopeReport({ projectName, photos, items }); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Report could not be opened'); }
  }

  return (
    <div className="space-y-5" data-testid="photo-intelligence-workspace">
      <section className="overflow-hidden rounded-[28px] bg-[#082b23] p-5 text-white shadow-xl sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="text-[11px] font-bold uppercase tracking-[.18em] text-amber-300">Property-wide evidence intelligence</div><h2 className="mt-1 font-display text-3xl sm:text-4xl">Turn photographs into accountable work</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-emerald-50/75">AI drafts what is visibly present. You verify the location, condition, priority, and action before anything becomes a confirmed finding or scope item.</p></div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end"><Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={generateReport}><FileText className="mr-2 h-4 w-4" />Generate scope report</Button><Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white" disabled={Boolean(progress)} onClick={() => { if (window.confirm(`Reanalyze all ${photos.length} photographs? Existing confirmed reviews will be preserved, but this can take several minutes.`)) void analyzeAll(true); }}><RotateCcw className="mr-2 h-4 w-4" />Reanalyze every image</Button><Button className="bg-amber-400 text-amber-950 hover:bg-amber-300" disabled={Boolean(progress)} onClick={() => void analyzeAll(false)}>{progress ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}{progress ? `Analyzing ${progress.done}/${progress.total}` : 'Analyze all pending'}</Button></div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4"><Stat label="All photographs" value={metrics.total} /><Stat label="AI drafts" value={metrics.drafted} /><Stat label="Confirmed" value={metrics.confirmed} /><Stat label="Need answers" value={metrics.clarification} /></div>
        {progress && <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3"><div className="flex items-center justify-between gap-3 text-xs"><span>{progress.failed ? `${progress.failed} failed and can be retried` : 'Each completed result is saved immediately'}</span><Button size="sm" variant="ghost" className="h-8 text-white hover:bg-white/10 hover:text-white" onClick={() => { cancelRef.current = true; }}><Square className="mr-1.5 h-3 w-3" />Pause safely</Button></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-300 transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} /></div></div>}
      </section>

      <section className="rounded-3xl border bg-white p-4 shadow-sm">
        <div className="grid gap-2 lg:grid-cols-[minmax(220px,1fr)_180px_180px_160px]">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search photos, conditions, actions, or locations" className="h-11 rounded-xl pl-9" /></div>
          <FilterSelect value={status} onChange={setStatus} label="Review status" values={['unreviewed','ai_drafted','needs_clarification','confirmed']} />
          <FilterSelect value={category} onChange={setCategory} label="Category" values={CATEGORIES} />
          <FilterSelect value={severity} onChange={setSeverity} label="Severity" values={SEVERITIES} />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground"><span><Filter className="mr-1 inline h-3.5 w-3.5" />Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} matching · {photos.length} total</span><Button variant="ghost" size="sm" className="h-8" onClick={() => { setQuery(''); setStatus('all'); setCategory('all'); setSeverity('all'); setVisibleCount(24); }}><RotateCcw className="mr-1 h-3.5 w-3.5" />Reset</Button></div>
      </section>

      {!filtered.length ? <div className="rounded-3xl border border-dashed bg-white p-12 text-center"><Images className="mx-auto h-8 w-8 text-slate-300" /><h3 className="mt-3 text-lg font-semibold text-[#082b23]">No photographs match these filters</h3><p className="mt-1 text-sm text-muted-foreground">Reset the filters or upload a new site walk.</p></div> : <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visible.map((photo) => {
        const item = photo.item_id ? itemMap.get(photo.item_id) : null;
        return <Card key={photo.id} className="overflow-hidden rounded-3xl border-slate-200 shadow-sm"><CardContent className="space-y-3 p-3"><AccountabilityPhotoViewer link={photo} compact annotations={item?.annotations || []} canAnnotate={Boolean(item)} onAnnotate={item ? (input) => onAnnotate({ itemId: item.id, ...input }) : undefined} onCaptionUpdate={onCaptionUpdate} /><div className="px-1"><div className="flex flex-wrap gap-1"><Badge className={photo.review_status === 'confirmed' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : photo.review_status === 'needs_clarification' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' : 'bg-sky-100 text-sky-800 hover:bg-sky-100'}>{(photo.review_status || 'unreviewed').replace(/_/g, ' ')}</Badge><Badge variant="outline" className="capitalize">{photoCategory(photo).replace(/_/g, ' ')} · {photoSeverity(photo)}</Badge></div><p className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-400">{fileLabel(photo)}</p><p className="mt-1 line-clamp-3 text-sm leading-relaxed text-slate-700">{photoObservation(photo)}</p><p className="mt-2 line-clamp-2 text-xs text-slate-500"><strong>Next:</strong> {photoRecommendedAction(photo)}</p></div><Button className="w-full rounded-xl bg-[#0d6b57] hover:bg-[#095746]" onClick={() => setReviewing(photo)}><Pencil className="mr-2 h-4 w-4" />Review finding</Button></CardContent></Card>;
      })}</div>{visible.length < filtered.length && <div className="flex justify-center"><Button variant="outline" className="h-11 rounded-full px-6" onClick={() => setVisibleCount((count) => count + 24)}>Load 24 more photographs</Button></div>}</>}

      <PhotoReviewDialog photo={reviewing} item={reviewing?.item_id ? itemMap.get(reviewing.item_id) || null : null} onOpenChange={(open) => { if (!open) setReviewing(null); }} onSave={onReview} onAnalyze={onAnalyze} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="text-2xl font-bold tabular-nums">{value.toLocaleString()}</div><div className="text-[10px] font-bold uppercase tracking-wider text-emerald-50/60">{label}</div></div>; }

function FilterSelect({ value, onChange, label, values }: { value: string; onChange: (value: string) => void; label: string; values: readonly string[] }) { return <Select value={value} onValueChange={onChange}><SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All {label.toLowerCase()}</SelectItem>{values.map((option) => <SelectItem key={option} value={option} className="capitalize">{option.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select>; }

function PhotoReviewDialog({ photo, item, onOpenChange, onSave, onAnalyze }: { photo: FieldPhoto | null; item: FieldItem | null; onOpenChange: (open: boolean) => void; onSave: (input: { photoLinkId: string; reviewStatus: 'unreviewed' | 'ai_drafted' | 'needs_clarification' | 'confirmed'; category: string; severity: FieldSeverity; narrative: string; action: string; location: string }) => Promise<unknown>; onAnalyze: (id: string) => Promise<unknown> }) {
  const key = photo?.id || 'none';
  return <Dialog open={Boolean(photo)} onOpenChange={onOpenChange}><DialogContent className="max-h-[94dvh] max-w-3xl overflow-y-auto rounded-3xl"><DialogHeader><DialogTitle className="font-display text-3xl text-[#082b23]">Review photographic finding</DialogTitle><DialogDescription>Keep what is observed separate from what is inferred. Confirmation creates a reviewed finding; it does not approve work or change the accountability item.</DialogDescription></DialogHeader>{photo && <PhotoReviewForm key={key} photo={photo} item={item} onSave={onSave} onAnalyze={onAnalyze} onDone={() => onOpenChange(false)} />}</DialogContent></Dialog>;
}

function PhotoReviewForm({ photo, item, onSave, onAnalyze, onDone }: { photo: FieldPhoto; item: FieldItem | null; onSave: (input: { photoLinkId: string; reviewStatus: 'unreviewed' | 'ai_drafted' | 'needs_clarification' | 'confirmed'; category: string; severity: FieldSeverity; narrative: string; action: string; location: string }) => Promise<unknown>; onAnalyze: (id: string) => Promise<unknown>; onDone: () => void }) {
  const [reviewStatus, setReviewStatus] = useState<'unreviewed' | 'ai_drafted' | 'needs_clarification' | 'confirmed'>(photo.review_status || 'ai_drafted');
  const [category, setCategory] = useState(photoCategory(photo));
  const [severity, setSeverity] = useState<FieldSeverity>(photoSeverity(photo) as FieldSeverity);
  const [narrative, setNarrative] = useState(photo.reviewed_narrative || draftValue(photo, 'observed') || draftValue(photo, 'caption') || photo.photo.caption || '');
  const [action, setAction] = useState(photo.recommended_action || draftValue(photo, 'clarification_questions'));
  const [location, setLocation] = useState(photo.reviewed_location || item?.location_label || '');
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  async function save() { setSaving(true); try { await onSave({ photoLinkId: photo.id, reviewStatus, category, severity, narrative, action, location }); toast.success(reviewStatus === 'confirmed' ? 'Finding confirmed and audit history saved' : 'Photo review saved'); onDone(); } catch (error) { toast.error(error instanceof Error ? error.message : 'Review could not be saved'); } finally { setSaving(false); } }
  async function analyze() { setAnalyzing(true); try { await onAnalyze(photo.id); toast.success('Fresh AI draft saved. Reopen this finding to review it.'); onDone(); } catch (error) { toast.error(error instanceof Error ? error.message : 'AI analysis failed'); } finally { setAnalyzing(false); } }
  return <div className="space-y-4"><div className="rounded-2xl border bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Uploader's original caption</p><p className="mt-1 text-sm text-slate-700">{photo.photo.caption || 'No uploader caption.'}</p><p className="mt-2 text-[11px] text-slate-500">Only the uploader may change this testimony. Your review is stored separately below.</p></div><div className="grid gap-3 sm:grid-cols-3"><label className="text-xs font-semibold text-slate-600">Review status<Select value={reviewStatus} onValueChange={(value) => setReviewStatus(value as typeof reviewStatus)}><SelectTrigger className="mt-1 h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ai_drafted">AI draft</SelectItem><SelectItem value="needs_clarification">Needs clarification</SelectItem><SelectItem value="confirmed">Confirmed</SelectItem><SelectItem value="unreviewed">Unreviewed</SelectItem></SelectContent></Select></label><label className="text-xs font-semibold text-slate-600">Category<Select value={category} onValueChange={setCategory}><SelectTrigger className="mt-1 h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((value) => <SelectItem key={value} value={value} className="capitalize">{value.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></label><label className="text-xs font-semibold text-slate-600">Severity<Select value={severity} onValueChange={(value) => setSeverity(value as FieldSeverity)}><SelectTrigger className="mt-1 h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{SEVERITIES.map((value) => <SelectItem key={value} value={value} className="capitalize">{value}</SelectItem>)}</SelectContent></Select></label></div><label className="block text-xs font-semibold text-slate-600">Verified location<Input value={location} onChange={(event) => setLocation(event.target.value)} className="mt-1 h-11 rounded-xl" placeholder="Building, side, asset, stall, gate, or GPS-confirmed area" /></label><label className="block text-xs font-semibold text-slate-600">Observed condition<VoiceDictationTextareaWithAI value={narrative} onValueChange={setNarrative} context="site_photo" maxLength={5000} className="mt-1 min-h-28" placeholder="Describe only what is visibly present." /></label><label className="block text-xs font-semibold text-slate-600">Recommended action / scope requirement<VoiceDictationTextareaWithAI value={action} onValueChange={setAction} context="site_photo" maxLength={5000} className="mt-1 min-h-28" placeholder="State the confirmation, protection, repair, or closeout evidence required." /></label><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between"><Button variant="outline" onClick={() => void analyze()} disabled={analyzing || saving}>{analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Reanalyze image</Button><Button className="bg-[#0d6b57] hover:bg-[#095746]" onClick={() => void save()} disabled={saving || analyzing || !narrative.trim()}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}Save review</Button></div></div>;
}
