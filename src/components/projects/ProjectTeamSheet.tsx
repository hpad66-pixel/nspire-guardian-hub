import { useState } from 'react';
import { Users, UserPlus, UserMinus, Search, ChevronDown } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useProjectTeamMembers,
  useAddProjectTeamMember,
  useRemoveProjectTeamMember,
  useUpdateProjectTeamMemberRole,
} from '@/hooks/useProjectTeam';
import { useUsers } from '@/hooks/useUserManagement';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const PROJECT_ROLES: { value: AppRole; label: string }[] = [
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'superintendent', label: 'Superintendent' },
  { value: 'inspector', label: 'Inspector' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'clerk', label: 'Clerk' },
  { value: 'viewer', label: 'Viewer' },
];

const ROLE_COLORS: Record<string, string> = {
  project_manager: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  superintendent:  'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  inspector:       'bg-green-500/10 text-green-600 border-green-500/20',
  subcontractor:   'bg-orange-500/10 text-orange-600 border-orange-500/20',
  clerk:           'bg-teal-500/10 text-teal-600 border-teal-500/20',
  viewer:          'bg-muted text-muted-foreground border-muted',
  admin:           'bg-red-500/10 text-red-600 border-red-500/20',
  manager:         'bg-blue-500/10 text-blue-600 border-blue-500/20',
  owner:           'bg-amber-500/10 text-amber-600 border-amber-500/20',
};

function getInitials(name?: string | null, email?: string | null) {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  if (email) return email.slice(0, 2).toUpperCase();
  return 'U';
}

interface ProjectTeamSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
}

export function ProjectTeamSheet({ open, onOpenChange, projectId, projectName }: ProjectTeamSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [addRole, setAddRole] = useState<AppRole>('viewer');

  const { data: members = [], isLoading: membersLoading } = useProjectTeamMembers(projectId);
  const { data: allUsers = [], isLoading: usersLoading } = useUsers();
  const addMember = useAddProjectTeamMember();
  const removeMember = useRemoveProjectTeamMember();
  const updateRole = useUpdateProjectTeamMemberRole();

  const memberUserIds = new Set(members.map(m => m.user_id));

  // Users not yet on the project, filtered by search
  const availableUsers = allUsers.filter(u => {
    if (memberUserIds.has(u.user_id)) return false;
    const q = searchQuery.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  const handleAdd = (userId: string) => {
    addMember.mutate({ projectId, userId, role: addRole });
    setSearchQuery('');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[460px] flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-module-projects" />
            Project Team
          </SheetTitle>
          <SheetDescription>{projectName}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

          {/* ── Current members ─────────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Team Members ({members.length})
            </h3>

            {membersLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground rounded-xl border border-dashed">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No team members yet</p>
                <p className="text-xs mt-1">Add people from the section below</p>
              </div>
            ) : (
              <div className="space-y-2">
                {members.map(member => {
                  const name = member.profile?.full_name;
                  const email = member.profile?.email;
                  const roleLabel = PROJECT_ROLES.find(r => r.value === member.role)?.label ?? member.role;
                  const roleColor = ROLE_COLORS[member.role] ?? ROLE_COLORS.viewer;
                  return (
                    <div key={member.id} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={member.profile?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(name, email)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{name || 'Unnamed User'}</p>
                        <p className="text-xs text-muted-foreground truncate">{email}</p>
                      </div>

                      {/* Role badge + change */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="shrink-0">
                            <Badge variant="outline" className={`${roleColor} gap-1 cursor-pointer hover:opacity-80 transition-opacity`}>
                              {roleLabel}
                              <ChevronDown className="h-3 w-3" />
                            </Badge>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {PROJECT_ROLES.map(r => (
                            <DropdownMenuItem
                              key={r.value}
                              onClick={() => updateRole.mutate({ id: member.id, projectId, role: r.value })}
                              className={member.role === r.value ? 'bg-accent' : ''}
                            >
                              {r.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Remove */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeMember.mutate({ id: member.id, projectId })}
                        disabled={removeMember.isPending}
                        title="Remove from project"
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Add people ──────────────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Add People
            </h3>

            <div className="flex gap-2 mb-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              {/* Role picker for adding */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 shrink-0 h-9 text-xs">
                    {PROJECT_ROLES.find(r => r.value === addRole)?.label ?? 'Role'}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Add as Role</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {PROJECT_ROLES.map(r => (
                    <DropdownMenuItem key={r.value} onClick={() => setAddRole(r.value)}>
                      {r.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {usersLoading ? (
              <div className="space-y-2">
                {[1, 2].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
              </div>
            ) : availableUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {searchQuery ? 'No users match your search' : 'All workspace users are already on this project'}
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableUsers.map(user => (
                  <div key={user.user_id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/5 transition-colors">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={user.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(user.full_name, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.full_name || 'Unnamed'}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 shrink-0 gap-1 text-xs"
                      onClick={() => handleAdd(user.user_id)}
                      disabled={addMember.isPending}
                    >
                      <UserPlus className="h-3 w-3" />
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
