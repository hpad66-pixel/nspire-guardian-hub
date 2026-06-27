/**
 * Public, no-login photo capture page reached via a tokenized link
 * (/capture/:token). A field crew opens it on a phone, snaps + captions a photo,
 * and it lands straight in that project/property gallery via the gallery-capture
 * edge function. Images are compressed client-side so uploads stay small.
 */
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, ImagePlus, Loader2, CheckCircle2, RotateCcw } from 'lucide-react';

const GOLD = '#C9A227', SAPPHIRE = '#1D6FE8', INK = '#15233B';

async function compress(file: File, maxDim = 1600, quality = 0.82): Promise<string> {
  const bmp = await createImageBitmap(file);
  let { width, height } = bmp;
  if (width > height && width > maxDim) { height = Math.round((height * maxDim) / width); width = maxDim; }
  else if (height >= width && height > maxDim) { width = Math.round((width * maxDim) / height); height = maxDim; }
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

export default function CaptureUploadPage() {
  const { token = '' } = useParams();
  const [phase, setPhase] = useState<'loading' | 'ready' | 'invalid'>('loading');
  const [contextName, setContextName] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [takenAt, setTakenAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.functions.invoke('gallery-capture', { body: { token } });
      if (error || !data?.ok) { setPhase('invalid'); return; }
      setContextName(data.contextName || 'Project');
      setPhase('ready');
    })();
  }, [token]);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    try { setPreview(await compress(file)); }
    catch { setError('Could not read that image. Try again.'); }
  };

  const upload = async () => {
    if (!preview) return;
    setBusy(true); setError('');
    try {
      const { data, error } = await supabase.functions.invoke('gallery-capture', {
        body: { token, imageBase64: preview, caption, takenAt },
      });
      if (error || !data?.ok) throw new Error(data?.error || 'Upload failed.');
      setDone(true);
    } catch (e: any) { setError(e?.message || 'Upload failed. Please try again.'); }
    finally { setBusy(false); }
  };

  const reset = () => { setPreview(null); setCaption(''); setDone(false); setError(''); setTakenAt(new Date().toISOString().slice(0, 10)); };

  if (phase === 'loading') {
    return <div className="flex min-h-dvh items-center justify-center bg-[#FDFCF9]"><Loader2 className="h-7 w-7 animate-spin text-[#1D6FE8]" /></div>;
  }
  if (phase === 'invalid') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#FDFCF9] p-6">
        <div className="max-w-sm text-center">
          <p className="text-lg font-semibold" style={{ color: INK }}>Link unavailable</p>
          <p className="mt-2 text-sm text-muted-foreground">This capture link is invalid or has been turned off. Ask whoever shared it for a new one.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#FDFCF9]" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div className="mx-auto max-w-md px-4 pb-10" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top,0px))' }}>
        <div style={{ borderTop: `5px solid ${GOLD}` }} className="rounded-t-xl bg-white px-5 pt-4">
          <div className="text-[20px] font-bold" style={{ color: INK }}>APAS Consulting</div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: SAPPHIRE }}>Photo Capture</div>
          <div className="mt-1 text-sm text-muted-foreground">Adding to: <span className="font-semibold" style={{ color: INK }}>{contextName}</span></div>
          <div className="mt-3 h-[2px]" style={{ background: SAPPHIRE }} />
        </div>

        <div className="rounded-b-xl bg-white px-5 pb-6 pt-5 shadow-sm">
          {done ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <p className="mt-3 text-lg font-semibold" style={{ color: INK }}>Photo added</p>
              <p className="mt-1 text-sm text-muted-foreground">It’s now in the {contextName} gallery.</p>
              <Button className="mt-5 w-full" onClick={reset}><Camera className="mr-2 h-4 w-4" /> Add another photo</Button>
            </div>
          ) : (
            <>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
              <input ref={libraryRef} type="file" accept="image/*" hidden onChange={onPick} />

              {preview ? (
                <div className="overflow-hidden rounded-xl border">
                  <img src={preview} alt="Preview" className="max-h-[46vh] w-full object-cover" />
                </div>
              ) : (
                <button onClick={() => cameraRef.current?.click()}
                  className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-muted-foreground active:scale-[0.99]">
                  <Camera className="h-9 w-9" style={{ color: SAPPHIRE }} />
                  <span className="text-sm font-medium">Tap to take a photo</span>
                </button>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => cameraRef.current?.click()}><Camera className="mr-1.5 h-4 w-4" /> Camera</Button>
                <Button variant="outline" onClick={() => libraryRef.current?.click()}><ImagePlus className="mr-1.5 h-4 w-4" /> Library</Button>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <Label className="text-xs font-semibold">Caption</Label>
                  <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={2} placeholder="What is this photo of?" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Date</Label>
                  <Input type="date" value={takenAt} onChange={(e) => setTakenAt(e.target.value)} className="mt-1" />
                </div>
              </div>

              {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

              <div className="mt-5 flex gap-2">
                {preview && <Button variant="outline" onClick={() => setPreview(null)} disabled={busy}><RotateCcw className="h-4 w-4" /></Button>}
                <Button className="flex-1" onClick={upload} disabled={!preview || busy}>
                  {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…</> : 'Add to gallery'}
                </Button>
              </div>
            </>
          )}
        </div>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">Powered by APAS Consulting · projos.ai</p>
      </div>
    </div>
  );
}
