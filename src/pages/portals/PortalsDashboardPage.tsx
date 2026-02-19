import { useState } from 'react';
import { Share2, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePortals, usePortalCount, useTotalPendingRequests } from '@/hooks/usePortal';
import { PortalCard } from '@/components/portals/PortalCard';
import { CreatePortalSheet } from '@/components/portals/CreatePortalSheet';
import { useNavigate } from 'react-router-dom';

export default function PortalsDashboardPage() {
  const { data: portals = [], isLoading } = usePortals();
  const { count, limit, canCreate } = usePortalCount();
  const totalPending = useTotalPendingRequests();
  const [createOpen, setCreateOpen] = useState(false);

  const nearLimit = !canCreate || (limit !== Infinity && count >= limit - 1);
  const atLimit = !canCreate;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Client Portals</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Share compliance data with your clients and partners
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          disabled={atLimit}
          title={atLimit ? `You've reached your ${limit} portal limit. Upgrade to create more.` : undefined}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Portal
        </Button>
      </div>

      {/* Tier limit banner */}
      {atLimit && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-4">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            You're using {count} of {limit} portals on your current plan.
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
            Upgrade your plan to create additional portals.
          </p>
        </div>
      )}
      {!atLimit && nearLimit && limit !== Infinity && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900 p-3">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            You have {limit - count} portal{limit - count !== 1 ? 's' : ''} remaining on your current plan.
          </p>
        </div>
      )}

      {/* Portal list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : portals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Share2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">No portals yet</h3>
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            Create a portal to share your compliance records with clients and partners.
            They get a clean, branded view — you control exactly what they see.
          </p>
          <Button onClick={() => setCreateOpen(true)} className="mt-6">
            <Plus className="h-4 w-4 mr-2" />
            Create Portal
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
          {portals.map(portal => (
            <PortalCard key={portal.id} portal={portal} />
          ))}
        </div>
      )}

      <CreatePortalSheet open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
