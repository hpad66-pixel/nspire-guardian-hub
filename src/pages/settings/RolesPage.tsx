import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Shield, Lock, ChevronDown, ChevronRight, Users, Plus, Trash2, Search, MoreHorizontal, X, Mail, UserPlus,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useRoleDefinitions, useRolePermissions, useRoleMemberCounts, useSetRolePermission, useDeleteRoleDefinition,
  MODULES, ACTIONS,
} from '@/hooks/useRoleDefinitions';
import { useUsers, useAddUserRole, useRemoveUserRole, type UserWithRole } from '@/hooks/useUserManagement';
import { useUserPermissions, getAssignableRoles } from '@/hooks/usePermissions';
import { useInvitations, useCreateInvitation, useSendInvitation, useDeleteInvitation } from '@/hooks/useInvitations';
import { useProperties } from '@/hooks/useProperties';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { RolePreviewPanel } from '@/components/roles/RolePreviewPanel';
import { CustomRoleBuilder } from '@/components/roles/CustomRoleBuilder';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

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

// ══════════════════════════════════════════════════════════════════════
// TAB 1 — Roles & Permissions
// ══════════════════════════════════════════════════════════════════════
function RolesPermissionsTab() {
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const { data: roles, isLoading } = useRoleDefinitions();
  const { data: permissions } = useRolePermissions();
  const { data: memberCounts } = useRoleMemberCounts();
  const setPermission = useSetRolePermission();
  const deleteRole = useDeleteRoleDefinition();
  const { isAdmin } = useUserPermissions();

  const hasPermission = (roleKey: string, module: string, action: string): boolean => {
    if (roleKey === 'admin') return true;
    return (permissions || []).some(p => p.role_key === roleKey && p.module === module && p.action === action && p.allowed);
  };

  if (isLoading) return <div className="animate-pulse space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-lg" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Roles & Permissions</h2>
          <p className="text-sm text-muted-foreground">Configure access for each role across all 15 modules</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setBuilderOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Create Custom Role
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {roles?.map(role => (
          <Card key={role.role_key} className="overflow-hidden">
            <Collapsible open={expandedRole === role.role_key}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setExpandedRole(expandedRole === role.role_key ? null : role.role_key)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {role.display_name}
                          {role.is_system_role && (
                            <Badge variant="secondary" className="gap-1"><Lock className="h-3 w-3" />System</Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">{role.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {!role.is_system_role && isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive h-7" onClick={e => e.stopPropagation()}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete role "{role.display_name}"?</AlertDialogTitle>
                              <AlertDialogDescription>This will remove the role and all its permissions. Users with this role will lose access.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteRole.mutate(role.role_key)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" /> {memberCounts?.[role.role_key] || 0}
                      </div>
                      {expandedRole === role.role_key ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="flex gap-6">
                    {/* Permission grid */}
                    <div className="flex-1 overflow-x-auto">
                      {role.role_key === 'admin' ? (
                        <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
                          <span className="text-sm">Administrators have full access to all modules and actions.</span>
                        </div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-3 font-medium">Module</th>
                              {ACTIONS.map(a => <th key={a} className="text-center py-2 px-2 font-medium text-xs">{ACTION_LABELS[a]}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {MODULES.map(module => (
                              <tr key={module} className="border-b last:border-0">
                                <td className="py-2 px-3 font-medium">{MODULE_LABELS[module]}</td>
                                {ACTIONS.map(action => (
                                  <td key={action} className="text-center py-2 px-2">
                                    <Checkbox
                                      checked={hasPermission(role.role_key, module, action)}
                                      onCheckedChange={checked => setPermission.mutate({ role_key: role.role_key, module, action, allowed: !!checked })}
                                      disabled={!isAdmin || role.is_system_role}
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                    {/* Preview panel */}
                    <div className="w-[280px] flex-shrink-0 border-l pl-4 hidden lg:block">
                      <RolePreviewPanel roleKey={role.role_key} />
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      <CustomRoleBuilder open={builderOpen} onOpenChange={setBuilderOpen} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// TAB 2 — Team Members
// ══════════════════════════════════════════════════════════════════════
function TeamMembersTab() {
  const { data: users = [], isLoading } = useUsers();
  const { data: properties = [] } = useProperties();
  const addRole = useAddUserRole();
  const removeRole = useRemoveUserRole();
  const { isAdmin, currentRole } = useUserPermissions();
  const assignableRoles = currentRole ? getAssignableRoles(currentRole) : [];

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [newRole, setNewRole] = useState<AppRole | ''>('');
  const [newPropertyId, setNewPropertyId] = useState('');
  const [newPropertyRole, setNewPropertyRole] = useState('');

  const filtered = users.filter(u => {
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.roles.some(r => r.role === roleFilter);
    return matchSearch && matchRole;
  });

  const getHighestRole = (u: UserWithRole) => {
    const priority: Record<string, number> = { admin: 9, owner: 8, manager: 7, inspector: 6, administrator: 5, superintendent: 4, clerk: 3, project_manager: 2, subcontractor: 2, viewer: 1, user: 1 };
    const sorted = [...u.roles].sort((a, b) => (priority[b.role] || 0) - (priority[a.role] || 0));
    return sorted[0]?.role || 'user';
  };

  const handleAddPropertyAssignment = async () => {
    if (!selectedUser || !newPropertyId || !newPropertyRole) return;
    const { error } = await supabase.from('property_team_members').insert({
      user_id: selectedUser.user_id,
      property_id: newPropertyId,
      role: newPropertyRole,
      status: 'active',
    } as any);
    if (error) toast.error(error.message);
    else { toast.success('Property assignment added'); setNewPropertyId(''); setNewPropertyRole(''); }
  };

  const openUserSheet = (u: UserWithRole) => { setSelectedUser(u); setSheetOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {assignableRoles.map(r => <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-muted">
            <th className="text-left py-3 px-4 font-medium">User</th>
            <th className="text-left py-3 px-4 font-medium">Email</th>
            <th className="text-left py-3 px-4 font-medium">Highest Role</th>
            <th className="text-right py-3 px-4 font-medium">Actions</th>
          </tr></thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No users found</td></tr>
            ) : filtered.map(u => (
              <tr key={u.user_id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => openUserSheet(u)}>
                <td className="py-2.5 px-4">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={u.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[10px]">{(u.full_name || u.email || 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{u.full_name || 'Unnamed'}</span>
                  </div>
                </td>
                <td className="py-2.5 px-4 text-muted-foreground">{u.email}</td>
                <td className="py-2.5 px-4"><Badge variant="secondary">{getHighestRole(u).replace('_', ' ')}</Badge></td>
                <td className="py-2.5 px-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" onClick={e => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent><DropdownMenuItem onClick={() => openUserSheet(u)}>View Details</DropdownMenuItem></DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[550px] sm:max-w-[550px] overflow-y-auto">
          {selectedUser && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedUser.full_name || selectedUser.email}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* Section A — Roles */}
                <section className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Roles</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.roles.map(r => (
                      <Badge key={r.id} variant="outline" className="gap-1">
                        {r.role.replace('_', ' ')}
                        {isAdmin && (
                          <button onClick={() => removeRole.mutate({ userId: selectedUser.user_id, role: r.role })} className="ml-1 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <Select value={newRole} onValueChange={v => setNewRole(v as AppRole)}>
                        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Add role..." /></SelectTrigger>
                        <SelectContent>
                          {assignableRoles.filter(r => !selectedUser.roles.some(ur => ur.role === r)).map(r => (
                            <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" disabled={!newRole} onClick={() => { if (newRole) { addRole.mutate({ userId: selectedUser.user_id, role: newRole }); setNewRole(''); } }}>Add</Button>
                    </div>
                  )}
                </section>

                <Separator />

                {/* Section B — Property Assignments */}
                <section className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Property Assignments</h4>
                  {isAdmin && (
                    <div className="flex gap-2 items-end">
                      <Select value={newPropertyId} onValueChange={setNewPropertyId}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Select property..." /></SelectTrigger>
                        <SelectContent>{properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={newPropertyRole} onValueChange={setNewPropertyRole}>
                        <SelectTrigger className="w-[130px]"><SelectValue placeholder="Role..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="inspector">Inspector</SelectItem>
                          <SelectItem value="superintendent">Superintendent</SelectItem>
                          <SelectItem value="clerk">Clerk</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={handleAddPropertyAssignment} disabled={!newPropertyId || !newPropertyRole}>Assign</Button>
                    </div>
                  )}
                </section>

                <Separator />

                {/* Section C — Access Summary */}
                <section className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">What this person can access</h4>
                  <RolePreviewPanel roleKey={getHighestRole(selectedUser)} />
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// TAB 3 — Seat Management
// ══════════════════════════════════════════════════════════════════════
function SeatManagementTab() {
  const { data: users = [] } = useUsers();
  const { data: invitations = [] } = useInvitations();
  const deleteInvitation = useDeleteInvitation();
  const { workspace } = useWorkspaceContext();

  const seatLimit = (workspace as any)?.seat_limit ?? 10;
  const seatsUsed = (workspace as any)?.seats_used ?? users.length;
  const seatRatio = seatLimit > 0 ? seatsUsed / seatLimit : 0;
  const seatColor = seatRatio >= 1 ? 'bg-destructive' : seatRatio >= 0.8 ? 'bg-amber-500' : 'bg-green-500';

  const pendingInvites = invitations.filter(inv => !inv.accepted_at);

  const getHighestRole = (u: UserWithRole) => {
    const priority: Record<string, number> = { admin: 9, owner: 8, manager: 7, inspector: 6, administrator: 5, superintendent: 4, clerk: 3, project_manager: 2, subcontractor: 2, viewer: 1, user: 1 };
    const sorted = [...u.roles].sort((a, b) => (priority[b.role] || 0) - (priority[a.role] || 0));
    return sorted[0]?.role || 'user';
  };

  return (
    <div className="space-y-6">
      {/* Seat counter */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <p className="text-3xl font-bold">
              <span>{seatsUsed}</span>
              <span className="text-muted-foreground font-normal"> of </span>
              <span>{seatLimit}</span>
              <span className="text-muted-foreground font-normal text-lg"> seats used</span>
            </p>
            <div className="h-3 rounded-full bg-muted overflow-hidden max-w-md mx-auto">
              <div className={`h-full rounded-full transition-all ${seatColor}`} style={{ width: `${Math.min(seatRatio * 100, 100)}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Users */}
        <Card>
          <CardHeader><CardTitle className="text-base">Active Users</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {users.map(u => (
                <div key={u.user_id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px]">{(u.full_name || 'U').slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.full_name || u.email}</p>
                      <p className="text-xs text-muted-foreground">{getHighestRole(u).replace('_', ' ')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        <Card>
          <CardHeader><CardTitle className="text-base">Pending Invitations</CardTitle></CardHeader>
          <CardContent>
            {pendingInvites.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No pending invitations</p>
            ) : (
              <div className="space-y-2">
                {pendingInvites.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">{inv.role.replace('_', ' ')}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-destructive h-7" onClick={() => deleteInvitation.mutate(inv.id)}>
                      Revoke
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-muted-foreground">Need more seats? Contact APAS Consulting</p>
          <a href="mailto:hardeep@apas.ai" className="text-sm text-primary hover:underline">hardeep@apas.ai</a>
        </CardContent>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// TAB 4 — Invite Member
// ══════════════════════════════════════════════════════════════════════
function InviteMemberTab() {
  const { currentRole } = useUserPermissions();
  const { workspace } = useWorkspaceContext();
  const { data: properties = [] } = useProperties();
  const createInvitation = useCreateInvitation();
  const sendInvitation = useSendInvitation();
  const assignableRoles = currentRole ? getAssignableRoles(currentRole) : [];

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole | ''>('');
  const [propertyId, setPropertyId] = useState('');

  const seatLimit = (workspace as any)?.seat_limit ?? 10;
  const seatsUsed = (workspace as any)?.seats_used ?? 0;
  const seatsAvailable = Math.max(0, seatLimit - seatsUsed);

  const handleSend = async () => {
    if (!email || !role) return;
    try {
      const inv = await createInvitation.mutateAsync({
        email,
        role: role as AppRole,
        property_id: propertyId || undefined,
        workspace_id: (workspace as any)?.id,
      });
      await sendInvitation.mutateAsync(inv.id);
      setEmail('');
      setRole('');
      setPropertyId('');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left — Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><UserPlus className="h-5 w-5" /> Invite Team Member</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email *</label>
            <Input type="email" placeholder="colleague@company.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Role *</label>
            <Select value={role} onValueChange={v => setRole(v as AppRole)}>
              <SelectTrigger><SelectValue placeholder="Select role..." /></SelectTrigger>
              <SelectContent>
                {assignableRoles.map(r => <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Property (optional)</label>
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger><SelectValue placeholder="Assign to property..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No property</SelectItem>
                {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className={`rounded-lg px-3 py-2 text-sm ${seatsAvailable > 0 ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'}`}>
            {seatsAvailable > 0 ? `${seatsAvailable} seats available` : 'No seats available — deactivate a user first'}
          </div>

          <Button onClick={handleSend} disabled={!email || !role || seatsAvailable === 0 || createInvitation.isPending} className="w-full">
            <Mail className="h-4 w-4 mr-2" /> Send Invitation
          </Button>
        </CardContent>
      </Card>

      {/* Right — Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">What this person will see</CardTitle>
        </CardHeader>
        <CardContent>
          {role ? (
            <ScrollArea className="h-[500px]">
              <RolePreviewPanel roleKey={role} />
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
              Select a role to preview access
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════════════
export default function RolesPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Roles & Access Control</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage roles, permissions, team members, and invitations</p>
      </div>

      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="team">Team Members</TabsTrigger>
          <TabsTrigger value="seats">Seat Management</TabsTrigger>
          <TabsTrigger value="invite">Invite Member</TabsTrigger>
        </TabsList>

        <TabsContent value="roles"><RolesPermissionsTab /></TabsContent>
        <TabsContent value="team"><TeamMembersTab /></TabsContent>
        <TabsContent value="seats"><SeatManagementTab /></TabsContent>
        <TabsContent value="invite"><InviteMemberTab /></TabsContent>
      </Tabs>
    </div>
  );
}
