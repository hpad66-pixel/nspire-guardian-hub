import { useState } from 'react';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Building2,
  Calendar,
  User,
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Camera,
} from 'lucide-react';
import { WorkOrder, useUpdateWorkOrder, useCompleteWorkOrder, useVerifyWorkOrder } from '@/hooks/useWorkOrders';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/hooks/useAuth';

interface WorkOrderDetailSheetProps {
  workOrder: WorkOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusOptions = [
  { value: 'pending', label: 'Pending', icon: Clock },
  { value: 'assigned', label: 'Assigned', icon: User },
  { value: 'in_progress', label: 'In Progress', icon: Wrench },
  { value: 'completed', label: 'Completed', icon: CheckCircle2 },
  { value: 'verified', label: 'Verified', icon: CheckCircle2 },
];

export function WorkOrderDetailSheet({ workOrder, open, onOpenChange }: WorkOrderDetailSheetProps) {
  const { user } = useAuth();
  const { data: profiles } = useProfiles();
  const updateWorkOrder = useUpdateWorkOrder();
  const completeWorkOrder = useCompleteWorkOrder();
  const verifyWorkOrder = useVerifyWorkOrder();
  
  const [notes, setNotes] = useState('');
  
  if (!workOrder) return null;
  
  const dueDate = new Date(workOrder.due_date);
  const isOverdue = dueDate < new Date() && workOrder.status !== 'verified' && workOrder.status !== 'completed';
  
  const handleStatusChange = async (newStatus: string) => {
    await updateWorkOrder.mutateAsync({
      id: workOrder.id,
      status: newStatus as WorkOrder['status'],
    });
  };
  
  const handleAssign = async (userId: string) => {
    await updateWorkOrder.mutateAsync({
      id: workOrder.id,
      assigned_to: userId,
      status: 'assigned',
    });
  };
  
  const handleComplete = async () => {
    await completeWorkOrder.mutateAsync({
      id: workOrder.id,
    });
  };
  
  const handleVerify = async () => {
    await verifyWorkOrder.mutateAsync(workOrder.id);
  };
  
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'outline' as const, className: 'border-muted-foreground' },
      assigned: { variant: 'secondary' as const, className: 'bg-blue-500/10 text-blue-500' },
      in_progress: { variant: 'secondary' as const, className: 'bg-warning/10 text-warning' },
      completed: { variant: 'secondary' as const, className: 'bg-success/10 text-success' },
      verified: { variant: 'default' as const, className: 'bg-success text-success-foreground' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const option = statusOptions.find(o => o.value === status);
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {option?.label || status}
      </Badge>
    );
  };
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2">
            {workOrder.priority === 'emergency' ? (
              <Badge variant="destructive">Emergency</Badge>
            ) : (
              <Badge variant="outline">Routine</Badge>
            )}
            {getStatusBadge(workOrder.status)}
          </div>
          <SheetTitle className="text-xl">{workOrder.title}</SheetTitle>
          <SheetDescription>
            Work Order Details
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-6">
          {/* Location */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Location</Label>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>{workOrder.property?.name}</span>
              {workOrder.unit && (
                <span className="text-muted-foreground">• Unit {workOrder.unit.unit_number}</span>
              )}
            </div>
          </div>
          
          {/* Due Date */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Due Date</Label>
            <div className="flex items-center gap-2">
              <Calendar className={`h-4 w-4 ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`} />
              <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                {format(dueDate, 'MMM d, yyyy')}
              </span>
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">Overdue</Badge>
              )}
            </div>
          </div>
          
          {/* Defect Info */}
          {workOrder.defect && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Related Defect</Label>
              <div className="p-3 rounded-lg border bg-muted/30">
                <p className="font-medium">{workOrder.defect.item_name}</p>
                <p className="text-sm text-muted-foreground">{workOrder.defect.defect_condition}</p>
              </div>
            </div>
          )}
          
          {/* Description */}
          {workOrder.description && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Description</Label>
              <p className="text-sm">{workOrder.description}</p>
            </div>
          )}
          
          <Separator />
          
          {/* Status Update */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Update Status</Label>
            <Select
              value={workOrder.status}
              onValueChange={handleStatusChange}
              disabled={updateWorkOrder.isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className="h-4 w-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Assignee */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Assigned To</Label>
            <Select
              value={workOrder.assigned_to || ''}
              onValueChange={handleAssign}
              disabled={updateWorkOrder.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                {profiles?.map((profile) => (
                  <SelectItem key={profile.user_id} value={profile.user_id}>
                    {profile.full_name || profile.email || 'Unknown'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Proof Photos */}
          {workOrder.proof_photos && workOrder.proof_photos.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Proof Photos</Label>
              <div className="grid grid-cols-3 gap-2">
                {workOrder.proof_photos.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Proof ${index + 1}`}
                    className="w-full h-20 object-cover rounded-lg border"
                  />
                ))}
              </div>
            </div>
          )}
          
          <Separator />
          
          {/* Action Buttons */}
          <div className="space-y-3">
            {workOrder.status === 'in_progress' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="w-full" variant="default">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark as Completed
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Complete Work Order</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to mark this work order as completed? This will notify the manager for verification.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleComplete}>
                      Complete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            
            {workOrder.status === 'completed' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="w-full" variant="default">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Verify Completion
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Verify Work Order</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to verify this work order? This confirms that the work has been completed satisfactorily.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleVerify}>
                      Verify
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          
          {/* Timestamps */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Created: {format(new Date(workOrder.created_at), 'MMM d, yyyy h:mm a')}</p>
            {workOrder.completed_at && (
              <p>Completed: {format(new Date(workOrder.completed_at), 'MMM d, yyyy h:mm a')}</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
