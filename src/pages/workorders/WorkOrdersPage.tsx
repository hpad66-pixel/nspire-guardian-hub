import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Wrench, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Building,
  Calendar,
  User,
  Download,
  TriangleAlert,
} from 'lucide-react';
import { useWorkOrdersByProperty, type WorkOrder } from '@/hooks/useWorkOrders';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { WorkOrderDetailSheet } from '@/components/workorders/WorkOrderDetailSheet';
import { LogIncidentSheet } from '@/components/safety/LogIncidentSheet';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { usePagination } from '@/hooks/usePagination';
import { useDataExport } from '@/hooks/useDataExport';
import { useSearchParams } from 'react-router-dom';
import { useManagedProperties } from '@/hooks/useProperties';

export default function WorkOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [incidentSheetOpen, setIncidentSheetOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [searchParams] = useSearchParams();

  const { data: properties = [] } = useManagedProperties();
  const { data: workOrders = [], isLoading } = useWorkOrdersByProperty(selectedPropertyId || null);
  const { exportToCSV } = useDataExport();

  useEffect(() => {
    if (!selectedPropertyId && properties.length > 0) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  const filteredWorkOrders = workOrders?.filter(wo => {
    const matchesStatus = statusFilter === 'all' || wo.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || wo.priority === priorityFilter;
    return matchesStatus && matchesPriority;
  }) || [];

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pending = workOrders.filter(wo => wo.status === 'pending').length;
    const inProgress = workOrders.filter(wo => wo.status === 'in_progress').length;
    const completed = workOrders.filter(wo => wo.status === 'completed').length;
    const verified = workOrders.filter(wo => wo.status === 'verified').length;
    const emergency = workOrders.filter(wo => wo.priority === 'emergency' && wo.status !== 'verified').length;
    const overdue = workOrders.filter(wo => {
      const dueDate = new Date(wo.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today && wo.status !== 'verified' && wo.status !== 'completed';
    }).length;
    return { pending, inProgress, completed, verified, emergency, overdue };
  }, [workOrders]);

  const {
    currentPage,
    pageSize,
    totalPages,
    paginatedData,
    setPage,
    setPageSize,
  } = usePagination(filteredWorkOrders, { initialPageSize: 10 });

  const handleExport = () => {
    const exportData = filteredWorkOrders.map(wo => ({
      title: wo.title,
      description: wo.description,
      status: wo.status,
      priority: wo.priority,
      property: wo.property?.name || '',
      unit: wo.unit?.unit_number || '',
      due_date: wo.due_date,
      created_at: wo.created_at,
    }));

    exportToCSV(exportData, {
      filename: 'work_orders',
      headers: ['title', 'description', 'status', 'priority', 'property', 'unit', 'due_date', 'created_at'],
      dateFields: ['due_date', 'created_at'],
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'assigned': return <User className="h-4 w-4 text-accent" />;
      case 'in_progress': return <Wrench className="h-4 w-4 text-warning" />;
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'verified': return <CheckCircle2 className="h-4 w-4 text-success" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'assigned': return 'Assigned';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'verified': return 'Verified';
      default: return status;
    }
  };

  const handleWorkOrderClick = (wo: WorkOrder) => {
    setSelectedWorkOrder(wo);
    setDetailSheetOpen(true);
  };

  useEffect(() => {
    const workOrderId = searchParams.get('workOrderId');
    if (!workOrderId || !workOrders || workOrders.length === 0) return;

    const match = workOrders.find((w) => w.id === workOrderId);
    if (match) {
      setSelectedWorkOrder(match);
      setDetailSheetOpen(true);
    }
  }, [workOrders, searchParams]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Work Orders</h1>
          <p className="text-muted-foreground">Manage repair and maintenance work orders</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Emergency"
          value={stats?.emergency || 0}
          subtitle="Requires immediate action"
          icon={AlertTriangle}
          variant="severe"
        />
        <StatCard
          title="Pending"
          value={stats?.pending || 0}
          subtitle="Awaiting assignment"
          icon={Clock}
        />
        <StatCard
          title="In Progress"
          value={stats?.inProgress || 0}
          subtitle="Currently being worked on"
          icon={Wrench}
          variant="moderate"
        />
        <StatCard
          title="Completed"
          value={stats?.completed || 0}
          subtitle="Awaiting verification"
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Overdue"
          value={stats?.overdue || 0}
          subtitle="Past deadline"
          icon={AlertTriangle}
          variant="severe"
        />
      </div>

      {/* Filters — wraps on mobile */}
      <div className="flex flex-wrap gap-2">
        <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
          <SelectTrigger className="w-full sm:w-[220px]">
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
          <SelectTrigger className="flex-1 sm:w-[160px] sm:flex-none">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="flex-1 sm:w-[160px] sm:flex-none">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="emergency">Emergency</SelectItem>
            <SelectItem value="routine">Routine</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="hidden sm:flex flex-1" />
        
        <Button variant="outline" onClick={handleExport} disabled={filteredWorkOrders.length === 0} className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
        <Button variant="outline" onClick={() => setIncidentSheetOpen(true)} className="w-full sm:w-auto border-amber-400 text-amber-600 hover:bg-amber-50">
          <TriangleAlert className="h-4 w-4 mr-2 text-amber-500" />
          Log Incident
        </Button>
      </div>

      {/* Work Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Work Orders</CardTitle>
          <CardDescription>
            {filteredWorkOrders.length} work orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : paginatedData && paginatedData.length > 0 ? (
            <div className="space-y-3">
              {paginatedData.map((wo) => {
                const dueDate = new Date(wo.due_date);
                const now = new Date();
                const isOverdue = dueDate < now && wo.status !== 'verified' && wo.status !== 'completed';

                  return (
                    <div 
                      key={wo.id}
                      onClick={() => handleWorkOrderClick(wo)}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border bg-card hover:border-accent/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="flex items-center gap-2 shrink-0">
                        {wo.priority === 'emergency' ? (
                          <Badge variant="destructive">Emergency</Badge>
                        ) : (
                          <Badge variant="outline">Routine</Badge>
                        )}
                        {getStatusIcon(wo.status)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{wo.title}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {wo.defect?.item_name} - {wo.defect?.defect_condition}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end sm:gap-6">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building className="h-4 w-4 shrink-0" />
                        <span className="truncate max-w-[120px]">{wo.property?.name}</span>
                        {wo.unit && <span className="hidden md:inline">• Unit {wo.unit.unit_number}</span>}
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-4 w-4" />
                          <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                            {dueDate.toLocaleDateString()}
                          </span>
                        </div>
                        <Badge variant="outline" className="mt-1">
                          {getStatusLabel(wo.status)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="font-medium">No work orders found</p>
              <p className="text-sm text-muted-foreground">
                {statusFilter !== 'all' || priorityFilter !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Work orders are automatically created from inspection defects'}
              </p>
            </div>
          )}
          
          {filteredWorkOrders.length > 0 && (
            <DataTablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredWorkOrders.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </CardContent>
      </Card>
      
      <WorkOrderDetailSheet
        workOrder={selectedWorkOrder}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />

      <LogIncidentSheet
        open={incidentSheetOpen}
        onOpenChange={setIncidentSheetOpen}
        sourceType="work_order"
        sourceId={selectedWorkOrder?.id}
        sourceName={selectedWorkOrder?.title ?? 'Work Order'}
      />
    </div>
  );
}
