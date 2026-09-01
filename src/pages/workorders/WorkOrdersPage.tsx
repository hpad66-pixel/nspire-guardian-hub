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
  Plus,
  ArrowDownWideNarrow,
} from 'lucide-react';
import { useWorkOrdersByProperty, type WorkOrder } from '@/hooks/useWorkOrders';
import { CreateWorkOrderDialog } from '@/components/workorders/CreateWorkOrderDialog';
import { WorkOrderDashboardStats } from '@/components/workorders/WorkOrderDashboardStats';
import { Skeleton } from '@/components/ui/skeleton';
import { WorkOrderDetailSheet } from '@/components/workorders/WorkOrderDetailSheet';
import { LogIncidentSheet } from '@/components/safety/LogIncidentSheet';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { usePagination } from '@/hooks/usePagination';
import { useDataExport } from '@/hooks/useDataExport';
import { useSearchParams } from 'react-router-dom';
import { useManagedProperties } from '@/hooks/useProperties';
import {
  computeWorkOrderDashboardKpis,
  sortWorkOrders,
  type WorkOrderSortKey,
} from '@/lib/workorders/workOrderDashboard';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

type ListPreset =
  | 'all'
  | 'today'
  | 'backlog'
  | 'processed'
  | 'in_progress'
  | 'overdue'
  | 'emergency'
  | '0_1'
  | '2_3'
  | '4_7'
  | '8_plus';

function startOfLocalDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function ageDays(iso: string, now = new Date()) {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return 0;
  return Math.max(
    0,
    Math.floor((startOfLocalDay(now).getTime() - startOfLocalDay(t).getTime()) / 86_400_000),
  );
}

export default function WorkOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<WorkOrderSortKey>('newest');
  const [listPreset, setListPreset] = useState<ListPreset>('all');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [incidentSheetOpen, setIncidentSheetOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [searchParams] = useSearchParams();

  const { data: properties = [] } = useManagedProperties();
  const { data: workOrders = [], isLoading } = useWorkOrdersByProperty(selectedPropertyId || null);
  const { exportToCSV } = useDataExport();

  useEffect(() => {
    const urlPropertyId = searchParams.get('propertyId');
    if (urlPropertyId && properties.some((p) => p.id === urlPropertyId)) {
      if (selectedPropertyId !== urlPropertyId) setSelectedPropertyId(urlPropertyId);
      return;
    }
    if (!selectedPropertyId && properties.length > 0) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId, searchParams]);

  const kpis = useMemo(
    () => computeWorkOrderDashboardKpis(workOrders),
    [workOrders],
  );

  const filteredWorkOrders = useMemo(() => {
    const now = new Date();
    const todayStart = startOfLocalDay(now);

    let rows = workOrders.filter((wo) => {
      const matchesStatus = statusFilter === 'all' || wo.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || wo.priority === priorityFilter;
      return matchesStatus && matchesPriority;
    });

    rows = rows.filter((wo) => {
      switch (listPreset) {
        case 'today':
          return new Date(wo.created_at) >= todayStart;
        case 'backlog':
          return ['draft', 'pending_approval', 'rejected', 'pending', 'assigned'].includes(wo.status);
        case 'processed':
          return (
            ['in_progress', 'completed', 'verified', 'closed'].includes(wo.status) &&
            (new Date(wo.updated_at || wo.completed_at || wo.created_at) >= todayStart)
          );
        case 'in_progress':
          return wo.status === 'in_progress';
        case 'emergency':
          return (
            wo.priority === 'emergency' &&
            !['completed', 'verified', 'closed'].includes(wo.status)
          );
        case 'overdue': {
          if (!wo.due_date || ['completed', 'verified', 'closed'].includes(wo.status)) return false;
          const due = new Date(wo.due_date);
          due.setHours(0, 0, 0, 0);
          return due < todayStart;
        }
        case '0_1':
          return !['completed', 'verified', 'closed'].includes(wo.status) && ageDays(wo.created_at, now) <= 1;
        case '2_3': {
          const d = ageDays(wo.created_at, now);
          return !['completed', 'verified', 'closed'].includes(wo.status) && d >= 2 && d <= 3;
        }
        case '4_7': {
          const d = ageDays(wo.created_at, now);
          return !['completed', 'verified', 'closed'].includes(wo.status) && d >= 4 && d <= 7;
        }
        case '8_plus':
          return !['completed', 'verified', 'closed'].includes(wo.status) && ageDays(wo.created_at, now) >= 8;
        default:
          return true;
      }
    });

    return sortWorkOrders(rows, sortKey);
  }, [workOrders, statusFilter, priorityFilter, listPreset, sortKey]);

  const {
    currentPage,
    pageSize,
    totalPages,
    paginatedData,
    setPage,
    setPageSize,
  } = usePagination(filteredWorkOrders, { initialPageSize: 10 });

  useEffect(() => {
    setPage(1);
  }, [statusFilter, priorityFilter, listPreset, sortKey, selectedPropertyId, setPage]);

  const handleExport = () => {
    const exportData = filteredWorkOrders.map((wo) => ({
      number: wo.work_order_number,
      title: wo.title,
      description: wo.description,
      status: wo.status,
      priority: wo.priority,
      property: wo.property?.name || '',
      unit: wo.unit?.unit_number || '',
      due_date: wo.due_date,
      created_at: wo.created_at,
      requester: wo.requester_name || '',
    }));

    exportToCSV(exportData, {
      filename: 'work_orders',
      headers: [
        'number',
        'title',
        'description',
        'status',
        'priority',
        'property',
        'unit',
        'due_date',
        'created_at',
        'requester',
      ],
      dateFields: ['due_date', 'created_at'],
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return <Clock className="h-4 w-4 text-[var(--apas-amber)]" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'assigned':
        return <User className="h-4 w-4 text-accent" />;
      case 'in_progress':
        return <Wrench className="h-4 w-4 text-warning" />;
      case 'completed':
      case 'verified':
      case 'closed':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return 'Pending approval';
      case 'pending':
        return 'Pending';
      case 'assigned':
        return 'Assigned';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'verified':
        return 'Verified';
      case 'closed':
        return 'Closed';
      case 'draft':
        return 'Draft';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
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

  const presetLabel =
    listPreset === 'all'
      ? null
      : listPreset.replace('_', '–').replace('plus', '+');

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Work Orders</h1>
          <p className="text-muted-foreground">
            Maintenance command center — track what came in today, the backlog, and aging tickets.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Work Order
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={filteredWorkOrders.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => setIncidentSheetOpen(true)}
            className="border-amber-400 text-amber-600 hover:bg-amber-50"
          >
            <TriangleAlert className="h-4 w-4 mr-2 text-amber-500" />
            Log Incident
          </Button>
        </div>
      </div>

      <WorkOrderDashboardStats
        kpis={kpis}
        isLoading={isLoading}
        onFilterPreset={(preset) => {
          setListPreset(preset);
          setStatusFilter('all');
          if (preset === 'emergency') setPriorityFilter('emergency');
          else setPriorityFilter('all');
          setSortKey('newest');
        }}
      />

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
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setListPreset('all'); }}>
          <SelectTrigger className="flex-1 sm:w-[180px] sm:flex-none">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending_approval">Pending approval</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
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
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as WorkOrderSortKey)}>
          <SelectTrigger className="flex-1 sm:w-[180px] sm:flex-none">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="due_soonest">Due soonest</SelectItem>
            <SelectItem value="due_latest">Due latest</SelectItem>
            <SelectItem value="priority">Emergency first</SelectItem>
          </SelectContent>
        </Select>
        {listPreset !== 'all' && (
          <Button variant="secondary" size="sm" onClick={() => setListPreset('all')} className="gap-1">
            <ArrowDownWideNarrow className="h-3.5 w-3.5" />
            Clear focus: {presetLabel}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Work Orders</CardTitle>
          <CardDescription>
            {filteredWorkOrders.length} work order{filteredWorkOrders.length === 1 ? '' : 's'}
            {sortKey === 'newest' ? ' · newest at the top' : ''}
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
                const dueDate = wo.due_date ? new Date(wo.due_date) : null;
                const now = new Date();
                const isOverdue =
                  !!dueDate &&
                  dueDate < now &&
                  wo.status !== 'verified' &&
                  wo.status !== 'completed' &&
                  wo.status !== 'closed';
                const createdLabel = formatDistanceToNow(new Date(wo.created_at), {
                  addSuffix: true,
                });

                return (
                  <div
                    key={wo.id}
                    onClick={() => handleWorkOrderClick(wo)}
                    className={cn(
                      'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border bg-card hover:border-accent/50 transition-colors cursor-pointer',
                      wo.status === 'pending_approval' && 'border-[var(--apas-amber)]/40 bg-[var(--apas-amber)]/5',
                    )}
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <div className="flex items-center gap-2 shrink-0">
                        {wo.priority === 'emergency' ? (
                          <Badge variant="destructive">Emergency</Badge>
                        ) : (
                          <Badge variant="outline">Routine</Badge>
                        )}
                        {getStatusIcon(wo.status)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {wo.work_order_number ? (
                            <span className="font-mono text-muted-foreground mr-2">
                              #{wo.work_order_number}
                            </span>
                          ) : null}
                          {wo.title}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {wo.defect?.item_name
                            ? `${wo.defect.item_name} - ${wo.defect.defect_condition}`
                            : wo.description || 'Voice / manual work order'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Created {createdLabel}
                          {wo.requester_name ? ` · ${wo.requester_name}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end sm:gap-6">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building className="h-4 w-4 shrink-0" />
                        <span className="truncate max-w-[120px]">{wo.property?.name}</span>
                        {wo.unit && (
                          <span className="hidden md:inline">• Unit {wo.unit.unit_number}</span>
                        )}
                      </div>
                      <div className="text-right">
                        {dueDate && (
                          <div className="flex items-center gap-1 text-sm justify-end">
                            <Calendar className="h-4 w-4" />
                            <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                              {dueDate.toLocaleDateString()}
                            </span>
                          </div>
                        )}
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
                {statusFilter !== 'all' || priorityFilter !== 'all' || listPreset !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Work orders are created from voice complaints, inspections, and manual entry'}
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

      <CreateWorkOrderDialog open={createOpen} onOpenChange={setCreateOpen} />

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
