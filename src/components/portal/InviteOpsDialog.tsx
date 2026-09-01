/**
 * Invite external Glorieta staff (maintenance / PM / owner) to Property Ops.
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInviteOpsPortalUser } from '@/hooks/useOpsPortal';
import { OPS_ROLE_LABELS, type OpsPortalRole } from '@/lib/portal/opsPortal';
import { supabase } from '@/integrations/supabase/client';
import { Check, Copy, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export function InviteOpsDialog({
  open,
  onOpenChange,
  propertyId,
  propertyName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  propertyId: string;
  propertyName?: string;
}) {
  const invite = useInviteOpsPortalUser();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OpsPortalRole>('ops_tech');
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [delivered, setDelivered] = useState(false);

  const inviteUrl = token ? `${window.location.origin}/portal-invite/${token}` : '';

  async function handleInvite() {
    if (!email.trim() || !email.includes('@')) {
      toast.error('Enter a valid email.');
      return;
    }
    try {
      const row = await invite.mutateAsync({
        email: email.trim().toLowerCase(),
        propertyId,
        role,
      });
      setToken(row.token);
      const url = `${window.location.origin}/portal-invite/${row.token}`;
      const roleLabel = OPS_ROLE_LABELS[role];
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          recipients: [email.trim().toLowerCase()],
          subject: `Your ${propertyName || 'Glorieta Gardens'} Property Ops portal is ready`,
          fromName: 'APAS Project Controls',
          bodyText: `Your Property Ops portal access (${roleLabel}) is ready: ${url}`,
          bodyHtml: `
            <div style="margin:0;background:#f6f3eb;padding:36px 18px;font-family:Arial,sans-serif;color:#08271f">
              <div style="max-width:580px;margin:auto;overflow:hidden;border:1px solid #dedbd1;border-radius:18px;background:#fffdf8">
                <div style="padding:28px 32px;background:#08271f;color:#fff">
                  <div style="font-size:12px;font-weight:800;letter-spacing:.16em;color:#d5aa52">PROPERTY OPS · GLORIETA GARDENS</div>
                  <h1 style="margin:18px 0 8px;font-family:Georgia,serif;font-size:30px;font-weight:400">Your ops portal is ready.</h1>
                  <p style="margin:0;color:#b8c5c0;font-size:14px;line-height:1.6">Role: ${roleLabel}. Maintenance, NSPIRE, Stores, and Voice — without construction project controls.</p>
                </div>
                <div style="padding:32px">
                  <p style="margin:0 0 22px;font-size:14px;line-height:1.7">Use the private button below. Your first click creates your approved access and opens Property Ops — no registration form.</p>
                  <a href="${url}" style="display:inline-block;padding:14px 20px;border-radius:10px;background:#d5aa52;color:#08271f;font-size:13px;font-weight:800;text-decoration:none">Open Property Ops</a>
                  <p style="margin:24px 0 0;color:#71817a;font-size:11px;line-height:1.5">Assigned to ${email.trim().toLowerCase()}. Expires automatically. Do not forward.</p>
                </div>
              </div>
            </div>`,
        },
      });
      setDelivered(!emailError);
      if (emailError) toast.warning('Invitation created, but email delivery failed. Copy the link below.');
      else toast.success('Secure Property Ops invitation emailed.');
    } catch (e: any) {
      toast.error(e.message || 'Could not create invitation');
    }
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() {
    onOpenChange(false);
    setEmail('');
    setRole('ops_tech');
    setToken(null);
    setCopied(false);
    setDelivered(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-[var(--apas-sapphire)]" />
            Invite to Property Ops
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            License external access for {propertyName || 'this property'}. They only see Property Ops modules for their role — never construction or consulting.
          </p>
          <div>
            <Label>Email</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tech@glorietagardens.com"
              type="email"
              disabled={!!token}
            />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as OpsPortalRole)} disabled={!!token}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ops_tech">Maintenance Tech — work orders only</SelectItem>
                <SelectItem value="ops_pm">Property Manager — NSPIRE, Stores, Voice, costs</SelectItem>
                <SelectItem value="ops_owner">Owner — all PM modules + Executive Dashboard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {token && (
            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
              {delivered && <div className="text-xs font-medium text-[var(--apas-emerald)]">✓ Delivered to {email}</div>}
              <div className="text-xs text-muted-foreground">Magic link (expires in 14 days)</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded bg-background px-2 py-1 font-mono text-xs">{inviteUrl}</code>
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
            <Button onClick={handleInvite} disabled={invite.isPending}>
              {invite.isPending ? 'Creating & sending…' : 'Send secure invitation'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
