import { useState } from 'react';
import { Users, UserPlus, UserMinus, Search, ChevronDown, Mail, Loader2, ContactRound, MessageSquareText, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateInvitation, useSendInvitation } from '@/hooks/useInvitations';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useProjectTeamMembers,
  useAddProjectTeamMember,
  useRemoveProjectTeamMember,
  useUpdateProjectTeamMemberRole,
} from '@/hooks/useProjectTeam';
import { useUsers } from '@/hooks/useUserManagement';
import { useProjectContacts } from '@/hooks/useProjectPeople';
import { useProjectDirectory } from '@/hooks/useProjectDirectory';
import { AddPersonDialog } from '@/components/directory/AddPersonDialog';
import { CorrespondenceComposer } from '@/components/projects/correspondence/CorrespondenceComposer';
import { ProjectSmsComposer, type SmsRecipient } from '@/components/projects/correspondence/ProjectSmsComposer';
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
  const [inviteEmail, setInviteEmail] = useState('');
  const [attachContactOpen, setAttachContactOpen] = useState(false);
  const [emailContact, setEmailContact] = useState<{ name: string; email: string; companyName?: string | null } | null>(null);
  const [smsContact, setSmsContact] = useState<SmsRecipient | null>(null);

  const { data: members = [], isLoading: membersLoading } = useProjectTeamMembers(projectId);
  const { data: allUsers = [], isLoading: usersLoading } = useUsers();
  const { data: projectContacts = [], isLoading: contactsLoading } = useProjectContacts(projectId);
  const projectDirectory = useProjectDirectory(projectId);
  const addMember = useAddProjectTeamMember();
  const removeMember = useRemoveProjectTeamMember();
  const updateRole = useUpdateProjectTeamMemberRole();
  const createInvitation = useCreateInvitation();
  const sendInvitation = useSendInvitation();
  const inviting = createInvitation.isPending || sendInvitation.isPending;

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast.error('Enter a valid email address.'); return; }
    try {
      const inv = await createInvitation.mutateAsync({ email, role: addRole });
      await sendInvitation.mutateAsync(inv.id);
      setInviteEmail('');
      toast.success(`Invitation sent to ${email}. They'll appear here once they join.`);
    } catch (e) {
      toast.error(`Couldn't invite: ${e instanceof Error ? e.message : 'try again'}`);
    }
  };

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
      <SheetContent className="w-full sm:max-w-[560px] flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-module-projects" />
            People &amp; Team
          </SheetTitle>
          <SheetDescription>{projectName}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

          {/* CRM contacts are communication-only and never receive app access. */}
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Project Contacts ({projectContacts.length})</h3>
                <p className="mt-1 text-xs text-muted-foreground">CRM contacts can receive project email and text without signing in.</p>
              </div>
              <Button size="sm" className="h-8 shrink-0 gap-1.5" onClick={() => setAttachContactOpen(true)}>
                <ContactRound className="h-3.5 w-3.5" />Attach contact
              </Button>
            </div>

            {contactsLoading ? (
              <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-[76px] w-full rounded-lg" />)}</div>
            ) : projectContacts.length === 0 ? (
              <button type="button" onClick={() => setAttachContactOpen(true)} className="w-full rounded-xl border border-dashed py-7 text-center text-muted-foreground hover:border-primary/40 hover:bg-primary/[0.02] transition-colors">
                <ContactRound className="mx-auto mb-2 h-7 w-7 opacity-35" />
                <span className="block text-sm font-medium">Attach someone from CRM</span>
                <span className="mt-1 block text-xs">Property managers, clients, consultants, vendors, and agency contacts</span>
              </button>
            ) : (
              <div className="space-y-2">
                {projectContacts.map((contact) => (
                  <div key={contact.entryId} className="rounded-xl border bg-card p-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-9 w-9 shrink-0"><AvatarFallback className="bg-amber-500/10 text-xs text-amber-700">{getInitials(contact.name, contact.email)}</AvatarFallback></Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-sm font-medium">{contact.name}</p>
                          {contact.isKeyContact && <Badge variant="outline" className="text-[10px]">Key contact</Badge>}
                          <Badge variant="secondary" className="text-[10px]">No portal access</Badge>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{[contact.roleLabel || contact.jobTitle, contact.companyName].filter(Boolean).join(' · ') || 'Project contact'}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{[contact.email, contact.phone].filter(Boolean).join(' · ') || 'Add email or mobile in CRM'}</p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" title="Detach from project"><UserMinus className="h-4 w-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Detach project contact</AlertDialogTitle><AlertDialogDescription>Remove {contact.name} from {projectName}? Their CRM record remains available and past correspondence stays in this project.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => projectDirectory.remove.mutate(contact.entryId)}>Detach</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="mt-2 flex gap-2 pl-12">
                      <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" disabled={!contact.email} onClick={() => contact.email && setEmailContact({ name: contact.name, email: contact.email, companyName: contact.companyName })}><Mail className="h-3.5 w-3.5" />Email</Button>
                      <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" disabled={!contact.phone} onClick={() => setSmsContact({ contactId: contact.contactId, name: contact.name, phone: contact.phone, companyName: contact.companyName })}><MessageSquareText className="h-3.5 w-3.5" />Text</Button>
                      {contact.phone && <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs"><a href={`tel:${contact.phone}`}><Phone className="h-3.5 w-3.5" />Call</a></Button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Current members ─────────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Internal Team ({members.length})
            </h3>
            <p className="-mt-2 mb-3 text-xs text-muted-foreground">Login users with a project role and application access.</p>

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

                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={!email} title={email ? `Email ${name || email}` : 'No email'} onClick={() => email && setEmailContact({ name: name || email, email })}>
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={!member.profile?.phone} title={member.profile?.phone ? `Text ${name || email}` : 'Add a mobile number to this user profile'} onClick={() => setSmsContact({ recipientUserId: member.user_id, name: name || email || 'Team member', phone: member.profile?.phone ?? null })}>
                        <MessageSquareText className="h-4 w-4" />
                      </Button>

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

                      {/* Remove — confirmed (#15) */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                            disabled={removeMember.isPending}
                            title="Remove from project"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove team member</AlertDialogTitle>
                            <AlertDialogDescription>
                              Remove {name || email || 'this user'} from {projectName}? They will
                              lose access to this project. You can add them back later.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeMember.mutate({ id: member.id, projectId })}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Add people ──────────────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Add Internal Team Member
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
                {searchQuery ? 'No users match your search' : "No one else in your workspace yet — invite someone below."}
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

            {/* ── Invite someone new by email ─────────────────────────── */}
            <div className="mt-5 pt-4 border-t">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Invite someone new</h4>
              <p className="text-xs text-muted-foreground mb-2.5">
                Not in your workspace yet? Send them an invite — they join with the role selected above and then show up here to add.
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="name@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleInvite(); }}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
                <Button size="sm" className="h-9 gap-1.5 shrink-0" onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                  {inviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                  Invite
                </Button>
              </div>
            </div>
          </section>
        </div>
      </SheetContent>
      <AddPersonDialog open={attachContactOpen} onOpenChange={setAttachContactOpen} projectId={projectId} contactsOnly />
      <CorrespondenceComposer
        open={Boolean(emailContact)}
        onOpenChange={(next) => { if (!next) setEmailContact(null); }}
        projectId={projectId}
        projectName={projectName}
        presetRecipient={emailContact}
      />
      <ProjectSmsComposer
        open={Boolean(smsContact)}
        onOpenChange={(next) => { if (!next) setSmsContact(null); }}
        projectId={projectId}
        projectName={projectName}
        recipient={smsContact}
      />
    </Sheet>
  );
}
