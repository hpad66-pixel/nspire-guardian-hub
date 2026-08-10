import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VoiceDictationTextareaWithAI } from "@/components/ui/voice-dictation-textarea-ai";
import { Send } from "lucide-react";
import type { FinancialProposal, FinancialProposalLine } from "@/hooks/useFinancialProposals";
import { proposalTotals } from "@/components/financial/FinancialProposalDocument";

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

export function SendFinancialProposalDialog({ open, onOpenChange, proposal, lines, projectName, onSent }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: FinancialProposal;
  lines: FinancialProposalLine[];
  projectName: string;
  onSent?: () => void;
}) {
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const total = proposalTotals(lines).total;
  const signLink = `${window.location.origin}/sign/financial-proposal/${proposal.sign_token}`;

  useEffect(() => {
    if (!open) return;
    setTo(proposal.client_email || "");
    setMessage(`Please review ${proposal.proposal_no} for ${projectName}. The proposal total is ${money(total)}. You can accept and sign electronically at the link below. If changes are needed, reject it with comments and we will amend and re-send it.`);
  }, [open, proposal, projectName, total]);

  async function send() {
    if (!to.trim()) return toast.error("Enter the client's email.");
    if (!proposal.locked) return toast.error("Sign and lock the proposal before sending it.");
    setBusy(true);
    try {
      const safeMessage = message.replace(/</g, "&lt;").replace(/\n/g, "<br>");
      const bodyHtml = `<div style="font-family:Georgia,serif;color:#1A1714"><p>${safeMessage}</p><p style="margin:18px 0"><a href="${signLink}" style="background:#1D6FE8;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Review &amp; sign ${proposal.proposal_no}</a></p>${proposal.pdf_path ? `<p><a href="${proposal.pdf_path}">Download the signed proposal PDF</a></p>` : ""}<p style="color:#6B6B6B;font-size:13px">${proposal.proposal_no} · ${proposal.title} · ${money(total)}</p></div>`;
      const { error: sendError } = await supabase.functions.invoke("send-email", {
        body: { recipients: [to.trim()], subject: `${proposal.proposal_no} — ${proposal.title} (signature requested)`, bodyHtml, bodyText: `${message}\n\nReview & sign: ${signLink}`, fromName: "APAS Consulting" },
      });
      if (sendError) throw sendError;
      const { error } = await supabase.from("proposals" as any).update({
        client_email: to.trim(), status: "sent", sent_to_client_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq("id", proposal.id);
      if (error) throw error;
      toast.success(`${proposal.sent_to_client_at ? "Re-sent" : "Sent"} to ${to.trim()}`);
      onSent?.();
      onOpenChange(false);
    } catch (error) { toast.error(`Send failed: ${(error as Error).message}`); }
    finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Send className="h-4 w-4" /> {proposal.sent_to_client_at ? "Re-send proposal" : "Send proposal"}</DialogTitle><DialogDescription>Email the signed PDF and a secure client acceptance link.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div><Label>Client email</Label><Input type="email" value={to} onChange={event => setTo(event.target.value)} /></div>
          <div><Label>Message</Label><VoiceDictationTextareaWithAI value={message} onValueChange={setMessage} rows={5} context="correspondence" /></div>
          <p className="break-all text-xs text-muted-foreground">Acceptance link: {signLink}</p>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={send} disabled={busy}>{busy ? "Sending…" : proposal.sent_to_client_at ? "Re-send" : "Send"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
