import { useState } from 'react';
import { format, isPast } from 'date-fns';
import { useOwnerProjects } from '@/hooks/useOwnerPortal';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const statusColor: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  on_track: 'bg-green-100 text-green-800',
  at_risk: 'bg-amber-100 text-amber-800',
  delayed: 'bg-red-100 text-red-800',
  on_hold: 'bg-muted text-muted-foreground',
  completed: 'bg-blue-100 text-blue-800',
};

export default function OwnerProjectsPage() {
  const { data: projects = [], isLoading } = useOwnerProjects();
  const [selected, setSelected] = useState<(typeof projects)[number] | null>(null);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-8">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <Badge variant="secondary">{projects.length}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Financial and schedule summary for your active projects</p>
      </div>

      <div className="rounded-lg border border-border bg-background shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Project</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Property</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Budget</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Spent</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">% Used</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Est. Completion</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
              )}
              {!isLoading && projects.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No projects found.</td></tr>
              )}
              {projects.map(p => {
                const pct = p.budget ? Math.round(((p.spent ?? 0) / p.budget) * 100) : 0;
                const barColor = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-green-500';
                const propertyName = (p as any).property?.name ?? '—';

                return (
                  <tr
                    key={p.id}
                    className="border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-muted/30"
                    onClick={() => setSelected(p)}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{propertyName}</td>
                    <td className="px-4 py-3">
                      <Badge className={cn('text-[10px]', statusColor[p.status ?? ''] ?? 'bg-muted text-muted-foreground')}>
                        {p.status?.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">${(p.budget ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums">${(p.spent ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                          <div className={cn('h-full rounded-full', barColor)} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
                      </div>
                    </td>
                    <td className={cn('px-4 py-3 text-sm', p.target_end_date && isPast(new Date(p.target_end_date)) ? 'text-red-500' : 'text-muted-foreground')}>
                      {p.target_end_date ? format(new Date(p.target_end_date), 'MMM d, yyyy') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Property</span>
                <span className="font-medium">{(selected as any).property?.name ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge className={cn('text-[10px]', statusColor[selected.status ?? ''])}>
                  {selected.status?.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Budget</span>
                <span className="tabular-nums font-medium">${(selected.budget ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Spent</span>
                <span className="tabular-nums font-medium">${(selected.spent ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remaining</span>
                <span className="tabular-nums font-medium">
                  ${((selected.budget ?? 0) - (selected.spent ?? 0)).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Est. Completion</span>
                <span>{selected.target_end_date ? format(new Date(selected.target_end_date), 'MMM d, yyyy') : '—'}</span>
              </div>
              <Button variant="outline" className="w-full mt-2" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
