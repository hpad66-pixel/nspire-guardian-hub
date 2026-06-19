/**
 * In-project Inspections — shows every daily inspection for THIS project's
 * property, contained entirely within the project. Each row has a View button
 * that opens the inspection in a right-side panel (View · Print · PDF · Email).
 *
 * Resilience: a property can have duplicate/competing records, so if the
 * project's linked property has no inspections we surface the ones that DO
 * exist in the workspace (grouped by property) — this both guarantees the data
 * is visible and makes any property-linkage mismatch obvious to fix.
 */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, CheckCircle2, Clock, ClipboardCheck, User, Calendar, ChevronRight, AlertTriangle } from 'lucide-react';
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
  const { data: scoped = [], isLoading } = useDailyInspections(propertyId || undefined);
  // Workspace-wide fallback so inspections under a different (e.g. duplicate)
  // property record are never hidden from the project.
  const { data: allInspections = [], isLoading: allLoading } = useDailyInspections(undefined);
  const { data: profiles = [] } = useProfiles();
  const { data: properties = [] } = useManagedProperties();

  const getInspectorName = (inspectorId: string | null) => {
    if (!inspectorId) return 'Unknown';
    const p = profiles.find((x) => x.user_id === inspectorId);
    return p?.full_name || p?.email || 'Unknown';
  };
  const getPropertyName = (pid: string) => properties.find((p) => p.id === pid)?.name || 'Unknown property';

  const otherInspections = allInspections.filter((i) => i.property_id !== propertyId);
  const showFallback = !isLoading && scoped.length === 0 && otherInspections.length > 0;

  function InspectionRow({ insp, showProperty }: { insp: DailyInspection; showProperty?: boolean }) {
    const weather = WEATHER_OPTIONS.find((w) => w.value === insp.weather);
    return (
      <Card className="hover:bg-muted/40 transition-colors">
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
                {showProperty ? getPropertyName(insp.property_id) : (insp.status === 'completed' ? 'Completed' : 'In Progress')}
              </p>
              <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {getInspectorName(insp.inspector_id)}
                </span>
                {weather && <span>{weather.icon} {weather.label}</span>}
                {insp.completed_at && <span>Completed {format(parseISO(insp.completed_at), 'h:mm a')}</span>}
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
  }

  function groupByDate(list: DailyInspection[]) {
    const grouped = list.reduce((acc, insp) => {
      (acc[insp.inspection_date] ||= []).push(insp);
      return acc;
    }, {} as Record<string, DailyInspection[]>);
    return Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map((d) => [d, grouped[d]] as const);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-[var(--apas-sapphire)]" />
            Inspections
          </h2>
          <p className="text-sm text-muted-foreground">
            {propertyId
              ? <>Daily inspections for <span className="font-medium text-foreground">{propertyName || 'this property'}</span>.</>
              : 'No property linked to this project.'}
          </p>
        </div>
        <Badge variant="secondary">{scoped.length} for this property</Badge>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : scoped.length > 0 ? (
        <div className="space-y-6">
          {groupByDate(scoped).map(([dateKey, list]) => (
            <div key={dateKey}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {format(parseISO(dateKey), 'EEEE, MMMM d, yyyy')}
              </h3>
              <div className="space-y-2">
                {list.map((insp) => <InspectionRow key={insp.id} insp={insp} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="font-medium">
              {propertyId
                ? <>No inspections recorded for <span className="text-foreground">{propertyName || 'this property'}</span> yet.</>
                : 'Link a property to this project to see its inspections.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Fallback: inspections exist in the workspace but under a different property */}
      {showFallback && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-200">
                {otherInspections.length} inspection{otherInspections.length !== 1 ? 's' : ''} found under other properties
              </p>
              <p className="text-amber-800 dark:text-amber-300/80">
                These are recorded against a different property than the one linked to this project.
                If they belong here, re-link this project to the correct property.
              </p>
            </div>
          </div>
          {groupByDate(otherInspections).map(([dateKey, list]) => (
            <div key={dateKey}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {format(parseISO(dateKey), 'EEEE, MMMM d, yyyy')}
              </h3>
              <div className="space-y-2">
                {list.map((insp) => <InspectionRow key={insp.id} insp={insp} showProperty />)}
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
