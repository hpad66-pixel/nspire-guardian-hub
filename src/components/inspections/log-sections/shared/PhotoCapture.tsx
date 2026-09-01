import React, { useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { FieldCameraDialog } from '@/components/camera/FieldCameraDialog';
import type { StampContext } from '@/lib/camera';

interface PhotoCaptureProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  folder?: string;
  required?: boolean;
  compact?: boolean;
  /** Optional stamp context (WO / unit / project) for Field Camera. */
  stampContext?: StampContext | null;
  /** Prefer Field Camera (default true). Set false to use bare file picker only. */
  useFieldCamera?: boolean;
}

/**
 * Reusable camera / upload component.
 * Default: opens Field Camera (time + GPS stamp burned into pixels).
 * Library upload remains available as a secondary path.
 */
export function PhotoCapture({
  photos,
  onPhotosChange,
  maxPhotos = 10,
  folder = 'daily-log',
  required = false,
  compact = false,
  stampContext = null,
  useFieldCamera = true,
}: PhotoCaptureProps) {
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const slots = maxPhotos - photos.length;
    const toUpload = Array.from(files).slice(0, slots);
    if (toUpload.length === 0) {
      toast.error(`Max ${maxPhotos} photos`);
      return;
    }

    setUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const uploaded: string[] = [];

      for (const file of toUpload) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image`);
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} too large (max 10 MB)`);
          continue;
        }

        const ext = file.name.split('.').pop();
        const path = `${user?.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error } = await supabase.storage.from('inspection-photos').upload(path, file);
        if (error) {
          toast.error(`Upload failed: ${file.name}`);
          continue;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('inspection-photos').getPublicUrl(path);
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

  const openCapture = () => {
    if (photos.length >= maxPhotos) {
      toast.error(`Max ${maxPhotos} photos`);
      return;
    }
    if (useFieldCamera) {
      setCameraOpen(true);
      return;
    }
    inputRef.current?.click();
  };

  const remove = (idx: number) => onPhotosChange(photos.filter((_, i) => i !== idx));

  const fieldCamera = (
    <FieldCameraDialog
      open={cameraOpen}
      onOpenChange={setCameraOpen}
      folder={folder}
      context={stampContext}
      onCaptured={({ url }) => {
        if (photos.length >= maxPhotos) {
          toast.error(`Max ${maxPhotos} photos`);
          return;
        }
        onPhotosChange([...photos, url]);
      }}
    />
  );

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {photos.map((url, i) => (
          <div key={i} className="relative h-16 w-16 group">
            <img
              src={url}
              alt=""
              className="h-full w-full rounded-lg border border-slate-200 object-cover"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {photos.length < maxPhotos && (
          <button
            type="button"
            onClick={openCapture}
            disabled={uploading}
            className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 transition-colors hover:border-slate-400"
            title="Field Camera — stamped photo"
          >
            {uploading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
            ) : (
              <Camera className="h-5 w-5" />
            )}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {fieldCamera}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={openCapture}
        disabled={uploading || photos.length >= maxPhotos}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-5 transition-all',
          photos.length === 0
            ? 'border-blue-300 bg-blue-50/50 text-blue-600 hover:border-blue-400 hover:bg-blue-50'
            : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300',
          uploading && 'cursor-not-allowed opacity-60',
        )}
      >
        {uploading ? (
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <Camera className="h-7 w-7" />
        )}
        <div className="text-center">
          <p className="text-sm font-semibold">
            {required && photos.length === 0
              ? 'Photo required — Field Camera'
              : 'Open Field Camera'}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            Time + GPS stamp · {photos.length}/{maxPhotos}
          </p>
        </div>
      </button>

      {useFieldCamera && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || photos.length >= maxPhotos}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 py-2 text-xs text-muted-foreground hover:bg-slate-50"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload from library (unstamped)
        </button>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((url, i) => (
            <div key={i} className="group relative aspect-square">
              <img
                src={url}
                alt=""
                className="h-full w-full rounded-xl border border-slate-200 object-cover"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 shadow transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {fieldCamera}
    </div>
  );
}
