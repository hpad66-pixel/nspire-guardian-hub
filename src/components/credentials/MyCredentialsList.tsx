import { useState } from 'react';
import { BadgeCheck, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useMyCredentials,
  getCredentialStatus,
  type CredentialStatus,
} from '@/hooks/useCredentials';
import { CredentialCard } from './CredentialCard';
import { AddCredentialSheet } from './AddCredentialSheet';
import { useAuth } from '@/hooks/useAuth';
import { useMyProfile } from '@/hooks/useMyProfile';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

function useWorkspaceId() {
  return useQuery({
    queryKey: ['my-workspace-id'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_my_workspace_id');
      return (data as string | null) ?? '';
    },
  });
}

type Filter = 'all' | CredentialStatus;

const FILTER_TABS: { key: Filter; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '' },
  { key: 'current', label: 'Current', emoji: '✅' },
  { key: 'expiring_soon', label: 'Expiring Soon', emoji: '⚠️' },
  { key: 'expired', label: 'Expired', emoji: '🔴' },
];

export function MyCredentialsList() {
  const { user } = useAuth();
  const { data: profile } = useMyProfile();
  const { data: credentials = [], isLoading } = useMyCredentials();
  const { data: workspaceId = '' } = useWorkspaceId();

  const [filter, setFilter] = useState<Filter>('all');
  const [addOpen, setAddOpen] = useState(false);

  const holderName = profile?.full_name || user?.email?.split('@')[0] || 'You';

  // Compute status counts
  const counts = credentials.reduce(
    (acc, c) => {
      const s = getCredentialStatus(c.expiry_date);
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    },
    {} as Record<CredentialStatus, number>
  );

  const filtered = filter === 'all'
    ? credentials
    : credentials.filter(c => getCredentialStatus(c.expiry_date) === filter);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Empty state
  if (credentials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BadgeCheck className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Your credentials live here
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-6">
          Add your licenses, certifications, and insurance documents and we'll
          remind you before they expire.
        </p>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Credential
        </Button>

        <AddCredentialSheet
          open={addOpen}
          onOpenChange={setAddOpen}
          workspaceId={workspaceId}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        {/* Summary chips */}
        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.filter(t => t.key !== 'all').map(tab => {
            const count = counts[tab.key as CredentialStatus] || 0;
            if (count === 0) return null;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(f => f === tab.key ? 'all' : tab.key as Filter)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all',
                  filter === tab.key
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                )}
              >
                <span>{tab.emoji}</span>
                <span>{count} {tab.label}</span>
              </button>
            );
          })}
        </div>

        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      {/* Filter bar */}
      {(counts.current || 0) + (counts.expiring_soon || 0) + (counts.expired || 0) > 0 && (
        <div className="flex gap-1.5">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                filter === tab.key
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
              {tab.key !== 'all' && counts[tab.key as CredentialStatus]
                ? ` (${counts[tab.key as CredentialStatus]})`
                : ''}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No {filter === 'all' ? '' : filter.replace('_', ' ')} credentials
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map(credential => (
            <CredentialCard
              key={credential.id}
              credential={credential}
              holderName={holderName}
              jobTitle={profile?.job_title}
              department={profile?.department}
            />
          ))}
        </div>
      )}

      <AddCredentialSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        workspaceId={workspaceId}
      />
    </div>
  );
}
