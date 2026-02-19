import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building, Plus, MapPin, DoorOpen, Calendar, Pencil, Trash2, MoreVertical,
  BarChart2, Zap, Images, Briefcase, ChevronRight,
} from 'lucide-react';
import { useProperties, useDeleteProperty, type Property } from '@/hooks/useProperties';
import { Skeleton } from '@/components/ui/skeleton';
import { PropertyDialog } from '@/components/properties/PropertyDialog';
import { useNavigate } from 'react-router-dom';
import { useAllPropertiesUtilitySummary } from '@/hooks/useUtilityBills';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function PropertiesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [deletingProperty, setDeletingProperty] = useState<Property | null>(null);
  const navigate = useNavigate();

  const { data: properties, isLoading, error } = useProperties();
  const deleteProperty = useDeleteProperty();
  const { data: utilitySummary } = useAllPropertiesUtilitySummary();

  // Build a lookup: propertyId → ytd_total
  const ytdByProperty: Record<string, number> = {};
  for (const row of utilitySummary ?? []) {
    ytdByProperty[row.property_id] = row.ytd_total;
  }

  const managedProperties = properties?.filter(p => p.is_managed_property !== false) ?? [];
  const commercialProperties = properties?.filter(p => p.is_managed_property === false) ?? [];

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setDialogOpen(true);
  };

  const handleOpenProperty = (propertyId: string) => {
    navigate(`/units?propertyId=${propertyId}`);
  };

  const handleDelete = async () => {
    if (deletingProperty) {
      await deleteProperty.mutateAsync(deletingProperty.id);
      setDeletingProperty(null);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingProperty(null);
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="text-destructive">Failed to load properties: {error.message}</div>
      </div>
    );
  }

  const renderPropertyCard = (property: Property, isManaged: boolean) => {
    const ytd = ytdByProperty[property.id];
    return (
      <Card
        key={property.id}
        className="card-interactive cursor-pointer"
        role="button"
        tabIndex={0}
        onClick={() => isManaged ? handleOpenProperty(property.id) : navigate(`/projects`)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            isManaged ? handleOpenProperty(property.id) : navigate(`/projects`);
          }
        }}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isManaged ? 'bg-primary/10' : 'bg-amber-500/10'}`}>
                {isManaged
                  ? <Building className="h-5 w-5 text-primary" />
                  : <Briefcase className="h-5 w-5 text-amber-600" />
                }
              </div>
              <div>
                <CardTitle className="text-lg">{property.name}</CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {property.city}, {property.state}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={property.status === 'active' ? 'secondary' : 'outline'}>
                {property.status === 'active' ? 'Active' : property.status}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(property);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingProperty(property);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{property.address}</p>

            {isManaged && (
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
            )}

            {isManaged && (
              <div className="flex items-center gap-1.5 text-xs">
                <Zap className="h-3 w-3 text-amber-500 flex-shrink-0" />
                {ytd != null ? (
                  <span className="text-muted-foreground">
                    YTD Utilities:{' '}
                    <span className="font-semibold text-foreground">
                      ${ytd.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground/60 italic">No utility data — add a bill</span>
                )}
              </div>
            )}

            {/* Module badges + action buttons */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                {isManaged && property.nspire_enabled && (
                  <Badge variant="outline" className="text-xs bg-module-inspections/10 text-cyan-700 border-module-inspections/30">
                    NSPIRE
                  </Badge>
                )}
                {isManaged && property.projects_enabled && (
                  <Badge variant="outline" className="text-xs bg-module-projects/10 text-violet-700 border-module-projects/30">
                    Projects
                  </Badge>
                )}
                {!isManaged && (
                  <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 border-amber-300">
                    Commercial / Project Site
                  </Badge>
                )}
              </div>
              <div className="flex gap-1.5">
                {isManaged && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/properties/${property.id}/gallery`);
                      }}
                    >
                      <Images className="h-3 w-3" />
                      Gallery
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/properties/${property.id}/analytics`);
                      }}
                    >
                      <BarChart2 className="h-3 w-3" />
                      Utilities & Inventory
                    </Button>
                  </>
                )}
                {!isManaged && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/projects`);
                    }}
                  >
                    <ChevronRight className="h-3 w-3" />
                    Go to Projects
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Properties</h1>
          <p className="text-sm text-muted-foreground">Managed multifamily and residential portfolio</p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)} className="self-start sm:self-auto">
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
      ) : (
        <>
          {/* ── Managed Properties ── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Managed Properties</h2>
              <Badge variant="secondary" className="text-xs">{managedProperties.length}</Badge>
            </div>
            {managedProperties.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {managedProperties.map(p => renderPropertyCard(p, true))}
              </div>
            ) : (
              <Card className="p-10 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                    <Building className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">No managed properties</h3>
                    <p className="text-muted-foreground text-sm">Add a multifamily or residential property to get started.</p>
                  </div>
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Property
                  </Button>
                </div>
              </Card>
            )}
          </section>

          {/* ── Commercial / Project Sites ── */}
          {commercialProperties.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-amber-600" />
                <h2 className="text-lg font-semibold">Commercial / Project Sites</h2>
                <Badge variant="outline" className="text-xs text-amber-700 border-amber-300 bg-amber-50">{commercialProperties.length}</Badge>
              </div>
              <p className="text-sm text-muted-foreground -mt-2">
                These sites are linked to Projects — they are not managed as residential properties and do not appear in the Units, NSPIRE, or Grounds modules.
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {commercialProperties.map(p => renderPropertyCard(p, false))}
              </div>
            </section>
          )}
        </>
      )}

      <PropertyDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        property={editingProperty}
      />

      <AlertDialog open={!!deletingProperty} onOpenChange={(open) => !open && setDeletingProperty(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingProperty?.name}"? This action cannot be undone
              and will remove all associated units, inspections, and issues.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
