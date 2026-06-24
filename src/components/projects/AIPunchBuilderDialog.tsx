/**
 * Dictate or type a walkthrough; AI turns it into a clean, editable punch list you
 * can save (and optionally send straight to a subcontractor).
 */
import { useState } from "react";
import { toast } from "sonner";
import { Mic, MicOff, Sparkles, Trash2, Wand2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSpeechDictation } from "@/hooks/useSpeechDictation";
import { useDraftPunchItems, useBulkCreatePunchItems, type DraftedPunchItem } from "@/hooks/useAIPunch";

type Row = DraftedPunchItem & { include: boolean };

const PRIORITIES = ["high", "medium", "low"];

export function AIPunchBuilderDialog({
  open, onOpenChange, projectId, projectName, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  projectName?: string;
  /** Called after items are saved; receives the new ids so the caller can offer "send". */
  onSaved?: (itemIds: string[], send: boolean) => void;
}) {
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const draft = useDraftPunchItems();
  const bulk = useBulkCreatePunchItems();
  const { listening, supported, toggle } = useSpeechDictation((chunk) => setNotes((n) => (n + chunk)));

  const reset = () => { setNotes(""); setRows(null); };
  const close = () => { onOpenChange(false); setTimeout(reset, 200); };

  async function generate() {
    if (notes.trim().length < 3) { toast.error("Add a few words describing the issues first."); return; }
    try {
      const items = await draft.mutateAsync({ text: notes, projectName });
      if (!items.length) { toast.error("No punch items found — try adding more detail."); return; }
      setRows(items.map((i) => ({ ...i, include: true })));
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't generate the list.");
    }
  }

  const update = (i: number, patch: Partial<Row>) => setRows((r) => r!.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const remove = (i: number) => setRows((r) => r!.filter((_, idx) => idx !== i));
  const included = (rows ?? []).filter((r) => r.include);

  async function save(send: boolean) {
    if (!included.length) { toast.error("Select at least one item."); return; }
    try {
      const saved = await bulk.mutateAsync({
        projectId,
        items: included.map((r) => ({ description: r.description, location: r.location, priority: r.priority })),
      });
      const ids = (saved as any[]).map((s) => s.id);
      toast.success(`Added ${ids.length} punch item${ids.length === 1 ? "" : "s"}.`);
      onSaved?.(ids, send);
      close();
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save the items.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-[var(--apas-sapphire)]" /> Generate punch list with AI</DialogTitle>
          <DialogDescription>
            Walk the site and talk, or type your notes. AI turns them into clean, professional punch items you can edit before saving.
          </DialogDescription>
        </DialogHeader>

        {!rows ? (
          <div className="space-y-3">
            <div className="relative">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={8}
                placeholder="e.g. In unit 204 the bathroom GFCI is dead, there's a paint scuff on the north wall, and the closet door won't latch. In the lobby the baseboard is loose near the elevator…"
              />
              {supported && (
                <Button
                  type="button" size="sm" variant={listening ? "default" : "outline"}
                  onClick={toggle}
                  className={`absolute bottom-2 right-2 ${listening ? "animate-pulse" : ""}`}
                >
                  {listening ? <><MicOff className="h-4 w-4 mr-1" /> Stop</> : <><Mic className="h-4 w-4 mr-1" /> Dictate</>}
                </Button>
              )}
            </div>
            {!supported && <p className="text-xs text-muted-foreground">Voice dictation needs Chrome or Edge. You can type instead.</p>}
            {listening && <p className="text-xs text-[var(--apas-sapphire)]">Listening… speak naturally; finalized phrases appear above.</p>}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{included.length} of {rows.length} selected. Edit anything before saving.</p>
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={i} className={`rounded-md border p-2.5 ${r.include ? "" : "opacity-50"}`}>
                  <div className="flex items-start gap-2">
                    <Checkbox checked={r.include} onCheckedChange={(v) => update(i, { include: Boolean(v) })} className="mt-1" />
                    <div className="flex-1 space-y-2">
                      <Textarea value={r.description} onChange={(e) => update(i, { description: e.target.value })} rows={2} className="text-sm" />
                      <div className="flex flex-wrap items-center gap-2">
                        <Input value={r.location} onChange={(e) => update(i, { location: e.target.value })} placeholder="Location" className="h-8 w-44 text-xs" />
                        <Select value={r.priority} onValueChange={(v) => update(i, { priority: v as Row["priority"] })}>
                          <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                        </Select>
                        <Badge variant="outline" className="text-[10px] capitalize">{r.trade}</Badge>
                        <Button type="button" size="icon" variant="ghost" className="h-7 w-7 ml-auto" onClick={() => remove(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {!rows ? (
            <>
              <Button variant="outline" onClick={close}>Cancel</Button>
              <Button onClick={generate} disabled={draft.isPending}>
                <Wand2 className="h-4 w-4 mr-1.5" /> {draft.isPending ? "Generating…" : "Generate"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setRows(null)}>Back</Button>
              <Button variant="outline" onClick={() => save(false)} disabled={bulk.isPending}>Add to punch list</Button>
              <Button onClick={() => save(true)} disabled={bulk.isPending}>Add &amp; send to sub →</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
