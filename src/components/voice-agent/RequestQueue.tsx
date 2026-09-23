import { AlertTriangle, ArrowRight, Clock, MapPin, PhoneCall, User, Wrench } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MaintenanceRequest } from '@/hooks/useMaintenanceRequests';
import { cn } from '@/lib/utils';

interface RequestQueueProps {
  requests: MaintenanceRequest[];
  onSelect: (request: MaintenanceRequest) => void;
  selectedId?: string;
}

const statusColors: Record<string, string> = {
  new: 'border-sky-200 bg-sky-50 text-sky-800',
  reviewed: 'border-amber-200 bg-amber-50 text-amber-800',
  assigned: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  in_progress: 'border-orange-200 bg-orange-50 text-orange-800',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  closed: 'border-slate-200 bg-slate-100 text-slate-600',
};

const urgencyColors: Record<string, string> = {
  emergency: 'bg-rose-600 text-white',
  urgent: 'bg-orange-600 text-white',
  normal: 'border-slate-200 bg-white text-slate-700',
  low: 'border-slate-200 bg-white text-slate-600',
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
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800">
            <AlertTriangle className="h-5 w-5" />
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
    <button
      type="button"
      className={cn(
        'group w-full rounded-2xl border bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#0f766e]/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] focus-visible:ring-offset-2',
        isSelected && 'border-[#0f766e] ring-2 ring-[#0f766e]/30',
        isEmergency && 'border-rose-200 bg-rose-50/60'
      )}
      onClick={() => onSelect(request)}
    >
      <Card className="border-0 bg-transparent shadow-none">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#10263f] px-2.5 py-1 font-mono text-xs font-semibold text-white">{ticketNumber}</span>
              {request.caller_unit_number && (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  Unit {request.caller_unit_number}
                </span>
              )}
                {request.work_order_id && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                    <Wrench className="h-3 w-3" />
                    WO linked
                  </span>
                )}
            </div>
              <h4 className="line-clamp-2 font-semibold leading-5 text-[#10263f]">{request.issue_description}</h4>
              <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-[#0f766e]" />
                {request.caller_name}
              </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[#0f766e]" />
                {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
              </div>
                {request.issue_location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[#0f766e]" />
                    <span className="capitalize">{request.issue_location}</span>
                  </div>
                )}
                {request.caller_phone && (
                  <div className="flex items-center gap-1.5">
                    <PhoneCall className="h-3.5 w-3.5 text-[#0f766e]" />
                    {request.caller_phone}
                  </div>
                )}
            </div>
          </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <Badge className={cn('border capitalize', urgencyColors[request.urgency_level])}>
              {request.urgency_level}
            </Badge>
              <Badge variant="outline" className={cn('capitalize', statusColors[request.status])}>
              {request.status.replace('_', ' ')}
            </Badge>
              <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#0f766e] opacity-0 transition-opacity group-hover:opacity-100">
                Open
                <ArrowRight className="h-3 w-3" />
              </span>
          </div>
        </div>
      </CardContent>
      </Card>
    </button>
  );
}
