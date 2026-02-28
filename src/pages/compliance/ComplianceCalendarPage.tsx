import { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useComplianceEvents, useComplianceEventStats, useSyncComplianceEvents, useUpdateComplianceEvent, type ComplianceEvent } from '@/hooks/useComplianceEvents';
import { CalendarFilters } from '@/components/compliance/CalendarFilters';
import { CalendarMonthView } from '@/components/compliance/CalendarMonthView';
import { CalendarListView } from '@/components/compliance/CalendarListView';
import { UpcomingEventsPanel } from '@/components/compliance/UpcomingEventsPanel';
import { ComplianceEventDialog } from '@/components/compliance/ComplianceEventDialog';
import { Skeleton } from '@/components/ui/skeleton';

function StatCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 cursor-pointer hover:border-primary/20 transition-all`}>
      <div className={`h-3 w-3 rounded-full ${color}`} />
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: 'JetBrains Mono' }}>
          {label}
        </p>
        <p className="text-xl font-bold">{count}</p>
      </div>
    </div>
  );
}

export default function ComplianceCalendarPage() {
  // Sync on mount
  useSyncComplianceEvents();

  const [view, setView] = useState<'month' | 'list'>('list');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ComplianceEvent | null>(null);

  const { data: events = [], isLoading } = useComplianceEvents({
    propertyId: filters.propertyId,
    category: filters.category,
    status: filters.status,
  });
  const stats = useComplianceEventStats();
  const updateEvent = useUpdateComplianceEvent();

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters(f => ({ ...f, [key]: value }));
  }, []);

  const handleEdit = (event: ComplianceEvent) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const handleComplete = (event: ComplianceEvent) => {
    updateEvent.mutate({
      id: event.id,
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
  };

  const handleNewEvent = () => {
    setSelectedEvent(null);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-1" style={{ fontFamily: 'JetBrains Mono' }}>
            REGULATORY CALENDAR
          </p>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Instrument Serif' }}>
            Compliance Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            All deadlines. One view. Nothing missed.
          </p>
        </div>
        <Button onClick={handleNewEvent} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Event
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Overdue" count={stats.overdue} color="bg-rose-500" />
        <StatCard label="Due 7 Days" count={stats.due7Days} color="bg-amber-500" />
        <StatCard label="Due 30 Days" count={stats.due30Days} color="bg-amber-400" />
        <StatCard label="Due 90 Days" count={stats.due90Days} color="bg-blue-500" />
      </div>

      {/* Filters */}
      <CalendarFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        view={view}
        onViewChange={setView}
      />

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div>
          {view === 'month' ? (
            <CalendarMonthView events={events} onEventClick={handleEdit} />
          ) : (
            <CalendarListView events={events} onEdit={handleEdit} onComplete={handleComplete} />
          )}
        </div>
        <div>
          <UpcomingEventsPanel events={events} onEventClick={handleEdit} />
        </div>
      </div>

      {/* Dialog */}
      <ComplianceEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={selectedEvent}
      />
    </div>
  );
}
