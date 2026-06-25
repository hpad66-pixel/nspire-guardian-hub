/**
 * Cross-project Daily Field Reports hub for admins — every project's reports in one
 * filterable place (search, project, date range, reviewed / issues), with view, PDF,
 * print, and the Reviewed seal. Per-project Daily Logs stays the place to create them.
 */
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import {
  Calendar, Cloud, Users, AlertTriangle, Printer, Download, Loader2, Eye, Search,
  CheckCircle2, RotateCcw, FileText, ExternalLink,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useDailyReports, useReviewDailyReport, type DailyReport } from '@/hooks/useDailyReports';
import { PrintableProjectDailyReport } from '@/components/projects/PrintableProjectDailyReport';
import { DailyReviewSeal, DailyReviewBadge } from '@/components/projects/DailyReviewSeal';
import { DailyReportActionItems } from '@/components/projects/DailyReportActionItems';
import { useOpenActionItemCounts } from '@/hooks/useDailyReportActionItems';
import { generatePDF, printReport } from '@/lib/generatePDF';

const safeDate = (d: unknown) => new Date(String(d ?? '').slice(0, 10) + 'T12:00:00');

export default function DailyReportsHubPage() {
  const { data: reports = [], isLoading } = useDailyReports();
  const review = useReviewDailyReport();
  const [query, setQuery] = useState('');
  const [projectId, setProjectId] = useState('all');
  const [range, setRange] = useState<'all' | '7' | '30'>('all');
  const [flag, setFlag] = useState<'all' | 'reviewed' | 'unreviewed' | 'issues'>('all');
  const [viewReport, setViewReport] = useState<DailyReport | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [exportReport, setExportReport] = useState<DailyReport | null>(null);

  const projects = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of reports) if (r.project_id && r.project?.name) seen.set(r.project_id, r.project.name);
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [reports]);

  const filtered = reports
    .filter((r) => {
      if (projectId !== 'all' && r.project_id !== projectId) return false;
      if (flag === 'reviewed' && !(r as any).reviewed_at) return false;
      if (flag === 'unreviewed' && (r as any).reviewed_at) return false;
      if (flag === 'issues' && !r.issues_encountered) return false;
      if (range !== 'all' && safeDate(r.report_date).getTime() < Date.now() - Number(range) * 86400000) return false;
      if (query.trim()) {
        const hay = [r.project?.name, r.project?.property?.name, r.work_performed, r.weather, r.issues_encountered,
          format(safeDate(r.report_date), 'EEEE, MMMM d, yyyy')].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(query.trim().toLowerCase())) return false;
      }
      return true;
    })
    .sort((a, b) => safeDate(b.report_date).getTime() - safeDate(a.report_date).getTime());

  const liveView = viewReport ? (reports.find((r) => r.id === viewReport.id) ?? viewReport) : null;
  const { data: openCounts = {} } = useOpenActionItemCounts(filtered.map((r) => r.id));
  const EXPORT_ID = 'hub-export-root';

  // Render the report full-width off-screen, wait for its photos, then capture.
  const withExport = async (r: DailyReport, fn: () => Promise<void>) => {
    setExportReport(r);
    await new Promise<void>((res) => requestAnimationFrame(() => setTimeout(res, 60)));
    const root = document.getElementById(EXPORT_ID);
    if (root) {
      await Promise.all(Array.from(root.querySelectorAll('img')).map((img) =>
        img.complete ? Promise.resolve() : new Promise<void>((res) => { img.onload = img.onerror = () => res(); })));
    }
    try { await fn(); } finally { setExportReport(null); }
  };

  const savePDF = async (r: DailyReport) => {
    setBusyId(r.id);
    try {
      await withExport(r, () => generatePDF({ filename: `field-report-${(r.project?.name || 'project').replace(/\s+/g, '-').toLowerCase()}-${format(safeDate(r.report_date), 'yyyy-MM-dd')}.pdf`, elementId: EXPORT_ID, scale: 2 }));
      toast.success('Report saved ✓');
    } catch { toast.error('Failed to generate PDF'); }
    setBusyId(null);
  };
  const print = async (r: DailyReport) => {
    setBusyId(r.id);
    try { await withExport(r, () => printReport(EXPORT_ID)); } catch { toast.error('Failed to print'); }
    setBusyId(null);
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-1 flex items-center gap-2">
        <FileText className="h-6 w-6 text-[var(--apas-sapphire)]" />
        <h1 className="text-3xl font-bold">Daily Field Reports</h1>
      </div>
      <p className="text-muted-foreground mb-6">Every project's daily field reports in one place. Open a project's Daily Logs to create one.</p>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search reports, projects…" className="pl-8 h-9" />
        </div>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="h-9 w-48"><SelectValue placeholder="All projects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
        {(['all', '7', '30'] as const).map((r) => (
          <Button key={r} size="sm" variant={range === r ? 'default' : 'outline'} onClick={() => setRange(r)}>{r === 'all' ? 'All' : `${r}d`}</Button>
        ))}
        <Select value={flag} onValueChange={(v) => setFlag(v as any)}>
          <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="unreviewed">Not reviewed</SelectItem>
            <SelectItem value="issues">Has issues</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">No daily reports match your filters.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <Card key={r.id} className="hover:border-accent/50 transition-colors">
              <CardContent className="flex items-center justify-between gap-3 p-3">
                <button className="flex items-center gap-3 text-left min-w-0" onClick={() => setViewReport(r)}>
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0"><Calendar className="h-5 w-5 text-muted-foreground" /></div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{format(safeDate(r.report_date), 'EEE, MMM d, yyyy')}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                      <span className="font-medium text-foreground/80">{r.project?.name ?? 'Project'}</span>
                      {r.project?.property?.name && <span>· {r.project.property.name}</span>}
                      {r.weather && <span className="hidden sm:flex items-center gap-1"><Cloud className="h-3 w-3" />{r.weather}</span>}
                      {r.workers_count ? <span className="hidden sm:flex items-center gap-1"><Users className="h-3 w-3" />{r.workers_count}</span> : null}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  {openCounts[r.id] > 0 && (
                    <Badge variant="outline" className="text-amber-600 border-amber-500/30 gap-1"><ClipboardList className="h-3 w-3" />{openCounts[r.id]}</Badge>
                  )}
                  {(r as any).reviewed_at && <DailyReviewBadge />}
                  {r.issues_encountered && <Badge variant="outline" className="text-amber-500 border-amber-500/20"><AlertTriangle className="h-3 w-3 mr-1" />Issues</Badge>}
                  <Button size="sm" variant="default" className="gap-1.5" onClick={() => setViewReport(r)}><Eye className="h-3.5 w-3.5" />View</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View drawer */}
      <Sheet open={!!viewReport} onOpenChange={(o) => !o && setViewReport(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col gap-0">
          <SheetHeader className="px-5 py-3 border-b flex-row items-center justify-between space-y-0 shrink-0">
            <SheetTitle className="text-base">{liveView ? format(safeDate(liveView.report_date), 'EEEE, MMMM d, yyyy') : 'Report'}</SheetTitle>
            <div className="flex gap-2 pr-6">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => liveView && print(liveView)} disabled={!liveView || busyId === liveView?.id}>
                {liveView && busyId === liveView.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}Print
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => liveView && savePDF(liveView)} disabled={!liveView || busyId === liveView?.id}>
                <Download className="h-4 w-4" />PDF
              </Button>
              {liveView && ((liveView as any).reviewed_at ? (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => review.mutate({ id: liveView.id, reviewed: false })} disabled={review.isPending}><RotateCcw className="h-4 w-4" />Un-review</Button>
              ) : (
                <Button size="sm" variant="outline" className="gap-1.5 border-[var(--apas-emerald)] text-[var(--apas-emerald)]" onClick={() => review.mutate({ id: liveView.id, reviewed: true })} disabled={review.isPending}><CheckCircle2 className="h-4 w-4" />Mark reviewed</Button>
              ))}
            </div>
          </SheetHeader>
          {liveView && (
            <div className="px-5 py-2 border-b text-xs text-muted-foreground flex items-center gap-2">
              <span className="font-medium text-foreground">{liveView.project?.name}</span>
              <Link to={`/projects/${liveView.project_id}/daily-log`} className="inline-flex items-center gap-1 text-[var(--apas-sapphire)] hover:underline" onClick={() => setViewReport(null)}>
                Open in project <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          )}
          <div className="flex-1 overflow-y-auto bg-white">
            {liveView && (liveView as any).reviewed_at && (
              <div className="flex justify-end px-6 pt-4"><DailyReviewSeal name={(liveView as any).reviewed_by_name} at={(liveView as any).reviewed_at} /></div>
            )}
            {liveView && <PrintableProjectDailyReport report={liveView as any} projectName={liveView.project?.name} propertyName={liveView.project?.property?.name} />}
            {liveView && <DailyReportActionItems reportId={liveView.id} projectId={liveView.project_id} />}
          </div>
        </SheetContent>
      </Sheet>

      {/* On-demand off-screen render for PDF / print (full width, real size) */}
      {exportReport && (
        <div id={EXPORT_ID} aria-hidden="true" style={{ position: 'fixed', left: '-10000px', top: 0, width: 800, background: '#fff' }}>
          <PrintableProjectDailyReport report={exportReport as any} projectName={exportReport.project?.name} propertyName={exportReport.project?.property?.name} />
        </div>
      )}
    </div>
  );
}
