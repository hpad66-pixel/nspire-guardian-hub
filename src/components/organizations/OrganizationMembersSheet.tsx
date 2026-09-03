import { Link } from 'react-router-dom';
import { ExternalLink, Users } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  useClientMembers,
  useClientTeamAccess,
  useRemoveClientTeamMember,
  useUpsertClientTeamMember,
  type Client,
} from '@/hooks/useClients';
import { useUsers } from '@/hooks/useUserManagement';
import { ScopedTeamManager, type ScopedTeamMember } from '@/components/teams/ScopedTeamManager';
import { CLIENT_TYPE_CONFIG } from '@/pages/organizations/OrganizationsPage';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface OrganizationMembersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: Client | null;
}

export function OrganizationMembersSheet({ open, onOpenChange, organization }: OrganizationMembersSheetProps) {
  const { data: members = [], isLoading } = useClientMembers(organization?.id);
  const { data: access } = useClientTeamAccess(organization?.id);
  const { data: accountUsers = [], isLoading: usersLoading } = useUsers();
  const upsertMember = useUpsertClientTeamMember();
  const removeMember = useRemoveClientTeamMember();

  if (!organization) return null;
  const typeConfig = CLIENT_TYPE_CONFIG[organization.client_type];
  const scopedMembers: ScopedTeamMember[] = members.map((member) => ({
    id: member.id,
    userId: member.user_id,
    role: member.role,
    name: member.profile?.full_name ?? null,
    email: member.profile?.email ?? null,
    phone: member.profile?.phone ?? null,
    avatarUrl: member.profile?.avatar_url ?? null,
  }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[640px]">
        <SheetHeader className="border-b px-5 py-5 sm:px-6">
          <SheetTitle className="flex items-center gap-2"><Users className="h-5 w-5" />{organization.name} team</SheetTitle>
          <SheetDescription className="flex flex-wrap items-center justify-between gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${typeConfig.badgeClass}`}>{typeConfig.icon}{typeConfig.label}</span>
            <Button asChild size="sm" variant="ghost" className="h-7 gap-1 text-xs"><Link to="/people">Account directory<ExternalLink className="h-3 w-3" /></Link></Button>
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <ScopedTeamManager
            scopeLabel="Client team"
            members={scopedMembers}
            accountUsers={accountUsers}
            isLoading={isLoading}
            usersLoading={usersLoading}
            canManage={access?.canManage ?? false}
            onAdd={(userId, role) => upsertMember.mutateAsync({ clientId: organization.id, userId, role: role as AppRole })}
            onRemove={(member) => removeMember.mutateAsync({ clientId: organization.id, userId: member.userId })}
            onRoleChange={(member, role) => upsertMember.mutateAsync({ clientId: organization.id, userId: member.userId, role: role as AppRole })}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
