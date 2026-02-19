import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PhotoGallery } from '@/components/gallery/PhotoGallery';
import { useProperties } from '@/hooks/useProperties';
import { Skeleton } from '@/components/ui/skeleton';

export default function PropertyGalleryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: properties, isLoading } = useProperties();

  const property = properties?.find(p => p.id === id);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-3 gap-0.5">
          {[...Array(9)].map((_, i) => <Skeleton key={i} className="aspect-square" />)}
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Property not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/properties')}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back to Properties
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center gap-3 bg-background">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/properties')}
          className="-ml-1 text-muted-foreground hover:text-foreground px-1"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Properties
        </Button>
        <div className="text-muted-foreground">/</div>
        <span className="text-sm font-medium truncate">{property.name}</span>
      </div>

      <div className="flex-1 overflow-hidden">
        <PhotoGallery
          context="property"
          contextId={id!}
          contextName={property.name}
          onBack={() => navigate('/properties')}
        />
      </div>
    </div>
  );
}
