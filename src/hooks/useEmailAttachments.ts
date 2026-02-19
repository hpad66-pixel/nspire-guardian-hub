import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UploadEmailAttachmentParams {
  emailId: string;
  file: File;
}

/**
 * Upload a single file to Supabase Storage bucket 'email-attachments'.
 * Stores file at path: {emailId}/{filename}
 * Returns the storage path (not a public URL — signed URLs generated on download).
 */
export function useUploadEmailAttachment() {
  return useMutation({
    mutationFn: async ({ emailId, file }: UploadEmailAttachmentParams) => {
      const path = `${emailId}/${file.name}`;
      const { data, error } = await supabase.storage
        .from("email-attachments")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      return data.path;
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });
}

/** Generate a 60-second signed download URL for a stored attachment. */
export async function getAttachmentDownloadUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("email-attachments")
    .createSignedUrl(storagePath, 60);
  if (error) throw error;
  return data.signedUrl;
}

/** Read a File as base64 string (for passing through Edge Function send). */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]); // strip data:...;base64, prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
