import { useParams, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { usePortalBySlug, usePortalSession } from '@/hooks/usePortal';
import { GlorietaSchedule } from './schedule/GlorietaSchedule';

export default function PortalSchedulePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: portal, isLoading } = usePortalBySlug(slug);
  const { isAuthenticated } = usePortalSession();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated || !portal) {
    return <Navigate to={`/portal/${slug}`} replace />;
  }

  return (
    <GlorietaSchedule
      portalId={portal.id}
      portalName={portal.client_name ?? portal.name}
      accentColor={portal.brand_accent_color ?? '#D4A017'}
    />
  );
}
