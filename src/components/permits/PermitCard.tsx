import { format, differenceInDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Building2, 
  Shield, 
  Flame, 
  ArrowUpSquare, 
  Waves, 
  Thermometer,
  Leaf,
  Home,
  Accessibility,
  FileQuestion,
  Calendar,
  MapPin,
  Paperclip
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PermitCardProps {
  permit: {
    id: string;
    name: string;
    permit_type: string;
    permit_number?: string | null;
    status: string;
    expiry_date?: string | null;
    issuing_authority?: string | null;
    properties?: { id: string; name: string } | null;
    document?: { id: string; name: string; file_url: string } | null;
  };
  requirementsStats?: {
    total: number;
    compliant: number;
    nextDue?: string | null;
  };
  onClick?: () => void;
}

const permitTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  building_permit: Building2,
  occupancy_certificate: Home,
  fire_safety: Flame,
  elevator: ArrowUpSquare,
  pool: Waves,
  boiler: Thermometer,
  environmental: Leaf,
  hud_compliance: Shield,
  ada: Accessibility,
  other: FileQuestion,
};

const permitTypeLabels: Record<string, string> = {
  building_permit: 'Building Permit',
  occupancy_certificate: 'Certificate of Occupancy',
  fire_safety: 'Fire Safety',
  elevator: 'Elevator',
  pool: 'Pool/Spa',
  boiler: 'Boiler',
  environmental: 'Environmental',
  hud_compliance: 'HUD Compliance',
  ada: 'ADA Compliance',
  other: 'Other',
};

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-success/10 text-success',
  expired: 'bg-destructive/10 text-destructive',
  renewed: 'bg-primary/10 text-primary',
  revoked: 'bg-destructive/10 text-destructive',
};

export function PermitCard({ permit, requirementsStats, onClick }: PermitCardProps) {
  const Icon = permitTypeIcons[permit.permit_type] || FileQuestion;
  
  const daysUntilExpiry = permit.expiry_date 
    ? differenceInDays(new Date(permit.expiry_date), new Date())
    : null;

  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
        isExpired && "border-destructive/50",
        isExpiringSoon && "border-warning/50"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            permit.status === 'active' ? "bg-primary/10" : "bg-muted"
          )}>
            <Icon className={cn(
              "h-5 w-5",
              permit.status === 'active' ? "text-primary" : "text-muted-foreground"
            )} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground truncate">{permit.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {permitTypeLabels[permit.permit_type]}
                  {permit.permit_number && ` • #${permit.permit_number}`}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge 
                  variant="secondary" 
                  className={cn("capitalize", statusColors[permit.status])}
                >
                  {permit.status}
                </Badge>
                {permit.expiry_date && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      isExpired && "border-destructive text-destructive",
                      isExpiringSoon && "border-warning text-warning"
                    )}
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    {format(new Date(permit.expiry_date), 'MMM d, yyyy')}
                  </Badge>
                )}
              </div>
            </div>

            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
              {permit.properties && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {permit.properties.name}
                </span>
              )}
              {permit.issuing_authority && (
                <span>{permit.issuing_authority}</span>
              )}
              {permit.document && (
                <span className="flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  Document attached
                </span>
              )}
            </div>

            {requirementsStats && requirementsStats.total > 0 && (
              <div className="mt-3 p-2 bg-muted/50 rounded-md">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Requirements: <span className="font-medium text-foreground">
                      {requirementsStats.compliant}/{requirementsStats.total} compliant
                    </span>
                  </span>
                  {requirementsStats.nextDue && (
                    <span className="text-muted-foreground">
                      Next Due: <span className="font-medium text-foreground">
                        {format(new Date(requirementsStats.nextDue), 'MMM d')}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
