/**
 * B2 · DrawingUploadDialog — bulk PDF upload into a drawing_sets + drawings +
 * drawing_revisions cascade.
 *
 * Minimal viable flow:
 *   1. Pick a set name + discipline
 *   2. Attach one or more PDFs (one per sheet)
 *   3. Enter sheet number for each PDF (auto-populated from filename)
 *   4. Upload → create drawing_sets row, then per file:
 *      upsert drawings row on (project_id, sheet_number), create drawing_revisions row.
 * The `drawings_after_new_revision` trigger flips is_current on prior revisions.
 *
 * Multi-page PDF auto-splitting is deferred to an edge function (separate task).
 */
import { toDateOnly } from "@/lib/date";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";
import { toast } from "sonner";

interface SheetDraft {
  file: File;
  sheetNumber: string;
  title: string;
}

function guessSheetNumber(name: string): string {
  // e.g. "A-101.pdf" → "A-101"
  const base = name.replace(/\.pdf$/i, "");
  return base.split(/[_\s]/)[0] ?? base;
}

export function DrawingUploadDialog({
  open, onOpenChange, projectId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
}) {
  const [setName, setSetName] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [setDate, setSetDate] = useState(toDateOnly(new Date()));
  const [drafts, setDrafts] = useState<SheetDraft[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const next: SheetDraft[] = [];
    for (const f of files) {
      if (!f.type.includes("pdf") && !f.name.toLowerCase().endsWith(".pdf")) continue;
      next.push({
        file: f,
        sheetNumber: guessSheetNumber(f.name),
        title: f.name.replace(/\.pdf$/i, ""),
      });
    }
    setDrafts([...drafts, ...next]);
  }

  function updateDraft(i: number, patch: Partial<SheetDraft>) {
    setDrafts(drafts.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }

  function removeDraft(i: number) {
    setDrafts(drafts.filter((_, idx) => idx !== i));
  }

  async function handleUpload() {
    if (!setName.trim()) { toast.error("Set name required"); return; }
    if (drafts.length === 0) { toast.error("Attach at least one PDF"); return; }
    setUploading(true);
    try {
      const tenant_id = await requireTenantId();

      setProgress("Creating set…");
      const { data: set, error: setErr } = await supabase
        .from("drawing_sets" as any)
        .insert({
          tenant_id, project_id: projectId,
          name: setName.trim(),
          set_date: setDate,
          discipline: discipline.trim() || null,
          status: "active",
        } as any)
        .select()
        .single();
      if (setErr) throw setErr;

      for (let i = 0; i < drafts.length; i++) {
        const d = drafts[i];
        setProgress(`Uploading ${d.sheetNumber} (${i + 1}/${drafts.length})…`);

        const revId = crypto.randomUUID();
        const path = `${tenant_id}/${projectId}/drawings/${revId}.pdf`;
        const { error: upErr } = await supabase.storage
          .from("drawings")
          .upload(path, d.file, { contentType: "application/pdf" });
        if (upErr) throw upErr;

        // Upsert the drawing (unique on project_id + sheet_number)
        const { data: drawing, error: drErr } = await supabase
          .from("drawings" as any)
          .upsert(
            {
              tenant_id, project_id: projectId,
              set_id: (set as any).id,
              sheet_number: d.sheetNumber,
              title: d.title,
              discipline: discipline.trim() || null,
            } as any,
            { onConflict: "project_id,sheet_number" },
          )
          .select()
          .single();
        if (drErr) throw drErr;

        const { error: revErr } = await supabase
          .from("drawing_revisions" as any)
          .insert({
            id: revId,
            tenant_id,
            drawing_id: (drawing as any).id,
            rev_number: String.fromCharCode(65 + i), // A, B, C…
            pdf_path: path,
            is_current: true,
          } as any);
        if (revErr) throw revErr;
      }

      setProgress(null);
      toast.success(`Uploaded ${drafts.length} sheet${drafts.length === 1 ? "" : "s"}`);
      setDrafts([]);
      setSetName("");
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
          <DialogTitle>Upload drawings</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Set name</Label>
              <Input value={setName} onChange={(e) => setSetName(e.target.value)}
                     placeholder="e.g. Issued for Construction" />
            </div>
            <div>
              <Label>Set date</Label>
              <Input type="date" value={setDate} onChange={(e) => setSetDate(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Discipline (optional)</Label>
              <Input value={discipline} onChange={(e) => setDiscipline(e.target.value)}
                     placeholder="Architectural / Structural / MEP" />
            </div>
          </div>

          <div>
            <Label>Sheets</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input type="file" multiple accept="application/pdf"
                     onChange={(e) => addFiles(e.target.files)} />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {drafts.length} file{drafts.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {drafts.length > 0 && (
            <div className="rounded-md border max-h-64 overflow-y-auto">
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="p-2 text-left font-medium">File</th>
                    <th className="p-2 text-left font-medium w-32">Sheet #</th>
                    <th className="p-2 text-left font-medium">Title</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((d, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 text-xs text-muted-foreground truncate max-w-[12ch]">
                        {d.file.name}
                      </td>
                      <td className="p-1">
                        <Input value={d.sheetNumber}
                               onChange={(e) => updateDraft(i, { sheetNumber: e.target.value })} />
                      </td>
                      <td className="p-1">
                        <Input value={d.title}
                               onChange={(e) => updateDraft(i, { title: e.target.value })} />
                      </td>
                      <td className="p-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7"
                                onClick={() => removeDraft(i)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </div>
          )}

          {progress && (
            <div className="text-xs text-muted-foreground">{progress}</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={uploading || drafts.length === 0}>
            {uploading ? "Uploading…" : `Upload ${drafts.length} sheet${drafts.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
