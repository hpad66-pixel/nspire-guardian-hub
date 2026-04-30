/**
 * G4 · CreateWebhookDialog
 *
 * Form for adding a webhook subscription. Uses useWebhooks().create.
 */
import { useState } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useWebhooks, type Webhook } from "@/hooks/useWebhooks";
import { toast } from "sonner";

const AVAILABLE_EVENTS = [
  "rfi.created", "rfi.responded", "rfi.closed",
  "submittal.created", "submittal.responded",
  "commitment.created", "commitment.executed",
  "change_order.created", "change_order.executed",
  "pay_app.submitted", "pay_app.approved", "pay_app.rejected",
  "direct_cost.approved",
];

interface CreateWebhookDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (w: Webhook) => void;
}

export function CreateWebhookDialog({
  open, onClose, onCreated,
}: CreateWebhookDialogProps) {
  const { create } = useWebhooks();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);

  function toggleEvent(ev: string) {
    setEvents((prev) =>
      prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) { toast.error("URL is required"); return; }
    if (events.length === 0) { toast.error("Choose at least one event"); return; }

    try {
      const w = await create.mutateAsync({
        name: name.trim() || undefined,
        url: url.trim(),
        events,
      });
      onCreated(w);
      setName(""); setUrl(""); setEvents([]);
    } catch (err: any) {
      toast.error(err.message ?? "Create failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add webhook</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="wh-name">Name (optional)</Label>
            <Input id="wh-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wh-url">Endpoint URL</Label>
            <Input
              id="wh-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/webhooks/procore"
              required
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Events</legend>
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto">
              {AVAILABLE_EVENTS.map((ev) => (
                <label key={ev} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={events.includes(ev)}
                    onCheckedChange={() => toggleEvent(ev)}
                  />
                  <span className="font-mono text-xs">{ev}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create webhook"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateWebhookDialog;
