import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Wrench, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Building,
  Calendar,
  User,
  Loader2,
} from 'lucide-react';
import { useWorkOrders, useWorkOrderStats } from '@/hooks/useWorkOrders';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';

export default function WorkOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const { data: workOrders, isLoading } = useWorkOrders();
  const { data: stats } = useWorkOrderStats();

  const filteredWorkOrders = workOrders?.filter(wo => {
    const matchesStatus = statusFilter === 'all' || wo.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || wo.priority === priorityFilter;
    return matchesStatus && matchesPriority;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'assigned': return <User className="h-4 w-4 text-blue-500" />;
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

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
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
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="emergency">Emergency</SelectItem>
            <SelectItem value="routine">Routine</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Work Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Work Orders</CardTitle>
          <CardDescription>
            {filteredWorkOrders?.length || 0} work orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredWorkOrders && filteredWorkOrders.length > 0 ? (
            <div className="space-y-3">
              {filteredWorkOrders.map((wo) => {
                const dueDate = new Date(wo.due_date);
                const now = new Date();
                const isOverdue = dueDate < now && wo.status !== 'verified' && wo.status !== 'completed';

                return (
                  <div 
                    key={wo.id} 
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:border-accent/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {wo.priority === 'emergency' ? (
                          <Badge variant="destructive">Emergency</Badge>
                        ) : (
                          <Badge variant="outline">Routine</Badge>
                        )}
                        {getStatusIcon(wo.status)}
                      </div>
                      <div>
                        <p className="font-medium">{wo.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {wo.defect?.item_name} - {wo.defect?.defect_condition}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building className="h-4 w-4" />
                        <span>{wo.property?.name}</span>
                        {wo.unit && <span>• Unit {wo.unit.unit_number}</span>}
                      </div>
                      <div className="text-right min-w-[100px]">
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
        </CardContent>
      </Card>
    </div>
  );
}
