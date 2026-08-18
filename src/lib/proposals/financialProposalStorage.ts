import { supabase } from "@/integrations/supabase/client";
import { resolveCurrentWorkspaceId } from "@/lib/tenant";

export async function uploadFinancialProposalArtifact(
  blob: Blob,
  projectId: string,
  kind: "signed" | "signature",
): Promise<string> {
  const tenantId = await resolveCurrentWorkspaceId();
  if (!tenantId) throw new Error("No workspace for current user");
  const ext = kind === "signed" ? "pdf" : "png";
  const contentType = kind === "signed" ? "application/pdf" : "image/png";
  const path = `${tenantId}/${projectId}/proposals/${kind}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("daily-report-files").upload(path, blob, { contentType, upsert: false });
  if (error) throw error;
  return supabase.storage.from("daily-report-files").getPublicUrl(path).data.publicUrl;
}
