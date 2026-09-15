import { useMemo, useRef, useState } from 'react';
import {
  Camera, Check, CheckCircle2, ClipboardCheck, ImagePlus, Images, Loader2, LocateFixed, MapPin,
  MapPinned, ShieldCheck, Sparkles, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { VoiceDictationTextareaWithAI } from '@/components/ui/voice-dictation-textarea-ai';
import { useFieldAccountability, type FieldPhoto, type FieldVisit } from '@/hooks/useFieldAccountability';
import { toast } from 'sonner';

type WalkCategory = 'uncategorized' | 'structural' | 'mechanical' | 'electrical' | 'plumbing' | 'landscaping';

const WALK_CATEGORIES: Array<{ value: WalkCategory; label: string }> = [
  { value: 'uncategorized', label: 'To classify' },
  { value: 'structural', label: 'Structural' },
  { value: 'mechanical', label: 'Mechanical' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'landscaping', label: 'Landscaping' },
];

interface QueuedPhoto {
  id: string;
  file: File;
  preview: string;
  stopNumber: number;
  locationLabel: string;
  category: WalkCategory;
  caption: string;
}

interface SavedWalkPhoto {
  id: string;
  preview: string;
  caption: string | null;
  fileName: string;
  savedAt: string;
  stopNumber: number;
  locationLabel: string;
  category: WalkCategory;
}

interface FieldWalkCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  propertyId?: string | null;
  audience?: 'staff' | 'owner';
}

export function FieldWalkCaptureDialog({ open, onOpenChange, projectId, propertyId, audience = 'staff' }: FieldWalkCaptureDialogProps) {
  const { createVisit, uploadPhotos, analyzePhoto } = useFieldAccountability(projectId);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [visitType, setVisitType] = useState(audience === 'owner' ? 'owner_walk' : 'property_manager_walk');
  const [notes, setNotes] = useState('');
  const [queue, setQueue] = useState<QueuedPhoto[]>([]);
  const [savedPhotos, setSavedPhotos] = useState<SavedWalkPhoto[]>([]);
  const [activeVisit, setActiveVisit] = useState<FieldVisit | null>(null);
  const [nextStopNumber, setNextStopNumber] = useState(1);
  const [autoSaveCamera, setAutoSaveCamera] = useState(audience === 'owner');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const hasPhotos = queue.length > 0;
  const hasSavedPhotos = savedPhotos.length > 0;

  const locationLabel = useMemo(() => location
    ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}${location.accuracy ? ` · ±${Math.round(location.accuracy)} m` : ''}`
    : 'EXIF location will be used when available', [location]);
  const defaultTitle = useMemo(() => {
    const timestamp = new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date());
    return audience === 'owner' ? `Owner site walk - ${timestamp}` : `Field site walk - ${timestamp}`;
  }, [audience]);
  const savedLabel = lastSavedAt
    ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(lastSavedAt))
    : null;

  function addFiles(files: FileList | null, source: 'camera' | 'library') {
    if (!files) return;
    const incoming = Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .map((file, index) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        stopNumber: nextStopNumber + index,
        locationLabel: '',
        category: 'uncategorized' as WalkCategory,
        caption: '',
      }));
    if (!incoming.length) return;
    setNextStopNumber((current) => current + incoming.length);
    if (source === 'camera' && autoSaveCamera && incoming.length === 1) {
      setSaveMessage('Camera photo received. Saving it now…');
      void saveBatch(incoming, { auto: true });
      return;
    }
    setQueue((current) => [...current, ...incoming]);
    setSaveMessage(null);
    toast.info(`${incoming.length} photo${incoming.length === 1 ? '' : 's'} ready to save`);
  }

  function removePhoto(index: number) {
    setQueue((current) => {
      const target = current[index];
      if (target) URL.revokeObjectURL(target.preview);
      return current.filter((_, currentIndex) => currentIndex !== index);
    });
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      toast.error('Location is not available on this device. Photo EXIF will still be preserved.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy });
        setLocating(false);
        toast.success('Current location captured');
      },
      () => {
        setLocating(false);
        toast.warning('Location permission was not granted. You can continue without it.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  }

  function reset() {
    queue.forEach((item) => URL.revokeObjectURL(item.preview));
    savedPhotos.forEach((item) => URL.revokeObjectURL(item.preview));
    setQueue([]);
    setSavedPhotos([]);
    setActiveVisit(null);
    setNextStopNumber(1);
    setLastSavedAt(null);
    setSaveMessage(null);
    setTitle('');
    setNotes('');
    setVisitType(audience === 'owner' ? 'owner_walk' : 'property_manager_walk');
    setLocation(null);
  }

  function closeWalk() {
    if (queue.length > 0) toast.warning(`${queue.length} unsaved photo${queue.length === 1 ? '' : 's'} discarded`);
    reset();
    onOpenChange(false);
  }

  async function ensureVisit(): Promise<FieldVisit> {
    if (activeVisit) return activeVisit;
    const visit = await createVisit.mutateAsync({
      title: title.trim() || defaultTitle,
      visitType,
      notes,
      propertyId,
    });
    setActiveVisit(visit);
    return visit;
  }

  function updateQueuedPhoto(id: string, patch: Partial<Pick<QueuedPhoto, 'caption' | 'category' | 'locationLabel'>>) {
    setQueue((current) => current.map((photo) => (photo.id === id ? { ...photo, ...patch } : photo)));
  }

  function composeCaption(source: QueuedPhoto) {
    const parts = [`Stop ${String(source.stopNumber).padStart(2, '0')}`];
    if (source.locationLabel.trim()) parts.push(`Location: ${source.locationLabel.trim()}`);
    if (source.category !== 'uncategorized') parts.push(`Category: ${WALK_CATEGORIES.find((category) => category.value === source.category)?.label ?? source.category}`);
    if (source.caption.trim()) parts.push(`Owner note: ${source.caption.trim()}`);
    return parts.join(' | ');
  }

  function mapSavedPhoto(photo: FieldPhoto, source: QueuedPhoto): SavedWalkPhoto {
    return {
      id: photo.id,
      preview: source.preview,
      caption: source.caption.trim() || photo.photo.caption || null,
      fileName: source.file.name,
      savedAt: photo.created_at || new Date().toISOString(),
      stopNumber: source.stopNumber,
      locationLabel: source.locationLabel.trim(),
      category: source.category,
    };
  }

  async function saveBatch(batch: QueuedPhoto[], options: { auto?: boolean } = {}) {
    if (!batch.length) return toast.error('Add at least one photograph');
    setSubmitting(true);
    try {
      const visit = await ensureVisit();
      const uploaded = await uploadPhotos.mutateAsync({
        visitId: visit.id,
        evidenceType: 'observation',
        files: batch.map((item) => ({ file: item.file, caption: composeCaption(item), currentLocation: location })),
      });
      const savedAt = new Date().toISOString();
      const savedIds = new Set(batch.map((photo) => photo.id));
      setLastSavedAt(savedAt);
      setSavedPhotos((current) => [
        ...uploaded.map((photo, index) => mapSavedPhoto(photo, batch[index])),
        ...current,
      ]);
      setQueue((current) => current.filter((photo) => !savedIds.has(photo.id)));
      setSaveMessage(`${uploaded.length} photo${uploaded.length === 1 ? '' : 's'} saved and synced. Move to the next location when ready.`);
      setLocation(null);
      toast.success(options.auto
        ? `Photo saved automatically. Ready for the next location.`
        : `${uploaded.length} photo${uploaded.length === 1 ? '' : 's'} saved to the walk inbox`);
      void (async () => {
        let drafted = 0;
        for (const photo of uploaded) {
          try {
            await analyzePhoto.mutateAsync(photo.id);
            drafted += 1;
          } catch {
            // The photograph is already saved. A failed advisory AI pass must
            // never make the evidence upload appear to have failed.
          }
        }
        if (drafted > 0) toast.success(`AI prepared ${drafted} starting caption${drafted === 1 ? '' : 's'} for review`);
      })();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'The site walk could not be saved');
    } finally {
      setSubmitting(false);
    }
  }

  async function submit() {
    if (!hasPhotos) return toast.error('Add at least one photograph');
    await saveBatch(queue);
  }

  function handleOpenChange(value: boolean) {
    if (submitting) return;
    if (value) {
      onOpenChange(true);
      return;
    }
    closeWalk();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[100dvh] w-[100vw] max-w-4xl overflow-y-auto overscroll-contain rounded-none p-0 sm:max-h-[94dvh] sm:w-[calc(100vw-1rem)] sm:rounded-3xl">
        <div className="border-b bg-gradient-to-br from-[#082b23] to-[#0d6b57] p-5 pr-12 text-white sm:p-8">
          <DialogHeader>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-200">Mobile field capture</p>
            <DialogTitle className="font-display text-2xl leading-tight sm:text-3xl">{hasSavedPhotos ? 'Keep walking the site' : 'Start a site walk'}</DialogTitle>
            <DialogDescription className="max-w-xl text-emerald-50/80">Take one picture at a time or choose a full batch. Each save confirms the photo is stored before you move to the next location.</DialogDescription>
          </DialogHeader>
        </div>

        <SavedPhotoStrip savedPhotos={savedPhotos} queuedPhotos={queue} savedLabel={savedLabel} />

        <div className="space-y-5 p-4 pb-0 sm:space-y-6 sm:p-8">
          <SaveConfidencePanel
            savedCount={savedPhotos.length}
            queueCount={queue.length}
            message={saveMessage}
            submitting={submitting}
            autoSaveCamera={autoSaveCamera}
            onAutoSaveChange={setAutoSaveCamera}
            onNextPhoto={() => cameraRef.current?.click()}
          />

          {hasSavedPhotos && (
            <WalkReceipt savedPhotos={savedPhotos} />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="walk-title">Walk title <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input id="walk-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={defaultTitle} className="h-12" disabled={Boolean(activeVisit)} />
              {activeVisit && <p className="text-[11px] text-emerald-700">This walk session is open. New photos will attach to the same saved visit.</p>}
            </div>
            {audience === 'owner' ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-700">Submitted by you</p>
                <p className="mt-1 text-sm font-semibold text-emerald-950">Owner / client site walk</p>
                <p className="mt-1 text-xs text-emerald-800/70">Your photos enter the private project inbox for review.</p>
              </div>
            ) : <div className="space-y-2">
              <Label>Who is walking?</Label>
              <Select value={visitType} onValueChange={setVisitType}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner_walk">Owner walk</SelectItem>
                  <SelectItem value="apas_inspection">APAS inspection</SelectItem>
                  <SelectItem value="property_manager_walk">Property manager walk</SelectItem>
                  <SelectItem value="maintenance_walk">Maintenance walk</SelectItem>
                  <SelectItem value="crew_update">Crew update</SelectItem>
                  <SelectItem value="other">Other visit</SelectItem>
                </SelectContent>
              </Select>
            </div>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3"><Label>Walk narrative</Label><span className="flex items-center gap-1 text-xs text-muted-foreground"><Sparkles className="h-3.5 w-3.5" /> Voice + fact-preserving AI polish</span></div>
            <VoiceDictationTextareaWithAI value={notes} onValueChange={setNotes} context="site_photo" placeholder="Speak or type what you observed. Keep uncertainty in your note…" className="min-h-32 text-base" />
          </div>

          <section className="rounded-3xl border border-dashed border-emerald-300 bg-emerald-50/40 p-4 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <Button type="button" className="h-14 rounded-2xl bg-[#0d6b57] text-base hover:bg-[#095746] sm:h-16" onClick={() => cameraRef.current?.click()} disabled={submitting}>
                <Camera className="mr-2 h-5 w-5" /> Take a picture
              </Button>
              <Button type="button" variant="outline" className="h-14 rounded-2xl bg-white text-base sm:h-16" onClick={() => libraryRef.current?.click()} disabled={submitting}>
                <Images className="mr-2 h-5 w-5" /> Choose many photos
              </Button>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" disabled={submitting} onChange={(event) => { addFiles(event.target.files, 'camera'); event.currentTarget.value = ''; }} />
              <input ref={libraryRef} type="file" accept="image/*" multiple className="hidden" disabled={submitting} onChange={(event) => { addFiles(event.target.files, 'library'); event.currentTarget.value = ''; }} />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600"><MapPin className="h-4 w-4 text-emerald-700" /> {locationLabel}</span>
              <Button type="button" size="sm" variant="ghost" onClick={captureLocation} disabled={locating}>
                {locating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <LocateFixed className="mr-1.5 h-4 w-4" />} Use current location
              </Button>
            </div>
          </section>

          {queue.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between"><h3 className="font-semibold">Ready to save</h3><span className="text-sm text-muted-foreground">{queue.length} photograph{queue.length === 1 ? '' : 's'}</span></div>
              <div className="grid gap-3 sm:grid-cols-2">
                {queue.map((item, index) => (
                  <article key={`${item.file.name}-${index}`} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                    <div className="relative aspect-[4/3] bg-slate-100 sm:aspect-video">
                      <img src={item.preview} alt="Upload preview" className="h-full w-full object-cover" />
                      <Button type="button" size="icon" variant="secondary" className="absolute right-2 top-2 h-9 w-9 rounded-full" onClick={() => removePhoto(index)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <div className="space-y-3 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.12em] text-emerald-800">Stop {item.stopNumber}</span>
                        <p className="truncate text-[11px] font-medium text-muted-foreground">{item.file.name}</p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-[1fr_150px]">
                        <div className="space-y-1.5">
                          <Label htmlFor={`location-${item.id}`} className="text-xs">Location label</Label>
                          <Input id={`location-${item.id}`} value={item.locationLabel} onChange={(event) => updateQueuedPhoto(item.id, { locationLabel: event.target.value })} placeholder="North gate, pump room, courtyard…" className="h-10" maxLength={120} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Category</Label>
                          <Select value={item.category} onValueChange={(value) => updateQueuedPhoto(item.id, { category: value as WalkCategory })}>
                            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {WALK_CATEGORIES.map((category) => (
                                <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Owner note <span className="font-normal text-muted-foreground">(optional)</span></Label>
                        <VoiceDictationTextareaWithAI value={item.caption} onValueChange={(value) => updateQueuedPhoto(item.id, { caption: value })} context="site_photo" placeholder="Speak or type what the owner wants done here…" className="min-h-24 text-sm" maxLength={2000} />
                      </div>
                      <p className="text-[10px] leading-relaxed text-muted-foreground">Save now with or without a note. ProjOS stores the stop number, label, category, and owner wording with the photo.</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-3 border-t bg-white/95 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:bg-transparent sm:px-0 sm:pb-0 sm:backdrop-blur-none">
            <span className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-emerald-700" /> Saved photos stay in the project inbox; captions can be refined later</span>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={closeWalk} disabled={submitting}>{hasSavedPhotos ? 'Done' : 'Cancel'}</Button>
              <Button type="button" onClick={submit} disabled={submitting || !hasPhotos} className="h-11 rounded-xl bg-[#0d6b57] hover:bg-[#095746]">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Save {queue.length > 1 ? `${queue.length} photos` : 'photo'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SavedPhotoStrip({ savedPhotos, queuedPhotos, savedLabel }: { savedPhotos: SavedWalkPhoto[]; queuedPhotos: QueuedPhoto[]; savedLabel: string | null }) {
  if (savedPhotos.length === 0 && queuedPhotos.length === 0) {
    return (
      <div className="border-b bg-white px-4 py-3 sm:px-8">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Images className="h-4 w-4 text-emerald-700" />
          Your saved gallery will appear here as you walk.
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-10 border-b bg-white/95 px-4 py-3 backdrop-blur sm:px-8" data-testid="field-walk-thumbnail-strip">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-emerald-700"><Images className="h-4 w-4" /> Walk gallery</p>
        <span className="text-[11px] font-medium text-slate-500">{savedPhotos.length} saved{queuedPhotos.length ? ` · ${queuedPhotos.length} pending` : ''}{savedLabel ? ` · last ${savedLabel}` : ''}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {queuedPhotos.map((photo, index) => (
          <div key={photo.id} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 border-amber-300 bg-amber-50">
            <img src={photo.preview} alt={`Pending photo ${index + 1}`} className="h-full w-full object-cover opacity-80" />
            <span className="absolute inset-x-1 bottom-1 rounded-full bg-amber-400 px-1 text-center text-[8px] font-black uppercase text-amber-950">Stop {photo.stopNumber}</span>
          </div>
        ))}
        {savedPhotos.map((photo) => (
          <div key={photo.id} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 border-emerald-500 bg-emerald-50">
            <img src={photo.preview} alt={`Saved stop ${photo.stopNumber}`} className="h-full w-full object-cover" />
            <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-emerald-600 text-white"><Check className="h-3 w-3" /></span>
            <span className="absolute inset-x-1 bottom-1 rounded-full bg-emerald-700 px-1 text-center text-[8px] font-black uppercase text-white">Stop {photo.stopNumber}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WalkReceipt({ savedPhotos }: { savedPhotos: SavedWalkPhoto[] }) {
  const withNotes = savedPhotos.filter((photo) => photo.caption?.trim()).length;
  const withLocations = savedPhotos.filter((photo) => photo.locationLabel).length;
  const classified = savedPhotos.filter((photo) => photo.category !== 'uncategorized').length;
  const latest = savedPhotos[0]?.savedAt ? new Date(savedPhotos[0].savedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : null;
  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 shadow-sm sm:rounded-3xl sm:p-5" data-testid="field-walk-receipt">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-600 text-white"><ClipboardCheck className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-sky-700">Walk receipt</p>
          <h3 className="mt-1 text-lg font-semibold text-[#082b23]">{savedPhotos.length} photo{savedPhotos.length === 1 ? '' : 's'} saved and synced</h3>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <ReceiptStat label="Notes" value={withNotes} />
            <ReceiptStat label="Locations" value={withLocations} />
            <ReceiptStat label="Classified" value={classified} />
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-600"><MapPinned className="h-3.5 w-3.5 text-sky-700" /> Latest sync{latest ? ` at ${latest}` : ''}. Use Done when the owner walk is complete.</p>
        </div>
      </div>
    </section>
  );
}

function ReceiptStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-sky-100 bg-white px-2 py-2">
      <p className="text-xl font-bold text-[#082b23]">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-[.1em] text-slate-500">{label}</p>
    </div>
  );
}

function SaveConfidencePanel({ savedCount, queueCount, message, submitting, autoSaveCamera, onAutoSaveChange, onNextPhoto }: {
  savedCount: number;
  queueCount: number;
  message: string | null;
  submitting: boolean;
  autoSaveCamera: boolean;
  onAutoSaveChange: (enabled: boolean) => void;
  onNextPhoto: () => void;
}) {
  const ready = queueCount > 0;
  const saved = savedCount > 0;
  return (
    <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm sm:rounded-3xl sm:p-5" data-testid="field-walk-save-confidence">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white">
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : saved ? <CheckCircle2 className="h-5 w-5" /> : <ImagePlus className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#082b23]">
            {submitting ? 'Saving to ProjOS…' : message || (ready ? 'Photo ready. Save it before moving on.' : 'Take the next location photo.')}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            {saved
              ? `${savedCount} photo${savedCount === 1 ? '' : 's'} confirmed in this walk. The thumbnail strip above is your running receipt.`
              : 'Nothing is marked complete until the save finishes and the green confirmation appears.'}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-white px-3 py-2">
        <div>
          <p className="text-xs font-semibold text-[#082b23]">Auto-save camera shots</p>
          <p className="text-[11px] text-slate-500">Phone photos save immediately; batch uploads still wait for review.</p>
        </div>
        <Switch checked={autoSaveCamera} onCheckedChange={onAutoSaveChange} disabled={submitting} aria-label="Auto-save camera shots" />
      </div>
      {saved && !ready && !submitting && (
        <Button type="button" variant="outline" className="mt-3 h-11 w-full rounded-xl bg-white sm:w-auto" onClick={onNextPhoto}>
          <Camera className="mr-2 h-4 w-4" /> Next location photo
        </Button>
      )}
    </section>
  );
}
