import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { 
  Phone, 
  User, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  PlayCircle,
  FileText,
  ChevronRight,
  PawPrint,
  Wrench
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MaintenanceRequest, 
  MaintenanceRequestActivity,
  useMaintenanceRequestActivity,
  useUpdateMaintenanceRequest,
  useAssignMaintenanceRequest,
  useResolveMaintenanceRequest,
} from '@/hooks/useMaintenanceRequests';
import { usePeople } from '@/hooks/usePeople';
import { cn } from '@/lib/utils';

interface RequestDetailSheetProps {
  request: MaintenanceRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusSteps = ['new', 'reviewed', 'assigned', 'in_progress', 'completed', 'closed'];

const statusConfig: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-blue-500' },
  reviewed: { label: 'Reviewed', color: 'bg-yellow-500' },
  assigned: { label: 'Assigned', color: 'bg-purple-500' },
  in_progress: { label: 'In Progress', color: 'bg-orange-500' },
  completed: { label: 'Completed', color: 'bg-green-500' },
  closed: { label: 'Closed', color: 'bg-muted-foreground' },
};

export function RequestDetailSheet({ request, open, onOpenChange }: RequestDetailSheetProps) {
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  
  const { data: activity } = useMaintenanceRequestActivity(request?.id || '');
  const { data: people } = usePeople();
  const updateRequest = useUpdateMaintenanceRequest();
  const assignRequest = useAssignMaintenanceRequest();
  const resolveRequest = useResolveMaintenanceRequest();

  if (!request) return null;

  const ticketNumber = `MR-${String(request.ticket_number).padStart(4, '0')}`;
  const currentStepIndex = statusSteps.indexOf(request.status);

  const handleStatusChange = (newStatus: string) => {
    updateRequest.mutate({ id: request.id, status: newStatus });
  };

  const handleAssign = () => {
    if (selectedAssignee) {
      assignRequest.mutate({ id: request.id, assigned_to: selectedAssignee });
    }
  };

  const handleResolve = () => {
    if (resolutionNotes.trim()) {
      resolveRequest.mutate({ 
        id: request.id, 
        resolution_notes: resolutionNotes 
      });
      setResolutionNotes('');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-3">
              <span className="font-mono">{ticketNumber}</span>
              {request.is_emergency && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  EMERGENCY
                </Badge>
              )}
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status Progress */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
            <div className="flex items-center gap-1">
              {statusSteps.map((step, index) => (
                <div key={step} className="flex items-center">
                  <button
                    onClick={() => handleStatusChange(step)}
                    className={cn(
                      'w-3 h-3 rounded-full transition-all',
                      index <= currentStepIndex
                        ? statusConfig[request.status].color
                        : 'bg-muted'
                    )}
                  />
                  {index < statusSteps.length - 1 && (
                    <div
                      className={cn(
                        'w-8 h-0.5',
                        index < currentStepIndex ? statusConfig[request.status].color : 'bg-muted'
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              {statusSteps.map((step) => (
                <span key={step} className={cn(step === request.status && 'font-medium text-foreground')}>
                  {statusConfig[step].label}
                </span>
              ))}
            </div>
          </div>

          <Separator />

          {/* Two Column Layout */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Caller Information */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                Caller Information
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{request.caller_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <a href={`tel:${request.caller_phone}`} className="font-medium text-primary">
                    {request.caller_phone}
                  </a>
                </div>
                {request.caller_unit_number && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unit</span>
                    <span className="font-medium">{request.caller_unit_number}</span>
                  </div>
                )}
                {request.properties?.name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Property</span>
                    <span className="font-medium">{request.properties.name}</span>
                  </div>
                )}
              </div>

              {/* Availability */}
              <div className="pt-2 space-y-2">
                <h5 className="text-sm font-medium text-muted-foreground">Availability</h5>
                <div className="space-y-1 text-sm">
                  {request.preferred_contact_time && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Best time: {request.preferred_contact_time}</span>
                    </div>
                  )}
                  {request.has_pets && (
                    <div className="flex items-center gap-2">
                      <PawPrint className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Has pets</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Issue Details */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                Issue Details
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-medium capitalize">{request.issue_category}</span>
                </div>
                {request.issue_location && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-medium capitalize">{request.issue_location}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Urgency</span>
                  <Badge variant={request.is_emergency ? 'destructive' : 'outline'}>
                    {request.urgency_level}
                  </Badge>
                </div>
              </div>
              <div className="pt-2">
                <h5 className="text-sm font-medium text-muted-foreground mb-2">Description</h5>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">
                  {request.issue_description}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Call Transcript */}
          {request.call_transcript && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Call Transcript
                  </h4>
                  {request.call_recording_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={request.call_recording_url} target="_blank" rel="noopener noreferrer">
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Play Recording
                      </a>
                    </Button>
                  )}
                </div>
                <div className="bg-muted/50 p-4 rounded-lg max-h-48 overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap font-sans">
                    {request.call_transcript}
                  </pre>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Assignment Section */}
          {['new', 'reviewed', 'assigned'].includes(request.status) && (
            <>
              <div className="space-y-3">
                <h4 className="font-medium">Assignment</h4>
                <div className="flex gap-3">
                  <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select technician" />
                    </SelectTrigger>
                    <SelectContent>
                      {people?.filter(p => p.status === 'active').map((person) => (
                        <SelectItem key={person.user_id} value={person.user_id}>
                          {person.full_name || person.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAssign} disabled={!selectedAssignee}>
                    Assign
                  </Button>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Resolution Section */}
          {['assigned', 'in_progress'].includes(request.status) && (
            <>
              <div className="space-y-3">
                <h4 className="font-medium">Resolution</h4>
                <Textarea
                  placeholder="Enter resolution notes..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleStatusChange('in_progress')}
                    disabled={request.status === 'in_progress'}
                  >
                    Mark In Progress
                  </Button>
                  <Button onClick={handleResolve} disabled={!resolutionNotes.trim()}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Mark Resolved
                  </Button>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Resolution Display */}
          {request.resolution_notes && (
            <>
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  Resolution
                </h4>
                <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg">
                  <p className="text-sm">{request.resolution_notes}</p>
                  {request.resolved_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Resolved {format(new Date(request.resolved_at), 'PPp')}
                    </p>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Activity Log */}
          <div className="space-y-3">
            <h4 className="font-medium">Activity Log</h4>
            <div className="space-y-2">
              {activity?.map((item) => (
                <div key={item.id} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-muted-foreground" />
                  <div className="flex-1">
                    <span className="capitalize">{item.action.replace(/_/g, ' ')}</span>
                    <span className="text-muted-foreground ml-2">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
              <div className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-primary" />
                <div className="flex-1">
                  <span>Request created via voice agent</span>
                  <span className="text-muted-foreground ml-2">
                    {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
