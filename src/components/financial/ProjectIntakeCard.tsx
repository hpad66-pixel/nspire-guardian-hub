import { useRef, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, FolderInput, Upload, KeyRound, Copy } from "lucide-react";
import { useProjectIntake } from "@/hooks/useProjectIntake";
import { useProjectArtifacts } from "@/hooks/useProjectArtifacts";
import { supabase } from "@/integrations/supabase/client";
import { resolveCurrentWorkspaceId } from "@/lib/tenant";
import { classifyDoc } from "@/lib/financial/intake";

interface Props { projectId: string; }

export function ProjectIntakeCard({ projectId }: Props) {
  const { data: intake, provision } = useProjectIntake(projectId);
  const { upload } = useProjectArtifacts(projectId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleProvision() {
    try {
      const res = await provision.mutateAsync();
      setRevealedToken(res.token); // shown once
      toast.success("Intake provisioned — copy the token now, it won't be shown again.");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to provision intake");
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const art = await upload.mutateAsync({
        file, projectId,
        input: { artifact_type: "invoice", source_system: "manual", title: file.name.replace(/\.[^.]+$/, "") },
      });
      const tenant_id = await resolveCurrentWorkspaceId();
      const doc_type = classifyDoc(file.name);
      const { error } = await supabase.from("vendor_submissions" as any).insert({
        tenant_id, project_id: projectId, source: "manual_upload",
        doc_type: doc_type === "unknown" ? "invoice" : doc_type,
        status: "received", artifact_id: (art as any).id,
        subject: file.name,
      } as any);
      if (error) throw error;
      toast.success("Uploaded — review it in the Vendor Inbox.");
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Vendor Submittal Intake</CardTitle>
        <p className="text-xs text-muted-foreground">
          <b>Provisioning</b> sets up a private email address + secure folder for this project. Forward a vendor’s invoice or lien waiver to that address (or drop a file in the folder) and it lands here automatically — no manual upload. It’s a one-time setup per project.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {intake ? (
          <>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{intake.intake_email}</code>
              <Button size="icon" variant="ghost" className="h-6 w-6"
                onClick={() => { navigator.clipboard?.writeText(intake.intake_email); toast.success("Copied"); }}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <FolderInput className="h-4 w-4 text-muted-foreground" />
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{intake.storage_prefix}</code>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">No intake address yet.</span>
            <Button size="sm" onClick={handleProvision} disabled={provision.isPending}>
              <KeyRound className="h-4 w-4 mr-1" /> Provision
            </Button>
          </div>
        )}

        {revealedToken && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
            <p className="text-xs font-medium text-amber-800 mb-1">Upload token (shown once)</p>
            <div className="flex items-center gap-2">
              <code className="text-xs break-all flex-1">{revealedToken}</code>
              <Button size="icon" variant="ghost" className="h-6 w-6"
                onClick={() => { navigator.clipboard?.writeText(revealedToken); toast.success("Copied"); }}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        <div className="pt-2 border-t">
          <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={handleUpload} />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="h-4 w-4 mr-1" /> {uploading ? "Uploading…" : "Upload document"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
