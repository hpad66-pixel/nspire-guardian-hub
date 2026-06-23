/**
 * InviteClientDialog — GC invites the owner/client to the owner portal. Creates a
 * portal_invitations row (portal_kind='owner') and shows the acceptance link the
 * GC can send. Accepting it (at /portal/invite/:token) grants the client an
 * owner-kind membership so they can sign in to /owner-portal.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { usePortalInvitations } from "@/hooks/usePortals";
import { Copy, Check, UserPlus } from "lucide-react";
import { toast } from "sonner";

export function InviteClientDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { create } = usePortalInvitations();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const inviteUrl = token ? `${window.location.origin}/portal-invite/${token}` : "";

  async function handleInvite() {
    if (!email.trim() || !email.includes("@")) { toast.error("Enter a valid email."); return; }
    try {
      const row = await create.mutateAsync({ email: email.trim().toLowerCase(), portalKind: "owner", role: "owner_portal" });
      setToken(row.token);
      toast.success("Invitation created — copy the link and send it to your client.");
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() { onOpenChange(false); setEmail(""); setToken(null); setCopied(false); }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-[var(--apas-sapphire)]" /> Invite your client</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Send your client a secure link to access their portal — financial health, reports, documents, and your project updates.
          </p>
          <div>
            <Label>Client's email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@company.com" type="email" disabled={!!token} />
          </div>
          {token && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
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
          {!token && <Button onClick={handleInvite} disabled={create.isPending}>{create.isPending ? "Creating…" : "Create invitation"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
