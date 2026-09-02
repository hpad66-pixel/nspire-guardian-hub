import { useMemo, useState } from 'react';
import { Share2, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePortals, usePortalCount } from '@/hooks/usePortal';
import { PortalCard } from '@/components/portals/PortalCard';
import { CreatePortalSheet } from '@/components/portals/CreatePortalSheet';
import { ownerPortalPath } from '@/lib/portal/ownerPortalPaths';

export default function PortalsDashboardPage() {
  const { data: portals = [], isLoading } = usePortals();
  const { count, limit, canCreate } = usePortalCount();
  const [createOpen, setCreateOpen] = useState(false);

  const nearLimit = !canCreate || (limit !== Infinity && count >= limit - 1);
  const atLimit = !canCreate;

  const groups = useMemo(() => {
    const map = new Map<string, { key: string; label: string; portals: typeof portals }>();
    for (const portal of portals) {
      const key = portal.client_id || portal.client_name || portal.id;
      const existing = map.get(key);
      if (existing) {
        existing.portals.push(portal);
        continue;
      }
      map.set(key, {
        key,
        label: portal.client_name || portal.name,
        portals: [portal],
      });
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [portals]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Client Portals</h1>
          <p className="text-muted-foreground text-sm mt-1">
            One link per client. If they have several projects, every job appears as a tab on that same portal.
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
        <div className="space-y-8">
          {groups.map((group) => {
            const primary = group.portals.find((p) => p.project_id) ?? group.portals[0];
            return (
              <section key={group.key} className="space-y-3" data-testid={`portal-client-group-${group.key}`}>
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Client</p>
                    <h2 className="text-lg font-semibold">{group.label}</h2>
                    <p className="text-xs text-muted-foreground">
                      {group.portals.length} portal{group.portals.length === 1 ? '' : 's'} · same client view
                    </p>
                  </div>
                  {primary?.project_id && (
                    <Button size="sm" variant="outline" onClick={() => window.open(ownerPortalPath(primary.project_id), '_blank')}>
                      Open client portal
                    </Button>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                  {group.portals.map((portal) => (
                    <PortalCard key={portal.id} portal={portal} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <CreatePortalSheet open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
