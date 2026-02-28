import { useState, useMemo } from 'react';
import { format, isPast, differenceInDays } from 'date-fns';
import { useOwnerComplianceEvents } from '@/hooks/useOwnerPortal';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  completed: 'bg-amber-100 text-amber-800',
  overdue: 'bg-red-100 text-red-800',
  at_risk: 'bg-amber-100 text-amber-800',
  open: 'bg-blue-100 text-blue-800',
};

export default function OwnerCompliancePage() {
  const { data: events = [], isLoading } = useOwnerComplianceEvents();
  const [agencyFilter, setAgencyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const agencies = useMemo(() => [...new Set(events.map(e => e.agency).filter(Boolean))], [events]);

  const overdueCount = events.filter(e => e.due_date && isPast(new Date(e.due_date))).length;

  const filtered = useMemo(() => {
    return events.filter(e => {
      if (agencyFilter !== 'all' && e.agency !== agencyFilter) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      return true;
    });
  }, [events, agencyFilter, statusFilter]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-8">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-foreground">Compliance</h1>
        {overdueCount > 0 && (
          <Badge className="bg-red-100 text-red-800 text-xs">{overdueCount} overdue</Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={agencyFilter} onValueChange={setAgencyFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Agencies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agencies</SelectItem>
            {agencies.map(a => (
              <SelectItem key={a!} value={a!}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="at_risk">At Risk</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-background shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Agency</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Due Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No compliance events found.</td></tr>
              )}
              {filtered.map(e => {
                const isOverdue = e.due_date && isPast(new Date(e.due_date));
                const daysUntil = e.due_date ? differenceInDays(new Date(e.due_date), new Date()) : null;
                const dueSoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 7;

                return (
                  <tr key={e.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      {e.agency ? (
                        <Badge variant="outline" className="text-[10px]">{e.agency}</Badge>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-foreground">{e.title}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-[10px]">{e.category}</Badge>
                    </td>
                    <td className={cn('px-4 py-3 text-xs', isOverdue ? 'text-red-500 font-medium' : dueSoon ? 'text-amber-600 font-medium' : 'text-muted-foreground')}>
                      {e.due_date ? (
                        <>
                          {format(new Date(e.due_date), 'MMM d, yyyy')}
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn('text-[10px]', statusColors[e.status] ?? 'bg-muted text-muted-foreground')}>
                        {e.status?.replace('_', ' ')}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
