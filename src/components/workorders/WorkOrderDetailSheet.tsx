import { useState } from 'react';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VoiceDictationTextareaWithAI } from '@/components/ui/voice-dictation-textarea-ai';
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
  DollarSign,
  Send,
  XCircle,
} from 'lucide-react';
import { WorkOrder, useUpdateWorkOrder, useCompleteWorkOrder, useVerifyWorkOrder } from '@/hooks/useWorkOrders';
import { useUserPermissions } from '@/hooks/usePermissions';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/hooks/useAuth';
import { WorkOrderComments } from './WorkOrderComments';
import { WorkOrderStatusStepper } from './WorkOrderStatusStepper';
import { WorkOrderActivityLog } from './WorkOrderActivityLog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { enqueue } from '@/lib/offlineQueue';

interface WorkOrderDetailSheetProps {
  workOrder: WorkOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusOptions = [
  { value: 'draft', label: 'Draft', icon: Clock },
  { value: 'pending_approval', label: 'Pending Approval', icon: Clock },
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
  const { canUpdate, canAssign, canApprove } = useUserPermissions();
  
  const [notes, setNotes] = useState(workOrder?.notes || '');
  const [estimatedCost, setEstimatedCost] = useState(workOrder?.estimated_cost?.toString() || '');
  const [rejectionReason, setRejectionReason] = useState('');
  
  if (!workOrder) return null;
  
  const dueDate = new Date(workOrder.due_date);
  const isOverdue = dueDate < new Date() && workOrder.status !== 'verified' && workOrder.status !== 'completed';
  const canEditWorkOrder = canUpdate('work_orders');
  const canAssignWorkOrder = canAssign('work_orders');
  const canApproveWorkOrder = canApprove('work_orders');
  
  const handleStatusChange = async (newStatus: string) => {
    await updateWorkOrder.mutateAsync({
      id: workOrder.id,
      status: newStatus as WorkOrder['status'],
    });
    
    // Log activity
    await supabase.from('work_order_activity').insert({
      work_order_id: workOrder.id,
      user_id: user?.id,
      action: 'status_changed',
      details: { from: workOrder.status, to: newStatus },
    });
  };
  
  const handleAssign = async (userId: string) => {
    await updateWorkOrder.mutateAsync({
      id: workOrder.id,
      assigned_to: userId,
      status: 'assigned',
    });
    
    await supabase.from('work_order_activity').insert({
      work_order_id: workOrder.id,
      user_id: user?.id,
      action: 'assigned',
      details: { assigned_to: userId },
    });
  };
  
  const handleSubmitForApproval = async () => {
    try {
      await updateWorkOrder.mutateAsync({
        id: workOrder.id,
        status: 'pending_approval' as WorkOrder['status'],
        submitted_at: new Date().toISOString(),
        estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null,
        notes,
      });
      
      await supabase.from('work_order_activity').insert({
        work_order_id: workOrder.id,
        user_id: user?.id,
        action: 'submitted',
        details: { estimated_cost: estimatedCost },
      });
      
      toast.success('Work order submitted for approval');
    } catch {
      if (!navigator.onLine) {
        await enqueue({
          type: 'work_order_status',
          payload: { id: workOrder.id, status: 'pending_approval', notes, estimatedCost },
          timestamp: Date.now(),
        });
        toast.warning('Offline — status update queued and will sync when reconnected.');
      } else {
        toast.error('Failed to submit work order');
      }
    }
  };
  
  const handleApprove = async () => {
    await updateWorkOrder.mutateAsync({
      id: workOrder.id,
      status: 'in_progress' as WorkOrder['status'],
      approved_by: user?.id,
      approved_at: new Date().toISOString(),
    });
    
    await supabase.from('work_order_activity').insert({
      work_order_id: workOrder.id,
      user_id: user?.id,
      action: 'approved',
      details: {},
    });
    
    toast.success('Work order approved');
  };
  
  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    
    await updateWorkOrder.mutateAsync({
      id: workOrder.id,
      status: 'rejected' as WorkOrder['status'],
      rejected_by: user?.id,
      rejected_at: new Date().toISOString(),
      rejection_reason: rejectionReason,
    });
    
    await supabase.from('work_order_activity').insert({
      work_order_id: workOrder.id,
      user_id: user?.id,
      action: 'rejected',
      details: { reason: rejectionReason },
    });
    
    setRejectionReason('');
    toast.success('Work order rejected');
  };
  
  const handleComplete = async () => {
    await completeWorkOrder.mutateAsync({
      id: workOrder.id,
    });
    
    await supabase.from('work_order_activity').insert({
      work_order_id: workOrder.id,
      user_id: user?.id,
      action: 'completed',
      details: {},
    });
  };
  
  const handleVerify = async () => {
    await verifyWorkOrder.mutateAsync(workOrder.id);
    
    await supabase.from('work_order_activity').insert({
      work_order_id: workOrder.id,
      user_id: user?.id,
      action: 'verified',
      details: {},
    });
  };
  
  const handleSaveNotes = async () => {
    await updateWorkOrder.mutateAsync({
      id: workOrder.id,
      notes,
      estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null,
    });
    toast.success('Notes saved');
  };
  
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: 'outline' as const, className: 'border-muted-foreground' },
      pending: { variant: 'outline' as const, className: 'border-muted-foreground' },
      pending_approval: { variant: 'secondary' as const, className: 'bg-warning/10 text-warning' },
      rejected: { variant: 'destructive' as const, className: '' },
      assigned: { variant: 'secondary' as const, className: 'bg-blue-500/10 text-blue-500' },
      in_progress: { variant: 'secondary' as const, className: 'bg-warning/10 text-warning' },
      completed: { variant: 'secondary' as const, className: 'bg-success/10 text-success' },
      verified: { variant: 'default' as const, className: 'bg-success text-success-foreground' },
      closed: { variant: 'outline' as const, className: 'text-muted-foreground' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const option = statusOptions.find(o => o.value === status);
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {option?.label || status}
      </Badge>
    );
  };
  
  const workOrderNumber = workOrder.work_order_number 
    ? `WO-${String(workOrder.work_order_number).padStart(4, '0')}`
    : 'Work Order';
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground">{workOrderNumber}</span>
            {workOrder.priority === 'emergency' ? (
              <Badge variant="destructive">Emergency</Badge>
            ) : (
              <Badge variant="outline">Routine</Badge>
            )}
            {getStatusBadge(workOrder.status)}
          </div>
          <SheetTitle className="text-xl">{workOrder.title}</SheetTitle>
          <SheetDescription>
            Manage work order details, communication, and approval workflow
          </SheetDescription>
        </SheetHeader>
        
        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-6 pt-4">
            {/* Two-column layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left column - Details */}
              <div className="space-y-4">
                {/* Location */}
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Location</Label>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{workOrder.property?.name}</span>
                    {workOrder.unit && (
                      <span className="text-sm text-muted-foreground">• Unit {workOrder.unit.unit_number}</span>
                    )}
                  </div>
                </div>
                
                {/* Due Date */}
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Due Date</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className={`h-4 w-4 ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`} />
                    <span className={`text-sm ${isOverdue ? 'text-destructive font-medium' : ''}`}>
                      {format(dueDate, 'MMM d, yyyy')}
                    </span>
                    {isOverdue && (
                      <Badge variant="destructive" className="text-xs">Overdue</Badge>
                    )}
                  </div>
                </div>
                
                {/* Estimated Cost */}
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Estimated Cost</Label>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={estimatedCost}
                      onChange={(e) => setEstimatedCost(e.target.value)}
                      placeholder="0.00"
                      className="h-8 w-32"
                      disabled={!canEditWorkOrder}
                    />
                  </div>
                </div>
                
                {/* Assignee */}
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Assigned To</Label>
                  {canAssignWorkOrder ? (
                    <Select
                      value={workOrder.assigned_to || ''}
                      onValueChange={handleAssign}
                      disabled={updateWorkOrder.isPending}
                    >
                      <SelectTrigger className="h-8">
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
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {workOrder.assigned_to
                        ? profiles?.find((p) => p.user_id === workOrder.assigned_to)?.full_name ||
                          profiles?.find((p) => p.user_id === workOrder.assigned_to)?.email ||
                          'Assigned'
                        : 'Unassigned'}
                    </span>
                  )}
                </div>
                
                {/* Defect Info */}
                {workOrder.defect && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider">Related Defect</Label>
                    <div className="p-2 rounded-lg border bg-muted/30 text-sm">
                      <p className="font-medium">{workOrder.defect.item_name}</p>
                      <p className="text-muted-foreground">{workOrder.defect.defect_condition}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Right column - Workflow Status */}
              <div className="space-y-4">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Workflow Status</Label>
                <WorkOrderStatusStepper currentStatus={workOrder.status} />
              </div>
            </div>
            
            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Notes</Label>
              <VoiceDictationTextareaWithAI
                value={notes}
                onValueChange={setNotes}
                placeholder="Add notes about this work order..."
                rows={3}
                context="notes"
                disabled={!canEditWorkOrder}
              />
              {canEditWorkOrder && (
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={handleSaveNotes}>
                    Save Notes
                  </Button>
                </div>
              )}
            </div>
            
            {/* Proof Photos */}
            {workOrder.proof_photos && workOrder.proof_photos.length > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Proof Photos</Label>
                <div className="grid grid-cols-4 gap-2">
                  {workOrder.proof_photos.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Proof ${index + 1}`}
                      className="w-full h-16 object-cover rounded-lg border"
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Rejection Reason */}
            {workOrder.status === 'rejected' && workOrder.rejection_reason && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2 text-destructive mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">Rejection Reason</span>
                </div>
                <p className="text-sm">{workOrder.rejection_reason}</p>
              </div>
            )}
            
            <Separator />
            
            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Draft - Submit for Approval */}
              {(workOrder.status === 'draft' || workOrder.status === 'rejected') && canEditWorkOrder && (
                <Button 
                  className="w-full" 
                  onClick={handleSubmitForApproval}
                  disabled={updateWorkOrder.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit for Approval
                </Button>
              )}
              
              {/* Pending Approval - Approve/Reject */}
              {workOrder.status === 'pending_approval' && canApproveWorkOrder && (
                <div className="flex gap-2">
                  <Button 
                    className="flex-1" 
                    onClick={handleApprove}
                    disabled={updateWorkOrder.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="flex-1">
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reject Work Order</AlertDialogTitle>
                        <AlertDialogDescription>
                          Please provide a reason for rejection. The submitter will be notified.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <VoiceDictationTextareaWithAI
                        value={rejectionReason}
                        onValueChange={setRejectionReason}
                        placeholder="Reason for rejection..."
                        rows={3}
                        context="notes"
                      />
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleReject}>
                          Reject Work Order
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
              
              {/* In Progress - Mark Complete */}
              {workOrder.status === 'in_progress' && canEditWorkOrder && (
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
              
              {/* Completed - Verify */}
              {workOrder.status === 'completed' && canApproveWorkOrder && (
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
          </TabsContent>
          
          <TabsContent value="communication" className="pt-4">
            <WorkOrderComments workOrderId={workOrder.id} />
          </TabsContent>
          
          <TabsContent value="activity" className="pt-4">
            <WorkOrderActivityLog workOrderId={workOrder.id} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
