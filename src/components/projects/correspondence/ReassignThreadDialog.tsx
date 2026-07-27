/**
 * ReassignThreadDialog — correct a synced thread: move it to the right project
 * (or sub-project) and/or fix its topic, optionally pushing the matching Gmail
 * label. Opened from a thread card's "Fix" action.
 */
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { useAllProjectTopics, useCorrespondenceReassign } from "@/hooks/useCorrespondenceReassign";

export function ReassignThreadDialog({
  open, onOpenChange, projectId, gmailThreadId, currentTopic,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  gmailThreadId: string;
  currentTopic: string | null;
}) {
  const { data: options = [], isLoading } = useAllProjectTopics();
  const reassign = useCorrespondenceReassign();
  const [targetProjectId, setTargetProjectId] = useState(projectId);
  const [topic, setTopic] = useState(currentTopic ?? "");
  const [applyLabel, setApplyLabel] = useState(true);

  const sorted = useMemo(() => [...options].sort((a, b) => a.project_name.localeCompare(b.project_name)), [options]);
  const target = options.find((o) => o.project_id === targetProjectId);

  // Reset the topic pick when the target project changes — keep it if the new
  // project happens to have the same topic key, otherwise clear it.
  useEffect(() => {
    if (!target) return;
    if (!target.topics.some((t) => t.key === topic)) setTopic("");
  }, [targetProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    reassign.mutate(
      {
        project_id: projectId,
        gmail_thread_id: gmailThreadId,
        target_project_id: targetProjectId !== projectId ? targetProjectId : undefined,
        topic: topic || undefined,
        apply_gmail_label: applyLabel,
      },
      {
        onSuccess: (r) => {
          const parts: string[] = [];
          parts.push(r.moved ? `Moved to ${target?.project_name ?? "the selected project"}.` : "Topic updated.");
          if (r.labelApplied) parts.push("Gmail label applied.");
          else if (r.labelSkippedReason) parts.push(r.labelSkippedReason);
          toast.success(parts.join(" "));
          onOpenChange(false);
        },
        onError: (e: any) => toast.error(e?.message ?? "Couldn't reassign this thread."),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Fix this thread's project / topic</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Project</Label>
            <Select value={targetProjectId} onValueChange={setTargetProjectId} disabled={isLoading}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {sorted.map((o) => (
                  <SelectItem key={o.project_id} value={o.project_id}>
                    {o.project_name}{o.parent_name ? ` (${o.parent_name})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Topic</Label>
            <Select value={topic} onValueChange={setTopic} disabled={!target || target.topics.length === 0}>
              <SelectTrigger><SelectValue placeholder={target && target.topics.length === 0 ? "This project has no topics configured yet" : "Select a topic"} /></SelectTrigger>
              <SelectContent>
                {(target?.topics ?? []).map((t) => (
                  <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={applyLabel} onCheckedChange={(v) => setApplyLabel(Boolean(v))} disabled={!target?.has_gmail_label} />
            Also apply the matching Gmail label
            {target && !target.has_gmail_label && <span className="text-xs text-muted-foreground">(none configured for this project yet)</span>}
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={reassign.isPending}>
            {reassign.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
