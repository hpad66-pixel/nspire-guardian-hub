import { Link, Navigate } from 'react-router-dom';
import { useOpsPortalProperty } from '@/components/portal/OpsPortalPropertyContext';
import { opsPortalPath } from '@/lib/portal/opsPortal';
import { WaterIntelDashboard } from '@/components/water-intel/WaterIntelDashboard';

export default function OpsWaterPage() {
  const { propertyId, can, isLoading } = useOpsPortalProperty();

  if (!isLoading && !can('water')) {
    return <Navigate to={opsPortalPath(propertyId)} replace />;
  }

  return (
    <div className="space-y-4" data-testid="ops-water-page">
      <Link to={opsPortalPath(propertyId)} className="text-sm text-muted-foreground hover:underline">← Home</Link>
      <WaterIntelDashboard scope={{ propertyId }} mode="ops" />
    </div>
  );
}
