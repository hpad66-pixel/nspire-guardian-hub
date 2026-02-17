import { supabase } from '@/integrations/supabase/client';

export function extractStoragePath(fileUrlOrPath: string, bucketId: string) {
  if (!fileUrlOrPath) return null;
  if (!fileUrlOrPath.startsWith('http')) return fileUrlOrPath;

  const marker = `/${bucketId}/`;
  const index = fileUrlOrPath.indexOf(marker);
  if (index === -1) return null;

  const path = fileUrlOrPath.slice(index + marker.length);
  return decodeURIComponent(path);
}

export async function getSignedUrlForBucket(
  bucketId: string,
  fileUrlOrPath: string,
  expiresInSeconds = 60 * 10
) {
  const storagePath = extractStoragePath(fileUrlOrPath, bucketId) || fileUrlOrPath;
  const { data, error } = await supabase.storage
    .from(bucketId)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw error || new Error('Failed to create signed URL');
  }

  return data.signedUrl;
}
