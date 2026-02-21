import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { UNIT_DEFECTS } from '@/data/nspire-catalog';
import { DoorOpen, Plus, ArrowLeft, CheckCircle2, AlertTriangle, Search, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { InspectionWizard } from '@/components/inspections/InspectionWizard';
import { useInspectionsByArea } from '@/hooks/useInspections';
import { useManagedProperties } from '@/hooks/useProperties';
import { useUnits } from '@/hooks/useUnits';
import { useInspectionStats } from '@/hooks/useInspectionStats';
import { format } from 'date-fns';

export default function UnitInspections() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: inspections, isLoading: inspectionsLoading } = useInspectionsByArea('unit');
  const { data: properties } = useManagedProperties();
  const { data: units } = useUnits();
  const { data: stats } = useInspectionStats();

  // Group defects by category for catalog
  const defectsByCategory = UNIT_DEFECTS.reduce((acc, defect) => {
    if (!acc[defect.category]) {
      acc[defect.category] = [];
    }
    acc[defect.category].push(defect);
    return acc;
  }, {} as Record<string, typeof UNIT_DEFECTS>);

  // Filter properties that have NSPIRE enabled
  const nspireProperties = properties?.filter(p => p.nspire_enabled) || [];
  
  // Calculate per-property unit inspection progress
  const propertyProgress = nspireProperties.map(property => {
    const propertyUnits = units?.filter(u => u.property_id === property.id) || [];
    const inspectedUnits = inspections?.filter(i => 
      i.property_id === property.id && 
      i.status === 'completed'
    ) || [];
    
    const uniqueInspectedUnitIds = new Set(inspectedUnits.map(i => i.unit_id));
    const completed = uniqueInspectedUnitIds.size;
    const total = propertyUnits.length;
    
    return {
      property: property.name,
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  });

  // Overall progress
  const totalUnits = units?.length || 0;
  const inspectedUnitIds = new Set(
    inspections?.filter(i => i.status === 'completed').map(i => i.unit_id) || []
  );
  const overallCompleted = inspectedUnitIds.size;
  const overallPercentage = totalUnits > 0 ? Math.round((overallCompleted / totalUnits) * 100) : 0;

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
            <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
              <DoorOpen className="h-5 w-5 text-violet-600" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Unit Inspections</h1>
          </div>
          <p className="text-muted-foreground ml-[4.5rem]">
            Individual unit inspections • 100% annual requirement per NSPIRE
          </p>
        </div>
        <Button onClick={() => setWizardOpen(true)}>
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
                <span className="text-sm text-muted-foreground">
                  {overallCompleted} / {totalUnits} units ({overallPercentage}%)
                </span>
              </div>
              <Progress value={overallPercentage} className="h-3" />
            </div>
            {propertyProgress.length > 0 && (
              <div className="grid gap-3 md:grid-cols-4">
                {propertyProgress.map((prop, i) => (
                  <div key={i} className="p-3 rounded-lg border bg-card">
                    <p className="font-medium text-sm truncate">{prop.property}</p>
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
            )}
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
              <Input 
                placeholder="Search by unit number, property, or address..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
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
                            <SeverityBadge severity={defect.defaultSeverity} lifeThreatening={defect.isLifeThreatening} showDeadline />
                            {defect.isUnscored && (
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">H&S</Badge>
                            )}
                            {defect.proofRequired && (
                              <Badge variant="outline" className="text-xs">Proof</Badge>
                            )}
                            {defect.pointValue.unit != null && (
                              <Badge variant="secondary" className="text-xs font-mono">
                                {defect.pointValue.unit} pts
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
          {inspectionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentInspections.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No unit inspections yet. Click "Start Unit Inspection" to begin.
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
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-warning" />
                      )}
                      <div>
                        <p className="font-medium">
                          Unit {inspection.unit?.unit_number || 'Unknown'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {inspection.property?.name} • {format(new Date(inspection.inspection_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={inspection.status === 'completed' ? 'secondary' : 'outline'}>
                        {inspection.status === 'completed' ? (defectCount === 0 ? 'Passed' : 'Completed') : 'In Progress'}
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
        defaultArea="unit"
      />
    </div>
  );
}
