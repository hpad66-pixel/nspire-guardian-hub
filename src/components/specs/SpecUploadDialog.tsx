/**
 * B3 · SpecUploadDialog — upload a CSI specification PDF set and
 * register its sections.
 *
 * Flow:
 *   1. User enters a set name + date and attaches a PDF.
 *   2. User enters a quick list of sections in freeform text, one per line:
 *        "03 30 00  Cast-in-Place Concrete"
 *        "09 29 00  Gypsum Board"
 *      (number and title separated by 2+ spaces or a tab).
 *   3. On submit we upload the PDF to the `specs` storage bucket, insert a
 *      `specification_sets` row, then bulk-insert the sections referencing it.
 *
 * This is deliberately lightweight — no per-section PDF splitting, no
 * submittal-requirement extraction. Those are edge-function concerns; a later
 * enhancement can call the edge fn and populate requirements automatically.
 */
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";
import { parseSections } from "@/lib/spec-parser";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function SpecUploadDialog({
  open, onOpenChange, projectId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
}) {
  const qc = useQueryClient();
  const [setName, setSetName] = useState("");
  const [setDate, setSetDate] = useState(new Date().toISOString().split("T")[0]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [sectionsText, setSectionsText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const parsed = parseSections(sectionsText);

  async function handleUpload() {
    if (!setName.trim()) { toast.error("Set name required"); return; }
    if (parsed.length === 0) {
      toast.error("Add at least one section (format: '03 30 00  Concrete')");
      return;
    }
    setUploading(true);
    try {
      const tenant_id = await requireTenantId();

      let pdfPath: string | null = null;
      if (pdfFile) {
        setProgress("Uploading PDF…");
        const path = `${tenant_id}/${projectId}/specs/${crypto.randomUUID()}.pdf`;
        const { error: upErr } = await supabase.storage
          .from("specs")
          .upload(path, pdfFile, { contentType: "application/pdf" });
        if (upErr) throw upErr;
        pdfPath = path;
      }

      setProgress("Creating set…");
      const { data: set, error: setErr } = await supabase
        .from("specification_sets" as any)
        .insert({
          tenant_id, project_id: projectId,
          name: setName.trim(),
          set_date: setDate,
          status: "active",
          pdf_path: pdfPath,
        } as any)
        .select()
        .single();
      if (setErr) throw setErr;

      setProgress(`Inserting ${parsed.length} sections…`);
      const { error: secErr } = await supabase
        .from("specification_sections" as any)
        .insert(parsed.map((p) => ({
          tenant_id,
          set_id: (set as any).id,
          section_number: p.section_number,
          title: p.title,
          division: p.division,
          revision: "0",
        })) as any);
      if (secErr) throw secErr;

      setProgress(null);
      toast.success(`Uploaded spec set with ${parsed.length} sections`);
      qc.invalidateQueries({ queryKey: ["spec-sets", projectId] });
      qc.invalidateQueries({ queryKey: ["spec-section-options", projectId] });
      setSetName("");
      setPdfFile(null);
      setSectionsText("");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !uploading && onOpenChange(o)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload specification set</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Set name</Label>
              <Input value={setName} onChange={(e) => setSetName(e.target.value)}
                     placeholder="e.g. 100% CDs" />
            </div>
            <div>
              <Label>Set date</Label>
              <Input type="date" value={setDate} onChange={(e) => setSetDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Combined spec PDF (optional)</Label>
            <Input type="file" accept="application/pdf"
                   onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} />
            <p className="text-xs text-muted-foreground mt-1">
              One PDF for the whole set; per-section splitting will follow.
            </p>
          </div>

          <div>
            <Label>Sections (one per line)</Label>
            <Textarea
              value={sectionsText}
              onChange={(e) => setSectionsText(e.target.value)}
              placeholder={"03 30 00  Cast-in-Place Concrete\n09 29 00  Gypsum Board"}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Parsed: <strong>{parsed.length}</strong> section{parsed.length === 1 ? "" : "s"}
              . Format: CSI number, then 2+ spaces, then title.
            </p>
          </div>

          {progress && <div className="text-xs text-muted-foreground">{progress}</div>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={uploading || parsed.length === 0}>
            {uploading ? "Uploading…" : `Create set · ${parsed.length} sections`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
