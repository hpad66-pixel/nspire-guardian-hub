import { useState } from 'react';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { Progress } from '@/components/ui/progress';
import { 
  ClipboardCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  Calendar,
  TreePine,
  Building,
  DoorOpen,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDefectStats, useOpenDefects } from '@/hooks/useDefects';
import { useInspectionStats, useAnnualInspectionProgress } from '@/hooks/useInspectionStats';
import { InspectionWizard } from '@/components/inspections/InspectionWizard';
import { Skeleton } from '@/components/ui/skeleton';

export default function InspectionsDashboard() {
  const [wizardOpen, setWizardOpen] = useState(false);
  
  const { data: defectStats, isLoading: loadingDefects } = useDefectStats();
  const { data: openDefects } = useOpenDefects();
  const { data: inspectionStats } = useInspectionStats();
  const { data: annualProgress } = useAnnualInspectionProgress();

  // Get urgent defects (first 5 sorted by deadline)
  const urgentDefects = openDefects?.slice(0, 5) || [];

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-module-inspections flex items-center justify-center">
              <ClipboardCheck className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">NSPIRE Inspections</h1>
          </div>
          <p className="text-muted-foreground">
            100% annual unit inspections • NSPIRE compliant defect tracking
          </p>
        </div>
        <Button onClick={() => setWizardOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Inspection
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loadingDefects ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatCard
              title="Severe Defects"
              value={defectStats?.severe || 0}
              subtitle="24hr deadline"
              icon={AlertTriangle}
              variant="severe"
            />
            <StatCard
              title="Moderate Defects"
              value={defectStats?.moderate || 0}
              subtitle="30 day deadline"
              icon={Clock}
              variant="moderate"
            />
            <StatCard
              title="Low Priority"
              value={defectStats?.low || 0}
              subtitle="60 day deadline"
              icon={Clock}
              variant="low"
            />
            <StatCard
              title="Resolved"
              value={defectStats?.resolved || 0}
              subtitle="This month"
              icon={CheckCircle2}
              variant="success"
            />
          </>
        )}
      </div>

      {/* Annual Compliance Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Annual Inspection Progress
          </CardTitle>
          <CardDescription>
            NSPIRE requires 100% of units inspected annually with 3-year retention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">
                  {annualProgress?.units.completed || 0} / {annualProgress?.units.total || 0} units ({annualProgress?.units.percentage || 0}%)
                </span>
              </div>
              <Progress value={annualProgress?.units.percentage || 0} className="h-3" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-8 w-8 rounded bg-emerald-100 flex items-center justify-center">
                    <TreePine className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium">Outside</p>
                    <p className="text-xs text-muted-foreground">{annualProgress?.outside.total || 0} properties</p>
                  </div>
                </div>
                <Progress value={annualProgress?.outside.percentage || 0} className="h-2 mb-2" />
                <p className={`text-xs font-medium ${annualProgress?.outside.percentage === 100 ? 'text-success' : 'text-muted-foreground'}`}>
                  {annualProgress?.outside.percentage === 100 ? 'Complete' : `${annualProgress?.outside.percentage || 0}% complete`}
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-8 w-8 rounded bg-blue-100 flex items-center justify-center">
                    <Building className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Inside (Common)</p>
                    <p className="text-xs text-muted-foreground">{annualProgress?.inside.total || 0} properties</p>
                  </div>
                </div>
                <Progress value={annualProgress?.inside.percentage || 0} className="h-2 mb-2" />
                <p className="text-xs text-muted-foreground">{annualProgress?.inside.percentage || 0}% complete</p>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-8 w-8 rounded bg-violet-100 flex items-center justify-center">
                    <DoorOpen className="h-4 w-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="font-medium">Units</p>
                    <p className="text-xs text-muted-foreground">{annualProgress?.units.total || 0} total</p>
                  </div>
                </div>
                <Progress value={annualProgress?.units.percentage || 0} className="h-2 mb-2" />
                <p className="text-xs text-muted-foreground">
                  {annualProgress?.units.completed || 0} of {annualProgress?.units.total || 0} complete
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inspection Areas Quick Access */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/inspections/outside">
          <Card className="card-interactive h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <TreePine className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Outside Inspections</h3>
                  <p className="text-sm text-muted-foreground">Site, grounds, exterior</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="mt-4 flex gap-2">
                <span className="text-xs px-2 py-1 rounded bg-muted">
                  {inspectionStats?.byArea.outside.completed || 0} completed
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/inspections/inside">
          <Card className="card-interactive h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Building className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Inside Inspections</h3>
                  <p className="text-sm text-muted-foreground">Common areas, systems</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="mt-4 flex gap-2">
                <span className="text-xs px-2 py-1 rounded bg-muted">
                  {inspectionStats?.byArea.inside.completed || 0} completed
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/inspections/units">
          <Card className="card-interactive h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-violet-100 flex items-center justify-center">
                  <DoorOpen className="h-6 w-6 text-violet-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Unit Inspections</h3>
                  <p className="text-sm text-muted-foreground">Individual unit compliance</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="mt-4 flex gap-2">
                <span className="text-xs px-2 py-1 rounded bg-muted">
                  {(annualProgress?.units.total || 0) - (annualProgress?.units.completed || 0)} remaining
                </span>
                {defectStats && defectStats.severe > 0 && (
                  <span className="text-xs px-2 py-1 rounded bg-severity-severe text-white">
                    {defectStats.severe} urgent
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Defects Requiring Attention */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Defects Requiring Attention</CardTitle>
              <CardDescription>Sorted by deadline urgency</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/work-orders">View All Work Orders</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {urgentDefects.length > 0 ? (
            <div className="space-y-3">
              {urgentDefects.map((defect) => {
                const deadline = new Date(defect.repair_deadline);
                const now = new Date();
                const hoursRemaining = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
                const daysRemaining = Math.floor(hoursRemaining / 24);
                
                let deadlineText = '';
                if (hoursRemaining < 0) {
                  deadlineText = 'Overdue';
                } else if (hoursRemaining < 48) {
                  deadlineText = `${hoursRemaining} hours`;
                } else {
                  deadlineText = `${daysRemaining} days`;
                }

                return (
                  <div 
                    key={defect.id} 
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:border-accent/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <SeverityBadge severity={defect.severity} />
                      <div>
                        <p className="font-medium">{defect.item_name}</p>
                        <p className="text-sm text-muted-foreground">{defect.defect_condition}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm">{defect.inspection?.unit?.unit_number ? `Unit ${defect.inspection.unit.unit_number}` : defect.inspection?.area}</p>
                        <p className="text-xs text-muted-foreground">{defect.inspection?.property?.name}</p>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <p className={`text-sm font-medium ${defect.severity === 'severe' || hoursRemaining < 0 ? 'text-destructive' : ''}`}>
                          {deadlineText}
                        </p>
                        {defect.proof_required && (
                          <p className="text-xs text-warning">Proof required</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-4" />
              <p className="font-medium">All Clear!</p>
              <p className="text-sm text-muted-foreground">No open defects requiring attention</p>
            </div>
          )}
        </CardContent>
      </Card>

      <InspectionWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  );
}
