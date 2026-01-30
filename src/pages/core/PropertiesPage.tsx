import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building, Plus, MapPin, DoorOpen, Calendar, Loader2 } from 'lucide-react';
import { useProperties } from '@/hooks/useProperties';
import { Skeleton } from '@/components/ui/skeleton';

export default function PropertiesPage() {
  const { data: properties, isLoading, error } = useProperties();

  if (error) {
    return (
      <div className="p-6">
        <div className="text-destructive">Failed to load properties: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Properties</h1>
          <p className="text-muted-foreground">Manage your property portfolio</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Property
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-5 w-32 mt-2" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <div className="flex justify-between mt-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : properties && properties.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <Card key={property.id} className="card-interactive">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{property.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {property.city}, {property.state}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={property.status === 'active' ? 'secondary' : 'outline'}>
                    {property.status === 'active' ? 'Active' : property.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{property.address}</p>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <DoorOpen className="h-4 w-4" />
                      <span>{property.total_units} units</span>
                    </div>
                    {property.year_built && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Built {property.year_built}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {property.nspire_enabled && (
                      <Badge variant="outline" className="text-xs bg-module-inspections/10 text-cyan-700 border-module-inspections/30">
                        NSPIRE
                      </Badge>
                    )}
                    {property.projects_enabled && (
                      <Badge variant="outline" className="text-xs bg-module-projects/10 text-violet-700 border-module-projects/30">
                        Projects
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
              <Building className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No properties yet</h3>
              <p className="text-muted-foreground">Add your first property to get started</p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
