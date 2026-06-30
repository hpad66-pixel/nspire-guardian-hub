import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRef } from 'react';
import { DoorOpen, Plus, Search, Bed, Bath, Building, Building2, Calendar, Upload, Pencil, Trash2, Camera, Loader2 } from 'lucide-react';
import { useUnitsByProperty, useDeleteUnit, type Unit } from '@/hooks/useUnits';
import { buildingKey, buildingColor } from '@/lib/units/building';
import { useSetUnitPhoto, unitPhotoUrl } from '@/hooks/useUnitPhoto';
import { useManagedProperties } from '@/hooks/useProperties';
import { UnitDialog } from '@/components/units/UnitDialog';
import { UnitImportDialog } from '@/components/units/UnitImportDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserPermissions } from '@/hooks/usePermissions';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { RefreshCw, ClipboardCheck, AlertTriangle } from 'lucide-react';
import { useUnitTurns, useStartUnitTurn, useConductTurnInspection, useDeferTurnInspection, type UnitTurn } from '@/hooks/useUnitTurns';
import { UnitTurnDrawer } from '@/components/units/UnitTurnDrawer';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function UnitsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState<string>('');
  const [searchParams, setSearchParams] = useSearchParams();

  const navigate = useNavigate();
  const { data: units = [], isLoading } = useUnitsByProperty(propertyFilter || null);
  const { data: properties } = useManagedProperties();
  const { data: turnsData } = useUnitTurns(propertyFilter || null);
  const turnByUnit = turnsData?.byUnit ?? {};
  const pendingTurns = (turnsData?.turns ?? []).filter((t) => t.nspire_pending && t.status !== 'closed');
  const startTurn = useStartUnitTurn();
  const conduct = useConductTurnInspection();
  const defer = useDeferTurnInspection();
  const [promptUnitId, setPromptUnitId] = useState<string | null>(null);
  const [drawerTurnId, setDrawerTurnId] = useState<string | null>(null);
  const promptTurn: UnitTurn | null = promptUnitId ? (turnByUnit[promptUnitId] ?? null) : null;
  const showPrompt = !!promptTurn && promptTurn.status === 'open' && promptTurn.nspire_required && !promptTurn.inspection_id;

  const deleteUnit = useDeleteUnit();
  const { canCreate, canUpdate, canDelete } = useUserPermissions();
  const canCreateUnits = canCreate('properties');
  const canUpdateUnits = canUpdate('properties');
  const canDeleteUnits = canDelete('properties');

  useEffect(() => {
    const param = searchParams.get('propertyId');
    if (param && param !== 'all') {
      setPropertyFilter(param);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!propertyFilter && properties && properties.length > 0) {
      setPropertyFilter(properties[0].id);
      setSearchParams({ propertyId: properties[0].id });
    }
  }, [properties, propertyFilter, setSearchParams]);

  const filteredUnits = units.filter(unit => {
    const matchesSearch = 
      unit.unit_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      unit.property?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProperty = !propertyFilter || unit.property_id === propertyFilter;
    return matchesSearch && matchesProperty;
  });

  const stats = useMemo(() => {
    const total = filteredUnits.length;
    const occupied = filteredUnits.filter(u => u.status === 'occupied').length;
    const vacant = filteredUnits.filter(u => u.status === 'vacant').length;
    const maintenance = filteredUnits.filter(u => u.status === 'maintenance').length;
    return {
      total,
      occupied,
      vacant,
      maintenance,
      occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0,
    };
  }, [filteredUnits]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Units</h1>
          <p className="text-muted-foreground">Manage units across your properties</p>
        </div>
        {canCreateUnits && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <Button onClick={() => {
              setSelectedUnit(null);
              setDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Unit
            </Button>
          </div>
        )}
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
        <Select
          value={propertyFilter}
          onValueChange={(value) => {
            setPropertyFilter(value);
            setSearchParams({ propertyId: value });
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select property" />
          </SelectTrigger>
          <SelectContent>
            {properties?.map((property) => (
              <SelectItem key={property.id} value={property.id}>
                {property.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* NSPIRE turnover alert */}
      {pendingTurns.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:bg-amber-950/20">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <b>{pendingTurns.length}</b> unit{pendingTurns.length !== 1 ? 's have' : ' has'} turned over and need{pendingTurns.length !== 1 ? '' : 's'} a NSPIRE inspection. These show as pending action items on the property log.
          </p>
        </div>
      )}

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
            <Card key={unit.id} className="card-interactive overflow-hidden">
              <UnitPhotoBanner unit={unit} canEdit={canUpdateUnits} />
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const bk = buildingKey(unit.unit_number);
                      const col = buildingColor(bk);
                      return (
                        <div
                          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl shadow-sm"
                          style={{ background: col.bg, color: col.fg }}
                          title={`Building ${bk}`}
                        >
                          <Building2 className="h-3.5 w-3.5 opacity-90" />
                          <span className="text-[12px] font-extrabold leading-none">{bk}</span>
                        </div>
                      );
                    })()}
                    <div>
                      <h3 className="font-semibold">Unit {unit.unit_number}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {unit.property?.name} · Bldg {buildingKey(unit.unit_number)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={
                      unit.status === 'occupied' ? 'secondary' :
                      unit.status === 'vacant' ? 'outline' : 'destructive'
                    }>
                      {unit.status}
                    </Badge>
                    {(() => {
                      const t = turnByUnit[unit.id];
                      if (!t) return null;
                      if (t.nspire_pending) return <button onClick={() => setPromptUnitId(unit.id)}><Badge className="cursor-pointer bg-amber-100 text-amber-800 hover:bg-amber-200">⚑ NSPIRE pending</Badge></button>;
                      if (t.status === 'inspecting') return <Badge className="bg-blue-100 text-blue-800">Inspecting</Badge>;
                      return <Badge variant="outline">Turn open</Badge>;
                    })()}
                  </div>
                </div>
                {(canUpdateUnits || canDeleteUnits) && (
                  <div className="flex items-center gap-2 mb-3">
                    {canUpdateUnits && !turnByUnit[unit.id] && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={startTurn.isPending}
                        onClick={() => startTurn.mutate({ unitId: unit.id, propertyId: propertyFilter || null }, { onSuccess: () => setPromptUnitId(unit.id) })}
                        title="Start a unit turn (triggers a NSPIRE inspection)"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Start turn
                      </Button>
                    )}
                    {turnByUnit[unit.id] && (
                      <Button variant="outline" size="sm" onClick={() => setDrawerTurnId(turnByUnit[unit.id].id)} title="Turn audit log">
                        <ClipboardCheck className="h-3 w-3 mr-1" />
                        Turn log
                      </Button>
                    )}
                    {canUpdateUnits && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUnit(unit);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    )}
                    {canDeleteUnits && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Unit</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete Unit {unit.unit_number}. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteUnit.mutate(unit.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                )}
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
                {searchQuery || propertyFilter !== '' 
                  ? 'Try adjusting your filters'
                  : 'Add your first unit to get started'}
              </p>
            </div>
            {canCreateUnits && !searchQuery && propertyFilter === '' && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Unit
              </Button>
            )}
          </div>
        </Card>
      )}

      <UnitDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedUnit(null);
        }}
        unit={selectedUnit || undefined}
      />
      {canCreateUnits && (
        <UnitImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
      )}

      {drawerTurnId && (
        <UnitTurnDrawer turnId={drawerTurnId} open onClose={() => setDrawerTurnId(null)} propertyId={propertyFilter || null} />
      )}

      {/* NSPIRE turnover prompt */}
      <AlertDialog open={showPrompt} onOpenChange={(o) => { if (!o) setPromptUnitId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-[var(--apas-sapphire)]" /> Conduct NSPIRE inspection?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This unit has turned over and NSPIRE is enabled for the property. Would you like to conduct the inspection now? If not, we'll route it as a <b>pending action item on your property log</b> so you can complete it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                if (promptTurn) defer.mutate({ turn: promptTurn, propertyId: propertyFilter || null }, { onSuccess: () => toast.success('Thank you — routed as a pending item on your property log.') });
                setPromptUnitId(null);
              }}
            >
              No, later
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (promptTurn) conduct.mutate({ turn: promptTurn, propertyId: propertyFilter || null }, { onSuccess: () => { setPromptUnitId(null); toast.success('NSPIRE inspection started'); navigate('/inspections/units'); } });
              }}
            >
              Yes, conduct now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Door-photo banner with the building + unit number stamped on it. The camera
// button opens the phone's rear camera (capture="environment") to take the photo.
function UnitPhotoBanner({ unit, canEdit }: { unit: Unit; canEdit: boolean }) {
  const setPhoto = useSetUnitPhoto();
  const ref = useRef<HTMLInputElement>(null);
  const url = unitPhotoUrl((unit as any).photo_path);
  const bk = buildingKey(unit.unit_number);
  const col = buildingColor(bk);
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setPhoto.mutate({ unitId: unit.id, file: f });
    if (ref.current) ref.current.value = '';
  };
  return (
    <div className="relative h-32 w-full overflow-hidden" style={{ background: url ? undefined : `${col.bg}14` }}>
      {url ? (
        <img src={url} alt={`Unit ${unit.unit_number} door`} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center"><DoorOpen className="h-10 w-10" style={{ color: col.bg, opacity: 0.45 }} /></div>
      )}
      {/* building + unit stamp */}
      <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-lg bg-black/55 px-2 py-1 text-white backdrop-blur-sm">
        <span className="grid h-5 w-5 place-items-center rounded text-[10px] font-extrabold" style={{ background: col.bg, color: col.fg }}>{bk}</span>
        <span className="text-[12px] font-semibold">Unit {unit.unit_number}</span>
      </div>
      {canEdit && (
        <>
          <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
          <button
            onClick={() => ref.current?.click()}
            disabled={setPhoto.isPending}
            className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-[11px] font-medium text-foreground shadow hover:bg-white disabled:opacity-60"
          >
            {setPhoto.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            {url ? 'Replace' : 'Add door photo'}
          </button>
        </>
      )}
    </div>
  );
}
