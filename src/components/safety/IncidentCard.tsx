import { format } from 'date-fns';
import { MapPin, User, Clock, ChevronRight } from 'lucide-react';
import { IncidentStatusBadge } from './IncidentStatusBadge';
import type { SafetyIncident } from '@/hooks/useSafety';
import { cn } from '@/lib/utils';

interface IncidentCardProps {
  incident: SafetyIncident;
  onReview?: (incident: SafetyIncident) => void;
  isManager?: boolean;
}

export function IncidentCard({ incident, onReview, isManager }: IncidentCardProps) {
  const sourceLabelMap: Record<string, string> = {
    project: 'Project',
    grounds_inspection: 'Grounds Inspection',
    work_order: 'Work Order',
    standalone: 'Safety Log',
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col gap-3 rounded-xl border bg-card p-4 transition-all duration-150',
        isManager && onReview && 'cursor-pointer hover:border-primary/40 hover:shadow-sm'
      )}
      onClick={isManager && onReview ? () => onReview(incident) : undefined}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <IncidentStatusBadge
            status={incident.status}
            isOshaRecordable={incident.is_osha_recordable}
            classification={incident.incident_classification}
          />
          {incident.case_number && (
            <span className="text-xs text-muted-foreground font-mono">
              Case #{incident.case_number}
            </span>
          )}
        </div>
        {isManager && onReview && (
          <ChevronRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
        )}
      </div>

      {/* Employee name + injury type */}
      <div>
        <p className="font-semibold text-foreground leading-tight">
          {incident.injured_employee_name}
          {incident.injured_employee_job_title && (
            <span className="font-normal text-muted-foreground"> · {incident.injured_employee_job_title}</span>
          )}
        </p>
        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
          {incident.what_happened}
        </p>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {incident.location_description}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {format(new Date(incident.incident_date), 'MMM d, yyyy')}
          {incident.incident_time && ` · ${incident.incident_time.slice(0, 5)}`}
        </span>
        {incident.source_type && incident.source_type !== 'standalone' && (
          <span className="flex items-center gap-1 text-muted-foreground/70">
            {sourceLabelMap[incident.source_type] ?? incident.source_type}
          </span>
        )}
        <span className="flex items-center gap-1">
          <User className="h-3 w-3" />
          Reported by {incident.reporter?.full_name ?? incident.reporter?.email ?? 'Unknown'}
        </span>
      </div>
    </div>
  );
}
