import { useState } from 'react';
import { Users, UserPlus, UserMinus, ChevronDown, Mail, Loader2, ContactRound, MessageSquareText, Phone } from 'lucide-react';
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
  useProjectTeamAccess,
} from '@/hooks/useProjectTeam';
import { useUsers } from '@/hooks/useUserManagement';
import { useProjectContacts } from '@/hooks/useProjectPeople';
import { useProjectDirectory } from '@/hooks/useProjectDirectory';
import { AddFromCrmDialog } from '@/components/crm/AddFromCrmDialog';
import { CorrespondenceComposer } from '@/components/projects/correspondence/CorrespondenceComposer';
import { ProjectSmsComposer, type SmsRecipient } from '@/components/projects/correspondence/ProjectSmsComposer';
import { ScopedTeamManager, type ScopedTeamMember } from '@/components/teams/ScopedTeamManager';
import { useProject } from '@/hooks/useProjects';
import { useClientMembers } from '@/hooks/useClients';
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
  const [addRole, setAddRole] = useState<AppRole>('viewer');
  const [inviteEmail, setInviteEmail] = useState('');
  const [attachContactOpen, setAttachContactOpen] = useState(false);
  const [emailContact, setEmailContact] = useState<{ name: string; email: string; companyName?: string | null } | null>(null);
  const [smsContact, setSmsContact] = useState<SmsRecipient | null>(null);

  const { data: members = [], isLoading: membersLoading } = useProjectTeamMembers(projectId);
  const { data: allUsers = [], isLoading: usersLoading } = useUsers();
  const { data: access } = useProjectTeamAccess(projectId);
  const { data: project } = useProject(projectId);
  const { data: clientMembers = [] } = useClientMembers(project?.client_id ?? undefined);
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

  const scopedMembers: ScopedTeamMember[] = members.map((member) => ({
    id: member.id,
    userId: member.user_id,
    role: member.role,
    name: member.profile?.full_name ?? null,
    email: member.profile?.email ?? null,
    phone: member.profile?.phone ?? null,
    avatarUrl: member.profile?.avatar_url ?? null,
  }));
  const directUserIds = new Set(scopedMembers.map((member) => member.userId));
  const inheritedClientMembers: ScopedTeamMember[] = clientMembers
    .filter((member) => !directUserIds.has(member.user_id))
    .map((member) => ({
      id: `client-${member.id}`,
      userId: member.user_id,
      role: member.role,
      name: member.profile?.full_name ?? null,
      email: member.profile?.email ?? null,
      phone: member.profile?.phone ?? null,
      avatarUrl: member.profile?.avatar_url ?? null,
    }));
  const inheritedLabels = new Map(inheritedClientMembers.map((member) => [member.userId, 'Client team · inherited']));

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
              <Button size="sm" className="h-8 shrink-0 gap-1.5 bg-[var(--apas-sapphire)] hover:bg-[var(--apas-sapphire)]/90" onClick={() => setAttachContactOpen(true)}>
                <ContactRound className="h-3.5 w-3.5" />Add from CRM
              </Button>
            </div>

            {contactsLoading ? (
              <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-[76px] w-full rounded-lg" />)}</div>
            ) : projectContacts.length === 0 ? (
              <button type="button" onClick={() => setAttachContactOpen(true)} className="w-full rounded-xl border border-dashed py-7 text-center text-muted-foreground hover:border-[var(--apas-sapphire)]/40 hover:bg-[var(--apas-sapphire)]/[0.03] transition-colors">
                <ContactRound className="mx-auto mb-2 h-7 w-7 opacity-35" />
                <span className="block text-sm font-medium">Add people from your CRM</span>
                <span className="mt-1 block text-xs">Search and attach clients, consultants, vendors — they become available for email and invoices</span>
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

          <section>
            <ScopedTeamManager
              scopeLabel="Project team"
              members={[...scopedMembers, ...inheritedClientMembers]}
              accountUsers={allUsers}
              isLoading={membersLoading}
              usersLoading={usersLoading}
              canManage={access?.canManage ?? false}
              inheritedLabels={inheritedLabels}
              onAdd={(userId, role) => addMember.mutateAsync({ projectId, userId, role: role as AppRole })}
              onRemove={(member) => removeMember.mutateAsync({ projectId, userId: member.userId })}
              onRoleChange={(member, role) => updateRole.mutateAsync({ projectId, userId: member.userId, role: role as AppRole })}
            />

            {/* ── Invite someone new by email ─────────────────────────── */}
            {access?.canManage && (
            <div className="mt-5 pt-4 border-t">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Invite someone new</h4>
              <p className="text-xs text-muted-foreground mb-2.5">
                Not in your account yet? Send an invitation. After they join, assign them above to give project access and enable @mentions.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 shrink-0 gap-1 text-xs">
                      {PROJECT_ROLES.find(r => r.value === addRole)?.label ?? 'Role'}
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Account role</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {PROJECT_ROLES.map(r => <DropdownMenuItem key={r.value} onClick={() => setAddRole(r.value)}>{r.label}</DropdownMenuItem>)}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" className="h-9 gap-1.5 shrink-0" onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                  {inviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                  Invite
                </Button>
              </div>
            </div>
            )}
          </section>
        </div>
      </SheetContent>
      <AddFromCrmDialog
        open={attachContactOpen}
        onOpenChange={setAttachContactOpen}
        projectId={projectId}
        projectName={projectName}
      />
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
