import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Plus, Search, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePermits, usePermitStats } from '@/hooks/usePermits';
import { useProperties } from '@/hooks/useProperties';
import { PermitCard } from '@/components/permits/PermitCard';
import { PermitDialog } from '@/components/permits/PermitDialog';
import { ScanPermitDialog } from '@/components/permits/ScanPermitDialog';
import { PermitScanGallery } from '@/components/permits/PermitScanGallery';
import { ComplianceStats } from '@/components/permits/ComplianceStats';

const permitTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'building_permit', label: 'Building Permit' },
  { value: 'occupancy_certificate', label: 'Certificate of Occupancy' },
  { value: 'fire_safety', label: 'Fire Safety' },
  { value: 'elevator', label: 'Elevator' },
  { value: 'pool', label: 'Pool/Spa' },
  { value: 'boiler', label: 'Boiler' },
  { value: 'environmental', label: 'Environmental' },
  { value: 'hud_compliance', label: 'HUD Compliance' },
  { value: 'ada', label: 'ADA Compliance' },
  { value: 'other', label: 'Other' },
];

const permitStatuses = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'renewed', label: 'Renewed' },
  { value: 'revoked', label: 'Revoked' },
];

export default function PermitsDashboard() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const { data: permits, isLoading: permitsLoading } = usePermits();
  const { data: stats, isLoading: statsLoading } = usePermitStats();
  const { data: properties = [] } = useProperties();

  useEffect(() => {
    if (!propertyFilter && properties.length > 0) {
      setPropertyFilter(properties[0].id);
    }
  }, [properties, propertyFilter]);

  // Filter permits
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const filteredPermits = permits?.filter((permit) => {
    const matchesSearch =
      permit.name.toLowerCase().includes(search.toLowerCase()) ||
      permit.permit_number?.toLowerCase().includes(search.toLowerCase()) ||
      permit.issuing_authority?.toLowerCase().includes(search.toLowerCase());

    const matchesProperty = !propertyFilter || permit.property_id === propertyFilter;
    const matchesType = typeFilter === 'all' || permit.permit_type === typeFilter;

    // `expiringSoon` is a derived pseudo-status (active + expiry within 30 days),
    // not a literal permit.status value — mirror the usePermitStats predicate.
    let matchesStatus: boolean;
    if (statusFilter === 'all') {
      matchesStatus = true;
    } else if (statusFilter === 'expiringSoon') {
      const expiry = permit.expiry_date ? new Date(permit.expiry_date) : null;
      matchesStatus = permit.status === 'active' && !!expiry && expiry <= thirtyDaysFromNow && expiry >= now;
    } else {
      matchesStatus = permit.status === statusFilter;
    }

    return matchesSearch && matchesProperty && matchesType && matchesStatus;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Permits & Compliance</h1>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Track regulatory requirements and deadlines
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <Button size="sm" variant="outline" onClick={() => setScanOpen(true)}>
            <Camera className="h-4 w-4 mr-2" />
            Scan permit
          </Button>
          <Button size="sm" onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Permit
          </Button>
        </div>
      </div>

      {/* Stats */}
      <ComplianceStats stats={stats} isLoading={statsLoading} onSelectStatus={setStatusFilter} />

      <PermitScanGallery
        emptyHint="Scan a property permit from your phone — tiles group by client or project."
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search permits..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Property" />
          </SelectTrigger>
          <SelectContent>
            {properties.map((property) => (
              <SelectItem key={property.id} value={property.id}>
                {property.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {permitTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {permitStatuses.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Permits List */}
      {permitsLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filteredPermits?.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No permits found</h3>
          <p className="text-muted-foreground mt-1">
            {search || propertyFilter !== '' || typeFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Add your first permit to get started'}
          </p>
          {!search && propertyFilter === '' && typeFilter === 'all' && statusFilter === 'all' && (
            <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Permit
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPermits?.map((permit) => (
            <PermitCard
              key={permit.id}
              permit={permit}
              onClick={() => navigate(`/permits/${permit.id}`)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <PermitDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
      <ScanPermitDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        scope="property"
        propertyId={propertyFilter || properties[0]?.id || null}
        properties={properties.map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}
