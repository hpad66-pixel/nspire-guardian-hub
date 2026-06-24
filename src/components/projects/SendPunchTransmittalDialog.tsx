/**
 * Send a punch list to a subcontractor. Pick the sub from the project's commitments,
 * choose which open items to include, and email a branded list with a secure link
 * the sub uses to respond with a status per item.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCommitments } from "@/hooks/useCommitments";
import { usePunchList } from "@/hooks/usePunchList";
import { useSendEmail } from "@/hooks/useSendEmail";
import { useCreatePunchTransmittal } from "@/hooks/usePunchTransmittals";
import { vendorName } from "@/components/financial/VendorPayments";

const PRIORITY_COLOR: Record<string, string> = { high: "#F43F5E", medium: "#F59E0B", low: "#878581" };

function buildEmailHtml(opts: { project: string; recipient: string; message: string; respondUrl: string; items: any[] }) {
  const rows = opts.items.map((i, n) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;vertical-align:top;color:#878581;font-size:12px;">${n + 1}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;vertical-align:top;">
        <div style="font-weight:600;color:#1A1714;">${i.description ?? ""}</div>
        <div style="font-size:12px;color:#878581;margin-top:2px;">${i.location ?? ""}</div>
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;vertical-align:top;text-align:right;">
        <span style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:${PRIORITY_COLOR[i.priority] ?? "#878581"};font-weight:700;">${i.priority ?? ""}</span>
      </td>
    </tr>`).join("");
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#1A1714;">
    <div style="border-bottom:3px solid #C4A35A;padding-bottom:12px;margin-bottom:16px;">
      <div style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#C4A35A;font-weight:700;">Punch List</div>
      <div style="font-size:20px;font-weight:800;">${opts.project}</div>
    </div>
    <p>Hello ${opts.recipient || "there"},</p>
    <p>Please review the punch list items below assigned to your scope. ${opts.message ? "" : "Use the button to confirm a status for each item."}</p>
    ${opts.message ? `<p style="white-space:pre-wrap;">${opts.message}</p>` : ""}
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
      <thead><tr style="background:#FAF8F4;">
        <th style="text-align:left;padding:8px;font-size:11px;text-transform:uppercase;color:#878581;">#</th>
        <th style="text-align:left;padding:8px;font-size:11px;text-transform:uppercase;color:#878581;">Item</th>
        <th style="text-align:right;padding:8px;font-size:11px;text-transform:uppercase;color:#878581;">Priority</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="text-align:center;margin:24px 0;">
      <a href="${opts.respondUrl}" style="display:inline-block;background:#1D6FE8;color:#fff;text-decoration:none;font-weight:700;padding:12px 28px;border-radius:8px;">Review &amp; respond to each item →</a>
    </div>
    <p style="font-size:12px;color:#878581;">Or paste this link into your browser:<br/>${opts.respondUrl}</p>
  </div>`;
}

export function SendPunchTransmittalDialog({
  open, onOpenChange, projectId, projectName, preselectedIds,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  projectName?: string;
  preselectedIds?: string[];
}) {
  const { data: commitments = [] } = useCommitments(projectId);
  const { data: allItems = [] } = usePunchList(projectId);
  const sendEmail = useSendEmail();
  const createTx = useCreatePunchTransmittal();

  const openItems = useMemo(() => (allItems as any[]).filter((i) => !i.closed_at), [allItems]);
  const [commitmentId, setCommitmentId] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) setSelected(new Set(preselectedIds && preselectedIds.length ? preselectedIds : openItems.map((i) => i.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => {
    if (!open) { setCommitmentId(""); setRecipientEmail(""); setMessage(""); }
  }, [open]);

  const commitment = commitments.find((c) => c.id === commitmentId);
  const recipientName = commitment ? vendorName(commitment) : "";
  const chosenItems = openItems.filter((i) => selected.has(i.id));
  const canSend = recipientEmail.trim() && chosenItems.length > 0 && !createTx.isPending && !sendEmail.isPending;

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function handleSend() {
    if (!canSend) return;
    const subject = `Punch List — ${projectName ?? "Project"}${recipientName ? ` · ${recipientName}` : ""}`;
    try {
      const tx = await createTx.mutateAsync({
        projectId, commitmentId: commitmentId || null, recipientName, recipientEmail: recipientEmail.trim(),
        subject, message, punchItemIds: chosenItems.map((i) => i.id),
      });
      const respondUrl = `${window.location.origin}/respond/punch/${tx.respond_token}`;
      await sendEmail.mutateAsync({
        recipients: [recipientEmail.trim()],
        subject,
        bodyHtml: buildEmailHtml({ project: projectName ?? "Project", recipient: recipientName, message, respondUrl, items: chosenItems }),
      });
      toast.success(`Punch list sent to ${recipientName || recipientEmail} (${chosenItems.length} items).`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(`Couldn't send: ${e?.message ?? "unknown error"}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send punch list to subcontractor</DialogTitle>
          <DialogDescription>Pick the sub, choose items, and email a list they can respond to item-by-item.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Subcontractor</Label>
              <Select value={commitmentId} onValueChange={setCommitmentId}>
                <SelectTrigger><SelectValue placeholder="Select a sub" /></SelectTrigger>
                <SelectContent>
                  {commitments.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">No commitments yet.</div>}
                  {commitments.map((c) => <SelectItem key={c.id} value={c.id}>{vendorName(c)} · {c.commitment_no}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Send to email</Label>
              <Input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="sub@company.com" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Message (optional)</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="Anything you want to add for the sub…" />
          </div>

          <div className="space-y-1.5">
            <Label>Items ({chosenItems.length} selected)</Label>
            <div className="max-h-56 overflow-y-auto rounded-md border divide-y">
              {openItems.length === 0 && <div className="p-3 text-sm text-muted-foreground">No open punch items to send.</div>}
              {openItems.map((i) => (
                <label key={i.id} className="flex items-start gap-2 p-2.5 cursor-pointer hover:bg-muted/30">
                  <Checkbox checked={selected.has(i.id)} onCheckedChange={() => toggle(i.id)} className="mt-0.5" />
                  <span className="flex-1 text-sm">
                    <span className="font-medium">{i.description}</span>
                    <span className="block text-xs text-muted-foreground">{i.location || "—"}</span>
                  </span>
                  <Badge variant="outline" className="text-[10px] capitalize">{i.priority}</Badge>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSend} disabled={!canSend}>
            <Send className="h-4 w-4 mr-1.5" /> {createTx.isPending || sendEmail.isPending ? "Sending…" : "Send punch list"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
