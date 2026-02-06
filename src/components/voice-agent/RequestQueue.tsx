import { AlertTriangle, Clock, User, Phone, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MaintenanceRequest } from '@/hooks/useMaintenanceRequests';
import { cn } from '@/lib/utils';

interface RequestQueueProps {
  requests: MaintenanceRequest[];
  onSelect: (request: MaintenanceRequest) => void;
  selectedId?: string;
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-500',
  reviewed: 'bg-yellow-500/10 text-yellow-500',
  assigned: 'bg-purple-500/10 text-purple-500',
  in_progress: 'bg-orange-500/10 text-orange-500',
  completed: 'bg-green-500/10 text-green-500',
  closed: 'bg-muted text-muted-foreground',
};

const urgencyColors: Record<string, string> = {
  emergency: 'bg-destructive text-destructive-foreground',
  urgent: 'bg-orange-500 text-white',
  normal: 'bg-muted text-muted-foreground',
  low: 'bg-muted text-muted-foreground',
};

export function RequestQueue({ requests, onSelect, selectedId }: RequestQueueProps) {
  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium text-lg">No requests</h3>
          <p className="text-sm text-muted-foreground">
            New maintenance requests will appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  // Separate emergency and regular requests
  const emergencyRequests = requests.filter(r => r.is_emergency);
  const regularRequests = requests.filter(r => !r.is_emergency);

  return (
    <div className="space-y-4">
      {/* Emergency Section */}
      {emergencyRequests.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-semibold">Emergency Requests</h3>
          </div>
          <div className="space-y-2">
            {emergencyRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onSelect={onSelect}
                isSelected={selectedId === request.id}
                isEmergency
              />
            ))}
          </div>
        </div>
      )}

      {/* Regular Requests */}
      <div className="space-y-2">
        {emergencyRequests.length > 0 && regularRequests.length > 0 && (
          <h3 className="font-medium text-muted-foreground pt-2">Recent Requests</h3>
        )}
        {regularRequests.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            onSelect={onSelect}
            isSelected={selectedId === request.id}
          />
        ))}
      </div>
    </div>
  );
}

interface RequestCardProps {
  request: MaintenanceRequest;
  onSelect: (request: MaintenanceRequest) => void;
  isSelected?: boolean;
  isEmergency?: boolean;
}

function RequestCard({ request, onSelect, isSelected, isEmergency }: RequestCardProps) {
  const ticketNumber = `MR-${String(request.ticket_number).padStart(4, '0')}`;

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary',
        isEmergency && 'border-destructive/50 bg-destructive/5'
      )}
      onClick={() => onSelect(request)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-medium">{ticketNumber}</span>
              {request.caller_unit_number && (
                <span className="text-sm text-muted-foreground">
                  Unit {request.caller_unit_number}
                </span>
              )}
            </div>
            <h4 className="font-medium truncate">{request.issue_description}</h4>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {request.caller_name}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={urgencyColors[request.urgency_level]}>
              {request.urgency_level}
            </Badge>
            <Badge variant="outline" className={statusColors[request.status]}>
              {request.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
