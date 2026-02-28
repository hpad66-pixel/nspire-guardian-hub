import { useState, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CalendarIcon, Building2, ClipboardCheck, AlertTriangle, Wrench, FolderKanban,
  User, FileBarChart, TrendingUp, Crown, Wand2, BookMarked, Receipt, HardHat,
  DollarSign, Star, Save, Clock, Trash2,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DateRange } from '@/hooks/useReports';

// Admin Reports
import { PropertyPortfolioReport } from '@/components/reports/PropertyPortfolioReport';
import { InspectionSummaryReport } from '@/components/reports/InspectionSummaryReport';
import { DefectsAnalysisReport } from '@/components/reports/DefectsAnalysisReport';
import { IssuesOverviewReport } from '@/components/reports/IssuesOverviewReport';
import { WorkOrdersPerformanceReport } from '@/components/reports/WorkOrdersPerformanceReport';
import { ProjectStatusReport } from '@/components/reports/ProjectStatusReport';

// User Reports
import { MyAssignedItemsReport } from '@/components/reports/MyAssignedItemsReport';
import { MyInspectionsReport } from '@/components/reports/MyInspectionsReport';
import { MyDailyReportsReport } from '@/components/reports/MyDailyReportsReport';

// New Owner Reports
import { PayAppStatusReport } from '@/components/reports/PayAppStatusReport';
import { ContractorAccountabilityReport } from '@/components/reports/ContractorAccountabilityReport';
import { ProjectFinancialReport } from '@/components/reports/ProjectFinancialReport';
import { OwnerMonthlySummaryReport } from '@/components/reports/OwnerMonthlySummaryReport';
import { SaveReportDialog } from '@/components/reports/SaveReportDialog';
import { ScheduleReportSheet } from '@/components/reports/ScheduleReportSheet';

// Saved Reports
import { useSavedReports, useDeleteSavedReport, useDeliveryLog, type SavedReport } from '@/hooks/useSavedReports';

// Data sources for builder
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const presetRanges = [
  { label: 'This Month', getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: 'Last Month', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: 'Last 3 Months', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 2)), to: endOfMonth(new Date()) }) },
  { label: 'Last 6 Months', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 5)), to: endOfMonth(new Date()) }) },
  { label: 'Year to Date', getValue: () => ({ from: new Date(new Date().getFullYear(), 0, 1), to: new Date() }) },
];

const DATA_SOURCES = [
  { key: 'properties', label: 'Properties', table: 'properties', cols: ['name', 'address', 'city', 'state', 'status'] },
  { key: 'inspections', label: 'Inspections', table: 'inspections', cols: ['area', 'status', 'inspection_date'] },
  { key: 'work_orders', label: 'Work Orders', table: 'work_orders', cols: ['title', 'status', 'priority', 'due_date', 'completed_at'] },
  { key: 'issues', label: 'Issues', table: 'issues', cols: ['title', 'status', 'severity', 'created_at'] },
  { key: 'projects', label: 'Projects', table: 'projects', cols: ['name', 'status', 'budget', 'spent'] },
  { key: 'pay_applications', label: 'Pay Applications', table: 'pay_applications', cols: ['pay_app_number', 'status', 'contractor_name', 'period_from', 'period_to'] },
  { key: 'contractors', label: 'Contractors', table: 'contractors', cols: ['name', 'company', 'trade', 'status'] },
];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(subMonths(new Date(), 2)),
    to: endOfMonth(new Date()),
  });
  const [activePreset, setActivePreset] = useState('Last 3 Months');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveDialogType, setSaveDialogType] = useState('');
  const [scheduleSheetOpen, setScheduleSheetOpen] = useState(false);
  const [scheduleReport, setScheduleReport] = useState<SavedReport | null>(null);

  // Builder state
  const [builderSource, setBuilderSource] = useState('properties');
  const [builderData, setBuilderData] = useState<any[]>([]);
  const [builderLoading, setBuilderLoading] = useState(false);

  // Saved reports
  const { data: savedReports = [] } = useSavedReports();
  const deleteReport = useDeleteSavedReport();
  const { data: deliveryLog = [] } = useDeliveryLog();

  const handlePresetClick = (preset: typeof presetRanges[0]) => {
    setDateRange(preset.getValue());
    setActivePreset(preset.label);
  };

  const openSaveDialog = (type: string) => {
    setSaveDialogType(type);
    setSaveDialogOpen(true);
  };

  const handleBuilderPreview = async () => {
    const src = DATA_SOURCES.find(s => s.key === builderSource);
    if (!src) return;
    setBuilderLoading(true);
    try {
      const { data, error } = await supabase.from(src.table as any).select(src.cols.join(',')).limit(20);
      if (error) throw error;
      setBuilderData(data ?? []);
    } catch { setBuilderData([]); }
    setBuilderLoading(false);
  };

  const currentSource = DATA_SOURCES.find(s => s.key === builderSource);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Comprehensive analytics and insights across your portfolio
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {presetRanges.map((preset) => (
            <Button
              key={preset.label}
              variant={activePreset === preset.label ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePresetClick(preset)}
            >
              {preset.label}
            </Button>
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                Custom
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to });
                    setActivePreset('');
                  }
                }}
                numberOfMonths={2}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Date Range Display */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarIcon className="h-4 w-4" />
        <span>
          Showing data from{' '}
          <span className="font-medium text-foreground">{format(dateRange.from, 'MMM d, yyyy')}</span>
          {' to '}
          <span className="font-medium text-foreground">{format(dateRange.to, 'MMM d, yyyy')}</span>
        </span>
      </div>

      {/* Report Categories */}
      <Tabs defaultValue="admin" className="space-y-6">
        <TabsList className="flex w-full max-w-2xl">
          <TabsTrigger value="admin" className="gap-1.5 flex-1">
            <FileBarChart className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Organization</span>
          </TabsTrigger>
          <TabsTrigger value="user" className="gap-1.5 flex-1">
            <User className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">My Reports</span>
          </TabsTrigger>
          <TabsTrigger value="owner" className="gap-1.5 flex-1">
            <Crown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Owner Reports</span>
          </TabsTrigger>
          <TabsTrigger value="builder" className="gap-1.5 flex-1">
            <Wand2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Builder</span>
          </TabsTrigger>
          <TabsTrigger value="saved" className="gap-1.5 flex-1">
            <BookMarked className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Saved</span>
          </TabsTrigger>
        </TabsList>

        {/* ═══════ Admin/Organization Reports ═══════ */}
        <TabsContent value="admin" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ReportCard title="Property Portfolio" description="Overview of all properties, units, and occupancy" icon={Building2} color="bg-blue-500" />
            <ReportCard title="Inspection Summary" description="Inspection activity by area and completion rates" icon={ClipboardCheck} color="bg-emerald-600" />
            <ReportCard title="Defects Analysis" description="Defect trends by severity and category" icon={AlertTriangle} color="bg-amber-500" />
            <ReportCard title="Issues Overview" description="Issue tracking and resolution metrics" icon={TrendingUp} color="bg-purple-500" />
            <ReportCard title="Work Orders" description="Work order performance and completion" icon={Wrench} color="bg-orange-500" />
            <ReportCard title="Project Status" description="Project progress and financial summary" icon={FolderKanban} color="bg-indigo-500" />
          </div>
          <div className="space-y-6">
            <PropertyPortfolioReport dateRange={dateRange} />
            <InspectionSummaryReport dateRange={dateRange} />
            <DefectsAnalysisReport dateRange={dateRange} />
            <IssuesOverviewReport dateRange={dateRange} />
            <WorkOrdersPerformanceReport dateRange={dateRange} />
            <ProjectStatusReport dateRange={dateRange} />
          </div>
        </TabsContent>

        {/* ═══════ User/Personal Reports ═══════ */}
        <TabsContent value="user" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <ReportCard title="My Assigned Items" description="Issues and work orders assigned to you" icon={AlertTriangle} color="bg-destructive" />
            <ReportCard title="My Inspections" description="Inspections you've conducted" icon={ClipboardCheck} color="bg-emerald-600" />
            <ReportCard title="My Daily Reports" description="Field reports you've submitted" icon={FileBarChart} color="bg-blue-500" />
          </div>
          <div className="space-y-6">
            <MyAssignedItemsReport />
            <MyInspectionsReport dateRange={dateRange} />
            <MyDailyReportsReport dateRange={dateRange} />
          </div>
        </TabsContent>

        {/* ═══════ Owner Reports ═══════ */}
        <TabsContent value="owner" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <ReportCard title="Pay App Status" description="Billing & certification" icon={Receipt} color="bg-blue-500" />
            <ReportCard title="Contractor Accountability" description="Performance scorecards" icon={HardHat} color="bg-amber-500" />
            <ReportCard title="Project Financial" description="Budget & spend overview" icon={DollarSign} color="bg-emerald-600" />
            <Card className="border-2 border-amber-500/50 hover:shadow-md transition-shadow relative">
              <div className="absolute top-2 right-2">
                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px]"><Star className="h-2.5 w-2.5 mr-0.5" /> FLAGSHIP</Badge>
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#0A1628]"><Crown className="h-5 w-5 text-amber-400" /></div>
                  <div>
                    <CardTitle className="text-base">Owner Monthly Summary</CardTitle>
                    <CardDescription className="text-xs">Executive briefing for ownership</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>

          {/* Report sections with Save buttons */}
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-end gap-2 no-print">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openSaveDialog('pay_app_status')}>
                  <Save className="h-3.5 w-3.5" /> Save
                </Button>
              </div>
              <PayAppStatusReport dateRange={dateRange} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-end gap-2 no-print">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openSaveDialog('contractor_accountability')}>
                  <Save className="h-3.5 w-3.5" /> Save
                </Button>
              </div>
              <ContractorAccountabilityReport dateRange={dateRange} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-end gap-2 no-print">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openSaveDialog('project_financial')}>
                  <Save className="h-3.5 w-3.5" /> Save
                </Button>
              </div>
              <ProjectFinancialReport dateRange={dateRange} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-end gap-2 no-print">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openSaveDialog('owner_monthly')}>
                  <Save className="h-3.5 w-3.5" /> Save
                </Button>
              </div>
              <OwnerMonthlySummaryReport dateRange={dateRange} />
            </div>
          </div>
        </TabsContent>

        {/* ═══════ Report Builder ═══════ */}
        <TabsContent value="builder" className="space-y-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Controls */}
            <div className="w-full lg:w-[300px] flex-shrink-0 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Report Builder</CardTitle>
                  <CardDescription className="text-xs">Select data and preview</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">Data Source</Label>
                    <Select value={builderSource} onValueChange={setBuilderSource}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DATA_SOURCES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button className="w-full" onClick={handleBuilderPreview} disabled={builderLoading}>
                    {builderLoading ? 'Loading...' : 'Preview Report'}
                  </Button>

                  <Button variant="outline" className="w-full gap-1.5" onClick={() => openSaveDialog('custom')}>
                    <Save className="h-3.5 w-3.5" /> Save This Report
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Preview */}
            <div className="flex-1 min-w-0">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Preview</CardTitle>
                  <CardDescription className="text-xs">
                    {builderData.length > 0 ? `Showing ${builderData.length} of records` : 'Click "Preview Report" to load data'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {builderData.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No data loaded. Select a source and click Preview.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            {currentSource?.cols.map(col => (
                              <th key={col} className="px-3 py-2 text-left font-medium text-xs">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {builderData.map((row, i) => (
                            <tr key={i} className="border-b last:border-0">
                              {currentSource?.cols.map(col => (
                                <td key={col} className="px-3 py-2 text-xs truncate max-w-[200px]">
                                  {row[col] != null ? String(row[col]) : '—'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ═══════ Saved Reports ═══════ */}
        <TabsContent value="saved" className="space-y-6">
          {savedReports.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                  <BookMarked className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">No saved reports</h3>
                <p className="text-sm text-muted-foreground">Save reports from the Owner Reports or Builder tabs.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {savedReports.map(report => (
                <Card key={report.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm">{report.name}</CardTitle>
                        {report.description && <CardDescription className="text-xs">{report.description}</CardDescription>}
                      </div>
                      <Badge variant="secondary" className="text-[9px]">{report.report_type.replace(/_/g, ' ')}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-[10px] text-muted-foreground mb-3">
                      Saved {format(new Date(report.created_at), 'MMM d, yyyy')}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline" size="sm" className="flex-1 gap-1"
                        onClick={() => { setScheduleReport(report); setScheduleSheetOpen(true); }}
                      >
                        <Clock className="h-3 w-3" /> Schedule
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => deleteReport.mutate(report.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Delivery Log */}
          {deliveryLog.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Delivery Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium text-xs">Report</th>
                        <th className="px-3 py-2 text-left font-medium text-xs">Sent To</th>
                        <th className="px-3 py-2 text-left font-medium text-xs">Sent At</th>
                        <th className="px-3 py-2 text-left font-medium text-xs">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveryLog.map((log: any) => (
                        <tr key={log.id} className="border-b last:border-0">
                          <td className="px-3 py-2">{log.saved_report?.name || '—'}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{(log.sent_to || []).join(', ')}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {log.sent_at ? format(new Date(log.sent_at), 'MMM d, yyyy h:mm a') : '—'}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant="secondary" className={`text-[10px] ${log.status === 'sent' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'}`}>
                              {log.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <SaveReportDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        reportType={saveDialogType}
        config={{ dateRange: { from: format(dateRange.from, 'yyyy-MM-dd'), to: format(dateRange.to, 'yyyy-MM-dd') } }}
      />

      {scheduleReport && (
        <ScheduleReportSheet
          open={scheduleSheetOpen}
          onOpenChange={setScheduleSheetOpen}
          savedReport={scheduleReport}
        />
      )}
    </div>
  );
}

function ReportCard({ 
  title, description, icon: Icon, color 
}: { 
  title: string; description: string; icon: React.ComponentType<{ className?: string }>; color: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", color)}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
