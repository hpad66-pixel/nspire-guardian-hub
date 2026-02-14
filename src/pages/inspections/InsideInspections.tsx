import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { INSIDE_DEFECTS } from '@/data/nspire-catalog';
import { Building, Plus, ArrowLeft, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { InspectionWizard } from '@/components/inspections/InspectionWizard';
import { useInspectionsByArea } from '@/hooks/useInspections';
import { format } from 'date-fns';

export default function InsideInspections() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const { data: inspections, isLoading } = useInspectionsByArea('inside');

  // Group defects by category
  const defectsByCategory = INSIDE_DEFECTS.reduce((acc, defect) => {
    if (!acc[defect.category]) {
      acc[defect.category] = [];
    }
    acc[defect.category].push(defect);
    return acc;
  }, {} as Record<string, typeof INSIDE_DEFECTS>);

  // Recent inspections
  const recentInspections = inspections?.slice(0, 5) || [];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link to="/inspections" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Building className="h-5 w-5 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Inside Inspections</h1>
          </div>
          <p className="text-muted-foreground ml-[4.5rem]">
            Common areas and building systems inspections per NSPIRE standards
          </p>
        </div>
        <Button onClick={() => setWizardOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Start Inspection
        </Button>
      </div>

      {/* Defect Catalog */}
      <Card>
        <CardHeader>
          <CardTitle>NSPIRE Inside (Common Area) Defect Catalog</CardTitle>
          <CardDescription>
            {INSIDE_DEFECTS.length} inspectable items across {Object.keys(defectsByCategory).length} categories
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
                            <SeverityBadge severity={defect.defaultSeverity} lifeThreatening={defect.isLifeThreatening} showDeadline />
                            {defect.isUnscored && (
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">H&S</Badge>
                            )}
                            {defect.proofRequired && (
                              <Badge variant="outline" className="text-xs">Proof</Badge>
                            )}
                            {defect.pointValue.inside != null && (
                              <Badge variant="secondary" className="text-xs font-mono">
                                {defect.pointValue.inside} pts
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
                          {defect.regulatoryHint && (
                            <p className="text-xs text-primary/80 bg-accent/50 p-2 rounded mt-1">
                              💡 {defect.regulatoryHint}
                            </p>
                          )}
                          {defect.notes && (
                            <p className="text-xs text-muted-foreground italic mt-1">{defect.notes}</p>
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

      {/* Recent Inside Inspections */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Inside Inspections</CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentInspections.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No inside inspections yet. Click "Start Inspection" to begin.
            </p>
          ) : (
            <div className="space-y-3">
              {recentInspections.map((inspection) => {
                const defectCount = inspection.defects?.length || 0;
                const hasSevereDefects = inspection.defects?.some(d => d.severity === 'severe');
                
                return (
                  <div key={inspection.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-4">
                      {inspection.status === 'completed' && defectCount === 0 ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : hasSevereDefects ? (
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                      ) : inspection.status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5 text-warning" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-warning" />
                      )}
                      <div>
                        <p className="font-medium">{inspection.property?.name || 'Unknown Property'}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(inspection.inspection_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={inspection.status === 'completed' ? 'secondary' : 'outline'}>
                        {inspection.status === 'completed' ? 'Completed' : 'In Progress'}
                      </Badge>
                      {defectCount > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {defectCount} defect{defectCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inspection Wizard */}
      <InspectionWizard 
        open={wizardOpen} 
        onOpenChange={setWizardOpen}
        defaultArea="inside"
      />
    </div>
  );
}
