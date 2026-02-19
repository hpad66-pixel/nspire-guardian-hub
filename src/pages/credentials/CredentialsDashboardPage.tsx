import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { BadgeCheck, Download, Search, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useModules } from '@/contexts/ModuleContext';
import { useUserPermissions } from '@/hooks/usePermissions';
import {
  useAllCredentials,
  getCredentialStatus,
  formatExpiryDate,
  formatExpiryLabel,
  type Credential,
  type CredentialStatus,
} from '@/hooks/useCredentials';
import { CredentialStatusBadge, CredentialStatusDot } from '@/components/credentials/CredentialStatusBadge';
import { CredentialCard } from '@/components/credentials/CredentialCard';
import { AddCredentialSheet } from '@/components/credentials/AddCredentialSheet';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

function useWorkspaceId() {
  return useQuery({
    queryKey: ['my-workspace-id'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_my_workspace_id');
      return (data as string | null) ?? '';
    },
  });
}

// Top 6 most common credential types in workspace
const COMMON_TYPES = [
  'General Contractor License',
  'OSHA 30-Hour',
  'General Liability Certificate',
  'Workers Compensation',
  'First Aid / CPR',
  'Commercial Driver\'s License (CDL)',
];

type DashboardFilter = 'all' | CredentialStatus;

interface TeamMember {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  department: string | null;
}

export default function CredentialsDashboardPage() {
  const { isModuleEnabled } = useModules();
  const { isAdmin } = useUserPermissions();
  const { data: credentials = [], isLoading } = useAllCredentials();
  const { data: workspaceId = '' } = useWorkspaceId();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<DashboardFilter>('all');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [addForMember, setAddForMember] = useState<string | null>(null);

  if (!isModuleEnabled('credentialWalletEnabled') || !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Aggregate stats
  const total = credentials.length;
  const statCurrent = credentials.filter(c => getCredentialStatus(c.expiry_date) === 'current').length;
  const statExpiring = credentials.filter(c => {
    const s = getCredentialStatus(c.expiry_date);
    return s === 'expiring_soon';
  }).length;
  const statExpired = credentials.filter(c => getCredentialStatus(c.expiry_date) === 'expired').length;

  // Build team member list from credentials
  const memberMap = new Map<string, TeamMember>();
  credentials.forEach(c => {
    if (c.holder && !memberMap.has(c.holder_id)) {
      memberMap.set(c.holder_id, c.holder as TeamMember);
    }
  });
  const members = Array.from(memberMap.values());

  // Filter members by search
  const filteredMembers = members.filter(m => {
    const name = (m.full_name || '').toLowerCase();
    return !search || name.includes(search.toLowerCase());
  });

  // Get credentials for a specific member
  const memberCredentials = (userId: string) =>
    credentials.filter(c => c.holder_id === userId && c.status !== 'deleted');

  // Determine status for member+type cell
  const cellStatus = (userId: string, type: string): CredentialStatus | null => {
    const creds = credentials.filter(c => c.holder_id === userId && c.credential_type === type);
    if (creds.length === 0) return null;
    // Take the best status (most recent / best)
    const statuses = creds.map(c => getCredentialStatus(c.expiry_date));
    if (statuses.includes('current')) return 'current';
    if (statuses.includes('expiring_soon')) return 'expiring_soon';
    if (statuses.includes('expired')) return 'expired';
    return 'no_expiry';
  };

  // Sort members: expired first → expiring → current → no credentials
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    const getPriority = (userId: string) => {
      const creds = memberCredentials(userId);
      if (creds.length === 0) return 4;
      const statuses = creds.map(c => getCredentialStatus(c.expiry_date));
      if (statuses.includes('expired')) return 1;
      if (statuses.includes('expiring_soon')) return 2;
      if (statuses.includes('current')) return 3;
      return 4;
    };
    return getPriority(a.user_id) - getPriority(b.user_id);
  });

  // CSV export
  const handleExport = () => {
    const header = 'Name,Credential Type,Issuing Authority,Number,Issue Date,Expiry Date,Status,Days Until Expiry\n';
    const rows = credentials.map(c => {
      const holder = c.holder as TeamMember | undefined;
      const status = getCredentialStatus(c.expiry_date);
      const days = c.expiry_date
        ? Math.ceil((new Date(c.expiry_date).getTime() - Date.now()) / 86400000)
        : '';
      return [
        holder?.full_name || '',
        c.custom_type_label || c.credential_type,
        c.issuing_authority || '',
        c.credential_number || '',
        c.issue_date || '',
        c.expiry_date || '',
        status,
        days,
      ].map(v => `"${v}"`).join(',');
    });
    const csv = header + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credential-compliance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedMemberCreds = selectedMember
    ? memberCredentials(selectedMember.user_id)
    : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <BadgeCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Credential Compliance</h1>
              <p className="text-sm text-muted-foreground">
                Track licenses, certifications, and documents across your team
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleExport} className="shrink-0">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-8">
          {[
            { label: 'Total Tracked', value: total, color: 'text-foreground' },
            { label: 'Current', value: statCurrent, color: 'text-green-600 dark:text-green-400', emoji: '✅' },
            { label: 'Expiring Soon', value: statExpiring, color: 'text-amber-600 dark:text-amber-400', emoji: '⚠️' },
            { label: 'Expired', value: statExpired, color: 'text-red-600 dark:text-red-400', emoji: '🔴' },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={cn('text-2xl font-bold mt-1', stat.color)}>
                {stat.emoji && <span className="mr-1 text-lg">{stat.emoji}</span>}
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name…"
              className="pl-9"
            />
          </div>
          <div className="flex gap-1.5">
            {(['all', 'current', 'expiring_soon', 'expired'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors capitalize',
                  filter === f
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {f === 'all' ? 'All' : f === 'expiring_soon' ? 'Expiring' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Compliance matrix */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : sortedMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BadgeCheck className="h-14 w-14 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No credentials on file yet</h3>
            <p className="text-sm text-muted-foreground">
              Team members can add their credentials from their Profile page
            </p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[200px]">
                      Team Member
                    </th>
                    {COMMON_TYPES.map(type => (
                      <th key={type} className="px-3 py-3 text-center font-medium text-muted-foreground min-w-[80px] max-w-[100px]">
                        <span className="block truncate text-[11px]" title={type}>{type}</span>
                      </th>
                    ))}
                    <th className="px-3 py-3 text-center font-medium text-muted-foreground min-w-[60px] text-[11px]">
                      Other
                    </th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedMembers.map(member => {
                    const creds = memberCredentials(member.user_id);
                    const otherCount = creds.filter(
                      c => !COMMON_TYPES.includes(c.credential_type)
                    ).length;

                    return (
                      <tr
                        key={member.user_id}
                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => setSelectedMember(member)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7 flex-shrink-0">
                              <AvatarImage src={member.avatar_url ?? undefined} />
                              <AvatarFallback className="text-[10px]">
                                {(member.full_name || '?').slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium truncate text-foreground">
                                {member.full_name || 'Unknown'}
                              </p>
                              {member.job_title && (
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {member.job_title}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        {COMMON_TYPES.map(type => {
                          const s = cellStatus(member.user_id, type);
                          return (
                            <td key={type} className="px-3 py-3 text-center">
                              {s ? (
                                <CredentialStatusDot status={s} />
                              ) : (
                                <span className="text-muted-foreground/40 text-lg leading-none">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-3 text-center">
                          {otherCount > 0 ? (
                            <span className="text-xs text-muted-foreground font-medium">{otherCount}</span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                        <td className="pr-3 py-3 text-center">
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Team member detail drawer */}
      <Sheet open={!!selectedMember} onOpenChange={open => !open && setSelectedMember(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {selectedMember && (
            <>
              <SheetHeader className="pb-4 border-b">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedMember.avatar_url ?? undefined} />
                    <AvatarFallback>
                      {(selectedMember.full_name || '?').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="text-base">{selectedMember.full_name || 'Team Member'}</SheetTitle>
                    {(selectedMember.job_title || selectedMember.department) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[selectedMember.job_title, selectedMember.department].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
              </SheetHeader>

              <div className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">
                    {selectedMemberCreds.length} credential{selectedMemberCreds.length !== 1 ? 's' : ''}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAddForMember(selectedMember.user_id);
                    }}
                  >
                    Add Credential
                  </Button>
                </div>

                {selectedMemberCreds.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No credentials on file
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedMemberCreds.map(c => (
                      <CredentialCard
                        key={c.id}
                        credential={c}
                        holderName={selectedMember.full_name || 'Team Member'}
                        jobTitle={selectedMember.job_title}
                        department={selectedMember.department}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {addForMember && (
        <AddCredentialSheet
          open={!!addForMember}
          onOpenChange={open => !open && setAddForMember(null)}
          prefilledHolderId={addForMember}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
}
