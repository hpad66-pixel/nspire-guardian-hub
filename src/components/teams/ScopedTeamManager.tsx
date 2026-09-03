import { useMemo, useState } from 'react';
import { Check, Mail, Search, ShieldCheck, UserMinus, UserPlus, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { UserWithRole } from '@/hooks/useUserManagement';

export interface ScopedTeamMember {
  id: string;
  userId: string;
  role: string;
  name: string | null;
  email: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
}

const TEAM_ROLES = [
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'administrator', label: 'Administrator' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'superintendent', label: 'Superintendent' },
  { value: 'inspector', label: 'Inspector' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'clerk', label: 'Coordinator' },
  { value: 'viewer', label: 'Viewer' },
] as const;

function roleLabel(role: string) {
  return TEAM_ROLES.find((item) => item.value === role)?.label ?? role.replaceAll('_', ' ');
}

function initials(name: string | null, email: string | null) {
  if (name) return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return email?.slice(0, 2).toUpperCase() ?? 'U';
}

interface ScopedTeamManagerProps {
  scopeLabel: string;
  members: ScopedTeamMember[];
  accountUsers: UserWithRole[];
  isLoading?: boolean;
  usersLoading?: boolean;
  canManage: boolean;
  inheritedLabels?: Map<string, string>;
  onAdd: (userId: string, role: string) => Promise<unknown>;
  onRemove: (member: ScopedTeamMember) => Promise<unknown>;
  onRoleChange: (member: ScopedTeamMember, role: string) => Promise<unknown>;
}

export function ScopedTeamManager({
  scopeLabel,
  members,
  accountUsers,
  isLoading = false,
  usersLoading = false,
  canManage,
  inheritedLabels = new Map(),
  onAdd,
  onRemove,
  onRoleChange,
}: ScopedTeamManagerProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [role, setRole] = useState('viewer');
  const [saving, setSaving] = useState(false);

  const memberIds = useMemo(() => new Set(members.map((member) => member.userId)), [members]);
  const available = useMemo(() => {
    const query = search.trim().toLowerCase();
    return accountUsers
      .filter((user) => !memberIds.has(user.user_id) && user.status !== 'deactivated')
      .filter((user) => !query || `${user.full_name ?? ''} ${user.email ?? ''} ${user.work_email ?? ''}`.toLowerCase().includes(query))
      .sort((a, b) => (a.full_name ?? a.email ?? '').localeCompare(b.full_name ?? b.email ?? ''));
  }, [accountUsers, memberIds, search]);

  const toggleSelected = (userId: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  const addSelected = async () => {
    if (!selected.size) return;
    setSaving(true);
    try {
      for (const userId of selected) await onAdd(userId, role);
      setSelected(new Set());
      setSearch('');
      setPickerOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 font-semibold"><Users className="h-4 w-4 text-primary" />{scopeLabel}</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Choose existing people from your account. One account profile can belong to multiple clients and projects.</p>
        </div>
        {canManage && (
          <Button onClick={() => setPickerOpen(true)} className="shrink-0 gap-2">
            <UserPlus className="h-4 w-4" />Add people
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-16 rounded-xl" />)}</div>
      ) : members.length === 0 ? (
        <button type="button" disabled={!canManage} onClick={() => setPickerOpen(true)} className="w-full rounded-xl border border-dashed p-8 text-center text-muted-foreground enabled:hover:border-primary/40 enabled:hover:bg-primary/[0.03]">
          <Users className="mx-auto mb-2 h-8 w-8 opacity-35" />
          <span className="block text-sm font-medium">No one assigned yet</span>
          <span className="mt-1 block text-xs">{canManage ? 'Add people already in your account in a few clicks.' : 'An administrator can assign people here.'}</span>
        </button>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <div key={member.id} className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar className="h-10 w-10 shrink-0"><AvatarImage src={member.avatarUrl ?? undefined} /><AvatarFallback>{initials(member.name, member.email)}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-sm font-semibold">{member.name || member.email || 'Unnamed user'}</p>
                    {inheritedLabels.get(member.userId) && <Badge variant="secondary" className="text-[10px]">{inheritedLabels.get(member.userId)}</Badge>}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pl-[52px] sm:pl-0">
                {member.email && <Button asChild variant="ghost" size="icon" className="h-8 w-8"><a href={`mailto:${member.email}`} aria-label={`Email ${member.name || member.email}`}><Mail className="h-4 w-4" /></a></Button>}
                {inheritedLabels.has(member.userId) ? (
                  <Badge variant="outline" className="h-8 px-3 text-xs"><ShieldCheck className="mr-1.5 h-3.5 w-3.5" />{roleLabel(member.role)}</Badge>
                ) : (
                  <Select value={member.role} disabled={!canManage} onValueChange={(next) => void onRoleChange(member, next)}>
                    <SelectTrigger className="h-8 min-w-[142px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{TEAM_ROLES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                  </Select>
                )}
                {canManage && !inheritedLabels.has(member.userId) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label={`Remove ${member.name || member.email}`}><UserMinus className="h-4 w-4" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Remove from {scopeLabel.toLowerCase()}?</AlertDialogTitle><AlertDialogDescription>{member.name || member.email} will lose this assignment. Their account and other client/project assignments remain intact.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void onRemove(member)}>Remove assignment</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={pickerOpen} onOpenChange={(open) => { setPickerOpen(open); if (!open) setSelected(new Set()); }}>
        <DialogContent className="flex max-h-[88vh] flex-col sm:max-w-xl">
          <DialogHeader><DialogTitle>Add people to {scopeLabel.toLowerCase()}</DialogTitle><DialogDescription>Search your account directory, select one or several people, and assign their scope role.</DialogDescription></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email…" className="pl-9" /></div>
            <Select value={role} onValueChange={setRole}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TEAM_ROLES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border p-2">
            {usersLoading ? <div className="space-y-2">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-14" />)}</div> : available.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">{search ? 'No account users match that search.' : 'Everyone in the account is already assigned.'}</div>
            ) : available.map((user) => {
              const checked = selected.has(user.user_id);
              const inherited = inheritedLabels.get(user.user_id);
              return (
                <button key={user.user_id} type="button" onClick={() => toggleSelected(user.user_id)} className={`mb-1 flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${checked ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/60'}`}>
                  <Checkbox checked={checked} aria-label={`Select ${user.full_name || user.email}`} />
                  <Avatar className="h-9 w-9"><AvatarImage src={user.avatar_url ?? undefined} /><AvatarFallback>{initials(user.full_name, user.email)}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{user.full_name || 'Unnamed user'}</p><p className="truncate text-xs text-muted-foreground">{user.email}</p></div>
                  {inherited && <Badge variant="outline" className="hidden text-[10px] sm:inline-flex"><ShieldCheck className="mr-1 h-3 w-3" />{inherited}</Badge>}
                  {checked && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>
          <DialogFooter className="gap-2 sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">{selected.size} selected · {roleLabel(role)}</p><div className="flex gap-2"><Button variant="outline" onClick={() => setPickerOpen(false)}>Cancel</Button><Button onClick={addSelected} disabled={!selected.size || saving}>{saving ? 'Adding…' : `Add ${selected.size || ''} ${selected.size === 1 ? 'person' : 'people'}`}</Button></div></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
