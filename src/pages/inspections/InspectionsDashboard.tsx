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

export default function InspectionsDashboard() {
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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Inspection
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Severe Defects"
          value={4}
          subtitle="24hr deadline"
          icon={AlertTriangle}
          variant="severe"
        />
        <StatCard
          title="Moderate Defects"
          value={18}
          subtitle="30 day deadline"
          icon={Clock}
          variant="moderate"
        />
        <StatCard
          title="Low Priority"
          value={32}
          subtitle="60 day deadline"
          icon={Clock}
          variant="low"
        />
        <StatCard
          title="Resolved"
          value={156}
          subtitle="This month"
          icon={CheckCircle2}
          variant="success"
        />
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
                <span className="text-sm text-muted-foreground">712 / 847 units (84%)</span>
              </div>
              <Progress value={84} className="h-3" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-8 w-8 rounded bg-emerald-100 flex items-center justify-center">
                    <TreePine className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium">Outside</p>
                    <p className="text-xs text-muted-foreground">12 properties</p>
                  </div>
                </div>
                <Progress value={100} className="h-2 mb-2" />
                <p className="text-xs text-success font-medium">Complete</p>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-8 w-8 rounded bg-blue-100 flex items-center justify-center">
                    <Building className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Inside (Common)</p>
                    <p className="text-xs text-muted-foreground">12 properties</p>
                  </div>
                </div>
                <Progress value={92} className="h-2 mb-2" />
                <p className="text-xs text-muted-foreground">92% complete</p>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-8 w-8 rounded bg-violet-100 flex items-center justify-center">
                    <DoorOpen className="h-4 w-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="font-medium">Units</p>
                    <p className="text-xs text-muted-foreground">847 total</p>
                  </div>
                </div>
                <Progress value={84} className="h-2 mb-2" />
                <p className="text-xs text-muted-foreground">712 of 847 complete</p>
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
                <span className="text-xs px-2 py-1 rounded bg-muted">2 scheduled</span>
                <span className="text-xs px-2 py-1 rounded bg-severity-severe text-white">1 urgent</span>
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
                <span className="text-xs px-2 py-1 rounded bg-muted">4 scheduled</span>
                <span className="text-xs px-2 py-1 rounded bg-severity-moderate text-white">3 pending</span>
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
                <span className="text-xs px-2 py-1 rounded bg-muted">135 remaining</span>
                <span className="text-xs px-2 py-1 rounded bg-severity-severe text-white">2 urgent</span>
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
            <Button variant="outline" size="sm">View All Defects</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { item: 'GFCI Protection', condition: 'GFCI not functioning', area: 'Unit 204', property: 'Oak Ridge Apts', severity: 'severe' as const, deadline: '6 hours', proofRequired: true },
              { item: 'Smoke Detector', condition: 'Missing', area: 'Unit 112', property: 'Maple Commons', severity: 'severe' as const, deadline: '18 hours', proofRequired: true },
              { item: 'Emergency Exit', condition: 'Door not functioning', area: 'Building A', property: 'Pine View', severity: 'severe' as const, deadline: '22 hours', proofRequired: true },
              { item: 'Water Heater', condition: 'Leaking', area: 'Unit 305', property: 'Cedar Heights', severity: 'moderate' as const, deadline: '28 days', proofRequired: false },
              { item: 'Bath Ventilation', condition: 'Non-functional fan', area: 'Unit 118', property: 'Oak Ridge Apts', severity: 'moderate' as const, deadline: '29 days', proofRequired: false },
            ].map((defect, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:border-accent/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <SeverityBadge severity={defect.severity} />
                  <div>
                    <p className="font-medium">{defect.item}</p>
                    <p className="text-sm text-muted-foreground">{defect.condition}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm">{defect.area}</p>
                    <p className="text-xs text-muted-foreground">{defect.property}</p>
                  </div>
                  <div className="text-right min-w-[80px]">
                    <p className={`text-sm font-medium ${defect.severity === 'severe' ? 'text-destructive' : ''}`}>
                      {defect.deadline}
                    </p>
                    {defect.proofRequired && (
                      <p className="text-xs text-warning">Proof required</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
