/**
 * F1 · InviteSubDialog — main-app side. GC invites a sub's representative.
 * Creates a portal_invitations row (portal_kind='sub') + returns the acceptance
 * token URL the GC can email (or we can post to the accept-portal-invitation
 * edge function if the Resend secret is set).
 */
import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { usePortalInvitations } from "@/hooks/usePortals";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useOrganizations } from "@/hooks/useDirectory";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";

export function InviteSubDialog({
  open, onOpenChange, organizationId, projectId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  organizationId?: string;
  projectId?: string;
}) {
  const { create } = usePortalInvitations();
  const { data: organizations = [] } = useOrganizations();
  const [email, setEmail] = useState("");
  const [orgId, setOrgId] = useState(organizationId ?? "");
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && organizationId) setOrgId(organizationId);
  }, [open, organizationId]);

  const chooseOrganization = (id: string) => {
    setOrgId(id);
    const organization = organizations.find((item) => item.id === id);
    if (organization?.email) setEmail(organization.email);
  };

  async function handleInvite() {
    if (!email.trim() || !email.includes("@")) {
      toast.error("Valid email required"); return;
    }
    if (!orgId.trim()) { toast.error("Organization id required"); return; }
    try {
      if (projectId) {
        const tenantId = await requireTenantId();
        const { data: auth } = await supabase.auth.getUser();
        const { error: assignmentError } = await supabase.from("consulting_vendor_assignments" as never).upsert({
          tenant_id: tenantId,
          project_id: projectId,
          organization_id: orgId,
          is_active: true,
          created_by: auth.user?.id ?? null,
        } as never, { onConflict: "project_id,organization_id" });
        if (assignmentError) throw assignmentError;
      }
      const row = await create.mutateAsync({
        email: email.trim().toLowerCase(),
        organizationId: orgId,
        projectId,
        portalKind: "sub",
        role: "subcontractor_portal",
      });
      setToken(row.token);
      toast.success("Invitation created — copy the link below and send to the sub");
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Invitation could not be created"); }
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
            <Label>Vendor company</Label>
            <Select value={orgId} onValueChange={chooseOrganization} disabled={!!organizationId}>
              <SelectTrigger><SelectValue placeholder="Choose a company" /></SelectTrigger>
              <SelectContent>
                {organizations.filter((item) => ['sub', 'vendor', 'consultant', 'other'].includes(item.kind)).map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">The invitation is scoped to this company and project. No database IDs need to be copied.</p>
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
