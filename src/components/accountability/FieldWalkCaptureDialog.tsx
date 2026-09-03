import { useMemo, useRef, useState } from 'react';
import { Camera, Check, Images, Loader2, LocateFixed, MapPin, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VoiceDictationTextareaWithAI } from '@/components/ui/voice-dictation-textarea-ai';
import { useFieldAccountability } from '@/hooks/useFieldAccountability';
import { toast } from 'sonner';

interface QueuedPhoto {
  file: File;
  preview: string;
  caption: string;
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
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const hasPhotos = queue.length > 0;

  const locationLabel = useMemo(() => location
    ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}${location.accuracy ? ` · ±${Math.round(location.accuracy)} m` : ''}`
    : 'EXIF location will be used when available', [location]);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const incoming = Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .map((file) => ({ file, preview: URL.createObjectURL(file), caption: '' }));
    setQueue((current) => [...current, ...incoming]);
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
    setQueue([]);
    setTitle('');
    setNotes('');
    setVisitType(audience === 'owner' ? 'owner_walk' : 'property_manager_walk');
    setLocation(null);
  }

  async function submit() {
    if (!title.trim()) return toast.error('Give this site walk a short title');
    if (!hasPhotos) return toast.error('Add at least one photograph');
    setSubmitting(true);
    try {
      const visit = await createVisit.mutateAsync({
        title,
        visitType,
        notes,
        propertyId,
      });
      const uploaded = await uploadPhotos.mutateAsync({
        visitId: visit.id,
        evidenceType: 'observation',
        files: queue.map((item) => ({ file: item.file, caption: item.caption, currentLocation: location })),
      });
      toast.success(`${queue.length} photograph${queue.length === 1 ? '' : 's'} added to the walk inbox`);
      reset();
      onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!submitting) onOpenChange(value); }}>
      <DialogContent className="max-h-[94dvh] max-w-4xl overflow-y-auto p-0 sm:rounded-3xl">
        <div className="border-b bg-gradient-to-br from-[#082b23] to-[#0d6b57] p-6 text-white sm:p-8">
          <DialogHeader>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-200">Mobile field capture</p>
            <DialogTitle className="font-display text-3xl">Start a site walk</DialogTitle>
            <DialogDescription className="max-w-xl text-emerald-50/80">Take pictures now or select a full batch. AI prepares a factual starting point, but your project team reviews it before anything becomes a finding.</DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-6 p-5 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="walk-title">Walk title</Label>
              <Input id="walk-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="North courtyard follow-up" className="h-12" />
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
              <Button type="button" className="h-16 rounded-2xl bg-[#0d6b57] text-base hover:bg-[#095746]" onClick={() => cameraRef.current?.click()}>
                <Camera className="mr-2 h-5 w-5" /> Take a picture
              </Button>
              <Button type="button" variant="outline" className="h-16 rounded-2xl bg-white text-base" onClick={() => libraryRef.current?.click()}>
                <Images className="mr-2 h-5 w-5" /> Choose many photos
              </Button>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = ''; }} />
              <input ref={libraryRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = ''; }} />
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
              <div className="flex items-center justify-between"><h3 className="font-semibold">Upload queue</h3><span className="text-sm text-muted-foreground">{queue.length} photograph{queue.length === 1 ? '' : 's'}</span></div>
              <div className="grid gap-3 sm:grid-cols-2">
                {queue.map((item, index) => (
                  <article key={`${item.file.name}-${index}`} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                    <div className="relative aspect-video bg-slate-100">
                      <img src={item.preview} alt="Upload preview" className="h-full w-full object-cover" />
                      <Button type="button" size="icon" variant="secondary" className="absolute right-2 top-2 h-9 w-9 rounded-full" onClick={() => removePhoto(index)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <div className="p-3">
                      <p className="mb-2 truncate text-[11px] font-medium text-muted-foreground">{item.file.name}</p>
                      <Input value={item.caption} onChange={(event) => setQueue((current) => current.map((photo, photoIndex) => photoIndex === index ? { ...photo, caption: event.target.value } : photo))} placeholder="Your factual caption (optional)" maxLength={2000} />
                      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">Only you can revise this caption later. AI suggestions remain clearly labeled until you accept or edit them.</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-emerald-700" /> Original files stay unchanged; captions and annotations are tracked separately</span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
              <Button type="button" onClick={submit} disabled={submitting || !title.trim() || !hasPhotos} className="bg-[#0d6b57] hover:bg-[#095746]">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Save walk
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
