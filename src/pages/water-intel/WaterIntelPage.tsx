import { useParams } from 'react-router-dom';
import { WaterIntelDashboard } from '@/components/water-intel/WaterIntelDashboard';
import { useUserPermissions } from '@/hooks/usePermissions';
import { usePlatformSuperAdmin } from '@/hooks/usePlatformAdmin';

export default function WaterIntelPage() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const { isPropertyManager, isAdmin } = useUserPermissions();
  const { isSuperAdmin } = usePlatformSuperAdmin();
  const dashboardMode = isPropertyManager && !isAdmin && !isSuperAdmin ? 'property_manager' : 'staff';
  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <WaterIntelDashboard scope={{ propertyId }} mode={dashboardMode} />
    </div>
  );
}
