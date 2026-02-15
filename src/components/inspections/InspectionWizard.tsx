import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { PhotoUpload } from './PhotoUpload';
import { useProperties } from '@/hooks/useProperties';
import { useUnitsByProperty } from '@/hooks/useUnits';
import { useCreateInspection, useUpdateInspection } from '@/hooks/useInspections';
import { useCreateDefect } from '@/hooks/useDefects';
import { getDefectCatalog, calculateDeadline, SEVERITY_CONFIG, AREA_CONFIG } from '@/data/nspire-catalog';
import type { InspectionArea, DefectItem, SeverityLevel } from '@/types/modules';
import { ArrowLeft, ArrowRight, Check, Plus, X, AlertTriangle, TreePine, Building, DoorOpen, Info, Flame, Snowflake, ShieldAlert, Camera } from 'lucide-react';
import { toast } from 'sonner';

interface InspectionWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultArea?: InspectionArea;
  defaultPropertyId?: string;
  defaultUnitId?: string;
}

interface CapturedDefect {
  catalogItem: DefectItem;
  condition: string;
  severity: SeverityLevel;
  lifeThreatening: boolean;
  location: string;
  photos: string[];
  notes: string;
}

type WizardStep = 'select' | 'inspect' | 'review';

// Seasonal HVAC helpers
function isHeatingSeason(): boolean {
  const month = new Date().getMonth() + 1;
  return month >= 10 || month <= 3;
}

function isCoolingSeason(): boolean {
  return !isHeatingSeason();
}

function getSeasonLabel(): string {
  return isHeatingSeason() ? 'Heating Season (Oct–Mar)' : 'Cooling Season (Apr–Sep)';
}

export function InspectionWizard({ 
  open, 
  onOpenChange, 
  defaultArea,
  defaultPropertyId,
  defaultUnitId 
}: InspectionWizardProps) {
  const [step, setStep] = useState<WizardStep>('select');
  const [area, setArea] = useState<InspectionArea>(defaultArea || 'unit');
  const [propertyId, setPropertyId] = useState(defaultPropertyId || '');
  const [unitId, setUnitId] = useState(defaultUnitId || '');
  const [notes, setNotes] = useState('');
  const [defects, setDefects] = useState<CapturedDefect[]>([]);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [currentDefect, setCurrentDefect] = useState<Partial<CapturedDefect>>({});
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const { data: properties } = useProperties();
  const { data: units } = useUnitsByProperty(propertyId);
  const createInspection = useCreateInspection();
  const updateInspection = useUpdateInspection();
  const createDefect = useCreateDefect();

  const catalog = getDefectCatalog(area);

  // Group catalog by category
  const catalogByCategory = useMemo(() => catalog.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, DefectItem[]>), [catalog]);

  const categories = useMemo(() => ['all', ...Object.keys(catalogByCategory)], [catalogByCategory]);

  const filteredCatalog = useMemo(() => {
    if (categoryFilter === 'all') return catalogByCategory;
    return { [categoryFilter]: catalogByCategory[categoryFilter] || [] };
  }, [catalogByCategory, categoryFilter]);

  useEffect(() => {
    if (defaultArea) setArea(defaultArea);
    if (defaultPropertyId) setPropertyId(defaultPropertyId);
    if (defaultUnitId) setUnitId(defaultUnitId);
  }, [defaultArea, defaultPropertyId, defaultUnitId]);

  const handleNext = () => {
    if (step === 'select') {
      if (!propertyId) {
        toast.error('Please select a property');
        return;
      }
      if (area === 'unit' && !unitId) {
        toast.error('Please select a unit');
        return;
      }
      setStep('inspect');
    } else if (step === 'inspect') {
      setStep('review');
    }
  };

  const handleBack = () => {
    if (step === 'inspect') {
      setStep('select');
    } else if (step === 'review') {
      setStep('inspect');
    }
  };

  const handleAddDefect = (catalogItem: DefectItem) => {
    if (expandedItem === catalogItem.id) {
      // Save defect
      if (!currentDefect.condition) {
        toast.error('Please select a condition');
        return;
      }

      const severity = currentDefect.severity || catalogItem.defaultSeverity;
      const isLT = currentDefect.lifeThreatening || false;

      // Enforce photo proof for severe/LT defects
      if ((severity === 'severe' || isLT) && (!currentDefect.photos || currentDefect.photos.length === 0)) {
        toast.error('Photo proof is required for Severe and Life-Threatening defects');
        return;
      }
      
      const newDefect: CapturedDefect = {
        catalogItem,
        condition: currentDefect.condition,
        severity,
        lifeThreatening: isLT,
        location: currentDefect.location || '',
        photos: currentDefect.photos || [],
        notes: currentDefect.notes || '',
      };
      
      setDefects([...defects, newDefect]);
      setExpandedItem(null);
      setCurrentDefect({});
      toast.success('Defect added');
    } else {
      setExpandedItem(catalogItem.id);
      setCurrentDefect({
        severity: catalogItem.defaultSeverity,
        lifeThreatening: catalogItem.isLifeThreatening,
        photos: [],
      });
    }
  };

  const handleRemoveDefect = (index: number) => {
    setDefects(defects.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    try {
      const inspection = await createInspection.mutateAsync({
        property_id: propertyId,
        unit_id: area === 'unit' ? unitId : null,
        area: area,
        status: 'completed',
        notes: notes,
        completed_at: new Date().toISOString(),
      });

      for (const defect of defects) {
        await createDefect.mutateAsync({
          inspection_id: inspection.id,
          nspire_item_id: defect.catalogItem.id,
          category: defect.catalogItem.category,
          item_name: defect.catalogItem.item,
          defect_condition: defect.condition,
          severity: defect.severity,
          life_threatening: defect.lifeThreatening,
          proof_required: defect.catalogItem.proofRequired || defect.severity === 'severe' || defect.lifeThreatening,
          photo_urls: defect.photos,
          notes: defect.notes + (defect.location ? ` Location: ${defect.location}` : ''),
        });
      }

      toast.success(`Inspection completed with ${defects.length} defect(s) recorded`);
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error saving inspection:', error);
      toast.error('Failed to save inspection');
    }
  };

  const resetForm = () => {
    setStep('select');
    setArea(defaultArea || 'unit');
    setPropertyId(defaultPropertyId || '');
    setUnitId(defaultUnitId || '');
    setNotes('');
    setDefects([]);
    setExpandedItem(null);
    setCurrentDefect({});
    setCategoryFilter('all');
  };

  const isPending = createInspection.isPending || createDefect.isPending;

  const getAreaIcon = (a: InspectionArea) => {
    switch (a) {
      case 'outside': return <TreePine className="h-5 w-5" />;
      case 'inside': return <Building className="h-5 w-5" />;
      case 'unit': return <DoorOpen className="h-5 w-5" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getAreaIcon(area)}
            {AREA_CONFIG[area].label} Inspection
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && 'Step 1: Select property and area'}
            {step === 'inspect' && 'Step 2: Inspect items and capture defects'}
            {step === 'review' && 'Step 3: Review and submit'}
          </DialogDescription>
        </DialogHeader>

        {/* Seasonal HVAC Banner */}
        {step === 'inspect' && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/50 border border-accent text-sm">
            {isHeatingSeason() ? <Flame className="h-4 w-4 text-orange-500 shrink-0" /> : <Snowflake className="h-4 w-4 text-blue-500 shrink-0" />}
            <span className="font-medium">{getSeasonLabel()}</span>
            <span className="text-muted-foreground">
              {isHeatingSeason() 
                ? '— Heating must maintain 68°F. Below 64°F = Life-Threatening.' 
                : '— Cooling system must be inspected if present.'}
            </span>
          </div>
        )}

        {/* Step 1: Select Property/Unit */}
        {step === 'select' && (
          <div className="space-y-6">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Inspection Area</Label>
                <div className="flex gap-2">
                  {(['outside', 'inside', 'unit'] as InspectionArea[]).map((a) => (
                    <Button
                      key={a}
                      type="button"
                      variant={area === a ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setArea(a)}
                    >
                      {getAreaIcon(a)}
                      <span className="ml-2">{AREA_CONFIG[a].label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Property *</Label>
                <Select value={propertyId} onValueChange={setPropertyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties?.filter(p => p.nspire_enabled).map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {area === 'unit' && propertyId && (
                <div className="grid gap-2">
                  <Label>Unit *</Label>
                  <Select value={unitId} onValueChange={setUnitId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {units?.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          Unit {unit.unit_number} {unit.last_inspection_date && `(Last: ${new Date(unit.last_inspection_date).toLocaleDateString()})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Inspect Items */}
        {step === 'inspect' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Click on an item to add a defect. {defects.length} defect(s) recorded.
              </p>
              {defects.length > 0 && (
                <Badge variant="secondary">{defects.length} defects</Badge>
              )}
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <Badge
                  key={cat}
                  variant={categoryFilter === cat ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat === 'all' ? 'All Categories' : cat}
                </Badge>
              ))}
            </div>

            <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
              {Object.entries(filteredCatalog).map(([category, items]) => (
                <div key={category}>
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">
                    {category}
                  </h4>
                  <div className="space-y-2">
                    {items.map((item) => {
                      const hasDefect = defects.some(d => d.catalogItem.id === item.id);
                      const isExpanded = expandedItem === item.id;

                      return (
                        <Card key={item.id} className={hasDefect ? 'border-destructive/50 bg-destructive/5' : ''}>
                          <CardContent className="p-3">
                            <div 
                              className="flex items-center justify-between cursor-pointer"
                              onClick={() => !isExpanded && handleAddDefect(item)}
                            >
                              <div className="flex items-center gap-3">
                                {hasDefect ? (
                                  <AlertTriangle className="h-4 w-4 text-destructive" />
                                ) : (
                                  <Check className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className="font-medium text-sm">{item.item}</span>
                                {item.isUnscored && (
                                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">H&S</Badge>
                                )}
                                {item.isLifeThreatening && (
                                  <Badge variant="destructive" className="text-xs">LT</Badge>
                                )}
                                {item.proofRequired && (
                                  <Badge variant="outline" className="text-xs">Proof</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <SeverityBadge severity={item.defaultSeverity} />
                                {!hasDefect && !isExpanded && (
                                  <Plus className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>

                            {/* Regulatory Hint */}
                            {(isExpanded || hasDefect) && item.regulatoryHint && (
                              <div className="mt-2 p-2 rounded bg-accent/50 border border-accent flex items-start gap-2">
                                <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                <p className="text-xs text-muted-foreground">{item.regulatoryHint}</p>
                              </div>
                            )}

                            {/* Conditional Rules */}
                            {isExpanded && item.conditionalRules && item.conditionalRules.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {item.conditionalRules.map((rule, i) => (
                                  <div key={i} className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded">
                                    <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                                    <span>{rule.description}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {isExpanded && (
                              <div className="mt-4 pt-4 border-t space-y-4">
                                <div className="grid gap-2">
                                  <Label>Condition *</Label>
                                  <Select
                                    value={currentDefect.condition}
                                    onValueChange={(value) => setCurrentDefect({ ...currentDefect, condition: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select condition" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {item.defectConditions.map((condition) => (
                                        <SelectItem key={condition} value={condition}>
                                          {condition}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="grid gap-2">
                                  <Label>Severity</Label>
                                  <div className="flex gap-2">
                                    {(['severe', 'moderate', 'low'] as SeverityLevel[]).map((sev) => (
                                      <Button
                                        key={sev}
                                        type="button"
                                        size="sm"
                                        variant={currentDefect.severity === sev ? 'default' : 'outline'}
                                        onClick={() => setCurrentDefect({ ...currentDefect, severity: sev, lifeThreatening: sev !== 'severe' ? false : currentDefect.lifeThreatening })}
                                        className="flex-1"
                                      >
                                        {SEVERITY_CONFIG[sev].label}
                                      </Button>
                                    ))}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Deadline: {SEVERITY_CONFIG[currentDefect.severity || item.defaultSeverity].deadline}
                                  </p>
                                </div>

                                {/* Life-Threatening Toggle */}
                                {currentDefect.severity === 'severe' && (
                                  <div className="flex items-center justify-between p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                                    <div className="flex items-center gap-2">
                                      <ShieldAlert className="h-4 w-4 text-destructive" />
                                      <div>
                                        <Label className="text-sm font-medium">Life-Threatening (LT)</Label>
                                        <p className="text-xs text-muted-foreground">
                                          {item.isLifeThreatening 
                                            ? 'This item is typically Life-Threatening per NSPIRE' 
                                            : 'Mark if this poses an immediate danger to life'}
                                        </p>
                                      </div>
                                    </div>
                                    <Switch
                                      checked={currentDefect.lifeThreatening || false}
                                      onCheckedChange={(checked) => setCurrentDefect({ ...currentDefect, lifeThreatening: checked })}
                                    />
                                  </div>
                                )}

                                <div className="grid gap-2">
                                  <Label>Location</Label>
                                  <Input
                                    placeholder="e.g. Kitchen, near window"
                                    value={currentDefect.location || ''}
                                    onChange={(e) => setCurrentDefect({ ...currentDefect, location: e.target.value })}
                                  />
                                </div>

                                <div className="grid gap-2">
                                  <Label className="flex items-center gap-2">
                                    Photos
                                    {(currentDefect.severity === 'severe' || currentDefect.lifeThreatening) && (
                                      <span className="flex items-center gap-1 text-xs text-destructive font-normal">
                                        <Camera className="h-3 w-3" /> Required for Severe/LT
                                      </span>
                                    )}
                                  </Label>
                                  <PhotoUpload
                                    photos={currentDefect.photos || []}
                                    onPhotosChange={(photos) => setCurrentDefect({ ...currentDefect, photos })}
                                    folder={`inspections/${area}`}
                                  />
                                </div>

                                <div className="grid gap-2">
                                  <Label>Notes</Label>
                                  <Textarea
                                    placeholder="Additional notes..."
                                    value={currentDefect.notes || ''}
                                    onChange={(e) => setCurrentDefect({ ...currentDefect, notes: e.target.value })}
                                    rows={2}
                                  />
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setExpandedItem(null);
                                      setCurrentDefect({});
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleAddDefect(item)}
                                  >
                                    Add Defect
                                  </Button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-2">
              <Label>Inspection Notes</Label>
              <Textarea
                placeholder="General notes about the inspection..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2">Inspection Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Area:</span>
                    <span className="ml-2 font-medium">{AREA_CONFIG[area].label}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Property:</span>
                    <span className="ml-2 font-medium">
                      {properties?.find(p => p.id === propertyId)?.name}
                    </span>
                  </div>
                  {area === 'unit' && (
                    <div>
                      <span className="text-muted-foreground">Unit:</span>
                      <span className="ml-2 font-medium">
                        {units?.find(u => u.id === unitId)?.unit_number}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Defects:</span>
                    <span className="ml-2 font-medium">{defects.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Season:</span>
                    <span className="ml-2 font-medium">{getSeasonLabel()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {defects.length > 0 ? (
              <div className="space-y-2">
                <h4 className="font-semibold">Defects Found ({defects.length})</h4>
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {defects.map((defect, index) => (
                    <Card key={index}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{defect.catalogItem.item}</span>
                              <SeverityBadge 
                                severity={defect.severity} 
                                showDeadline 
                                lifeThreatening={defect.lifeThreatening}
                              />
                              {defect.catalogItem.isUnscored && (
                                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">Unscored H&S</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{defect.condition}</p>
                            {defect.location && (
                              <p className="text-xs text-muted-foreground">Location: {defect.location}</p>
                            )}
                            {defect.photos.length > 0 && (
                              <p className="text-xs text-muted-foreground">{defect.photos.length} photo(s)</p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveDefect(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex gap-4 pt-2">
                  <Card className="flex-1 p-3 text-center bg-severity-severe/10">
                    <p className="text-2xl font-bold text-destructive">
                      {defects.filter(d => d.severity === 'severe').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Severe (24h)</p>
                    {defects.some(d => d.lifeThreatening) && (
                      <p className="text-xs text-destructive font-medium mt-1">
                        {defects.filter(d => d.lifeThreatening).length} Life-Threatening
                      </p>
                    )}
                  </Card>
                  <Card className="flex-1 p-3 text-center bg-severity-moderate/10">
                    <p className="text-2xl font-bold text-warning">
                      {defects.filter(d => d.severity === 'moderate').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Moderate (30d)</p>
                  </Card>
                  <Card className="flex-1 p-3 text-center bg-severity-low/10">
                    <p className="text-2xl font-bold text-blue-600">
                      {defects.filter(d => d.severity === 'low').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Low (60d)</p>
                  </Card>
                </div>
              </div>
            ) : (
              <Card className="p-8 text-center">
                <Check className="h-12 w-12 mx-auto text-success mb-2" />
                <p className="font-medium">No Defects Found</p>
                <p className="text-sm text-muted-foreground">This inspection passed with no issues.</p>
              </Card>
            )}

            {notes && (
              <div>
                <h4 className="font-semibold mb-1">Notes</h4>
                <p className="text-sm text-muted-foreground">{notes}</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <div>
            {step !== 'select' && (
              <Button type="button" variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {step !== 'review' ? (
              <Button type="button" onClick={handleNext}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={isPending}>
                {isPending ? 'Saving...' : 'Complete Inspection'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
