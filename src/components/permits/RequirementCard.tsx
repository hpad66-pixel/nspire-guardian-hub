import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronRight,
  ClipboardCheck,
  FileText,
  Award,
  FileInput,
  DollarSign,
  GraduationCap,
  HelpCircle,
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
  User,
  Plus
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { PermitRequirement } from '@/hooks/usePermitRequirements';
import type { PermitDeliverable } from '@/hooks/usePermitDeliverables';

interface RequirementCardProps {
  requirement: PermitRequirement & {
    permit_deliverables?: PermitDeliverable[];
  };
  onEdit?: () => void;
  onAddDeliverable?: () => void;
  onDeliverableClick?: (deliverable: PermitDeliverable) => void;
  responsibleUser?: { full_name?: string | null; email?: string | null } | null;
}

const requirementTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  inspection: ClipboardCheck,
  report: FileText,
  certification: Award,
  filing: FileInput,
  payment: DollarSign,
  training: GraduationCap,
  other: HelpCircle,
};

const requirementTypeLabels: Record<string, string> = {
  inspection: 'Inspection',
  report: 'Report',
  certification: 'Certification',
  filing: 'Filing',
  payment: 'Payment',
  training: 'Training',
  other: 'Other',
};

const frequencyLabels: Record<string, string> = {
  one_time: 'One-time',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annual: 'Semi-Annual',
  annual: 'Annual',
  biennial: 'Biennial',
  as_needed: 'As Needed',
};

const statusConfig: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { color: 'bg-muted text-muted-foreground', icon: Circle },
  in_progress: { color: 'bg-primary/10 text-primary', icon: Clock },
  compliant: { color: 'bg-success/10 text-success', icon: CheckCircle2 },
  non_compliant: { color: 'bg-destructive/10 text-destructive', icon: AlertCircle },
  waived: { color: 'bg-muted text-muted-foreground', icon: Circle },
};

const deliverableStatusConfig: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { color: 'text-muted-foreground', icon: Circle },
  submitted: { color: 'text-primary', icon: Clock },
  approved: { color: 'text-success', icon: CheckCircle2 },
  rejected: { color: 'text-destructive', icon: AlertCircle },
  overdue: { color: 'text-destructive', icon: AlertCircle },
};

export function RequirementCard({ 
  requirement, 
  onEdit, 
  onAddDeliverable,
  onDeliverableClick,
  responsibleUser 
}: RequirementCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const Icon = requirementTypeIcons[requirement.requirement_type] || HelpCircle;
  const statusConf = statusConfig[requirement.status] || statusConfig.pending;
  const StatusIcon = statusConf.icon;

  const deliverables = requirement.permit_deliverables || [];
  const completedDeliverables = deliverables.filter(d => d.status === 'approved').length;

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-foreground">{requirement.title}</h4>
                      <Badge 
                        variant="secondary" 
                        className={cn("capitalize text-xs", statusConf.color)}
                      >
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {requirement.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {requirementTypeLabels[requirement.requirement_type]} • {frequencyLabels[requirement.frequency]}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {requirement.next_due_date && (
                      <span className="text-xs text-muted-foreground">
                        Due: {format(new Date(requirement.next_due_date), 'MMM d, yyyy')}
                      </span>
                    )}
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  {requirement.last_completed_date && (
                    <span>
                      Last Completed: {format(new Date(requirement.last_completed_date), 'MMM d, yyyy')}
                    </span>
                  )}
                  {responsibleUser && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {responsibleUser.full_name || responsibleUser.email}
                    </span>
                  )}
                  {deliverables.length > 0 && (
                    <span>
                      Deliverables: {completedDeliverables}/{deliverables.length}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 border-t bg-muted/30">
            <div className="pt-3 space-y-2">
              {requirement.description && (
                <p className="text-sm text-muted-foreground">{requirement.description}</p>
              )}

              {deliverables.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Deliverables:</p>
                  {deliverables.map((deliverable) => {
                    const dConfig = deliverableStatusConfig[deliverable.status] || deliverableStatusConfig.pending;
                    const DIcon = dConfig.icon;
                    
                    return (
                      <div 
                        key={deliverable.id}
                        className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-background cursor-pointer"
                        onClick={() => onDeliverableClick?.(deliverable)}
                      >
                        <DIcon className={cn("h-4 w-4", dConfig.color)} />
                        <span className="text-sm flex-1">{deliverable.title}</span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {deliverable.status}
                        </span>
                        {deliverable.due_date && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(deliverable.due_date), 'MMM d')}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No deliverables yet</p>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={onEdit}>
                  Edit Requirement
                </Button>
                <Button variant="outline" size="sm" onClick={onAddDeliverable}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Deliverable
                </Button>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
