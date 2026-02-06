import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Search,
  MoreHorizontal,
  Shield,
  ShieldCheck,
  ShieldAlert,
  User,
  Plus,
  Trash2,
} from 'lucide-react';
import { useUsers, useAddUserRole, useRemoveUserRole, type UserWithRole } from '@/hooks/useUserManagement';
import { useUserPermissions, getAssignableRoles, canRoleManage } from '@/hooks/usePermissions';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const roleConfig: Record<AppRole, { label: string; icon: typeof Shield; color: string }> = {
  admin: { label: 'Admin', icon: ShieldAlert, color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  owner: { label: 'Owner', icon: ShieldAlert, color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  manager: { label: 'Property Manager', icon: ShieldCheck, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  administrator: { label: 'Administrator', icon: Shield, color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' },
  project_manager: { label: 'Project Manager', icon: ShieldCheck, color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  superintendent: { label: 'Superintendent', icon: Shield, color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
  inspector: { label: 'Inspector', icon: Shield, color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  clerk: { label: 'Clerk', icon: User, color: 'bg-teal-500/10 text-teal-500 border-teal-500/20' },
  subcontractor: { label: 'Subcontractor', icon: User, color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  viewer: { label: 'Viewer', icon: User, color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
  user: { label: 'User', icon: User, color: 'bg-muted text-muted-foreground border-muted' },
};

const allRoles: AppRole[] = [
  'admin',
  'owner',
  'manager',
  'inspector',
  'administrator',
  'superintendent',
  'clerk',
  'project_manager',
  'subcontractor',
  'viewer',
  'user',
];

export function UserManagement() {
  const { data: users, isLoading } = useUsers();
  const { currentRole, isAdmin, isOwner, isPropertyManager } = useUserPermissions();
  const addRoleMutation = useAddUserRole();
  const removeRoleMutation = useRemoveUserRole();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState<AppRole>('user');

  const canManageRoles = isAdmin || isOwner || isPropertyManager;
  const assignableRoles = currentRole ? getAssignableRoles(currentRole) : [];

  const filteredUsers = users?.filter(user => {
    const search = searchQuery.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search)
    );
  }) || [];

  const handleAddRole = () => {
    if (selectedUser && newRole) {
      addRoleMutation.mutate(
        { userId: selectedUser.user_id, role: newRole },
        { onSuccess: () => setRoleDialogOpen(false) }
      );
    }
  };

  const handleRemoveRole = (user: UserWithRole, role: AppRole) => {
    if (user.roles.length <= 1) {
      return; // Keep at least one role
    }
    removeRoleMutation.mutate({ userId: user.user_id, role });
  };

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getHighestRole = (roles: { role: AppRole }[]): AppRole => {
    const rolePriority: Record<AppRole, number> = { 
      admin: 9,
      owner: 8,
      manager: 7,
      inspector: 6,
      administrator: 5,
      superintendent: 4,
      clerk: 3,
      project_manager: 2,
      subcontractor: 2,
      viewer: 1,
      user: 1,
    };
    const sorted = [...roles].sort((a, b) => (rolePriority[b.role] || 0) - (rolePriority[a.role] || 0));
    return sorted[0]?.role || 'user';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>
              Manage user roles and permissions ({filteredUsers.length} users)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const highestRole = getHighestRole(user.roles);
                  const RoleIcon = roleConfig[highestRole]?.icon || User;

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(user.full_name, user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.full_name || 'No name'}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((r) => {
                            const config = roleConfig[r.role];
                            return (
                              <Badge
                                key={r.id}
                                variant="outline"
                                className={`${config?.color} gap-1`}
                              >
                                {config?.label || r.role}
                        {canManageRoles && user.roles.length > 1 && currentRole && canRoleManage(currentRole, r.role) && (
                          <button
                            onClick={() => handleRemoveRole(user, r.role)}
                            className="ml-1 hover:text-destructive"
                            title="Remove role"
                          >
                                    ×
                                  </button>
                                )}
                              </Badge>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {canManageRoles && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setNewRole((assignableRoles[0] || 'user') as AppRole);
                                  setRoleDialogOpen(true);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Role
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Role Legend */}
        <div className="mt-6 pt-6 border-t">
          <h4 className="text-sm font-medium mb-3">Role Permissions</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {allRoles.map((role) => {
              const config = roleConfig[role];
              const Icon = config.icon;
              return (
                <div key={role} className="flex items-start gap-2">
                  <div className={`p-1.5 rounded ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{config.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {role === 'admin' && 'Full system access'}
                      {role === 'owner' && 'Organization owner access'}
                      {role === 'manager' && 'Property oversight & team management'}
                      {role === 'administrator' && 'Administrative staff access'}
                      {role === 'superintendent' && 'Field operations and inspections'}
                      {role === 'clerk' && 'Clerical and support access'}
                      {role === 'inspector' && 'Inspections & reports'}
                      {role === 'user' && 'Basic access'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>

      {/* Add Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Role</DialogTitle>
            <DialogDescription>
              Add a new role to {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {assignableRoles
                  .filter(r => !selectedUser?.roles.some(ur => ur.role === r))
                  .map((role) => {
                    const config = roleConfig[role];
                    return (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          <config.icon className="h-4 w-4" />
                          {config.label}
                        </div>
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRole} disabled={addRoleMutation.isPending}>
              {addRoleMutation.isPending ? 'Adding...' : 'Add Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
