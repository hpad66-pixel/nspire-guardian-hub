/**
 * Send a signed change order to the client. Emails the signed PDF plus a
 * token-gated counter-sign link; the client accepts in-browser (no login) and
 * the acceptance returns to the contractor's in-app inbox.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n ?? 0);

export function SendChangeOrderDialog({
  open, onOpenChange, co, onSent,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  co: any;
  onSent?: () => void;
}) {
  const spec = co?.spec ?? {};
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTo(spec?.parties?.to?.email || "");
      setMessage(`Please find attached ${spec?.doc?.co_label || "the change order"} for ${spec?.parties?.project || "the project"}. You can review and sign it electronically at the link below. Once executed, you'll automatically receive a fully-signed copy by email. If anything needs to change, you can reject it with comments and they'll come straight back to us.`);
    }
  }, [open, co]);

  const signLink = `${window.location.origin}/sign/co/${co?.sign_token}`;

  async function send() {
    if (!to.trim()) return toast.error("Enter the client's email.");
    setBusy(true);
    try {
      const label = spec?.doc?.co_label || `${co.co_type}-${co.co_no}`;
      const bodyHtml = `
        <div style="font-family:Georgia,serif;color:#1A1714">
          <p>${message.replace(/\n/g, "<br>")}</p>
          <p style="margin:18px 0">
            <a href="${signLink}" style="background:#1D6FE8;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Review &amp; sign ${label}</a>
          </p>
          ${co.pdf_path ? `<p><a href="${co.pdf_path}">View the signed PDF</a></p>` : ""}
          <p style="color:#6B6B6B;font-size:13px">${label} · ${spec?.doc?.title || co.title} · ${money(Number(co.amount))}</p>
        </div>`;
      // From name = the signer, else the consulting company — never "User".
      const fromName = spec?.signatures?.submitted?.name || spec?.parties?.from?.name || undefined;
      const { error } = await supabase.functions.invoke("send-email", {
        body: { recipients: [to.trim()], subject: `${label} — ${spec?.doc?.title || co.title} (signature requested)`, bodyHtml, bodyText: `${message}\n\nReview & sign: ${signLink}`, fromName },
      });
      if (error) throw error;
      await supabase.from("change_orders" as any).update({ sent_to_client_at: new Date().toISOString() }).eq("id", co.id);
      toast.success(`Sent to ${to.trim()}`);
      onSent?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(`Send failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Send className="h-4 w-4" /> Send to client</DialogTitle>
          <DialogDescription>Email the signed change order with a link the client can counter-sign.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Client email</Label><Input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="client@example.com" /></div>
          <div><Label>Message</Label><Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} /></div>
          <p className="text-xs text-muted-foreground break-all">Counter-sign link: {signLink}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={busy}>{busy ? "Sending…" : "Send"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
