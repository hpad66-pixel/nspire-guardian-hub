import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Plus, 
  Search,
  Home,
  AlertCircle,
  UserCheck,
  UserMinus,
  Calendar,
  DollarSign,
  Building,
} from 'lucide-react';
import { useTenants, useTenantStats, type Tenant } from '@/hooks/useTenants';
import { useProperties } from '@/hooks/useProperties';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { TenantDialog } from '@/components/occupancy/TenantDialog';
import { TenantDetailSheet } from '@/components/occupancy/TenantDetailSheet';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function OccupancyPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');

  const { data: tenants, isLoading } = useTenants();
  const { data: stats } = useTenantStats();
  const { data: properties = [] } = useProperties();

  useEffect(() => {
    if (!selectedPropertyId && properties.length > 0) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  const filteredTenants = useMemo(() => {
    if (!tenants) return [];
    
    return tenants.filter(tenant => {
      const matchesProperty = !selectedPropertyId || tenant.unit?.property?.id === selectedPropertyId;
      const matchesSearch = searchQuery === '' || 
        `${tenant.first_name} ${tenant.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.unit?.unit_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.unit?.property?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
      
      return matchesProperty && matchesSearch && matchesStatus;
    });
  }, [tenants, searchQuery, statusFilter, selectedPropertyId]);

  const filteredStats = useMemo(() => {
    const total = filteredTenants.length;
    const active = filteredTenants.filter(t => t.status === 'active').length;
    const noticeGiven = filteredTenants.filter(t => t.status === 'notice_given').length;
    const movedOut = filteredTenants.filter(t => t.status === 'moved_out').length;
    return { total, active, noticeGiven, movedOut };
  }, [filteredTenants]);

  const handleTenantClick = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setDetailSheetOpen(true);
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingTenant(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Active</Badge>;
      case 'notice_given':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Notice Given</Badge>;
      case 'moved_out':
        return <Badge variant="secondary">Moved Out</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getLeaseStatus = (tenant: Tenant) => {
    if (!tenant.lease_end) return null;
    
    const daysUntilEnd = differenceInDays(parseISO(tenant.lease_end), new Date());
    
    if (daysUntilEnd < 0) {
      return <Badge variant="destructive" className="text-xs">Lease Expired</Badge>;
    } else if (daysUntilEnd <= 30) {
      return <Badge variant="secondary" className="text-xs bg-yellow-500/10 text-yellow-600">Expires in {daysUntilEnd} days</Badge>;
    }
    return null;
  };

  return (
    <TooltipProvider>
      <div className="p-4 md:p-6 space-y-6 animate-fade-in">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                <Users className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Occupancy</h1>
            </div>
            <p className="text-sm text-muted-foreground">Manage tenants and lease information</p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" onClick={() => setDialogOpen(true)} className="self-start sm:self-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Tenant
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add a new tenant to a unit</TooltipContent>
          </Tooltip>
        </div>

        {/* Stats */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <StatCard
            title="Total Tenants"
            value={selectedPropertyId ? filteredStats.total : (stats?.total || 0)}
            subtitle="All tenants"
            icon={Users}
          />
          <StatCard
            title="Active"
            value={selectedPropertyId ? filteredStats.active : (stats?.active || 0)}
            subtitle="Currently residing"
            icon={UserCheck}
            variant="success"
          />
          <StatCard
            title="Notice Given"
            value={selectedPropertyId ? filteredStats.noticeGiven : (stats?.noticeGiven || 0)}
            subtitle="Moving soon"
            icon={AlertCircle}
            variant="moderate"
          />
          <StatCard
            title="Moved Out"
            value={selectedPropertyId ? filteredStats.movedOut : (stats?.movedOut || 0)}
            subtitle="Historical records"
            icon={UserMinus}
          />
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tenants, units, properties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select property" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="notice_given">Notice Given</SelectItem>
              <SelectItem value="moved_out">Moved Out</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tenants List */}
        <Card>
          <CardHeader>
            <CardTitle>Tenants</CardTitle>
            <CardDescription>
              {filteredTenants.length} tenant{filteredTenants.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredTenants.length > 0 ? (
              <div className="space-y-3">
                {filteredTenants.map((tenant) => (
                  <div 
                    key={tenant.id}
                    onClick={() => handleTenantClick(tenant)}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:border-accent/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {tenant.first_name.charAt(0)}{tenant.last_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{tenant.first_name} {tenant.last_name}</p>
                          {getStatusBadge(tenant.status)}
                          {getLeaseStatus(tenant)}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {tenant.email && <span>{tenant.email}</span>}
                          {tenant.phone && <span>• {tenant.phone}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span>{tenant.unit?.property?.name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Home className="h-4 w-4" />
                          <span>Unit {tenant.unit?.unit_number}</span>
                        </div>
                      </div>
                      <div className="text-right min-w-[120px]">
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {format(parseISO(tenant.lease_start), 'MMM d, yyyy')}
                          </span>
                        </div>
                        {tenant.rent_amount && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                            <span>{tenant.rent_amount.toLocaleString()}/mo</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium">No tenants found</p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Try adjusting your filters'
                    : 'Add your first tenant to get started'}
                </p>
                {!searchQuery && statusFilter === 'all' && (
                  <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tenant
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <TenantDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          tenant={editingTenant}
        />

        <TenantDetailSheet
          open={detailSheetOpen}
          onOpenChange={setDetailSheetOpen}
          tenant={selectedTenant}
          onEdit={handleEdit}
        />
      </div>
    </TooltipProvider>
  );
}
