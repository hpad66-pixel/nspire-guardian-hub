import { useState } from 'react';
import { useModules } from '@/contexts/ModuleContext';
import { useCurrentUserRole } from '@/hooks/useUserManagement';
import { Navigate } from 'react-router-dom';
import { GraduationCap, Download, UserCheck, ClipboardList, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAllAssignments, useTeamCompletions, useCatalog, useRemoveAssignment } from '@/hooks/useTraining';
import { AssignCourseSheet } from '@/components/training/AssignCourseSheet';
import { StatCard } from '@/components/ui/stat-card';
import { isAfter, addDays, parseISO } from 'date-fns';

export default function TrainingDashboardPage() {
  const { isModuleEnabled } = useModules();
  const { data: role } = useCurrentUserRole();
  const isAdmin = role === 'admin' || role === 'owner' || role === 'manager';

  const { data: assignments = [] } = useAllAssignments();
  const { data: completions = [] } = useTeamCompletions();
  const { data: catalog = [] } = useCatalog();
  const removeAssignment = useRemoveAssignment();

  const [assignSheetOpen, setAssignSheetOpen] = useState(false);

  if (!isModuleEnabled('trainingHubEnabled')) return <Navigate to="/dashboard" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const now = new Date();
  const overdue = assignments.filter(a => a.due_date && isAfter(now, parseISO(a.due_date)));
  const dueSoon = assignments.filter(a => a.due_date && !isAfter(now, parseISO(a.due_date)) && isAfter(addDays(now, 14), parseISO(a.due_date)));

  const handleExportCSV = () => {
    const rows = [
      ['Name', 'Course', 'Due Date', 'Status', 'Recurrence'],
      ...assignments.map(a => {
        const c = catalog.find(c => c.id === a.lw_course_id);
        const assignee = (a as any).assignee;
        return [
          assignee?.full_name ?? 'Unknown',
          c?.title ?? a.lw_course_id,
          a.due_date ?? '',
          a.status,
          a.recurrence ?? '',
        ];
      })
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'training-report.csv';
    link.click();
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Training & Compliance</h1>
            <p className="text-sm text-muted-foreground">Assign courses, track completion, ensure your team stays certified</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Button size="sm" onClick={() => setAssignSheetOpen(true)}>
            Assign Course
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Assignments" value={assignments.length} icon={ClipboardList} />
        <StatCard title="Completed" value={completions.length} variant="success" icon={UserCheck} />
        <StatCard title="Due within 14 days" value={dueSoon.length} variant="moderate" icon={ClipboardList} />
        <StatCard title="Overdue" value={overdue.length} variant="severe" icon={Award} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="assignments">
        <TabsList>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="mt-4 space-y-3">
          {assignments.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/30 py-12 text-center">
              <p className="text-sm text-muted-foreground">No assignments yet. Click "Assign Course" to get started.</p>
            </div>
          ) : (
            assignments.map(a => {
              const course = catalog.find(c => c.id === a.lw_course_id);
              const assignee = (a as any).assignee;
              const isDue = a.due_date ? isAfter(now, parseISO(a.due_date)) : false;
              return (
                <div key={a.id} className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{course?.title ?? a.lw_course_id}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                      {assignee?.full_name && <span>{assignee.full_name}</span>}
                      {a.due_date && (
                        <span className={isDue ? 'text-red-500 font-medium' : ''}>
                          Due {a.due_date}
                        </span>
                      )}
                      {a.recurrence && <span className="capitalize">{a.recurrence}</span>}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="text-xs text-muted-foreground h-7"
                    onClick={() => removeAssignment.mutate(a.id)}>
                    Remove
                  </Button>
                </div>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="certificates" className="mt-4 space-y-3">
          {completions.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/30 py-12 text-center">
              <p className="text-sm text-muted-foreground">No certificates earned yet.</p>
            </div>
          ) : (
            completions.filter(c => c.certificate_url).map(c => {
              const profile = (c as any).profile;
              const course = catalog.find(ct => ct.id === c.lw_course_id);
              return (
                <div key={c.id} className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
                  <div>
                    <p className="text-sm font-semibold">{course?.title ?? c.lw_course_id}</p>
                    <p className="text-xs text-muted-foreground">{profile?.full_name} · {new Date(c.completed_at).toLocaleDateString()}</p>
                  </div>
                  {c.certificate_url && (
                    <Button size="sm" variant="outline" className="text-xs h-7"
                      onClick={() => window.open(c.certificate_url!, '_blank')}>
                      View
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      <AssignCourseSheet open={assignSheetOpen} onOpenChange={setAssignSheetOpen} />
    </div>
  );
}
