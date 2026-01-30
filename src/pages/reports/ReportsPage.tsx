import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { 
  CalendarIcon, 
  Building2, 
  ClipboardCheck, 
  AlertTriangle, 
  Wrench, 
  FolderKanban,
  User,
  FileBarChart,
  TrendingUp,
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

const presetRanges = [
  { label: 'This Month', getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: 'Last Month', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: 'Last 3 Months', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 2)), to: endOfMonth(new Date()) }) },
  { label: 'Last 6 Months', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 5)), to: endOfMonth(new Date()) }) },
  { label: 'Year to Date', getValue: () => ({ from: new Date(new Date().getFullYear(), 0, 1), to: new Date() }) },
];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(subMonths(new Date(), 2)),
    to: endOfMonth(new Date()),
  });
  const [activePreset, setActivePreset] = useState('Last 3 Months');

  const handlePresetClick = (preset: typeof presetRanges[0]) => {
    setDateRange(preset.getValue());
    setActivePreset(preset.label);
  };

  return (
    <div className="space-y-6">
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
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="admin" className="gap-2">
            <FileBarChart className="h-4 w-4" />
            Organization Reports
          </TabsTrigger>
          <TabsTrigger value="user" className="gap-2">
            <User className="h-4 w-4" />
            My Reports
          </TabsTrigger>
        </TabsList>

        {/* Admin/Organization Reports */}
        <TabsContent value="admin" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Report Cards */}
            <ReportCard
              title="Property Portfolio"
              description="Overview of all properties, units, and occupancy"
              icon={Building2}
              color="bg-blue-500"
            />
            <ReportCard
              title="Inspection Summary"
              description="Inspection activity by area and completion rates"
              icon={ClipboardCheck}
              color="bg-green-500"
            />
            <ReportCard
              title="Defects Analysis"
              description="Defect trends by severity and category"
              icon={AlertTriangle}
              color="bg-amber-500"
            />
            <ReportCard
              title="Issues Overview"
              description="Issue tracking and resolution metrics"
              icon={TrendingUp}
              color="bg-purple-500"
            />
            <ReportCard
              title="Work Orders"
              description="Work order performance and completion"
              icon={Wrench}
              color="bg-orange-500"
            />
            <ReportCard
              title="Project Status"
              description="Project progress and financial summary"
              icon={FolderKanban}
              color="bg-indigo-500"
            />
          </div>

          {/* Detailed Reports */}
          <div className="space-y-6">
            <PropertyPortfolioReport dateRange={dateRange} />
            <InspectionSummaryReport dateRange={dateRange} />
            <DefectsAnalysisReport dateRange={dateRange} />
            <IssuesOverviewReport dateRange={dateRange} />
            <WorkOrdersPerformanceReport dateRange={dateRange} />
            <ProjectStatusReport dateRange={dateRange} />
          </div>
        </TabsContent>

        {/* User/Personal Reports */}
        <TabsContent value="user" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <ReportCard
              title="My Assigned Items"
              description="Issues and work orders assigned to you"
              icon={AlertTriangle}
              color="bg-red-500"
            />
            <ReportCard
              title="My Inspections"
              description="Inspections you've conducted"
              icon={ClipboardCheck}
              color="bg-green-500"
            />
            <ReportCard
              title="My Daily Reports"
              description="Field reports you've submitted"
              icon={FileBarChart}
              color="bg-blue-500"
            />
          </div>

          {/* User Reports */}
          <div className="space-y-6">
            <MyAssignedItemsReport />
            <MyInspectionsReport dateRange={dateRange} />
            <MyDailyReportsReport dateRange={dateRange} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportCard({ 
  title, 
  description, 
  icon: Icon, 
  color 
}: { 
  title: string; 
  description: string; 
  icon: React.ComponentType<{ className?: string }>; 
  color: string;
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
