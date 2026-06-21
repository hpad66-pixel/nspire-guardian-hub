import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function SendLienWaiverDialog({ open, onOpenChange, waiver, onSent }: {
  open: boolean; onOpenChange: (v: boolean) => void; waiver: any; onSent?: () => void;
}) {
  const [to, setTo] = useState<string>(waiver?.claimant_email ?? "");
  const [msg, setMsg] = useState("Please review, sign, print, and notarize this lien waiver, then upload the notarized copy back using the link below.");
  const [busy, setBusy] = useState(false);
  const link = `${window.location.origin}/sign/lien/${waiver?.sign_token}`;

  async function send() {
    if (!to.trim()) return toast.error("Enter the claimant's email.");
    setBusy(true);
    try {
      const bodyHtml =
        `<div style="font-family:Arial,sans-serif;color:#1A1714;max-width:560px;">` +
        `<h2 style="margin:0 0 8px;">${waiver.title}</h2>` +
        `<p style="white-space:pre-wrap;">${msg.replace(/</g, "&lt;")}</p>` +
        `<p style="margin:18px 0;"><a href="${link}" style="background:#1D6FE8;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;">Open &amp; sign the waiver</a></p>` +
        `<p style="font-size:12px;color:#666;">Or paste this link: ${link}</p></div>`;
      const { error } = await supabase.functions.invoke("send-email", {
        body: { recipients: [to.trim()], subject: `${waiver.title} — signature requested`, bodyHtml, bodyText: `${msg}\n\n${link}` },
      });
      if (error) throw error;
      await supabase.from("lien_releases" as any).update({ sent_at: new Date().toISOString(), claimant_email: to.trim() }).eq("id", waiver.id);
      toast.success("Waiver sent to the claimant.");
      onSent?.();
      onOpenChange(false);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Send className="h-4 w-4" /> Send waiver to claimant</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Claimant email</Label><Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="sub@example.com" /></div>
          <div><Label className="text-xs">Message</Label><Textarea rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">They’ll get a secure link (no login) to fill, sign, download, notarize, and upload it back.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={send} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}Send</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
