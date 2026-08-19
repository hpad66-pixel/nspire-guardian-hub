/**
 * InviteClientDialog — GC invites the owner/client to the owner portal. Creates a
 * portal_invitations row (portal_kind='owner') and shows the acceptance link the
 * GC can send. Accepting it (at /portal-invite/:token) grants the client an
 * owner-kind membership so they can sign in to /owner-portal.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { usePortalInvitations } from "@/hooks/usePortals";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Check, UserPlus } from "lucide-react";
import { toast } from "sonner";

export function InviteClientDialog({ open, onOpenChange, projectId }: { open: boolean; onOpenChange: (o: boolean) => void; projectId: string }) {
  const { create } = usePortalInvitations();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [delivered, setDelivered] = useState(false);

  const inviteUrl = token ? `${window.location.origin}/portal-invite/${token}` : "";

  async function handleInvite() {
    if (!email.trim() || !email.includes("@")) { toast.error("Enter a valid email."); return; }
    try {
      const row = await create.mutateAsync({
        email: email.trim().toLowerCase(),
        portalKind: "owner",
        role: "owner_portal",
        projectId,
      });
      setToken(row.token);
      const url = `${window.location.origin}/portal-invite/${row.token}`;
      const { error: emailError } = await supabase.functions.invoke("send-email", {
        body: {
          recipients: [email.trim().toLowerCase()],
          subject: "Your secure project portal is ready",
          fromName: "APAS Project Controls",
          bodyText: `Your private APAS Project Controls portal is ready. Open it here: ${url}`,
          bodyHtml: `
            <div style="margin:0;background:#f6f3eb;padding:36px 18px;font-family:Arial,sans-serif;color:#08271f">
              <div style="max-width:580px;margin:auto;overflow:hidden;border:1px solid #dedbd1;border-radius:18px;background:#fffdf8">
                <div style="padding:28px 32px;background:#08271f;color:#fff">
                  <div style="font-size:12px;font-weight:800;letter-spacing:.16em;color:#d5aa52">APAS PROJECT CONTROLS</div>
                  <h1 style="margin:18px 0 8px;font-family:Georgia,serif;font-size:32px;font-weight:400">Your project portal is ready.</h1>
                  <p style="margin:0;color:#b8c5c0;font-size:14px;line-height:1.6">One secure place for decisions, updates, financial status, schedule, and approved documents.</p>
                </div>
                <div style="padding:32px">
                  <p style="margin:0 0 22px;font-size:14px;line-height:1.7">Use the private button below. Your first click creates your approved access and takes you directly into the client portal—no registration form.</p>
                  <a href="${url}" style="display:inline-block;padding:14px 20px;border-radius:10px;background:#d5aa52;color:#08271f;font-size:13px;font-weight:800;text-decoration:none">Open my secure portal</a>
                  <p style="margin:24px 0 0;color:#71817a;font-size:11px;line-height:1.5">This invitation is assigned to ${email.trim().toLowerCase()} and expires automatically. Do not forward it.</p>
                </div>
              </div>
            </div>`,
        },
      });
      setDelivered(!emailError);
      if (emailError) {
        toast.warning("The invitation was created, but email delivery failed. Copy the private link below.");
      } else {
        toast.success("Secure invitation emailed to your client.");
      }
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() { onOpenChange(false); setEmail(""); setToken(null); setCopied(false); setDelivered(false); }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-[var(--apas-sapphire)]" /> Invite your client</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Send one private link. The first click provisions access and opens the client portal—there is no separate registration form.
          </p>
          <div>
            <Label>Client's email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@company.com" type="email" disabled={!!token} />
          </div>
          {token && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
              {delivered && <div className="text-xs font-medium text-[var(--apas-emerald)]">✓ Delivered to {email}</div>}
              <div className="text-xs text-muted-foreground">Invitation link (send to your client — expires in 14 days)</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-xs bg-background px-2 py-1 rounded break-all">{inviteUrl}</code>
                <Button size="sm" variant="outline" onClick={handleCopy}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Close</Button>
          {!token && <Button onClick={handleInvite} disabled={create.isPending}>{create.isPending ? "Creating & sending…" : "Send secure invitation"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
