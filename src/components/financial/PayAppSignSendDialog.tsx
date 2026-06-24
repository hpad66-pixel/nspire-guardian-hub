/**
 * PayAppSignSendDialog — e-sign the G702 certification and email the signed DRAFT
 * to the owner for review. The contractor types their signature (TypedSignaturePad),
 * which is stamped into the pay-app PDF with a "DRAFT — FOR OWNER REVIEW" banner,
 * then emailed (reusing useSendEmail). Sending is always explicit (this button) —
 * nothing is sent without the user confirming the recipient here.
 */
import { useMemo, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TypedSignaturePad } from "@/components/financial/TypedSignaturePad";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { usePayAppContinuation } from "@/hooks/usePayAppContinuation";
import { useCoSettings } from "@/hooks/useCoSettings";
import { useSendEmail } from "@/hooks/useSendEmail";
import { supabase } from "@/integrations/supabase/client";
import { PayApplicationDocument } from "@/lib/payApp/PayApplicationDocument";
import { buildPayAppSpec } from "@/lib/payApp/buildSpec";
import { payAppPdfBlob, blobToBase64 } from "@/lib/payApp/payAppPdf";
import type { PrimeContract } from "@/hooks/usePrimeContract";

export function PayAppSignSendDialog({
  payAppId, contract,
}: { payAppId: string; contract: PrimeContract }) {
  const { detail, lines, g702 } = usePayAppContinuation(payAppId);
  const { data: coSettings } = useCoSettings();
  const sendEmail = useSendEmail();
  const docRef = useRef<HTMLDivElement>(null);

  const pa = detail.data;
  const [open, setOpen] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(pa?.signature_data ?? null);
  const [signedName, setSignedName] = useState<string>(pa?.signed_name || contract.contractor_contact || "");
  const [recipient, setRecipient] = useState<string>(contract.owner_email || "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  // Off-screen DRAFT document, stamped with the just-typed signature.
  const spec = useMemo(
    () => (pa ? buildPayAppSpec(pa, contract, coSettings ?? {}, g702, lines, {
      signatureUrl, signedName, signedDate: today, draft: true,
    }) : null),
    [pa, contract, coSettings, g702, lines, signatureUrl, signedName, today],
  );

  async function signAndSend() {
    if (!pa) return;
    if (!signatureUrl) { toast.error("Type your name to sign first."); return; }
    if (!recipient.trim()) { toast.error("Enter the client's email."); return; }
    if (!docRef.current) { toast.error("Document not ready."); return; }
    setBusy(true);
    const t = toast.loading("Signing and building the PDF…");
    try {
      const signedAt = new Date().toISOString();
      // 1) Persist the signature on the pay app.
      const { error: e1 } = await supabase.from("prime_contract_pay_apps" as any)
        .update({ signature_data: signatureUrl, signed_name: signedName, signed_at: signedAt } as any)
        .eq("id", pa.id);
      if (e1) throw e1;

      // 2) Rasterize the stamped DRAFT to a clean PDF.
      await new Promise((r) => setTimeout(r, 300)); // let the signature image paint
      const blob = await payAppPdfBlob(docRef.current);
      const base64 = await blobToBase64(blob);
      const filename = `pay-app-${pa.pay_app_no}-DRAFT-${contract.contract_no || "g702"}.pdf`;

      // 3) Email the client the draft for review.
      const recipients = recipient.split(",").map((x) => x.trim()).filter(Boolean);
      toast.loading("Sending to the client…", { id: t });
      await sendEmail.mutateAsync({
        recipients,
        subject: `DRAFT for review — Pay Application #${pa.pay_app_no} · ${contract.title}`,
        bodyHtml: `
          <p>Hello,</p>
          <p>Please find attached <strong>Pay Application #${pa.pay_app_no}</strong> (period ending ${pa.period_end}) for
          <strong>${contract.title}</strong>, sent as a <strong>DRAFT for your review</strong>. This is not yet a formal
          request for payment.</p>
          ${message.trim() ? `<p>${message.trim().replace(/\n/g, "<br/>")}</p>` : ""}
          <p>Please review and let us know of any questions.</p>
          <p>Regards,<br/>${signedName || contract.contractor_name || "APAS Consulting LLC"}</p>`,
        bodyText: `Pay Application #${pa.pay_app_no} (period ending ${pa.period_end}) for ${contract.title} — DRAFT for your review. ${message.trim()}`,
        attachments: [{ filename, contentBase64: base64, contentType: "application/pdf", size: blob.size }],
      });

      // The email is out — confirm success NOW and close. Everything below is
      // best-effort bookkeeping; a hiccup there must never make a delivered email
      // look failed (that previously pushed users to re-send the same draft).
      toast.success(`Signed draft sent to ${recipients.join(", ")}.`, { id: t });
      setOpen(false);
      try {
        // 4) Record the send (informational; does not change status).
        await supabase.from("prime_contract_pay_apps" as any)
          .update({ sent_for_review_at: signedAt, sent_for_review_to: recipients.join(", ") } as any)
          .eq("id", pa.id);
        await detail.refetch();
      } catch (bookErr) {
        console.warn("Pay app send bookkeeping failed (the email was delivered):", bookErr);
      }
    } catch (e: any) {
      toast.error(`Couldn't send: ${e.message}`, { id: t });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={!pa}>
          <Send className="h-4 w-4 mr-1" />Sign &amp; send to client
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Sign &amp; send draft for review</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            Your typed signature is stamped onto the G702 with a <strong>DRAFT — for owner review</strong> banner,
            then emailed to the client. It does not submit or approve the pay app.
          </div>

          {/* TypedSignaturePad is loaded lazily to avoid the handwriting fonts on every page */}
          <SignArea defaultName={signedName} onSig={setSignatureUrl} onName={setSignedName} />

          <div>
            <Label className="text-xs">Send to (client email)</Label>
            <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="owner@example.com" type="email" />
            <p className="text-[11px] text-muted-foreground mt-1">Separate multiple emails with commas.</p>
          </div>

          <div>
            <Label className="text-xs">Note to client (optional)</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Anything you'd like them to focus on…" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button onClick={signAndSend} disabled={busy || !signatureUrl || !recipient.trim()}>
            <Send className="h-4 w-4 mr-1" />{busy ? "Sending…" : "Sign & send"}
          </Button>
        </DialogFooter>

        {/* Off-screen render target for rasterization */}
        <div style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none", opacity: 0 }} aria-hidden>
          {spec && <PayApplicationDocument ref={docRef} spec={spec} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Small wrapper so the signature pad is grouped with its label.
function SignArea({ defaultName, onSig, onName }: { defaultName: string; onSig: (u: string | null) => void; onName: (n: string) => void }) {
  return (
    <div>
      <Label className="text-xs mb-1 block">Sign the pay application</Label>
      <TypedSignaturePad defaultName={defaultName} onChange={onSig} onNameChange={onName} />
    </div>
  );
}
