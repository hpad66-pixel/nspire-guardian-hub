import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MapPinned } from 'lucide-react';
import { SiteAssetMap } from '@/components/projects/site-map/SiteAssetMap';
import { useAssets } from '@/hooks/useAssets';
import { useProject } from '@/hooks/useProjects';
import { GLORIETA_SITE_LAYOUT, countAssetsByKind } from '@/lib/site-map/glorietaSiteLayout';
import { Card, CardContent } from '@/components/ui/card';

const CONVEYANCE_PROJECT_ID = '4b168bb0-a0a0-4c0a-bcd8-eb56ec2f413d';

export function ProjectSiteMapTab({
  projectId,
  variant = 'full',
}: {
  projectId: string;
  variant?: 'hero' | 'full';
}) {
  const navigate = useNavigate();
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const propertyId = project?.property_id ?? undefined;
  const { data: assets = [], isLoading: assetsLoading } = useAssets(propertyId);
  const counts = useMemo(() => countAssetsByKind(GLORIETA_SITE_LAYOUT), []);

  // Glorieta curated layout for Conveyance; other projects still get the hero shell
  // with empty DB pins until they have their own layout.
  const isGlorieta = projectId === CONVEYANCE_PROJECT_ID
    || (project?.name ?? '').toLowerCase().includes('conveyance')
    || (project?.name ?? '').toLowerCase().includes('sewer extension');

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading site map…
      </div>
    );
  }

  if (!isGlorieta) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <MapPinned className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-semibold">Site map not curated for this project yet</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              The interactive Glorieta as-built map is live on Conveyance & Close-Out.
              Upload as-builts for this project and we will pin its assets the same way.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="project-site-map-tab">
      {variant === 'full' && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Manholes', value: counts.manhole, hint: 'S-1 … S-8' },
            { label: 'Cleanouts', value: counts.cleanout, hint: 'CO-01 … CO-24' },
            { label: 'Retention pond', value: counts.retention_pond, hint: 'POND-1' },
          ].map((kpi) => (
            <Card key={kpi.label} className="border-[var(--apas-sapphire)]/15 bg-gradient-to-br from-card to-[var(--apas-sapphire)]/[0.03]">
              <CardContent className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{kpi.label}</p>
                <p className="mt-1 font-display text-3xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.hint}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SiteAssetMap
        layout={GLORIETA_SITE_LAYOUT}
        dbAssets={assets}
        variant={variant}
        inspectAction={{
          label: 'Inspect this asset',
          onClick: (asset, db) => {
            if (!propertyId) return;
            const params = new URLSearchParams({
              propertyId,
              wizard: '1',
            });
            if (db?.id) params.set('assetId', db.id);
            else params.set('assetCode', asset.code);
            navigate(`/inspections/daily?${params.toString()}`);
          },
        }}
      />

      {assetsLoading && (
        <p className="text-center text-xs text-muted-foreground">Syncing inspection register…</p>
      )}
    </div>
  );
}

export default ProjectSiteMapTab;
