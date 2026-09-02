import { useParams } from 'react-router-dom';
import { WaterIntelDashboard } from '@/components/water-intel/WaterIntelDashboard';

export default function WaterIntelPage() {
  const { propertyId } = useParams<{ propertyId: string }>();
  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <WaterIntelDashboard scope={{ propertyId }} mode="staff" />
    </div>
  );
}
