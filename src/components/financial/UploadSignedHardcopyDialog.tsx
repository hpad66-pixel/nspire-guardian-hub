/**
 * UploadSignedHardcopyDialog — upload the client's signed PHYSICAL copy of a change
 * order for the GC's records. Choose to keep it alongside the unsigned/electronic
 * copy, or make it the primary document. A note (shown on the CO) records why.
 */
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, UploadCloud, FileCheck } from "lucide-react";
import { toast } from "sonner";
import { uploadCoArtifact } from "@/lib/changeOrder/storage";
import { useUploadSignedHardcopy } from "@/hooks/useProcoreChangeOrders";

const DEFAULT_NOTE = "Client signed a physical copy of this change order and returned the hard copy; uploaded for our records.";

export function UploadSignedHardcopyDialog({
  open, onOpenChange, coId, projectId, locked,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  coId: string;
  projectId: string;
  locked: boolean;
}) {
  const upload = useUploadSignedHardcopy();
  const [path, setPath] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState(DEFAULT_NOTE);
  const [mode, setMode] = useState<"keep" | "replace">("keep");

  function reset() { setPath(null); setFileName(""); setNote(DEFAULT_NOTE); setMode("keep"); }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadCoArtifact(file, projectId, "change-orders/signed", "pdf");
      setPath(url);
      setFileName(file.name);
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    } finally { setUploading(false); e.target.value = ""; }
  }

  async function save() {
    if (!path) { toast.error("Choose the signed hard copy PDF first."); return; }
    if (!note.trim()) { toast.error("Add a note explaining the hard copy."); return; }
    try {
      await upload.mutateAsync({ coId, path, note, replacePrimary: mode === "replace", locked });
      toast.success(mode === "replace" ? "Signed hard copy saved as the primary document." : "Signed hard copy added to the record.");
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't save the hard copy.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileCheck className="h-5 w-5 text-[var(--apas-emerald)]" /> Upload signed hard copy</DialogTitle>
          <DialogDescription>
            The client signed a physical copy. Upload the scan for your records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Signed copy (PDF)</Label>
            <div className="flex items-center gap-2">
              <Input type="file" accept="application/pdf" onChange={handleFile} disabled={uploading} className="flex-1" />
              {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            {path && <p className="text-xs text-[var(--apas-emerald)] flex items-center gap-1"><UploadCloud className="h-3.5 w-3.5" /> {fileName || "Uploaded"}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>How should we file it?</Label>
            <div className="space-y-2">
              <label className="flex items-start gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/40">
                <input type="radio" checked={mode === "keep"} onChange={() => setMode("keep")} className="mt-1" />
                <div>
                  <div className="text-sm font-medium">Keep the unsigned/electronic copy — add this as the signed hard copy</div>
                  <div className="text-xs text-muted-foreground">Both are on file; the signed scan shows as the executed hard copy.</div>
                </div>
              </label>
              <label className="flex items-start gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/40">
                <input type="radio" checked={mode === "replace"} onChange={() => setMode("replace")} className="mt-1" />
                <div>
                  <div className="text-sm font-medium">Replace the displayed document with this signed hard copy</div>
                  <div className="text-xs text-muted-foreground">The signed scan becomes the primary document for this CO{locked ? " (the lock is briefly lifted and restored)" : ""}.</div>
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Note <span className="text-muted-foreground font-normal">(shown on the CO so people know why)</span></Label>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={upload.isPending || uploading || !path}>
            {upload.isPending ? "Saving…" : "Save hard copy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
