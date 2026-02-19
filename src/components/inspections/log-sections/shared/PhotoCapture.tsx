import React, { useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PhotoCaptureProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  folder?: string;
  required?: boolean;
  compact?: boolean;
}

/**
 * Reusable camera / upload component wrapping PhotoUpload logic.
 * Captures environment camera on mobile, file picker on desktop.
 */
export function PhotoCapture({
  photos,
  onPhotosChange,
  maxPhotos = 10,
  folder = 'daily-log',
  required = false,
  compact = false,
}: PhotoCaptureProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const slots = maxPhotos - photos.length;
    const toUpload = Array.from(files).slice(0, slots);
    if (toUpload.length === 0) { toast.error(`Max ${maxPhotos} photos`); return; }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uploaded: string[] = [];

      for (const file of toUpload) {
        if (!file.type.startsWith('image/')) { toast.error(`${file.name} is not an image`); continue; }
        if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} too large (max 10 MB)`); continue; }

        const ext = file.name.split('.').pop();
        const path = `${user?.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error } = await supabase.storage.from('inspection-photos').upload(path, file);
        if (error) { toast.error(`Upload failed: ${file.name}`); continue; }

        const { data: { publicUrl } } = supabase.storage.from('inspection-photos').getPublicUrl(path);
        uploaded.push(publicUrl);
      }

      if (uploaded.length) {
        onPhotosChange([...photos, ...uploaded]);
        toast.success(`${uploaded.length} photo(s) uploaded`);
      }
    } catch {
      toast.error('Failed to upload photos');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = (idx: number) => onPhotosChange(photos.filter((_, i) => i !== idx));

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {photos.map((url, i) => (
          <div key={i} className="relative w-16 h-16 group">
            <img src={url} alt="" className="w-full h-full object-cover rounded-lg border border-slate-200" />
            <button type="button" onClick={() => remove(i)}
              className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {photos.length < maxPhotos && (
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
            className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-slate-400 transition-colors">
            {uploading ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              : <Camera className="h-5 w-5" />}
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple className="hidden"
          onChange={(e) => handleFiles(e.target.files)} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Upload trigger */}
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading || photos.length >= maxPhotos}
        className={cn(
          'w-full flex flex-col items-center justify-center gap-2 py-5 rounded-xl border-2 border-dashed transition-all',
          photos.length === 0
            ? 'border-blue-300 bg-blue-50/50 text-blue-600 hover:border-blue-400 hover:bg-blue-50'
            : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300',
          uploading && 'opacity-60 cursor-not-allowed'
        )}
      >
        {uploading
          ? <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
          : <Camera className="h-7 w-7" />}
        <div className="text-center">
          <p className="text-sm font-semibold">
            {required && photos.length === 0 ? '📷 Photo Required*' : '📷 Add Photo'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{photos.length}/{maxPhotos} uploaded</p>
        </div>
      </button>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((url, i) => (
            <div key={i} className="relative group aspect-square">
              <img src={url} alt="" className="w-full h-full object-cover rounded-xl border border-slate-200" />
              <button type="button" onClick={() => remove(i)}
                className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple className="hidden"
        onChange={(e) => handleFiles(e.target.files)} />
    </div>
  );
}
