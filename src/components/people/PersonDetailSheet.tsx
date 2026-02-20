import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { 
  X, Mail, Phone, Calendar, Building2, Plus, 
  Shield, History, Archive, RotateCcw, Edit2, Save, FolderLock,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserStatusHistory, formatStatusChange } from '@/hooks/useUserStatusHistory';
import { useRoleDefinitions } from '@/hooks/useRoleDefinitions';
import { useUpdateProfile, useArchiveTeamMember, useReactivateTeamMember, useUpdatePropertyAssignment } from '@/hooks/usePeople';
import { useAddUserRole, useRemoveUserRole } from '@/hooks/useUserManagement';
import { useUserPermissions, getAssignableRoles, canRoleManage } from '@/hooks/usePermissions';
import { PropertyAssignmentDialog } from './PropertyAssignmentDialog';
import { ArchivePersonDialog } from './ArchivePersonDialog';
import { HRVaultTab } from './HRVaultTab';
import type { PersonWithAssignments, PropertyTeamMember } from '@/hooks/usePeople';
import type { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { useModules } from '@/contexts/ModuleContext';
import { toast } from 'sonner';

type AppRole = Database['public']['Enums']['app_role'];

interface PersonDetailSheetProps {
  person: PersonWithAssignments | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getInitials = (name: string | null) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'admin': return 'destructive';
    case 'owner': return 'default';
    case 'manager': return 'default';
    case 'administrator': return 'secondary';
    case 'clerk': return 'secondary';
    default: return 'secondary';
  }
};

export function PersonDetailSheet({ person, open, onOpenChange }: PersonDetailSheetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<PersonWithAssignments>>({});
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [assignmentDefaultRole, setAssignmentDefaultRole] = useState<AppRole | null>(null);
  const [assignmentRoleLocked, setAssignmentRoleLocked] = useState(false);
  const [archiveAssignment, setArchiveAssignment] = useState<PropertyTeamMember | null>(null);

  const { data: statusHistory } = useUserStatusHistory(person?.user_id || null);
  const { data: roles } = useRoleDefinitions();
  const { canUpdate, canDelete, isAdmin, isOwner, isPropertyManager, currentRole } = useUserPermissions();
  const { modules: tenantModules } = useModules();
  const canManageRoles = isAdmin || isOwner || isPropertyManager;
  const canManageModules = isAdmin || isOwner;
  const assignableRoles = currentRole ? getAssignableRoles(currentRole) : [];

  const updateProfile = useUpdateProfile();
  const archiveTeamMember = useArchiveTeamMember();
  const reactivateTeamMember = useReactivateTeamMember();
  const updateAssignment = useUpdatePropertyAssignment();
  const addRole = useAddUserRole();
  const removeRole = useRemoveUserRole();
  const queryClient = useQueryClient();

  const propertyScopedRoles = new Set<AppRole>([
    'manager',
    'inspector',
    'administrator',
    'superintendent',
    'clerk',
    'project_manager',
    'subcontractor',
    'viewer',
    'user',
  ]);

  const moduleOptions = [
    {
      key: 'dailyGroundsEnabled',
      label: 'Daily Grounds Inspections',
      description: 'Exterior grounds and asset inspections',
    },
    {
      key: 'nspireEnabled',
      label: 'NSPIRE Compliance',
      description: 'HUD NSPIRE-compliant inspections',
    },
    {
      key: 'projectsEnabled',
      label: 'Projects',
      description: 'Capital improvements and project tracking',
    },
    {
      key: 'occupancyEnabled',
      label: 'Occupancy Tracking',
      description: 'Tenant and lease tracking',
    },
    {
      key: 'emailInboxEnabled',
      label: 'Email Inbox',
      description: 'Unified email inbox integration',
    },
    {
      key: 'qrScanningEnabled',
      label: 'QR Scanning',
      description: 'QR-based asset scanning',
    },
  ] as const;

  const { data: moduleAccess = [] } = useQuery({
    queryKey: ['user-module-access', person?.user_id],
    queryFn: async () => {
      if (!person?.user_id) return [];
      const { data, error } = await supabase
        .from('user_module_access')
        .select('module_key, enabled')
        .eq('user_id', person.user_id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!person?.user_id && canManageModules,
  });

  const moduleAccessMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    moduleAccess.forEach((row) => {
      map[row.module_key] = row.enabled;
    });
    return map;
  }, [moduleAccess]);

  const updateModuleAccess = useMutation({
    mutationFn: async ({ moduleKey, enabled }: { moduleKey: string; enabled: boolean }) => {
      if (!person?.user_id) return;
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('user_module_access')
        .upsert(
          { user_id: person.user_id, module_key: moduleKey, enabled, updated_by: user?.id || null },
          { onConflict: 'user_id,module_key' }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-module-access', person?.user_id] });
      toast.success('Module access updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update module access: ${error.message}`);
    },
  });

  if (!person) return null;

  const handleSaveProfile = async () => {
    await updateProfile.mutateAsync({
      userId: person.user_id,
      full_name: editedProfile.full_name ?? person.full_name ?? undefined,
      email: editedProfile.email ?? person.email ?? undefined,
      phone: editedProfile.phone ?? person.phone ?? undefined,
      job_title: editedProfile.job_title ?? person.job_title ?? undefined,
      department: editedProfile.department ?? person.department ?? undefined,
    });
    setIsEditing(false);
    setEditedProfile({});
  };

  const handleAddRole = async (role: AppRole) => {
    if (propertyScopedRoles.has(role)) {
      setAssignmentDefaultRole(role);
      setAssignmentRoleLocked(true);
      setShowAssignmentDialog(true);
      return;
    }
    await addRole.mutateAsync({ userId: person.user_id, role });
  };

  const handleRemoveRole = async (role: AppRole) => {
    await removeRole.mutateAsync({ userId: person.user_id, role });
  };

  const handleReactivate = async (assignment: PropertyTeamMember) => {
    await reactivateTeamMember.mutateAsync(assignment.id);
  };

  const activeAssignments = person.assignments.filter(a => a.status === 'active');
  const archivedAssignments = person.assignments.filter(a => a.status === 'archived');

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={person.avatar_url || undefined} />
                  <AvatarFallback className="text-lg">{getInitials(person.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                  {isEditing ? (
                    <Input
                      value={editedProfile.full_name ?? person.full_name ?? ''}
                      onChange={(e) => setEditedProfile({ ...editedProfile, full_name: e.target.value })}
                      className="text-xl font-bold mb-1"
                    />
                  ) : (
                    <SheetTitle className="text-xl">{person.full_name || 'Unknown'}</SheetTitle>
                  )}
                  <p className="text-sm text-muted-foreground">{person.job_title || 'No title'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={person.status === 'active' ? 'default' : 'secondary'}>
                  {person.status || 'Active'}
                </Badge>
                {(canUpdate('people') || isAdmin || isOwner || isPropertyManager) && (
                  <>
                    {isEditing ? (
                      <Button size="sm" onClick={handleSaveProfile} disabled={updateProfile.isPending}>
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                {isEditing ? (
                  <Input
                    value={editedProfile.email ?? person.email ?? ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, email: e.target.value })}
                    className="h-8"
                  />
                ) : (
                  person.email
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                {isEditing ? (
                  <Input
                    value={editedProfile.phone ?? person.phone ?? ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                    placeholder="Add phone number"
                    className="h-8"
                  />
                ) : (
                  person.phone || 'No phone'
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Hired: {person.hire_date 
                  ? format(new Date(person.hire_date), 'MMMM d, yyyy')
                  : format(new Date(person.created_at), 'MMMM d, yyyy')}
              </div>
            </div>
          </SheetHeader>

          <Separator className="my-6" />

          <Tabs defaultValue="assignments" className="space-y-4">
            <TabsList
              className={`grid w-full ${
                canManageRoles && canManageModules
                  ? 'grid-cols-5'
                  : canManageRoles || canManageModules
                  ? 'grid-cols-4'
                  : 'grid-cols-3'
              }`}
            >
              <TabsTrigger value="assignments" className="gap-1">
                <Building2 className="h-4 w-4" />
                Properties
              </TabsTrigger>
              {canManageRoles && (
                <TabsTrigger value="roles" className="gap-1">
                  <Shield className="h-4 w-4" />
                  Roles
                </TabsTrigger>
              )}
              {canManageModules && (
                <TabsTrigger value="modules" className="gap-1">
                  <Shield className="h-4 w-4" />
                  Modules
                </TabsTrigger>
              )}
              {(canManageRoles || isAdmin || isOwner) && (
                <TabsTrigger value="hr-vault" className="gap-1">
                  <FolderLock className="h-4 w-4" />
                  HR Vault
                </TabsTrigger>
              )}
              <TabsTrigger value="history" className="gap-1">
                <History className="h-4 w-4" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="assignments" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Property Assignments</h3>
                {(canUpdate('people') || isAdmin || isOwner || isPropertyManager) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAssignmentDefaultRole(null);
                      setAssignmentRoleLocked(false);
                      setShowAssignmentDialog(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Property
                  </Button>
                )}
              </div>

              {activeAssignments.length > 0 ? (
                <div className="space-y-3">
                  {activeAssignments.map(assignment => (
                    <Card key={assignment.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {assignment.property?.name || 'Unknown Property'}
                              </span>
                            </div>
                            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <span>Role:</span>
                                <Select
                                  value={assignment.role}
                                  onValueChange={(value) => updateAssignment.mutate({ 
                                    id: assignment.id, 
                                    role: value as AppRole 
                                  })}
                                  disabled={
                                    !canUpdate('people') ||
                                    !currentRole ||
                                    !canRoleManage(currentRole, assignment.role as AppRole)
                                  }
                                >
                                  <SelectTrigger className="h-7 w-auto">
                                    <Badge variant={getRoleBadgeVariant(assignment.role)}>
                                      {assignment.role}
                                    </Badge>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {roles
                                      ?.filter(role => assignableRoles.includes(role.role_key as AppRole))
                                      .map(role => (
                                        <SelectItem key={role.role_key} value={role.role_key}>
                                          {role.display_name}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {assignment.title && <div>Title: {assignment.title}</div>}
                              {assignment.department && <div>Department: {assignment.department}</div>}
                              <div>Since: {assignment.start_date 
                                ? format(new Date(assignment.start_date), 'MMM d, yyyy')
                                : 'N/A'}</div>
                            </div>
                          </div>
                          {(canDelete('people') || isAdmin || isOwner || isPropertyManager) && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => setArchiveAssignment(assignment)}
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No active property assignments</p>
              )}

              {archivedAssignments.length > 0 && (
                <>
                  <Separator />
                  <h4 className="text-sm font-medium text-muted-foreground">Archived Assignments</h4>
                  <div className="space-y-2">
                    {archivedAssignments.map(assignment => (
                      <Card key={assignment.id} className="bg-muted/50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <Archive className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-muted-foreground">
                                  {assignment.property?.name || 'Unknown'}
                                </span>
                                <Badge variant="outline">{assignment.role}</Badge>
                              </div>
                              <div className="mt-1 text-sm text-muted-foreground">
                                <span>{assignment.start_date} - {assignment.end_date}</span>
                                {assignment.departure_reason && (
                                  <span className="ml-2 capitalize">({assignment.departure_reason})</span>
                                )}
                              </div>
                            </div>
                            {canManageRoles && (
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleReactivate(assignment)}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            {canManageRoles && (
              <TabsContent value="roles" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Global Roles</h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  {person.global_roles.map(role => (
                    <Badge key={role} variant={getRoleBadgeVariant(role)} className="gap-1">
                      {role}
                      {currentRole && canRoleManage(currentRole, role) && (
                        <button 
                          onClick={() => handleRemoveRole(role)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                  {person.global_roles.length === 0 && (
                    <span className="text-sm text-muted-foreground">No global roles assigned</span>
                  )}
                </div>

                {canManageRoles && (
                  <div className="pt-4">
                    <Label>Add Role</Label>
                    <Select onValueChange={(value) => handleAddRole(value as AppRole)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select a role to add" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles
                          ?.filter(r => assignableRoles.includes(r.role_key as AppRole))
                          .filter(r => !person.global_roles.includes(r.role_key as AppRole))
                          .map(role => (
                          <SelectItem key={role.role_key} value={role.role_key}>
                            {role.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-2">
                      Property-level roles require a property assignment.
                    </p>
                  </div>
                )}
              </TabsContent>
            )}

            {canManageModules && (
              <TabsContent value="modules" className="space-y-4">
                <div>
                  <h3 className="font-semibold">Module Access</h3>
                  <p className="text-sm text-muted-foreground">
                    Assign or revoke tenant modules for this user.
                  </p>
                </div>

                <div className="space-y-3">
                  {moduleOptions.map((module) => {
                    const tenantEnabled = tenantModules[module.key];
                    const override = moduleAccessMap[module.key];
                    const assigned = tenantEnabled && (override ?? true);

                    return (
                      <Card key={module.key}>
                        <CardContent className="p-4 flex items-center justify-between gap-4">
                          <div>
                            <p className="font-medium">{module.label}</p>
                            <p className="text-sm text-muted-foreground">{module.description}</p>
                            {!tenantEnabled && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Disabled tenant-wide
                              </p>
                            )}
                          </div>
                          <Switch
                            checked={assigned}
                            disabled={!tenantEnabled || updateModuleAccess.isPending}
                            onCheckedChange={(checked) =>
                              updateModuleAccess.mutate({ moduleKey: module.key, enabled: checked })
                            }
                          />
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            )}

            {(canManageRoles || isAdmin || isOwner) && (
              <TabsContent value="hr-vault" className="space-y-4">
                <HRVaultTab employeeId={person.user_id} />
              </TabsContent>
            )}

            <TabsContent value="history" className="space-y-4">
              <h3 className="font-semibold">Activity History</h3>
              {statusHistory && statusHistory.length > 0 ? (
                <div className="space-y-3">
                  {statusHistory.map(entry => (
                    <div key={entry.id} className="flex gap-3 text-sm">
                      <div className="text-muted-foreground whitespace-nowrap">
                        {format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}
                      </div>
                      <div>
                        <p>{formatStatusChange(entry)}</p>
                        {entry.changed_by_profile && (
                          <p className="text-muted-foreground">
                            by {entry.changed_by_profile.full_name || entry.changed_by_profile.email}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No activity history</p>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <PropertyAssignmentDialog
        open={showAssignmentDialog}
        onOpenChange={(openState) => {
          setShowAssignmentDialog(openState);
          if (!openState) {
            setAssignmentDefaultRole(null);
            setAssignmentRoleLocked(false);
          }
        }}
        userId={person.user_id}
        existingPropertyIds={person.assignments.map(a => a.property_id)}
        defaultRole={assignmentDefaultRole}
        lockRole={assignmentRoleLocked}
      />

      <ArchivePersonDialog
        assignment={archiveAssignment}
        open={!!archiveAssignment}
        onOpenChange={(open) => !open && setArchiveAssignment(null)}
      />
    </>
  );
}
