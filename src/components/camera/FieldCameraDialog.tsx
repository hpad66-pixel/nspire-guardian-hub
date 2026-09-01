import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Loader2, MapPin, Settings2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  STAMP_COLOR_HEX,
  buildStampLines,
  flattenStampLines,
  getGeoFix,
  loadStampSettings,
  saveStampSettings,
  stampPhoto,
  uploadStampedPhoto,
  type GeoFix,
  type StampContext,
  type StampSettings,
} from '@/lib/camera';
import { StampSettingsPanel } from './StampSettingsPanel';

export interface FieldCameraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with public URL after upload (and optional WO attach by parent). */
  onCaptured: (result: {
    url: string;
    notation?: string;
    takenAt: string;
    lat?: number | null;
    lng?: number | null;
  }) => void | Promise<void>;
  context?: StampContext | null;
  folder?: string;
  title?: string;
  /** When true, show notation + attach CTA (work-order flow). */
  showNotation?: boolean;
  attachLabel?: string;
}

type Phase = 'live' | 'review' | 'settings';

function stampPositionClass(position: StampSettings['position']): string {
  switch (position) {
    case 'top-left':
      return 'top-20 left-4 items-start text-left';
    case 'top-center':
      return 'top-20 left-1/2 -translate-x-1/2 items-center text-center';
    case 'top-right':
      return 'top-20 right-4 items-end text-right';
    case 'bottom-center':
      return 'bottom-36 left-1/2 -translate-x-1/2 items-center text-center';
    case 'bottom-right':
      return 'bottom-36 right-4 items-end text-right';
    case 'bottom-left':
    default:
      return 'bottom-36 left-4 items-start text-left';
  }
}

export function FieldCameraDialog({
  open,
  onOpenChange,
  onCaptured,
  context,
  folder = 'field-camera',
  title = 'Field Camera',
  showNotation = false,
  attachLabel = 'Use photo',
}: FieldCameraDialogProps) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>('live');
  const [settings, setSettings] = useState<StampSettings>(() => loadStampSettings());
  const [geo, setGeo] = useState<GeoFix | null>(null);
  const [tick, setTick] = useState(() => new Date());
  const [starting, setStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ dataUrl: string; blob: Blob; takenAt: string } | null>(null);
  const [notation, setNotation] = useState('');
  const [saving, setSaving] = useState(false);

  const techName =
    context?.technicianName ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    null;

  const resolvedContext = useMemo<StampContext>(
    () => ({
      ...context,
      technicianName: techName,
    }),
    [context, techName],
  );

  const liveLines = useMemo(
    () =>
      flattenStampLines(
        buildStampLines(settings, { now: tick, geo, context: resolvedContext }),
      ),
    [settings, tick, geo, resolvedContext],
  );

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    setStarting(true);
    setCameraError(null);
    try {
      stopCamera();
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API unavailable in this browser');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch {
      setCameraError(
        'Camera permission is required for Field Camera. Check browser settings and try again.',
      );
    } finally {
      setStarting(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setPhase('live');
      setPreview(null);
      setNotation('');
      setCameraError(null);
      return;
    }
    setSettings(loadStampSettings());
    void startCamera();
    void getGeoFix({ reverseGeocode: true }).then(setGeo);
    return () => stopCamera();
  }, [open, startCamera, stopCamera]);

  useEffect(() => {
    if (!open || phase !== 'live') return;
    const id = window.setInterval(() => setTick(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [open, phase]);

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      toast.error('Camera not ready yet');
      return;
    }
    try {
      const stamped = await stampPhoto(video, {
        settings,
        geo,
        context: resolvedContext,
        now: new Date(),
      });
      setPreview({
        dataUrl: stamped.dataUrl,
        blob: stamped.blob,
        takenAt: stamped.takenAt,
      });
      setPhase('review');
      stopCamera();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not capture photo');
    }
  };

  const handleRetake = async () => {
    setPreview(null);
    setPhase('live');
    await startCamera();
  };

  const handleUse = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      const url = await uploadStampedPhoto({
        blob: preview.blob,
        folder,
        fileName: `field-${Date.now()}.jpg`,
      });
      await onCaptured({
        url,
        notation: notation.trim() || undefined,
        takenAt: preview.takenAt,
        lat: geo?.lat ?? null,
        lng: geo?.lng ?? null,
      });
      toast.success('Stamped photo saved');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = () => {
    const next = saveStampSettings(settings);
    setSettings(next);
    setPhase('live');
    toast.success('Stamp style saved');
  };

  const darkText = settings.textColor === 'black';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'left-0 top-0 flex h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-black p-0 sm:max-w-none sm:rounded-none',
          '[&>button.absolute]:hidden',
        )}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>

        {phase === 'settings' ? (
          <div className="flex h-full flex-col bg-[#FDFCF9] text-foreground">
            <header className="flex items-center justify-between border-b px-4 py-3">
              <button type="button" className="text-sm font-medium" onClick={() => setPhase('live')}>
                Cancel
              </button>
              <div className="font-semibold">Stamp settings</div>
              <div className="w-12" />
            </header>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <StampSettingsPanel
                settings={settings}
                onChange={setSettings}
                onSave={handleSaveSettings}
                previewUrl={preview?.dataUrl}
              />
            </div>
          </div>
        ) : phase === 'review' && preview ? (
          <div className="relative flex h-full flex-col bg-black text-white">
            <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4 pb-8 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <button
                type="button"
                className="text-sm font-medium"
                onClick={() => void handleRetake()}
                disabled={saving}
              >
                Retake
              </button>
              <button
                type="button"
                className="text-sm font-semibold text-[#F5F1E8]"
                onClick={() => void handleUse()}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Use photo'}
              </button>
            </header>
            <img src={preview.dataUrl} alt="Stamped capture" className="h-full w-full object-contain" />
            <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-3xl bg-[#FDFCF9] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 text-foreground shadow-2xl">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/15" />
              <h3 className="text-center font-display text-xl font-semibold text-[#08271f]">
                {showNotation ? 'Attach evidence' : 'Stamped photo ready'}
              </h3>
              {resolvedContext.workOrderLabel && (
                <p className="mt-1 text-center text-sm text-muted-foreground">
                  {resolvedContext.workOrderLabel}
                  {resolvedContext.unitLabel ? ` · ${resolvedContext.unitLabel}` : ''}
                </p>
              )}
              {showNotation && (
                <div className="mt-3 space-y-1.5">
                  <Label htmlFor="field-camera-notation">Notation</Label>
                  <Input
                    id="field-camera-notation"
                    value={notation}
                    onChange={(e) => setNotation(e.target.value)}
                    placeholder="What was done / observed"
                  />
                </div>
              )}
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <div className="font-semibold">Electronically captured</div>
                  <div className="text-xs text-emerald-800/90">
                    Time, date{settings.showLocation ? ', location' : ''} & context are burned into
                    the pixels.
                  </div>
                </div>
              </div>
              <div className="mt-3 grid gap-2">
                <Button
                  className="w-full bg-[#08271f] hover:bg-[#08271f]/90"
                  onClick={() => void handleUse()}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="mr-2 h-4 w-4" />
                  )}
                  {attachLabel}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => void handleRetake()}
                  disabled={saving}
                >
                  Retake
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative flex h-full flex-col bg-black text-white">
            <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/75 to-transparent px-3 pb-10 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <button
                type="button"
                aria-label="Close"
                className="rounded-full bg-black/35 p-2"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-5 w-5" />
              </button>
              <div className="text-center">
                <div className="text-sm font-semibold tracking-wide">{title}</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/70">
                  APAS · projOS
                </div>
              </div>
              <button
                type="button"
                aria-label="Stamp settings"
                className="rounded-full bg-black/35 p-2"
                onClick={() => setPhase('settings')}
              >
                <Settings2 className="h-5 w-5" />
              </button>
            </header>

            <div className="relative min-h-0 flex-1">
              {starting && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
              {cameraError ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                  <p className="text-sm text-white/90">{cameraError}</p>
                  <Button variant="secondary" onClick={() => void startCamera()}>
                    Retry camera
                  </Button>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="h-full w-full object-cover"
                />
              )}

              {!cameraError && liveLines.length > 0 && (
                <div
                  className={cn(
                    'pointer-events-none absolute z-10 flex max-w-[88%] flex-col rounded-xl px-3 py-2 font-mono shadow-lg',
                    stampPositionClass(settings.position),
                  )}
                  style={{
                    fontSize: `${Math.max(11, Math.min(16, settings.fontSize - 2))}px`,
                    lineHeight: 1.35,
                    color: STAMP_COLOR_HEX[settings.textColor],
                    backgroundColor: darkText
                      ? `rgba(255,255,255,${0.72 * settings.opacity})`
                      : `rgba(8,12,18,${0.62 * settings.opacity})`,
                    opacity: settings.opacity,
                  }}
                  data-testid="field-camera-live-stamp"
                >
                  {liveLines.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              )}
            </div>

            <footer className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 to-transparent px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-10">
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  data-testid="field-camera-shutter"
                  aria-label="Capture stamped photo"
                  disabled={!!cameraError || starting}
                  onClick={() => void handleCapture()}
                  className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-[3px] border-white/90 bg-white/15 disabled:opacity-40"
                >
                  <span className="h-14 w-14 rounded-full bg-white" />
                </button>
              </div>
              <p className="mt-3 text-center text-[11px] text-white/70">
                Photo · time + GPS burned into every shot
              </p>
            </footer>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
