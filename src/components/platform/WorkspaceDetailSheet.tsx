import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { useUpdateWorkspace, useTogglePlatformModule, type PlatformWorkspace } from '@/hooks/usePlatformAdmin';
import { Save, AlertTriangle } from 'lucide-react';

interface Props {
  workspace: PlatformWorkspace | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MODULE_GATES = [
  { label: 'Credential Wallet', platformField: 'platform_credential_wallet', workspaceField: 'credential_wallet_enabled' },
  { label: 'Training Hub', platformField: 'platform_training_hub', workspaceField: 'training_hub_enabled' },
  { label: 'Safety Module', platformField: 'platform_safety_module', workspaceField: 'safety_module_enabled' },
  { label: 'Equipment Tracker', platformField: 'platform_equipment_tracker', workspaceField: 'equipment_tracker_enabled' },
  { label: 'Client Portal', platformField: 'platform_client_portal', workspaceField: 'client_portal_enabled' },
  { label: 'Email Inbox', platformField: 'platform_email_inbox', workspaceField: 'email_inbox_enabled' },
  { label: 'QR Scanning', platformField: 'platform_qr_scanning', workspaceField: 'qr_scanning_enabled' },
  { label: 'Occupancy', platformField: 'platform_occupancy', workspaceField: 'occupancy_enabled' },
] as const;

export function WorkspaceDetailSheet({ workspace, open, onOpenChange }: Props) {
  const updateWorkspace = useUpdateWorkspace();
  const toggleModule = useTogglePlatformModule();

  const [form, setForm] = useState({
    client_company: '',
    client_contact_name: '',
    billing_contact_email: '',
    monthly_fee: 0,
    seat_limit: 10,
    plan: 'trial',
    status: 'active',
    billing_cycle: 'monthly',
    next_billing_date: '',
    notes: '',
  });

  useEffect(() => {
    if (workspace) {
      setForm({
        client_company: workspace.client_company || '',
        client_contact_name: workspace.client_contact_name || '',
        billing_contact_email: workspace.billing_contact_email || '',
        monthly_fee: workspace.monthly_fee || 0,
        seat_limit: workspace.seat_limit || 10,
        plan: workspace.plan || 'trial',
        status: workspace.status || 'active',
        billing_cycle: workspace.billing_cycle || 'monthly',
        next_billing_date: workspace.next_billing_date || '',
        notes: workspace.notes || '',
      });
    }
  }, [workspace]);

  if (!workspace) return null;

  const handleSave = () => {
    updateWorkspace.mutate({ id: workspace.id, ...form } as any);
  };

  const handleSuspend = () => {
    updateWorkspace.mutate({ id: workspace.id, status: 'suspended' } as any);
  };

  const handleReactivate = () => {
    updateWorkspace.mutate({ id: workspace.id, status: 'active' } as any);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-[600px] sm:max-w-[600px] overflow-y-auto border-l"
        style={{ background: '#0F1923', borderColor: '#1E3A5F', color: '#fff' }}
      >
        <SheetHeader>
          <SheetTitle className="text-white">{workspace.client_company || workspace.name}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-8">
          {/* SECTION 1 — Subscription Details */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#C9A84C]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              Subscription Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[#94A3B8] text-xs">Client Company</Label>
                <Input value={form.client_company} onChange={e => setForm(f => ({ ...f, client_company: e.target.value }))} className="bg-[#090D17] border-[#1E3A5F] text-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[#94A3B8] text-xs">Client Contact</Label>
                <Input value={form.client_contact_name} onChange={e => setForm(f => ({ ...f, client_contact_name: e.target.value }))} className="bg-[#090D17] border-[#1E3A5F] text-white" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-[#94A3B8] text-xs">Billing Email</Label>
                <Input type="email" value={form.billing_contact_email} onChange={e => setForm(f => ({ ...f, billing_contact_email: e.target.value }))} className="bg-[#090D17] border-[#1E3A5F] text-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[#94A3B8] text-xs">Monthly Fee ($)</Label>
                <Input type="number" value={form.monthly_fee} onChange={e => setForm(f => ({ ...f, monthly_fee: Number(e.target.value) }))} className="bg-[#090D17] border-[#1E3A5F] text-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[#94A3B8] text-xs">Seat Limit</Label>
                <Input type="number" value={form.seat_limit} onChange={e => setForm(f => ({ ...f, seat_limit: Number(e.target.value) }))} className="bg-[#090D17] border-[#1E3A5F] text-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[#94A3B8] text-xs">Plan</Label>
                <Select value={form.plan} onValueChange={v => setForm(f => ({ ...f, plan: v }))}>
                  <SelectTrigger className="bg-[#090D17] border-[#1E3A5F] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[#94A3B8] text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="bg-[#090D17] border-[#1E3A5F] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="churned">Churned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[#94A3B8] text-xs">Billing Cycle</Label>
                <Select value={form.billing_cycle} onValueChange={v => setForm(f => ({ ...f, billing_cycle: v }))}>
                  <SelectTrigger className="bg-[#090D17] border-[#1E3A5F] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[#94A3B8] text-xs">Next Billing Date</Label>
                <Input type="date" value={form.next_billing_date} onChange={e => setForm(f => ({ ...f, next_billing_date: e.target.value }))} className="bg-[#090D17] border-[#1E3A5F] text-white" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#94A3B8] text-xs">Notes</Label>
              <Textarea rows={4} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-[#090D17] border-[#1E3A5F] text-white resize-none" />
            </div>
            <Button onClick={handleSave} disabled={updateWorkspace.isPending} className="bg-[#1E5FB3] hover:bg-[#1E5FB3]/80 text-white">
              <Save className="h-4 w-4 mr-2" /> Save Changes
            </Button>
          </section>

          <Separator className="bg-[#1E3A5F]" />

          {/* SECTION 2 — Module Gates */}
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#C9A84C]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                Platform Module Gates
              </h3>
              <p className="text-xs text-[#94A3B8] mt-1">Platform gates control what workspace admins can enable</p>
            </div>
            <div className="space-y-3">
              {MODULE_GATES.map(mod => {
                const platformEnabled = workspace.modules?.[mod.platformField] ?? true;
                const workspaceEnabled = workspace.modules?.[mod.workspaceField] ?? false;
                return (
                  <div key={mod.platformField} className="flex items-center justify-between rounded-lg border border-[#1E3A5F] bg-[#090D17] px-4 py-3">
                    <span className="text-sm text-white">{mod.label}</span>
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={platformEnabled}
                        onCheckedChange={(checked) => toggleModule.mutate({
                          workspaceId: workspace.id,
                          field: mod.platformField,
                          value: checked,
                        })}
                      />
                      <span className={`text-xs font-medium ${workspaceEnabled ? 'text-[#22C55E]' : 'text-[#94A3B8]'}`}>
                        {workspaceEnabled ? 'Admin ON' : 'Admin OFF'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <Separator className="bg-[#1E3A5F]" />

          {/* SECTION 3 — Danger Zone */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#EF4444]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              Danger Zone
            </h3>
            <div className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/5 p-4 space-y-3">
              {workspace.status !== 'suspended' ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <AlertTriangle className="h-4 w-4 mr-2" /> Suspend Workspace
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Suspend this workspace?</AlertDialogTitle>
                      <AlertDialogDescription>
                        All users in this workspace will lose access until reactivated. This action is reversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSuspend} className="bg-destructive text-destructive-foreground">
                        Suspend
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button onClick={handleReactivate} className="w-full bg-[#22C55E] hover:bg-[#22C55E]/80 text-white">
                  Reactivate Workspace
                </Button>
              )}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
