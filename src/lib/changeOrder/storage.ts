/** Upload a generated artifact (docx/pdf/signature png) and return its public URL. */
import { supabase } from "@/integrations/supabase/client";
import { resolveCurrentWorkspaceId } from "@/lib/tenant";

export async function uploadCoArtifact(
  blob: Blob,
  projectId: string,
  folder: "change-orders" | "change-orders/signed" | "change-orders/sig",
  ext: "docx" | "pdf" | "png",
): Promise<string> {
  const tenant = await resolveCurrentWorkspaceId();
  if (!tenant) throw new Error("No workspace for current user");
  const bucket = "daily-report-files";
  const path = `${tenant}/${projectId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const contentType =
    ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType, upsert: false });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
