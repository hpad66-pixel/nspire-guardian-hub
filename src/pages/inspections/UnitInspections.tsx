import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { UNIT_DEFECTS } from '@/data/nspire-catalog';
import { DoorOpen, Plus, ArrowLeft, CheckCircle2, AlertTriangle, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

export default function UnitInspections() {
  // Group defects by category
  const defectsByCategory = UNIT_DEFECTS.reduce((acc, defect) => {
    if (!acc[defect.category]) {
      acc[defect.category] = [];
    }
    acc[defect.category].push(defect);
    return acc;
  }, {} as Record<string, typeof UNIT_DEFECTS>);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link to="/inspections" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
              <DoorOpen className="h-5 w-5 text-violet-600" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Unit Inspections</h1>
          </div>
          <p className="text-muted-foreground ml-[4.5rem]">
            Individual unit inspections • 100% annual requirement per NSPIRE
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Start Unit Inspection
        </Button>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Annual Unit Inspection Progress</CardTitle>
          <CardDescription>Target: 100% of units inspected annually</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">712 / 847 units (84%)</span>
              </div>
              <Progress value={84} className="h-3" />
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              {[
                { property: 'Oak Ridge Apts', completed: 180, total: 200, percentage: 90 },
                { property: 'Maple Commons', completed: 245, total: 280, percentage: 88 },
                { property: 'Pine View', completed: 167, total: 220, percentage: 76 },
                { property: 'Cedar Heights', completed: 120, total: 147, percentage: 82 },
              ].map((prop, i) => (
                <div key={i} className="p-3 rounded-lg border bg-card">
                  <p className="font-medium text-sm">{prop.property}</p>
                  <div className="flex items-center justify-between mt-2">
                    <Progress value={prop.percentage} className="h-2 flex-1 mr-2" />
                    <span className="text-xs text-muted-foreground">{prop.percentage}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {prop.completed} / {prop.total} units
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unit Search */}
      <Card>
        <CardHeader>
          <CardTitle>Find Unit</CardTitle>
          <CardDescription>Search for a specific unit to inspect or view history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by unit number, property, or address..." className="pl-10" />
            </div>
            <Button variant="outline">Search</Button>
          </div>
        </CardContent>
      </Card>

      {/* Defect Catalog */}
      <Card>
        <CardHeader>
          <CardTitle>NSPIRE Unit Defect Catalog</CardTitle>
          <CardDescription>
            {UNIT_DEFECTS.length} inspectable items across {Object.keys(defectsByCategory).length} categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(defectsByCategory).map(([category, defects]) => (
              <div key={category}>
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {defects.map((defect) => (
                    <div
                      key={defect.id}
                      className="p-4 rounded-lg border bg-card hover:border-accent/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="font-medium">{defect.item}</p>
                            <SeverityBadge severity={defect.defaultSeverity} showDeadline />
                            {defect.proofRequired && (
                              <Badge variant="outline" className="text-xs">
                                Proof Required
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {defect.defectConditions.map((condition, i) => (
                              <span key={i} className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                                {condition}
                              </span>
                            ))}
                          </div>
                          {defect.notes && (
                            <p className="text-xs text-muted-foreground italic">{defect.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Unit Inspections */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Unit Inspections</CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { unit: 'Unit 204', property: 'Oak Ridge Apts', date: '2024-01-29', status: 'failed', defects: 2 },
              { unit: 'Unit 118', property: 'Oak Ridge Apts', date: '2024-01-29', status: 'completed', defects: 1 },
              { unit: 'Unit 305', property: 'Maple Commons', date: '2024-01-28', status: 'completed', defects: 0 },
              { unit: 'Unit 112', property: 'Maple Commons', date: '2024-01-28', status: 'failed', defects: 1 },
              { unit: 'Unit 401', property: 'Pine View', date: '2024-01-27', status: 'completed', defects: 0 },
            ].map((inspection, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-4">
                  {inspection.status === 'completed' ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  )}
                  <div>
                    <p className="font-medium">{inspection.unit}</p>
                    <p className="text-sm text-muted-foreground">{inspection.property} • {inspection.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={inspection.status === 'completed' ? 'secondary' : 'destructive'}>
                    {inspection.status === 'completed' ? 'Passed' : 'Failed'}
                  </Badge>
                  {inspection.defects > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {inspection.defects} defect{inspection.defects !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
