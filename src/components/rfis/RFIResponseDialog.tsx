/**
 * C1 · RFIResponseDialog — post a response to an RFI.
 *
 * Supports three action modes:
 *   - "comment" : internal comment (is_official=false)
 *   - "official": authoritative response (is_official=true)
 *   - "official-and-close": answer + advance the workflow to closed
 */
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useRfiResponses, useCloseProcoreRfi } from "@/hooks/useProcoreRfis";
import { toast } from "sonner";

type Action = "comment" | "official" | "official-close";

export function RFIResponseDialog({
  open, onOpenChange, rfiId, workflowInstanceId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  rfiId: string | null;
  workflowInstanceId?: string;
}) {
  const { add } = useRfiResponses(rfiId);
  const closeRfi = useCloseProcoreRfi();
  const [body, setBody] = useState("");
  const [action, setAction] = useState<Action>("comment");

  const busy = add.isPending || closeRfi.isPending;

  async function handleSubmit() {
    if (!rfiId) return;
    if (!body.trim()) { toast.error("Response body required"); return; }
    try {
      await add.mutateAsync({
        body: body.trim(),
        isOfficial: action !== "comment",
      });
      if (action === "official-close") {
        await closeRfi.mutateAsync({ rfiId, instanceId: workflowInstanceId });
        toast.success("Official response posted · RFI closed");
      } else {
        toast.success(action === "official" ? "Official response posted" : "Comment posted");
      }
      setBody("");
      setAction("comment");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Respond to RFI</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Response</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)}
                      rows={8} placeholder="Enter your response…" />
          </div>

          <div>
            <Label className="mb-1 block">Mark this response as</Label>
            <div className="flex flex-col gap-1 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio" name="rfi-action" value="comment"
                  checked={action === "comment"}
                  onChange={() => setAction("comment")}
                />
                Internal comment (doesn't close the RFI)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio" name="rfi-action" value="official"
                  checked={action === "official"}
                  onChange={() => setAction("official")}
                />
                Official response (keeps RFI open)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio" name="rfi-action" value="official-close"
                  checked={action === "official-close"}
                  onChange={() => setAction("official-close")}
                />
                Official response <strong>and close RFI</strong>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={busy || !body.trim()}>
            {busy ? "Posting…" : "Post response"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
