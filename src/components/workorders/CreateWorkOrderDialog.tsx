/**
 * CreateWorkOrderDialog — manually create an ad-hoc work order (most are auto-created
 * from inspection defects, but maintenance tasks sometimes need a manual one).
 * Required: title, property, due date. Optional: priority, description.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useProperties } from "@/hooks/useProperties";
import { useCreateWorkOrder } from "@/hooks/useWorkOrders";

export function CreateWorkOrderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: properties } = useProperties();
  const create = useCreateWorkOrder();
  const today = new Date().toISOString().slice(0, 10);

  const [title, setTitle] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [dueDate, setDueDate] = useState(today);
  const [priority, setPriority] = useState<"routine" | "emergency">("routine");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<{ title?: boolean; property?: boolean; due?: boolean }>({});

  function reset() {
    setTitle(""); setPropertyId(""); setDueDate(today); setPriority("routine"); setDescription(""); setErrors({});
  }

  async function submit() {
    const e = { title: !title.trim(), property: !propertyId, due: !dueDate };
    if (e.title || e.property || e.due) { setErrors(e); toast.error("Fill in the required fields."); return; }
    try {
      await create.mutateAsync({
        title: title.trim(), property_id: propertyId, due_date: dueDate,
        priority, status: "pending", description: description.trim() || null,
      } as any);
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't create the work order.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Work Order</DialogTitle>
          <DialogDescription>Create an ad-hoc maintenance work order.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => { setTitle(e.target.value); if (errors.title) setErrors((x) => ({ ...x, title: false })); }}
              placeholder="e.g. Replace hallway light fixtures" className={cn(errors.title && "border-destructive")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Property *</Label>
              <Select value={propertyId} onValueChange={(v) => { setPropertyId(v); if (errors.property) setErrors((x) => ({ ...x, property: false })); }}>
                <SelectTrigger className={cn(errors.property && "border-destructive")}><SelectValue placeholder="Select property" /></SelectTrigger>
                <SelectContent>
                  {properties?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due date *</Label>
              <Input type="date" value={dueDate} onChange={(e) => { setDueDate(e.target.value); if (errors.due) setErrors((x) => ({ ...x, due: false })); }}
                className={cn(errors.due && "border-destructive")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as "routine" | "emergency")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="routine">Routine</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What needs to be done…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending}>{create.isPending ? "Creating…" : "Create work order"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
