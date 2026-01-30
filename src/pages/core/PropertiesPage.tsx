import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building, Plus, MapPin, DoorOpen, Calendar } from 'lucide-react';

export default function PropertiesPage() {
  const properties = [
    { id: '1', name: 'Oak Ridge Apartments', address: '123 Oak Street', city: 'Austin', state: 'TX', units: 200, yearBuilt: 1998, status: 'active' },
    { id: '2', name: 'Maple Commons', address: '456 Maple Ave', city: 'Austin', state: 'TX', units: 280, yearBuilt: 2005, status: 'active' },
    { id: '3', name: 'Pine View Residences', address: '789 Pine Blvd', city: 'Round Rock', state: 'TX', units: 220, yearBuilt: 2012, status: 'active' },
    { id: '4', name: 'Cedar Heights', address: '321 Cedar Lane', city: 'Georgetown', state: 'TX', units: 147, yearBuilt: 2018, status: 'active' },
  ];

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
                <Badge variant="secondary">Active</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{property.address}</p>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <DoorOpen className="h-4 w-4" />
                    <span>{property.units} units</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Built {property.yearBuilt}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
