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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Send, Upload, Trash2, ArrowUp, ArrowDown, Paperclip, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePayAppContinuation } from "@/hooks/usePayAppContinuation";
import { usePayAppAttachments, type PayAppAttachment } from "@/hooks/usePayAppAttachments";
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
  const { data: attachments = [], add: addAtt, remove: removeAtt, reorder: reorderAtt } = usePayAppAttachments(payAppId);
  const sendEmail = useSendEmail();
  const docRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pa = detail.data;
  const [open, setOpen] = useState(false);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [attKind, setAttKind] = useState<PayAppAttachment["kind"]>("support");

  const moveAtt = (id: string, dir: -1 | 1) => {
    const ids = attachments.map((a) => a.id);
    const i = ids.indexOf(id), j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorderAtt.mutate(ids);
  };
  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) addAtt.mutate({ file: f, kind: attKind });
    if (fileRef.current) fileRef.current.value = "";
  };
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
      let finalBase64 = base64;
      let filename = `pay-app-${pa.pay_app_no}-DRAFT-${contract.contract_no || "g702"}.pdf`;

      // 2b) Merge selected supporting documents into one package PDF.
      const selected = attachments.filter((a) => !excluded.has(a.id));
      if (selected.length > 0) {
        toast.loading("Packaging documents…", { id: t });
        const { data: pkg, error: pkgErr } = await supabase.functions.invoke("package-pdf", {
          body: { payAppBase64: base64, items: selected.map((a) => ({ bucket: a.bucket, path: a.storage_path, contentType: a.content_type, label: a.label })) },
        });
        if (!pkgErr && pkg?.ok && pkg.base64) {
          finalBase64 = pkg.base64;
          filename = `pay-app-${pa.pay_app_no}-package-${contract.contract_no || "g702"}.pdf`;
          if (Array.isArray(pkg.skipped) && pkg.skipped.length) toast.message(`Some files couldn't be merged: ${pkg.skipped.join(", ")}`);
        } else {
          toast.message("Couldn't merge attachments — sending the pay app on its own.");
        }
      }
      const sizeApprox = Math.floor((finalBase64.length * 3) / 4);

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
        attachments: [{ filename, contentBase64: finalBase64, contentType: "application/pdf", size: sizeApprox }],
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

          {/* Supporting documents — merged into one package PDF, in this order */}
          <div className="rounded-md border p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium">
              <Paperclip className="h-3.5 w-3.5" /> Supporting documents
              <span className="font-normal text-muted-foreground">— checked items are merged into one PDF, in this order</span>
            </div>

            {attachments.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No attachments yet. Upload lien-release copies (conditional / unconditional) and any backup below.</p>
            ) : (
              <div className="divide-y">
                {attachments.map((a, i) => (
                  <div key={a.id} className="flex items-center gap-2 py-1.5 text-xs">
                    <input type="checkbox" className="h-3.5 w-3.5" checked={!excluded.has(a.id)} onChange={(e) => setExcluded((s) => { const n = new Set(s); e.target.checked ? n.delete(a.id) : n.add(a.id); return n; })} />
                    <span className="flex-1 truncate" title={a.label}>{a.label}</span>
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] capitalize text-muted-foreground">{a.kind.replace("lien_", "lien ").replace("_", " ")}</span>
                    <button onClick={() => moveAtt(a.id, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button onClick={() => moveAtt(a.id, 1)} disabled={i === attachments.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                    <button onClick={() => { if (confirm(`Remove "${a.label}"?`)) removeAtt.mutate(a); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Select value={attKind} onValueChange={(v) => setAttKind(v as PayAppAttachment["kind"])}>
                <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lien_conditional">Conditional lien</SelectItem>
                  <SelectItem value="lien_unconditional">Unconditional lien</SelectItem>
                  <SelectItem value="support">Supporting doc</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={onPickFile} />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={addAtt.isPending}>
                {addAtt.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />} Upload
              </Button>
            </div>
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
