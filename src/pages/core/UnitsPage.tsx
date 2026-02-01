import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DoorOpen, Plus, Search, Bed, Bath, Building, Calendar, Loader2, Upload } from 'lucide-react';
import { useUnits, useUnitStats } from '@/hooks/useUnits';
import { useProperties } from '@/hooks/useProperties';
import { UnitDialog } from '@/components/units/UnitDialog';
import { UnitImportDialog } from '@/components/units/UnitImportDialog';
import { Skeleton } from '@/components/ui/skeleton';

export default function UnitsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');

  const { data: units, isLoading } = useUnits();
  const { data: stats } = useUnitStats();
  const { data: properties } = useProperties();

  const filteredUnits = units?.filter(unit => {
    const matchesSearch = 
      unit.unit_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.property?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProperty = propertyFilter === 'all' || unit.property_id === propertyFilter;
    return matchesSearch && matchesProperty;
  });

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Units</h1>
          <p className="text-muted-foreground">Manage units across your properties</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Unit
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Total Units</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-success">{stats.occupied}</div>
              <p className="text-sm text-muted-foreground">Occupied</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-warning">{stats.vacant}</div>
              <p className="text-sm text-muted-foreground">Vacant</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.occupancyRate}%</div>
              <p className="text-sm text-muted-foreground">Occupancy Rate</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search units..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {properties?.map((property) => (
              <SelectItem key={property.id} value={property.id}>
                {property.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Units Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-6 w-20 mb-2" />
                <Skeleton className="h-4 w-32 mb-4" />
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredUnits && filteredUnits.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredUnits.map((unit) => (
            <Card key={unit.id} className="card-interactive">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <DoorOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Unit {unit.unit_number}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {unit.property?.name}
                      </p>
                    </div>
                  </div>
                  <Badge variant={
                    unit.status === 'occupied' ? 'secondary' : 
                    unit.status === 'vacant' ? 'outline' : 'destructive'
                  }>
                    {unit.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Bed className="h-4 w-4" />
                    <span>{unit.bedrooms} bed</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Bath className="h-4 w-4" />
                    <span>{unit.bathrooms} bath</span>
                  </div>
                  {unit.square_feet && (
                    <span>{unit.square_feet} sqft</span>
                  )}
                </div>
                {unit.last_inspection_date && (
                  <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Last inspected: {new Date(unit.last_inspection_date).toLocaleDateString()}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
              <DoorOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No units found</h3>
              <p className="text-muted-foreground">
                {searchQuery || propertyFilter !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Add your first unit to get started'}
              </p>
            </div>
            {!searchQuery && propertyFilter === 'all' && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Unit
              </Button>
            )}
          </div>
        </Card>
      )}

      <UnitDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <UnitImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
    </div>
  );
}
