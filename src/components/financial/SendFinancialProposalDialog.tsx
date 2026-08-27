import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VoiceDictationTextareaWithAI } from "@/components/ui/voice-dictation-textarea-ai";
import { Send, Paperclip, FileText, X } from "lucide-react";
import type { FinancialProposal, FinancialProposalLine } from "@/hooks/useFinancialProposals";
import type { ProposalClient } from "@/components/financial/FinancialProposalDocument";
import { proposalTotals } from "@/lib/financial/proposalPricing";
import { buildProposalPdfBlob } from "@/lib/pdf/proposalPdf";
import { uploadFinancialProposalArtifact } from "@/lib/proposals/financialProposalStorage";

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

const MAX_ATTACH_BYTES = 20 * 1024 * 1024;

interface SubAttachment {
  filename: string;
  contentBase64: string;
  contentType: string;
  size: number;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

const readAsBase64 = (file: File) => blobToBase64(file);

export function SendFinancialProposalDialog({ open, onOpenChange, proposal, lines, projectName, client, onSent }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: FinancialProposal;
  lines: FinancialProposalLine[];
  projectName: string;
  client?: ProposalClient | null;
  onSent?: () => void;
}) {
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [attachments, setAttachments] = useState<SubAttachment[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const total = proposalTotals(lines, proposal).total;
  const signLink = `${window.location.origin}/sign/financial-proposal/${proposal.sign_token}`;

  useEffect(() => {
    if (!open) return;
    setTo(proposal.client_email || "");
    setAttachments([]);
    setMessage(`Please review ${proposal.proposal_no} for ${projectName}. The proposal total is ${money(total)}. You can accept and sign electronically at the link below. If changes are needed, reject it with comments and we will amend and re-send it.`);
  }, [open, proposal, projectName, total]);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const next: SubAttachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_ATTACH_BYTES) {
        toast.error(`${file.name} is larger than 20 MB and was skipped`);
        continue;
      }
      try {
        next.push({
          filename: file.name,
          contentBase64: await readAsBase64(file),
          contentType: file.type || "application/octet-stream",
          size: file.size,
        });
      } catch {
        toast.error(`Could not read ${file.name}`);
      }
    }
    if (next.length) setAttachments(prev => [...prev, ...next]);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function send() {
    if (!to.trim()) return toast.error("Enter the client's email.");
    if (!proposal.locked) return toast.error("Sign and lock the proposal before sending it.");
    setBusy(true);
    try {
      // Always regenerate the proposal PDF fresh from current data with the
      // branded vector builder — never rely on a possibly-stale stored blob.
      // The signature images are loaded from the proposal's stored paths.
      let freshPdfPath = proposal.pdf_path ?? null;
      const proposalAttachment: SubAttachment[] = [];
      try {
        const pdfBlob = await buildProposalPdfBlob(proposal, lines, projectName, "APAS Consulting", undefined, client);
        const filename = `${proposal.proposal_no}-${(proposal.title || "proposal").replace(/[^a-z0-9]/gi, "-").toLowerCase()}.pdf`;
        proposalAttachment.push({
          filename,
          contentBase64: await blobToBase64(pdfBlob),
          contentType: "application/pdf",
          size: pdfBlob.size,
        });
        // Refresh the stored copy so any link (and the record) points at the new PDF.
        try { freshPdfPath = await uploadFinancialProposalArtifact(pdfBlob, proposal.project_id, "signed"); }
        catch { /* storage refresh is best-effort; the attachment already carries the PDF */ }
      } catch (pdfErr) {
        console.warn("Proposal PDF regeneration failed (sending without the PDF attachment):", pdfErr);
      }

      const safeMessage = message.replace(/</g, "&lt;").replace(/\n/g, "<br>");
      const bodyHtml = `<div style="font-family:Georgia,serif;color:#1A1714"><p>${safeMessage}</p><p style="margin:18px 0"><a href="${signLink}" style="background:#1D6FE8;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Review &amp; sign ${proposal.proposal_no}</a></p><p style="color:#6B6B6B;font-size:13px">The proposal is attached as a PDF. ${proposal.proposal_no} · ${proposal.title} · ${money(total)}</p></div>`;
      const { error: sendError } = await supabase.functions.invoke("send-email", {
        body: {
          recipients: [to.trim()],
          subject: `${proposal.proposal_no} — ${proposal.title} (signature requested)`,
          bodyHtml,
          bodyText: `${message}\n\nReview & sign: ${signLink}`,
          fromName: "APAS Consulting",
          attachments: [...proposalAttachment, ...attachments].map(({ filename, contentBase64, contentType, size }) => ({
            filename,
            contentBase64,
            contentType,
            size,
          })),
        },
      });
      if (sendError) throw sendError;
      const now = new Date().toISOString();
      const { data: auth } = await supabase.auth.getUser();
      const deliveries = Array.isArray(proposal.delivery_history) ? proposal.delivery_history : [];
      const { error } = await supabase.from("proposals").update({
        status: "sent",
        sent_to_client_at: now,
        pdf_path: freshPdfPath,
        delivery_history: [...deliveries, { to: to.trim(), at: now, by: auth.user?.id ?? null, kind: proposal.sent_to_client_at ? "resent" : "sent" }],
        updated_at: now,
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Attachments</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
                <Paperclip className="mr-2 h-4 w-4" /> Attach subconsultant docs
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.gif,.txt,.csv"
              onChange={event => handleFiles(event.target.files)}
            />
            {attachments.length === 0 ? (
              <p className="text-xs text-muted-foreground">The freshly-rendered proposal PDF is attached automatically. Add subconsultant docs to include them in the same email.</p>
            ) : (
              <ul className="space-y-1">
                {attachments.map((attachment, index) => (
                  <li key={`${attachment.filename}-${index}`} className="flex items-center gap-2 rounded border bg-muted/40 px-2 py-1 text-sm">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{attachment.filename}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{(attachment.size / 1024).toFixed(0)} KB</span>
                    <button
                      type="button"
                      onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                      disabled={busy}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${attachment.filename}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="break-all text-xs text-muted-foreground">Acceptance link: {signLink}</p>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={send} disabled={busy}>{busy ? "Sending…" : proposal.sent_to_client_at ? "Re-send" : "Send"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
