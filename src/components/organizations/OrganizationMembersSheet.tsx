import { Users, UserMinus, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useClientMembers, useAssignClientToProfile, type Client } from '@/hooks/useClients';
import { CLIENT_TYPE_CONFIG } from '@/pages/organizations/OrganizationsPage';

interface OrganizationMembersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: Client | null;
}

export function OrganizationMembersSheet({ open, onOpenChange, organization }: OrganizationMembersSheetProps) {
  const { data: members, isLoading } = useClientMembers(organization?.id);
  const assignClient = useAssignClientToProfile();

  if (!organization) return null;

  const typeConfig = CLIENT_TYPE_CONFIG[organization.client_type];

  const handleUnlink = async (userId: string) => {
    await assignClient.mutateAsync({ userId, clientId: null });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[420px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Members of {organization.name}
          </SheetTitle>
          <SheetDescription>
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${typeConfig.badgeClass}`}>
              {typeConfig.icon}
              {typeConfig.label}
            </span>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))
          ) : members && members.length > 0 ? (
            members.map((member) => {
              const initials = member.full_name
                ? member.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                : member.email?.charAt(0).toUpperCase() || '?';
              return (
                <div key={member.user_id} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.full_name || 'Unknown User'}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleUnlink(member.user_id)}
                    disabled={assignClient.isPending}
                    title="Remove from organization"
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No members linked</p>
              <p className="text-xs mt-1">
                Assign users to this organization when inviting them or from the People page.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
