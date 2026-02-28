import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronRight } from 'lucide-react';
import { RolePreviewPanel } from '@/components/roles/RolePreviewPanel';
import { useCreateRoleDefinition, useSetRolePermission, MODULES, ACTIONS } from '@/hooks/useRoleDefinitions';
import { toast } from 'sonner';

const MODULE_LABELS: Record<string, string> = {
  properties: 'Properties', people: 'People', work_orders: 'Work Orders',
  inspections: 'Inspections', projects: 'Projects', issues: 'Issues',
  documents: 'Documents', reports: 'Reports', settings: 'Settings',
  compliance_calendar: 'Compliance Calendar', risk_register: 'Risk Register',
  corrective_actions: 'Corrective Actions', corrective_loop: 'Corrective Queue',
  escalation_rules: 'Escalation Rules', executive_dashboard: 'Executive Dashboard',
};

const ACTION_LABELS: Record<string, string> = {
  view: 'View', create: 'Create', update: 'Edit', delete: 'Delete', approve: 'Approve', assign: 'Assign',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomRoleBuilder({ open, onOpenChange }: Props) {
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [roleKey, setRoleKey] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<Record<string, Set<string>>>({});
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false);

  const createRole = useCreateRoleDefinition();
  const setRolePermission = useSetRolePermission();

  const handleDisplayNameChange = (val: string) => {
    setDisplayName(val);
    if (!keyManuallyEdited) {
      setRoleKey(val.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
    }
  };

  const togglePermission = (module: string, action: string) => {
    setPermissions(prev => {
      const next = { ...prev };
      if (!next[module]) next[module] = new Set();
      else next[module] = new Set(next[module]);
      if (next[module].has(action)) next[module].delete(action);
      else next[module].add(action);
      return next;
    });
  };

  const isChecked = (module: string, action: string) =>
    permissions[module]?.has(action) ?? false;

  const totalPermissions = Object.values(permissions).reduce((s, set) => s + set.size, 0);
  const activeModules = Object.keys(permissions).filter(m => (permissions[m]?.size ?? 0) > 0).length;

  const keyValid = /^[a-z][a-z0-9_]*$/.test(roleKey) && roleKey.length >= 2;

  const handleCreate = async () => {
    try {
      await createRole.mutateAsync({
        role_key: roleKey,
        display_name: displayName,
        description: description || undefined,
      });

      // Set all checked permissions
      const promises: Promise<void>[] = [];
      for (const [module, actions] of Object.entries(permissions)) {
        for (const action of actions) {
          promises.push(
            setRolePermission.mutateAsync({ role_key: roleKey, module, action, allowed: true })
          );
        }
      }
      await Promise.all(promises);

      toast.success('Role created');
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create role');
    }
  };

  const resetForm = () => {
    setStep(1);
    setDisplayName('');
    setRoleKey('');
    setDescription('');
    setPermissions({});
    setKeyManuallyEdited(false);
  };

  const steps = [
    { num: 1, label: 'Identity' },
    { num: 2, label: 'Permissions' },
    { num: 3, label: 'Confirm' },
  ];

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) resetForm(); onOpenChange(v); }}>
      <SheetContent className="w-[700px] sm:max-w-[700px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Create Custom Role</SheetTitle>
        </SheetHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mt-4 mb-6">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                step === s.num ? 'bg-primary text-primary-foreground' :
                step > s.num ? 'bg-green-500/20 text-green-600' : 'bg-muted text-muted-foreground'
              }`}>
                {step > s.num ? <Check className="h-3 w-3" /> : <span>{s.num}</span>}
                <span>{s.label}</span>
              </div>
              {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step 1 — Identity */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Display Name *</Label>
              <Input
                placeholder="e.g. Site Inspector"
                value={displayName}
                onChange={e => handleDisplayNameChange(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role Key *</Label>
              <Input
                value={roleKey}
                onChange={e => { setKeyManuallyEdited(true); setRoleKey(e.target.value); }}
                className={!keyValid && roleKey.length > 0 ? 'border-destructive' : ''}
              />
              {roleKey.length > 0 && !keyValid && (
                <p className="text-xs text-destructive">Must start with a letter, only a-z, 0-9, underscore</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="What this role is for..." />
            </div>
            <Button
              onClick={() => setStep(2)}
              disabled={!displayName.trim() || !keyValid}
              className="w-full"
            >
              Continue
            </Button>
          </div>
        )}

        {/* Step 2 — Permissions */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-left py-2 px-3 font-medium">Module</th>
                    {ACTIONS.map(a => (
                      <th key={a} className="text-center py-2 px-2 font-medium text-xs">{ACTION_LABELS[a]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map(module => (
                    <tr key={module} className="border-b last:border-0">
                      <td className="py-2 px-3 font-medium text-sm">{MODULE_LABELS[module]}</td>
                      {ACTIONS.map(action => (
                        <td key={action} className="text-center py-2 px-2">
                          <Checkbox
                            checked={isChecked(module, action)}
                            onCheckedChange={() => togglePermission(module, action)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
              <Button onClick={() => setStep(3)} className="flex-1">Continue</Button>
            </div>
          </div>
        )}

        {/* Step 3 — Confirm */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="rounded-lg border border-border p-4 space-y-2">
              <h3 className="text-lg font-semibold">{displayName}</h3>
              <p className="text-sm text-muted-foreground">{description || 'No description'}</p>
              <Badge variant="secondary">Key: {roleKey}</Badge>
              <p className="text-sm text-muted-foreground mt-2">
                {totalPermissions} permissions across {activeModules} modules
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
              <Button
                onClick={handleCreate}
                disabled={createRole.isPending}
                className="flex-1"
              >
                Create Role
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
