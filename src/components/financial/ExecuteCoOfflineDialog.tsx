/**
 * ExecuteCoOfflineDialog — execute a change order from a client's offline-signed
 * copy (they printed it, signed on paper, sent back a scan). Upload the signed
 * copy → it becomes the executed document and the CO is marked executed + locked
 * with an executed date and optional signer name. The offline counterpart to the
 * in-app counter-sign.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AttachmentField } from "@/components/common/AttachmentField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useExecuteCoOffline } from "@/hooks/useProcoreChangeOrders";
import { coLabel } from "@/lib/changeOrder/coLabel";

interface ExecuteCo { id: string; co_no: number | null; co_type: string | null; pdf_path?: string | null }

export function ExecuteCoOfflineDialog({
  open, onOpenChange, co, projectId, onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  co: ExecuteCo;
  projectId: string;
  onDone?: () => void;
}) {
  const exec = useExecuteCoOffline();
  const [pdfUrl, setPdfUrl] = useState<string | null>(co?.pdf_path ?? null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [signer, setSigner] = useState("");
  const label = coLabel(co.co_type, co.co_no);

  async function submit() {
    if (!pdfUrl) { toast.error("Upload the client's signed copy first."); return; }
    try {
      await exec.mutateAsync({ coId: co.id, pdfPath: pdfUrl, executedDate: date, signerName: signer });
      toast.success(`${label} marked executed from the signed copy.`);
      onOpenChange(false);
      onDone?.();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Mark {label} executed — client signed offline</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            For when the client printed {label}, signed it on paper, and sent back a scan. Upload the
            signed copy — it becomes the executed change-order document, and the CO is marked
            <strong> executed</strong> and locked.
          </p>
          <div>
            <Label>Client&apos;s signed copy (PDF / scan)</Label>
            <AttachmentField
              url={pdfUrl}
              onChange={(u) => setPdfUrl(u ?? null)}
              projectId={projectId}
              folder="change-orders/signed"
              label="Signed change order"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Executed date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Signed by (client, optional)</Label>
              <Input value={signer} onChange={(e) => setSigner(e.target.value)} placeholder="e.g. Chris Sullivan" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={exec.isPending || !pdfUrl}>
            {exec.isPending ? "Saving…" : "Mark executed"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
