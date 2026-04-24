/**
 * F1 · InviteSubDialog — main-app side. GC invites a sub's representative.
 * Creates a portal_invitations row (portal_kind='sub') + returns the acceptance
 * token URL the GC can email (or we can post to the accept-portal-invitation
 * edge function if the Resend secret is set).
 */
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { usePortalInvitations } from "@/hooks/usePortals";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

export function InviteSubDialog({
  open, onOpenChange, organizationId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  organizationId?: string;
}) {
  const { create } = usePortalInvitations();
  const [email, setEmail] = useState("");
  const [orgId, setOrgId] = useState(organizationId ?? "");
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleInvite() {
    if (!email.trim() || !email.includes("@")) {
      toast.error("Valid email required"); return;
    }
    if (!orgId.trim()) { toast.error("Organization id required"); return; }
    try {
      const row = await create.mutateAsync({
        email: email.trim().toLowerCase(),
        organizationId: orgId,
        portalKind: "sub",
        role: "subcontractor_portal",
      });
      setToken(row.token);
      toast.success("Invitation created — copy the link below and send to the sub");
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleCopy() {
    if (!token) return;
    const url = `${window.location.origin}/portal/invite/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() {
    onOpenChange(false);
    setEmail(""); setToken(null); setCopied(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a subcontractor</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div>
            <Label>Sub's email</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@sub-company.com"
              type="email"
            />
          </div>
          <div>
            <Label>Organization id</Label>
            <Input
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              placeholder="uuid — the sub's row in public.organizations"
              disabled={!!organizationId}
            />
          </div>

          {token && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
              <div className="text-xs text-muted-foreground">
                Invitation link (send to the sub — expires in 14 days)
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-xs bg-background px-2 py-1 rounded break-all">
                  {`${window.location.origin}/portal/invite/${token}`}
                </code>
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Close</Button>
          {!token && (
            <Button onClick={handleInvite} disabled={create.isPending}>
              {create.isPending ? "Sending…" : "Create invitation"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
