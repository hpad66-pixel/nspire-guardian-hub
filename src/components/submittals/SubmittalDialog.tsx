/**
 * C2 · SubmittalDialog — respond to a single submittal workflow step.
 *
 * This is the reviewer-facing action. The hook `respond()` also auto-rolls up
 * the parent submittal's status once every step has a response (worst-of-all
 * strategy — see useProcoreSubmittals.ts for the severity rank).
 */
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useSubmittalSteps } from "@/hooks/useProcoreSubmittals";
import { toast } from "sonner";

type Response = "approved" | "approved_as_noted" | "revise" | "rejected" | "fyi";

const RESPONSES: Array<{ value: Response; label: string; hint: string }> = [
  { value: "approved",         label: "Approved",            hint: "Proceed as submitted" },
  { value: "approved_as_noted",label: "Approved as noted",   hint: "Proceed with the noted corrections" },
  { value: "revise",           label: "Revise & resubmit",   hint: "Return for rework" },
  { value: "rejected",         label: "Rejected",            hint: "Not acceptable" },
  { value: "fyi",              label: "FYI",                 hint: "No approval required — informational" },
];

export function SubmittalDialog({
  open, onOpenChange, submittalId, stepId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  submittalId: string | null;
  stepId: string | null;
}) {
  const { respond } = useSubmittalSteps(submittalId);
  const [response, setResponse] = useState<Response>("approved");
  const [comment, setComment] = useState("");

  async function handleSubmit() {
    if (!stepId) return;
    try {
      await respond.mutateAsync({
        stepId, response, comment: comment.trim() || undefined,
      });
      toast.success("Response recorded");
      setResponse("approved");
      setComment("");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !respond.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Respond to submittal</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Response</Label>
            <Select value={response} onValueChange={(v) => setResponse(v as Response)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RESPONSES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <div>
                      <div>{r.label}</div>
                      <div className="text-xs text-muted-foreground">{r.hint}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Comment (optional)</Label>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)}
                      rows={4} placeholder="Notes for the submitter…" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}
                  disabled={respond.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={respond.isPending}>
            {respond.isPending ? "Recording…" : "Submit response"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
