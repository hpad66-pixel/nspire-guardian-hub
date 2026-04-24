/**
 * E1 · ScheduleImportDialog — upload a P6 XER or MSP XML file, invoke the
 * matching edge function, and create + populate a new schedule in one shot.
 *
 * Flow:
 *   1. User enters a schedule name, picks a source, attaches a file.
 *   2. We create the `schedules` row (useCreateSchedule) so the FK exists.
 *   3. We invoke either `parse-p6-xer` or `parse-msp-xml` with the file text.
 *   4. On success we return the new schedule id so the caller can select it.
 *
 * Files are read as plain text in the browser — the edge functions handle
 * the format-specific parsing server-side.
 */
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCreateSchedule } from "@/hooks/useSchedule";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Source = "p6" | "msp";

const SOURCES: Array<{ value: Source; label: string; accept: string; hint: string }> = [
  {
    value: "p6", label: "Primavera P6 (XER)",
    accept: ".xer,text/plain",
    hint: "Export from P6: File → Export → Primavera XER",
  },
  {
    value: "msp", label: "Microsoft Project (XML)",
    accept: ".xml,text/xml,application/xml",
    hint: "Export from MSP: File → Save As → Project XML",
  },
];

export function ScheduleImportDialog({
  open, onOpenChange, projectId, onImported,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  onImported?: (scheduleId: string) => void;
}) {
  const qc = useQueryClient();
  const createSchedule = useCreateSchedule();

  const [name, setName] = useState("");
  const [source, setSource] = useState<Source>("p6");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const activeSource = SOURCES.find((s) => s.value === source)!;

  async function handleSubmit() {
    if (!name.trim()) { toast.error("Schedule name required"); return; }
    if (!file) { toast.error("Attach a schedule file"); return; }
    setBusy(true);
    try {
      setProgress("Reading file…");
      const text = await file.text();

      setProgress("Creating schedule…");
      const schedule = await createSchedule.mutateAsync({
        projectId, name: name.trim(), source,
      });

      setProgress(`Parsing ${source === "p6" ? "XER" : "XML"} on server…`);
      const fnName = source === "p6" ? "parse-p6-xer" : "parse-msp-xml";
      const body = source === "p6"
        ? { schedule_id: schedule.id, xer: text }
        : { schedule_id: schedule.id, xml: text };
      const { data, error } = await supabase.functions.invoke(fnName, { body });
      if (error) throw error;

      const r = data as { tasks_inserted?: number; predecessors_inserted?: number };
      toast.success(
        `Imported ${r.tasks_inserted ?? 0} task${r.tasks_inserted === 1 ? "" : "s"}` +
        (r.predecessors_inserted ? ` + ${r.predecessors_inserted} link${r.predecessors_inserted === 1 ? "" : "s"}` : ""),
      );

      qc.invalidateQueries({ queryKey: ["schedules", projectId] });
      qc.invalidateQueries({ queryKey: ["schedule-tasks", schedule.id] });
      onImported?.(schedule.id);
      setName("");
      setFile(null);
      setProgress(null);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
      setProgress(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import schedule</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Schedule name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)}
                   placeholder="e.g. Baseline — Apr 2026" />
          </div>

          <div>
            <Label>Source</Label>
            <Select value={source} onValueChange={(v) => setSource(v as Source)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">{activeSource.hint}</p>
          </div>

          <div>
            <Label>File</Label>
            <Input type="file"
                   accept={activeSource.accept}
                   onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {file && (
              <p className="text-xs text-muted-foreground mt-1">
                {file.name} · {(file.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>

          {progress && (
            <div className="text-xs text-muted-foreground">{progress}</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={busy || !file || !name.trim()}>
            {busy ? "Importing…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
