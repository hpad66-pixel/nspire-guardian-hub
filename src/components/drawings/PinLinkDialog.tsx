/**
 * B2 · PinLinkDialog — link a drawing markup (pin) to an RFI / Punch item / Photo.
 * Opens from MarkupCanvas.onPinClick. Updates drawing_markups row with
 * linked_record_type + linked_record_id + optional text label.
 */
import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DrawingMarkup } from "@/hooks/useDrawings";

export interface PinLinkDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  markup: DrawingMarkup | null;
}

type LinkType = "rfi" | "punch_item" | "photo" | "submittal";

export function PinLinkDialog({ open, onOpenChange, markup }: PinLinkDialogProps) {
  const [text, setText] = useState("");
  const [linkType, setLinkType] = useState<LinkType | "">("");
  const [linkId, setLinkId] = useState("");
  const [published, setPublished] = useState(false);

  useEffect(() => {
    if (markup) {
      setText(markup.text ?? "");
      setLinkType((markup.linked_record_type as LinkType) ?? "");
      setLinkId(markup.linked_record_id ?? "");
      setPublished(markup.is_published);
    }
  }, [markup]);

  async function handleSave() {
    if (!markup) return;
    try {
      const { error } = await supabase
        .from("drawing_markups" as any)
        .update({
          text: text || null,
          linked_record_type: linkType || null,
          linked_record_id: linkId || null,
          is_published: published,
        } as any)
        .eq("id", markup.id);
      if (error) throw error;
      toast.success("Markup updated");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleDelete() {
    if (!markup) return;
    if (!confirm("Delete this markup?")) return;
    try {
      const { error } = await supabase
        .from("drawing_markups" as any)
        .delete()
        .eq("id", markup.id);
      if (error) throw error;
      toast.success("Markup deleted");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pin — link & label</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Label / note</Label>
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Beam clash, see RFI-012" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Link type</Label>
              <Select value={linkType} onValueChange={(v) => setLinkType(v as LinkType | "")}>
                <SelectTrigger><SelectValue placeholder="unlinked" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unlinked</SelectItem>
                  <SelectItem value="rfi">RFI</SelectItem>
                  <SelectItem value="punch_item">Punch item</SelectItem>
                  <SelectItem value="photo">Photo</SelectItem>
                  <SelectItem value="submittal">Submittal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Record ID</Label>
              <Input
                value={linkId}
                onChange={(e) => setLinkId(e.target.value)}
                placeholder="uuid"
                disabled={!linkType}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Switch checked={published} onCheckedChange={setPublished} id="pub" />
            <Label htmlFor="pub" className="cursor-pointer">Publish to other users (default: private draft)</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
