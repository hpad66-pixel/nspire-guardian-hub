/**
 * B5 · NewVersionDialog — upload a new version of an existing pl_documents row.
 * Bumps `current_version`, pushes a new pl_document_versions row, and updates
 * mime + size_bytes on the parent.
 */
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useDocumentVersions } from "@/hooks/useProjectDocuments";
import type { ProjectDocument } from "@/hooks/useProjectDocuments";
import { toast } from "sonner";

export function NewVersionDialog({
  open, onOpenChange, doc,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  doc: ProjectDocument | null;
}) {
  const { uploadNewVersion } = useDocumentVersions(doc?.id ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");

  async function handleSubmit() {
    if (!doc || !file) { toast.error("Attach a file"); return; }
    try {
      const v = await uploadNewVersion.mutateAsync({
        documentId: doc.id, file, note: note.trim() || undefined,
      });
      toast.success(`Uploaded version ${v}`);
      setFile(null);
      setNote("");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const nextVersion = doc ? doc.current_version + 1 : 1;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !uploadNewVersion.isPending && onOpenChange(o)}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Upload new version{doc && <span className="text-muted-foreground font-normal"> · v{nextVersion}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {doc && (
            <p className="text-xs text-muted-foreground">
              This will replace <strong>{doc.name}</strong> current version{" "}
              (v{doc.current_version}) for download and preview. Prior versions
              are preserved in the version history.
            </p>
          )}
          <div>
            <Label>File</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <Label>Change note (optional)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)}
                      rows={3} placeholder="What changed in this version?" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}
                  disabled={uploadNewVersion.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}
                  disabled={uploadNewVersion.isPending || !file}>
            {uploadNewVersion.isPending ? "Uploading…" : `Upload v${nextVersion}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
