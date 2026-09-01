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
  Camera,
  User,
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Send,
  XCircle,
} from 'lucide-react';
import {
  WorkOrder,
  useUpdateWorkOrder,
  useCompleteWorkOrder,
  useVerifyWorkOrder,
  useAssignWorkOrderCrew,
} from '@/hooks/useWorkOrders';
import { useUserPermissions } from '@/hooks/usePermissions';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/hooks/useAuth';
import { WorkOrderComments } from './WorkOrderComments';
import { WorkOrderStatusStepper } from './WorkOrderStatusStepper';
import { WorkOrderActivityLog } from './WorkOrderActivityLog';
import { WorkOrderPartsPanel } from './WorkOrderPartsPanel';
import { FieldCameraDialog } from '@/components/camera/FieldCameraDialog';
import { useWorkOrderParts } from '@/hooks/useWorkOrderParts';
import { partsCompletionBlocker } from '@/lib/workorders/workOrderParts';
import { useOpsPortalProperty } from '@/components/portal/OpsPortalPropertyContext';
import { isOpsPmOrOwner } from '@/lib/portal/opsPortal';
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
  const assignCrew = useAssignWorkOrderCrew();
  const { canUpdate, canAssign, canApprove } = useUserPermissions();
  const ops = useOpsPortalProperty();
  const { data: woParts = [] } = useWorkOrderParts(workOrder?.id);
  
  const [notes, setNotes] = useState(workOrder?.notes || '');
  const [estimatedCost, setEstimatedCost] = useState(workOrder?.estimated_cost?.toString() || '');
  const [rejectionReason, setRejectionReason] = useState('');
  const [fieldCameraOpen, setFieldCameraOpen] = useState(false);
  
  if (!workOrder) return null;

  const partsBlocker = partsCompletionBlocker(woParts);
  const crewProfile = profiles?.find(
    (p) => p.user_id === (workOrder.crew_assigned_to || workOrder.assigned_to),
  );
  const crewName = crewProfile?.full_name || crewProfile?.email || null;
  const intakeLabel =
    workOrder.intake_source === 'voice'
      ? 'Voice complaint'
      : workOrder.intake_source === 'nspire'
        ? 'NSPIRE'
        : workOrder.intake_source === 'stores'
          ? 'Stores'
          : workOrder.intake_source === 'manual'
            ? 'Manual'
            : null;

  const inOpsPortal = Boolean(ops.propertyId && ops.can('maintenance'));
  const opsCanDispatch = inOpsPortal && isOpsPmOrOwner(ops.role);
  const opsCanExecute = inOpsPortal; // tech + PM + owner can capture photos / install / complete
  
  const dueDate = new Date(workOrder.due_date);
  const isOverdue = dueDate < new Date() && workOrder.status !== 'verified' && workOrder.status !== 'completed';
  const canEditWorkOrder = canUpdate('work_orders') || opsCanExecute;
  const canAssignWorkOrder = canAssign('work_orders') || opsCanDispatch;
  const canApproveWorkOrder = canApprove('work_orders') || opsCanDispatch;
  
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
  
  const handleAssignSupervisor = async (userId: string) => {
    await updateWorkOrder.mutateAsync({
      id: workOrder.id,
      supervisor_id: userId,
      assigned_to: userId,
      assigned_by: user?.id ?? null,
      assigned_at: new Date().toISOString(),
      status: 'assigned',
    } as any);
    
    await supabase.from('work_order_activity').insert({
      work_order_id: workOrder.id,
      user_id: user?.id,
      action: 'assigned_supervisor',
      details: { supervisor_id: userId },
    });
    toast.success('Assigned to maintenance supervisor');
  };

  const handleAssignCrew = async (userId: string) => {
    await assignCrew.mutateAsync({ id: workOrder.id, crewUserId: userId });
    await supabase.from('work_order_activity').insert({
      work_order_id: workOrder.id,
      user_id: user?.id,
      action: 'assigned_crew',
      details: { crew_assigned_to: userId },
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
    if (partsBlocker) {
      toast.error(partsBlocker);
      return;
    }
    try {
      await completeWorkOrder.mutateAsync({
        id: workOrder.id,
      });
      
      await supabase.from('work_order_activity').insert({
        work_order_id: workOrder.id,
        user_id: user?.id,
        action: 'completed',
        details: {},
      });
    } catch {
      /* toast handled in mutation */
    }
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
            {intakeLabel && (
              <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                {intakeLabel}
              </Badge>
            )}
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
                
                {/* Supervisor (tier 1) */}
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                    Maintenance supervisor
                  </Label>
                  {canAssignWorkOrder ? (
                    <Select
                      value={workOrder.supervisor_id || workOrder.assigned_to || ''}
                      onValueChange={handleAssignSupervisor}
                      disabled={updateWorkOrder.isPending}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Assign supervisor" />
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
                      {workOrder.supervisor_id || workOrder.assigned_to
                        ? profiles?.find(
                            (p) =>
                              p.user_id === (workOrder.supervisor_id || workOrder.assigned_to),
                          )?.full_name
                          || profiles?.find(
                            (p) =>
                              p.user_id === (workOrder.supervisor_id || workOrder.assigned_to),
                          )?.email
                          || 'Assigned'
                        : 'Unassigned'}
                    </span>
                  )}
                </div>

                {/* Crew (tier 2) */}
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                    Maintenance crew
                  </Label>
                  {canAssignWorkOrder ? (
                    <Select
                      value={workOrder.crew_assigned_to || ''}
                      onValueChange={handleAssignCrew}
                      disabled={assignCrew.isPending}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Dispatch to crew tech" />
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
                      {workOrder.crew_assigned_to
                        ? profiles?.find((p) => p.user_id === workOrder.crew_assigned_to)
                            ?.full_name
                          || profiles?.find((p) => p.user_id === workOrder.crew_assigned_to)
                            ?.email
                          || 'Assigned'
                        : 'Not dispatched yet'}
                    </span>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    Supervisor assigns the crew tech who will install parts and capture photos.
                  </p>
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
            
            {/* Parts from stores — before/after photos + install gate */}
            <WorkOrderPartsPanel
              workOrder={workOrder}
              crewName={crewName}
              readOnly={!canEditWorkOrder && !canAssignWorkOrder}
            />

            <Separator />

            {/* Evidence / Field Camera */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                Evidence Photos
              </Label>
              <Button
                type="button"
                className="w-full bg-[var(--apas-sapphire,#1D6FE8)] hover:bg-[var(--apas-sapphire,#1D6FE8)]/90"
                onClick={() => setFieldCameraOpen(true)}
              >
                <Camera className="mr-2 h-4 w-4" />
                Open Field Camera
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Time + GPS stamp burned into every photo · attaches to this work order
              </p>
              {workOrder.proof_photos && workOrder.proof_photos.length > 0 && (
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {workOrder.proof_photos.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Proof ${index + 1}`}
                      className="h-16 w-full rounded-lg border object-cover"
                    />
                  ))}
                </div>
              )}
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3 py-2 text-[11px] text-emerald-900">
                <span className="font-semibold">Photo proof you can trust.</span>{' '}
                Stamps are burned into the image pixels and cannot be removed.
              </div>
            </div>

            <FieldCameraDialog
              open={fieldCameraOpen}
              onOpenChange={setFieldCameraOpen}
              folder={`work-orders/${workOrder.id}`}
              showNotation
              attachLabel="Attach to WO"
              context={{
                workOrderLabel: `WO · ${workOrder.title}`,
                unitLabel: workOrder.unit?.unit_number
                  ? `Unit ${workOrder.unit.unit_number}`
                  : null,
                propertyLabel: workOrder.property?.name ?? null,
                addressHint: workOrder.property?.name
                  ? `${workOrder.property.name}${
                      workOrder.unit?.unit_number ? ` · Unit ${workOrder.unit.unit_number}` : ''
                    }`
                  : null,
              }}
              onCaptured={async ({ url, notation }) => {
                const next = [...(workOrder.proof_photos ?? []), url];
                await updateWorkOrder.mutateAsync({
                  id: workOrder.id,
                  proof_photos: next,
                  ...(notation
                    ? {
                        notes: [workOrder.notes, notation].filter(Boolean).join('\n'),
                      }
                    : {}),
                });
                if (user?.id) {
                  await supabase.from('work_order_activity').insert({
                    work_order_id: workOrder.id,
                    user_id: user.id,
                    action: 'proof_photo_added',
                    details: { url, notation: notation ?? null, stamped: true },
                  });
                }
              }}
            />
            
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
              
              {/* In Progress / Assigned - Mark Complete (blocked until parts installed) */}
              {(workOrder.status === 'in_progress' || workOrder.status === 'assigned')
                && canEditWorkOrder && (
                <>
                  {partsBlocker && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                      <strong>Cannot finalize yet.</strong> {partsBlocker}
                    </div>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        className="w-full"
                        variant="default"
                        disabled={!!partsBlocker}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Mark as Completed
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Complete Work Order</AlertDialogTitle>
                        <AlertDialogDescription>
                          Confirm every assigned part has before/after photos and is marked Installed. This notifies the manager for verification.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleComplete} disabled={!!partsBlocker}>
                          Complete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
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
