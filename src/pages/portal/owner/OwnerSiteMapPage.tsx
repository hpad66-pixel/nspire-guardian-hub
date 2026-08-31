import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { SiteAssetMap } from '@/components/projects/site-map/SiteAssetMap';
import { useClientPortalProject, useOwnerPortalHref } from '@/components/portal/ClientPortalProjectContext';
import { useAssets } from '@/hooks/useAssets';
import { useProject } from '@/hooks/useProjects';
import { GLORIETA_SITE_LAYOUT, countAssetsByKind } from '@/lib/site-map/glorietaSiteLayout';

export default function OwnerSiteMapPage() {
  const href = useOwnerPortalHref();
  const { selectedProjectId: projectId } = useClientPortalProject();
  const { data: project, isLoading } = useProject(projectId ?? null);
  const { data: assets = [] } = useAssets(project?.property_id ?? undefined);
  const counts = countAssetsByKind(GLORIETA_SITE_LAYOUT);

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6" data-testid="owner-site-map-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to={href()}
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to overview
          </Link>
          <h1 className="font-display text-3xl font-bold tracking-tight">Site map</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Interactive property map for {project?.name || 'your project'} — sanitary assets from
            the certified as-builts, plus the retention pond on site.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-800">
          <Sparkles className="h-3.5 w-3.5" />
          {counts.total} assets · owner view
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading map…
        </div>
      ) : (
        <SiteAssetMap
          layout={GLORIETA_SITE_LAYOUT}
          dbAssets={assets}
          variant="portal"
          readOnly
        />
      )}
    </div>
  );
}
