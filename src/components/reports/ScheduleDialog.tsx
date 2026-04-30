/**
 * E3 · ScheduleDialog — configure a recurring run for a saved report.
 *
 * Writes one row into `report_schedules`:
 *   - cron   : 5-field Postgres cron expression (generated from a preset)
 *   - format : pdf / xlsx / csv
 *   - recipients : { distribution_list_ids?: string[]; emails?: string[] }
 *
 * We keep the UI presets simple — users rarely need arbitrary cron. The
 * "advanced" textbox is still available when they do.
 */
import { useMemo, useState } from "react";
import { useReportSchedules } from "@/hooks/useProcoreReports";
import { useDistributionLists } from "@/hooks/useDistributionLists";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Cadence =
  | "daily-morning"
  | "weekly-monday"
  | "monthly-1st"
  | "quarterly"
  | "custom";

const CADENCE_TO_CRON: Record<Exclude<Cadence, "custom">, { cron: string; label: string }> = {
  "daily-morning": { cron: "0 7 * * *",   label: "Every day at 07:00" },
  "weekly-monday": { cron: "0 7 * * 1",   label: "Every Monday at 07:00" },
  "monthly-1st":   { cron: "0 7 1 * *",   label: "1st of every month at 07:00" },
  "quarterly":     { cron: "0 7 1 1,4,7,10 *", label: "Jan/Apr/Jul/Oct 1st at 07:00" },
};

const FORMATS = ["pdf", "xlsx", "csv"] as const;

export function ScheduleDialog({
  open, onOpenChange, reportId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  reportId: string | null;
}) {
  const { create } = useReportSchedules(reportId);
  const { data: lists = [] } = useDistributionLists();

  const [cadence, setCadence] = useState<Cadence>("weekly-monday");
  const [customCron, setCustomCron] = useState("");
  const [format, setFormat] = useState<(typeof FORMATS)[number]>("pdf");
  const [listIds, setListIds] = useState<Set<string>>(new Set());
  const [emails, setEmails] = useState("");

  const cron = useMemo(() => {
    if (cadence === "custom") return customCron.trim();
    return CADENCE_TO_CRON[cadence].cron;
  }, [cadence, customCron]);

  function toggleList(id: string) {
    setListIds((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  async function handleSubmit() {
    if (!reportId) return;
    if (!cron || cron.split(/\s+/).length < 5) {
      toast.error("Cron must be a 5-field expression (m h dom mon dow)");
      return;
    }
    const emailList = emails.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
    if (listIds.size === 0 && emailList.length === 0) {
      toast.error("Add at least one distribution list or email address");
      return;
    }
    try {
      await create.mutateAsync({
        cron, format,
        recipients: {
          ...(listIds.size > 0 ? { distribution_list_ids: [...listIds] } : {}),
          ...(emailList.length > 0 ? { emails: emailList } : {}),
        },
      });
      toast.success("Schedule saved");
      setListIds(new Set());
      setEmails("");
      setCadence("weekly-monday");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !create.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule report run</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Cadence</Label>
            <Select value={cadence} onValueChange={(v) => setCadence(v as Cadence)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(CADENCE_TO_CRON) as Array<[Exclude<Cadence, "custom">, { cron: string; label: string }]>).map(
                  ([key, v]) => (
                    <SelectItem key={key} value={key}>{v.label}</SelectItem>
                  ),
                )}
                <SelectItem value="custom">Custom (cron)</SelectItem>
              </SelectContent>
            </Select>
            {cadence === "custom" ? (
              <Input
                className="mt-2 font-mono"
                value={customCron}
                onChange={(e) => setCustomCron(e.target.value)}
                placeholder="e.g. 0 8 * * 1-5"
              />
            ) : (
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                {cron}
              </p>
            )}
          </div>

          <div>
            <Label>Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FORMATS.map((f) => (
                  <SelectItem key={f} value={f} className="uppercase">{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1 block">Distribution lists</Label>
            {lists.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No distribution lists yet — add recipients as email addresses below.
              </p>
            ) : (
              <div className="rounded-md border divide-y max-h-40 overflow-y-auto">
                {lists.map((l) => (
                  <label
                    key={l.id}
                    className="flex items-center gap-2 p-2 text-sm cursor-pointer hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={listIds.has(l.id)}
                      onCheckedChange={() => toggleList(l.id)}
                    />
                    <span className="flex-1 truncate">{l.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{l.scope}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label>Additional recipients (comma or newline-separated)</Label>
            <Input
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="alice@example.com, bob@example.com"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}
                  disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}
                  disabled={create.isPending || !reportId || !cron}>
            {create.isPending ? "Saving…" : "Save schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
