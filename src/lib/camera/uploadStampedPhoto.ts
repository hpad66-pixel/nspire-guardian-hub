import { supabase } from '@/integrations/supabase/client';

export interface UploadStampedPhotoOpts {
  blob: Blob;
  folder?: string;
  fileName?: string;
  bucket?: string;
}

/**
 * Upload a stamped JPEG to storage and return the public URL.
 * Default bucket matches PhotoCapture (`inspection-photos`).
 */
export async function uploadStampedPhoto(opts: UploadStampedPhotoOpts): Promise<string> {
  const bucket = opts.bucket ?? 'inspection-photos';
  const folder = opts.folder ?? 'field-camera';
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const name = opts.fileName ?? `field-${Date.now()}.jpg`;
  const path = `${user?.id ?? 'anon'}/${folder}/${name}`;

  const { error } = await supabase.storage.from(bucket).upload(path, opts.blob, {
    contentType: 'image/jpeg',
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicUrl;
}
