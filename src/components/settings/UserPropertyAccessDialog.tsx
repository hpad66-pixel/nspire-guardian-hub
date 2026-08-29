import { useEffect, useMemo, useState } from 'react';
import { Building2, Loader2, Plus, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useProperties } from '@/hooks/useProperties';
import {
  type PermissionAction,
  type PropertyRole,
  usePropertyAccessMatrix,
  useRemovePropertyUserAccess,
  useSetPropertyPermissionOverride,
  useSetPropertyUserAccess,
  useUserPropertyAssignments,
} from '@/hooks/usePropertyAccessAdministration';

const ACTIONS: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'approve', 'assign'];
const ACTION_LABELS: Record<PermissionAction, string> = {
  view: 'View', create: 'Create', edit: 'Edit', delete: 'Delete', approve: 'Approve', assign: 'Assign',
};
const PROPERTY_ROLES: Array<{ value: PropertyRole; label: string }> = [
  { value: 'owner', label: 'Property Owner' },
  { value: 'manager', label: 'Property Manager' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'superintendent', label: 'Superintendent' },
  { value: 'inspector', label: 'Inspector' },
  { value: 'administrator', label: 'Administrator' },
  { value: 'clerk', label: 'Clerk' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'user', label: 'Standard User' },
];

interface UserPropertyAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  userName: string;
}

export function UserPropertyAccessDialog({
  open, onOpenChange, userId, userName,
}: UserPropertyAccessDialogProps) {
  const { data: properties = [] } = useProperties();
  const { data: assignments = [], isLoading: assignmentsLoading } = useUserPropertyAssignments(userId);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [newPropertyId, setNewPropertyId] = useState('');
  const [newRole, setNewRole] = useState<PropertyRole>('manager');
  const setAccess = useSetPropertyUserAccess(userId);
  const removeAccess = useRemovePropertyUserAccess(userId);
  const { data: matrix = [], isLoading: matrixLoading } = usePropertyAccessMatrix(userId, selectedPropertyId);
  const setOverride = useSetPropertyPermissionOverride(userId, selectedPropertyId);

  useEffect(() => {
    if (!open) return;
    if (assignments.length && !assignments.some(a => a.property_id === selectedPropertyId)) {
      setSelectedPropertyId(assignments[0].property_id);
    }
    if (!assignments.length) setSelectedPropertyId(null);
  }, [open, assignments, selectedPropertyId]);

  const selectedAssignment = assignments.find(a => a.property_id === selectedPropertyId) ?? null;
  const availableProperties = properties.filter(p => !assignments.some(a => a.property_id === p.id));
  const modules = useMemo(() => {
    const byModule = new Map<string, {
      module: string; label: string; description: string;
      actions: Partial<Record<PermissionAction, (typeof matrix)[number]>>;
    }>();
    for (const row of matrix) {
      const existing = byModule.get(row.module) ?? {
        module: row.module,
        label: row.module_label,
        description: row.description,
        actions: {},
      };
      existing.actions[row.action] = row;
      byModule.set(row.module, existing);
    }
    return [...byModule.values()];
  }, [matrix]);

  const saveAccess = async (propertyId: string, role: PropertyRole) => {
    try {
      await setAccess.mutateAsync({ propertyId, role });
      setSelectedPropertyId(propertyId);
      setNewPropertyId('');
      toast.success('Property access saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save property access');
    }
  };

  const removeSelectedAccess = async () => {
    if (!selectedAssignment) return;
    if (!window.confirm(`Remove ${userName} from ${selectedAssignment.property_name}?`)) return;
    try {
      await removeAccess.mutateAsync(selectedAssignment.property_id);
      setSelectedPropertyId(null);
      toast.success('Property access removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove property access');
    }
  };

  const changePermission = async (module: string, action: PermissionAction, allowed: boolean | null) => {
    try {
      await setOverride.mutateAsync({ module, action, allowed });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update permission');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] lg:max-w-7xl max-h-[94vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Property Access & Permissions
          </DialogTitle>
          <DialogDescription>
            {userName} sees only assigned properties. Role defaults can be overridden permission by permission.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4 overflow-y-auto rounded-lg border p-3">
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Assigned properties</Label>
              <div className="mt-2 space-y-2">
                {assignmentsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : assignments.length === 0 ? (
                  <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">No property access yet.</p>
                ) : assignments.map(assignment => (
                  <button
                    type="button"
                    key={assignment.assignment_id}
                    onClick={() => setSelectedPropertyId(assignment.property_id)}
                    className={`w-full rounded-md border p-3 text-left transition-colors ${
                      selectedPropertyId === assignment.property_id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                  >
                    <span className="block text-sm font-medium">{assignment.property_name}</span>
                    <span className="mt-1 block text-xs capitalize text-muted-foreground">{assignment.role.replace('_', ' ')}</span>
                  </button>
                ))}
              </div>
            </div>

            {availableProperties.length > 0 && (
              <div className="space-y-2 border-t pt-3">
                <Label>Add another property</Label>
                <Select value={newPropertyId} onValueChange={setNewPropertyId}>
                  <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent>
                    {availableProperties.map(property => (
                      <SelectItem key={property.id} value={property.id}>{property.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={newRole} onValueChange={value => setNewRole(value as PropertyRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROPERTY_ROLES.map(role => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button className="w-full" size="sm" disabled={!newPropertyId || setAccess.isPending} onClick={() => saveAccess(newPropertyId, newRole)}>
                  <Plus className="mr-2 h-4 w-4" /> Add Property
                </Button>
              </div>
            )}
          </aside>

          <section className="min-h-0 overflow-y-auto rounded-lg border">
            {!selectedAssignment ? (
              <div className="flex h-full min-h-80 flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <Building2 className="mb-3 h-10 w-10" />
                <p className="font-medium text-foreground">Assign a property to begin</p>
                <p className="mt-1 max-w-md text-sm">A user receives no property or project data until an assignment exists.</p>
              </div>
            ) : (
              <>
                <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-background p-4">
                  <div>
                    <h3 className="font-semibold">{selectedAssignment.property_name}</h3>
                    <p className="text-xs text-muted-foreground">Changes apply only to this property and its projects.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedAssignment.role}
                      onValueChange={value => saveAccess(selectedAssignment.property_id, value as PropertyRole)}
                    >
                      <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PROPERTY_ROLES.map(role => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={removeSelectedAccess}>
                      <Trash2 className="mr-2 h-4 w-4" /> Remove
                    </Button>
                  </div>
                </div>

                {matrixLoading ? (
                  <div className="flex items-center justify-center p-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                  <Table>
                    <TableHeader className="sticky top-[77px] z-[5] bg-background">
                      <TableRow>
                        <TableHead className="min-w-64">Capability</TableHead>
                        {ACTIONS.map(action => <TableHead key={action} className="w-24 text-center">{ACTION_LABELS[action]}</TableHead>)}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {modules.map(module => (
                        <TableRow key={module.module}>
                          <TableCell>
                            <div className="font-medium">{module.label}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground">{module.description}</div>
                          </TableCell>
                          {ACTIONS.map(action => {
                            const permission = module.actions[action];
                            if (!permission) return <TableCell key={action} />;
                            return (
                              <TableCell key={action} className="text-center">
                                <div className="inline-flex items-center gap-1">
                                  <Checkbox
                                    aria-label={`${module.label}: ${ACTION_LABELS[action]}`}
                                    checked={permission.allowed}
                                    disabled={setOverride.isPending}
                                    onCheckedChange={value => changePermission(module.module, action, value === true)}
                                  />
                                  {permission.source === 'user_override' && (
                                    <Button
                                      variant="ghost" size="icon" className="h-6 w-6"
                                      title="Restore role default"
                                      onClick={() => changePermission(module.module, action, null)}
                                    >
                                      <RotateCcw className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                <div className="border-t p-3 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="mr-2">Role default</Badge>
                  A reset icon means that permission has a user-specific override; use it to restore the role default.
                </div>
              </>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

