/**
 * B5 · TransmittalDialog — package a selection of pl_documents into a
 * numbered transmittal (TRN-####) and send it to a distribution list.
 *
 * On submit:
 *   - Calls `next_transmittal_number` RPC to assign the sequential number.
 *   - Inserts the transmittal row + one transmittal_items row per document.
 *   - Optionally stamps `sent_at = now()` when "Mark as sent" is checked.
 *
 * Email delivery itself is handled by an edge function listening to the
 * transmittals webhook stream — this dialog only records intent.
 */
import { useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useTransmittals } from "@/hooks/useProjectDocuments";
import type { ProjectDocument } from "@/hooks/useProjectDocuments";
import { useDistributionLists } from "@/hooks/useDistributionLists";
import { toast } from "sonner";

export function TransmittalDialog({
  open, onOpenChange, projectId, selectedDocs,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  selectedDocs: ProjectDocument[];
}) {
  const { create } = useTransmittals(projectId);
  const { data: lists = [] } = useDistributionLists({ projectId });

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [distributionListId, setDistributionListId] = useState<string | "">("");
  const [markSent, setMarkSent] = useState(false);

  const docIds = useMemo(
    () => selectedDocs.map((d) => ({ id: d.id, version: d.current_version })),
    [selectedDocs],
  );

  async function handleSubmit() {
    if (!subject.trim()) { toast.error("Subject required"); return; }
    if (docIds.length === 0) { toast.error("Select at least one document"); return; }
    try {
      const t = await create.mutateAsync({
        subject: subject.trim(),
        body: body.trim() || undefined,
        distributionListId: distributionListId || undefined,
        documentIds: docIds,
        markSent,
      });
      toast.success(markSent ? `Sent ${t.number}` : `Created ${t.number} (draft)`);
      setSubject("");
      setBody("");
      setDistributionListId("");
      setMarkSent(false);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !create.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New transmittal</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)}
                   placeholder="e.g. 100% CD Package — for review" />
          </div>

          <div>
            <Label>Message (optional)</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)}
                      rows={4} placeholder="Cover note for the recipients…" />
          </div>

          <div>
            <Label>Distribution list</Label>
            <Select value={distributionListId}
                    onValueChange={(v) => setDistributionListId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a distribution list…" />
              </SelectTrigger>
              <SelectContent>
                {lists.length === 0 && (
                  <div className="p-2 text-xs text-muted-foreground">
                    No distribution lists available.
                  </div>
                )}
                {lists.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                    <span className="text-xs text-muted-foreground ml-2">· {l.scope}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1 block">Documents</Label>
            {selectedDocs.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No documents selected — close this dialog, select some, and retry.
              </p>
            ) : (
              <div className="rounded-md border divide-y max-h-48 overflow-y-auto">
                {selectedDocs.map((d) => (
                  <div key={d.id} className="flex items-center justify-between px-3 py-1.5 text-sm">
                    <span className="truncate">{d.name}</span>
                    <Badge variant="outline">v{d.current_version}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={markSent}
              onCheckedChange={(v) => setMarkSent(v === true)}
            />
            Mark as sent immediately (skip draft state)
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}
                  disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}
                  disabled={create.isPending || selectedDocs.length === 0 || !subject.trim()}>
            {create.isPending ? "Creating…" : markSent ? "Send transmittal" : "Save draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
