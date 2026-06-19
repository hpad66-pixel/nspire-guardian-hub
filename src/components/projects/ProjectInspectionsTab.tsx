/**
 * In-project Inspections — shows every daily inspection for THIS project's
 * property, contained entirely within the project. Each row has a View button
 * that opens the inspection in a right-side panel (View · Print · PDF · Email).
 */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, CheckCircle2, Clock, ClipboardCheck, User, Calendar, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useDailyInspections, WEATHER_OPTIONS, type DailyInspection } from '@/hooks/useDailyInspections';
import { useProfiles } from '@/hooks/useProfiles';
import { useManagedProperties } from '@/hooks/useProperties';
import { InspectionDetailSheet } from '@/components/inspections/InspectionDetailSheet';

interface ProjectInspectionsTabProps {
  propertyId: string | null | undefined;
  propertyName?: string | null;
}

export function ProjectInspectionsTab({ propertyId, propertyName }: ProjectInspectionsTabProps) {
  const [selected, setSelected] = useState<DailyInspection | null>(null);
  const { data: inspections = [], isLoading } = useDailyInspections(propertyId || undefined);
  const { data: profiles = [] } = useProfiles();
  const { data: properties = [] } = useManagedProperties();

  const getInspectorName = (inspectorId: string | null) => {
    if (!inspectorId) return 'Unknown';
    const p = profiles.find((x) => x.user_id === inspectorId);
    return p?.full_name || p?.email || 'Unknown';
  };

  // No property linked → inspections can't be scoped to this project.
  if (!propertyId) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <p className="font-medium">No property linked to this project</p>
          <p className="text-sm mt-1">
            Link a property to this project to see its daily inspections here.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group by date (newest first)
  const grouped = inspections.reduce((acc, insp) => {
    (acc[insp.inspection_date] ||= []).push(insp);
    return acc;
  }, {} as Record<string, DailyInspection[]>);
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-[var(--apas-sapphire)]" />
            Inspections
          </h2>
          <p className="text-sm text-muted-foreground">
            Daily grounds inspections for {propertyName || 'this property'}.
          </p>
        </div>
        <Badge variant="secondary">{inspections.length} total</Badge>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : sortedDates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="font-medium">No inspections recorded yet</p>
            <p className="text-sm mt-1">Daily inspections for this property will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((dateKey) => (
            <div key={dateKey}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {format(parseISO(dateKey), 'EEEE, MMMM d, yyyy')}
              </h3>
              <div className="space-y-2">
                {grouped[dateKey].map((insp) => {
                  const weather = WEATHER_OPTIONS.find((w) => w.value === insp.weather);
                  return (
                    <Card key={insp.id} className="hover:bg-muted/40 transition-colors">
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          {insp.status === 'completed' ? (
                            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            </div>
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center shrink-0">
                              <Clock className="h-5 w-5 text-yellow-600" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium">
                              {insp.status === 'completed' ? 'Completed' : 'In Progress'}
                            </p>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {getInspectorName(insp.inspector_id)}
                              </span>
                              {weather && <span>{weather.icon} {weather.label}</span>}
                              {insp.completed_at && (
                                <span>Completed {format(parseISO(insp.completed_at), 'h:mm a')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button size="sm" onClick={() => setSelected(insp)} className="gap-1.5">
                            <Eye className="h-4 w-4" /> View
                          </Button>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Right-side panel: View · Print · PDF · Email */}
      <InspectionDetailSheet
        inspection={selected}
        onClose={() => setSelected(null)}
        properties={properties}
        profiles={profiles}
      />
    </div>
  );
}
