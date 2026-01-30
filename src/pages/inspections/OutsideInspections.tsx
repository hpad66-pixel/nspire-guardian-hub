import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { OUTSIDE_DEFECTS, SEVERITY_CONFIG } from '@/data/nspire-catalog';
import { TreePine, Plus, ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

export default function OutsideInspections() {
  // Group defects by category
  const defectsByCategory = OUTSIDE_DEFECTS.reduce((acc, defect) => {
    if (!acc[defect.category]) {
      acc[defect.category] = [];
    }
    acc[defect.category].push(defect);
    return acc;
  }, {} as Record<string, typeof OUTSIDE_DEFECTS>);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link to="/inspections" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <TreePine className="h-5 w-5 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Outside Inspections</h1>
          </div>
          <p className="text-muted-foreground ml-[4.5rem]">
            Site, grounds, and exterior area inspections per NSPIRE standards
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Start Inspection
        </Button>
      </div>

      {/* Defect Catalog */}
      <Card>
        <CardHeader>
          <CardTitle>NSPIRE Outside Defect Catalog</CardTitle>
          <CardDescription>
            {OUTSIDE_DEFECTS.length} inspectable items across {Object.keys(defectsByCategory).length} categories
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

      {/* Recent Outside Inspections */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Outside Inspections</CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { property: 'Oak Ridge Apartments', date: '2024-01-28', status: 'completed', defects: 2 },
              { property: 'Maple Commons', date: '2024-01-25', status: 'completed', defects: 0 },
              { property: 'Pine View Residences', date: '2024-01-22', status: 'completed', defects: 3 },
              { property: 'Cedar Heights', date: '2024-01-20', status: 'in_progress', defects: 1 },
            ].map((inspection, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-4">
                  {inspection.status === 'completed' ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  )}
                  <div>
                    <p className="font-medium">{inspection.property}</p>
                    <p className="text-sm text-muted-foreground">{inspection.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={inspection.status === 'completed' ? 'secondary' : 'outline'}>
                    {inspection.status === 'completed' ? 'Completed' : 'In Progress'}
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
