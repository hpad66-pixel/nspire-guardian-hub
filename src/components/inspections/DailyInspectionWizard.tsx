import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { WeatherSelector } from './WeatherSelector';
import { InspectionProgress } from './InspectionProgress';
import { AssetCheckCard } from './AssetCheckCard';
import { VoiceDictation } from '@/components/ui/voice-dictation';
import { useAssets, Asset } from '@/hooks/useAssets';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { 
  useCreateDailyInspection, 
  useUpdateDailyInspection, 
  useUpsertInspectionItem,
  useInspectionItems,
  DailyInspection,
  InspectionItemStatus,
  WEATHER_OPTIONS 
} from '@/hooks/useDailyInspections';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  ChevronLeft, 
  ChevronRight,
  Play, 
  CheckCircle2, 
  Upload, 
  Send,
  Paperclip,
  X,
  FileText
} from 'lucide-react';
import { InspectionReportDialog } from './InspectionReportDialog';
import { cn } from '@/lib/utils';

type WizardStep = 'start' | 'assets' | 'notes' | 'review' | 'success';

interface DailyInspectionWizardProps {
  propertyId: string;
  existingInspection?: DailyInspection | null;
  onComplete: () => void;
  onCancel: () => void;
}

interface AssetCheckData {
  status?: InspectionItemStatus;
  photoUrls: string[];
  notes: string;
  defectDescription: string;
}

export function DailyInspectionWizard({
  propertyId,
  existingInspection,
  onComplete,
  onCancel,
}: DailyInspectionWizardProps) {
  const [step, setStep] = useState<WizardStep>('start');
  const [weather, setWeather] = useState(existingInspection?.weather || '');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [generalNotes, setGeneralNotes] = useState(existingInspection?.general_notes || '');
  const [attachments, setAttachments] = useState<string[]>(existingInspection?.attachments || []);
  const [assetChecks, setAssetChecks] = useState<Record<string, AssetCheckData>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [inspection, setInspection] = useState<DailyInspection | null>(existingInspection || null);
  const [showReportDialog, setShowReportDialog] = useState(false);

  const { data: assets = [] } = useAssets(propertyId);
  const { data: existingItems = [] } = useInspectionItems(inspection?.id || '');
  const createInspection = useCreateDailyInspection();
  const updateInspection = useUpdateDailyInspection();
  const upsertItem = useUpsertInspectionItem();

  // Load existing items into state
  useEffect(() => {
    if (existingItems.length > 0) {
      const checks: Record<string, AssetCheckData> = {};
      existingItems.forEach(item => {
        checks[item.asset_id] = {
          status: item.status,
          photoUrls: item.photo_urls || [],
          notes: item.notes || '',
          defectDescription: item.defect_description || '',
        };
      });
      setAssetChecks(prev => ({ ...prev, ...checks }));
    }
  }, [existingItems]);

  const activeAssets = useMemo(() => 
    assets.filter(a => a.status === 'active'),
    [assets]
  );

  const selectedAsset = selectedAssetId
    ? activeAssets.find((a) => a.id === selectedAssetId)
    : undefined;
  const selectedCheck = selectedAsset ? assetChecks[selectedAsset.id] : undefined;

  const stats = useMemo(() => {
    let okCount = 0, attentionCount = 0, defectCount = 0;
    Object.values(assetChecks).forEach(check => {
      if (check.status === 'ok') okCount++;
      else if (check.status === 'needs_attention') attentionCount++;
      else if (check.status === 'defect_found') defectCount++;
    });
    return { okCount, attentionCount, defectCount };
  }, [assetChecks]);

  const handleStartInspection = async () => {
    if (!weather) {
      toast.error('Please select the weather');
      return;
    }

    if (!inspection) {
      try {
        const newInspection = await createInspection.mutateAsync({
          property_id: propertyId,
          weather,
        });
        setInspection(newInspection);
      } catch (error) {
        return;
      }
    }

    setStep('assets');
  };

  const handleAssetCheck = (field: keyof AssetCheckData, value: any) => {
    if (!selectedAsset) return;
    
    setAssetChecks(prev => ({
      ...prev,
      [selectedAsset.id]: {
        ...prev[selectedAsset.id] || { photoUrls: [], notes: '', defectDescription: '' },
        [field]: value,
      },
    }));
  };

  const handleSaveAssetCheck = async () => {
    if (!selectedAsset || !inspection) return;
    
    const check = assetChecks[selectedAsset.id];
    if (check?.status) {
      await upsertItem.mutateAsync({
        daily_inspection_id: inspection.id,
        asset_id: selectedAsset.id,
        status: check.status,
        photo_urls: check.photoUrls,
        notes: check.notes || undefined,
        defect_description: check.defectDescription || undefined,
      });
    }
    setAssetDialogOpen(false);
  };

  const handleOpenAsset = (assetId: string) => {
    setSelectedAssetId(assetId);
    setAssetDialogOpen(true);
  };

  const handleVoiceTranscript = (text: string) => {
    setGeneralNotes(prev => prev ? `${prev}\n\n${text}` : text);
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${inspection?.id || 'temp'}-${Date.now()}.${fileExt}`;
        const filePath = `daily-inspections/attachments/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('inspection-photos')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('inspection-photos')
          .getPublicUrl(filePath);

        newUrls.push(publicUrl);
      }

      setAttachments(prev => [...prev, ...newUrls]);
      toast.success('Attachment uploaded');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload attachment');
    } finally {
      setIsUploading(false);
    }
  };

  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!inspection) return;

    try {
      // Persist all checked assets before submitting
      const itemsToSave = Object.entries(assetChecks)
        .filter(([, check]) => !!check.status)
        .map(([assetId, check]) =>
          upsertItem.mutateAsync({
            daily_inspection_id: inspection.id,
            asset_id: assetId,
            status: check.status as InspectionItemStatus,
            photo_urls: check.photoUrls,
            notes: check.notes || undefined,
            defect_description: check.defectDescription || undefined,
          })
        );

      if (itemsToSave.length > 0) {
        await Promise.all(itemsToSave);
      }

      // Find a property manager to assign issues
      const { data: pm } = await supabase
        .from('property_team_members')
        .select('user_id')
        .eq('property_id', propertyId)
        .eq('role', 'manager')
        .eq('status', 'active')
        .maybeSingle();

      const assignedTo = pm?.user_id || null;

      // Create issues for assets needing attention or with defects
      const issueCreates = activeAssets.flatMap((asset) => {
        const check = assetChecks[asset.id];
        if (!check?.status || check.status === 'ok') return [];

        const severity: 'severe' | 'moderate' = check.status === 'defect_found' ? 'severe' : 'moderate';
        const title =
          check.status === 'defect_found'
            ? `Defect found: ${asset.name}`
            : `Needs attention: ${asset.name}`;

        const descriptionParts = [
          `Daily Grounds Inspection: ${inspection.id}`,
          asset.location_description ? `Location: ${asset.location_description}` : null,
          check.notes ? `Notes: ${check.notes}` : null,
          check.defectDescription ? `Defect: ${check.defectDescription}` : null,
        ].filter(Boolean);

        return [
          {
            property_id: propertyId,
            title,
            description: descriptionParts.join('\n'),
            source_module: 'core' as const,
            area: 'outside' as const,
            severity,
            status: 'open',
            assigned_to: assignedTo,
          },
        ];
      });

      if (issueCreates.length > 0) {
        await supabase.from('issues').insert(issueCreates);
      }

      await updateInspection.mutateAsync({
        id: inspection.id,
        general_notes: generalNotes,
        attachments,
        status: 'completed',
        completed_at: new Date().toISOString(),
        review_status: 'pending_review',
        submitted_at: new Date().toISOString(),
      } as any);

      // Show success screen instead of navigating away
      setStep('success');
      toast.success('Inspection submitted for review!');
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to submit inspection');
    }
  };

  const handleGoToDashboard = () => {
    onComplete();
    navigate('/dashboard');
  };

  const handleStartNewInspection = () => {
    onComplete();
    // Stay on daily grounds page to potentially start another property
  };

  const checkedCount = stats.okCount + stats.attentionCount + stats.defectCount;

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Exit
          </Button>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div className="w-16" />
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto">
        {/* Step: Start */}
        {step === 'start' && (
          <div className="space-y-6">
            <div className="text-center py-6">
              <h1 className="text-2xl font-bold mb-2">Daily Grounds Inspection</h1>
              <p className="text-muted-foreground">
                {activeAssets.length} assets to check today
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What's the weather?</CardTitle>
              </CardHeader>
              <CardContent>
                <WeatherSelector value={weather} onChange={setWeather} />
              </CardContent>
            </Card>

            <Button
              size="lg"
              className="w-full h-16 text-xl gap-3"
              onClick={handleStartInspection}
              disabled={!weather || createInspection.isPending}
            >
              <Play className="h-6 w-6" />
              Let's Go!
            </Button>
          </div>
        )}

        {/* Step: Assets */}
        {step === 'assets' && (
          <div className="space-y-4">
            {activeAssets.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground mb-4">No assets found for this property.</p>
                  <Button onClick={() => setStep('notes')}>
                    Continue to Notes
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <InspectionProgress
                  current={checkedCount}
                  total={activeAssets.length}
                  okCount={stats.okCount}
                  attentionCount={stats.attentionCount}
                  defectCount={stats.defectCount}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeAssets.map((asset) => {
                    const check = assetChecks[asset.id];
                    const status = check?.status;
                    const statusLabel =
                      status === 'ok'
                        ? 'OK'
                        : status === 'needs_attention'
                        ? 'Needs attention'
                        : status === 'defect_found'
                        ? 'Defect found'
                        : 'Not checked';
                    const statusClass =
                      status === 'ok'
                        ? 'bg-green-100 text-green-700'
                        : status === 'needs_attention'
                        ? 'bg-yellow-100 text-yellow-700'
                        : status === 'defect_found'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-muted text-muted-foreground';
                    const noteText =
                      status === 'needs_attention'
                        ? check?.notes
                        : status === 'defect_found'
                        ? check?.defectDescription || check?.notes
                        : check?.notes;

                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => handleOpenAsset(asset.id)}
                        className={cn(
                          'text-left w-full rounded-lg border p-3 transition-colors hover:bg-muted/40',
                          status === 'defect_found' && 'border-red-200'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{asset.name}</p>
                            {asset.location_description && (
                              <p className="text-xs text-muted-foreground">
                                {asset.location_description}
                              </p>
                            )}
                          </div>
                          <span className={cn('text-xs font-medium px-2 py-1 rounded-full', statusClass)}>
                            {statusLabel}
                          </span>
                        </div>
                        {noteText && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {noteText}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>

                <Button
                  className="w-full h-12"
                  onClick={() => setStep('notes')}
                >
                  Continue to Notes
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            )}
          </div>
        )}

        {/* Step: Notes */}
        {step === 'notes' && (
          <div className="space-y-6">
            <div className="text-center py-4">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <h2 className="text-xl font-bold">Assets Checked!</h2>
              <p className="text-muted-foreground">
                {checkedCount} of {activeAssets.length} completed
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  General Notes
                  <VoiceDictation onTranscript={handleVoiceTranscript} />
                </CardTitle>
                <CardDescription>
                  Add any observations, exterior defects, or housekeeping notes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Describe any exterior defects observed, general housekeeping notes, or other observations..."
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  className="min-h-[150px]"
                />

                {/* Attachments */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Attachments</label>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((url, index) => (
                      <div key={index} className="relative group">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm hover:bg-muted/80"
                        >
                          <Paperclip className="h-3 w-3" />
                          Attachment {index + 1}
                        </a>
                        <button
                          type="button"
                          onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                          className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        multiple
                        onChange={handleAttachmentUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                      <span className="flex items-center gap-1 px-2 py-1 border border-dashed rounded text-sm hover:bg-muted transition-colors">
                        <Upload className="h-3 w-3" />
                        {isUploading ? 'Uploading...' : 'Add File'}
                      </span>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep('assets')}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Assets
              </Button>
              <Button
                className="flex-1"
                onClick={() => setStep('review')}
              >
                Review
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Review */}
        {step === 'review' && (
          <div className="space-y-6">
            <div className="text-center py-4">
              <h2 className="text-xl font-bold">Review & Submit</h2>
              <p className="text-muted-foreground">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>

            {/* Summary Card */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Weather</span>
                  <span className="font-medium">
                    {WEATHER_OPTIONS.find(w => w.value === weather)?.icon}{' '}
                    {WEATHER_OPTIONS.find(w => w.value === weather)?.label}
                  </span>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-2">Asset Status</p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{stats.okCount}</p>
                      <p className="text-xs text-green-600">OK</p>
                    </div>
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-600">{stats.attentionCount}</p>
                      <p className="text-xs text-yellow-600">Attention</p>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">{stats.defectCount}</p>
                      <p className="text-xs text-red-600">Defects</p>
                    </div>
                  </div>
                </div>

                {generalNotes && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-2">General Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{generalNotes}</p>
                  </div>
                )}

                {attachments.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      Attachments ({attachments.length})
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep('notes')}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleSubmit}
                disabled={updateInspection.isPending}
              >
                <Send className="h-4 w-4 mr-1" />
                {updateInspection.isPending ? 'Submitting...' : 'Submit Inspection'}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="space-y-6 text-center">
            <div className="py-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 mb-4">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">
                Inspection Submitted!
              </h2>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Your daily grounds inspection has been submitted and is now pending supervisor review.
              </p>
            </div>

            {/* Summary Stats */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4 text-center mb-4">
                  <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{stats.okCount}</p>
                    <p className="text-xs text-green-600">OK</p>
                  </div>
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{stats.attentionCount}</p>
                    <p className="text-xs text-yellow-600">Attention</p>
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{stats.defectCount}</p>
                    <p className="text-xs text-red-600">Defects</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(), 'EEEE, MMMM d, yyyy • h:mm a')}
                </p>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full h-14 text-lg gap-2"
                onClick={() => setShowReportDialog(true)}
              >
                <FileText className="h-5 w-5" />
                View Report
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full"
                onClick={handleGoToDashboard}
              >
                Go to Dashboard
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="w-full"
                onClick={handleStartNewInspection}
              >
                Back to Daily Grounds
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Report Dialog */}
      <InspectionReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        inspectionId={inspection?.id}
        inspection={inspection}
      />

      <Dialog
        open={assetDialogOpen && !!selectedAsset}
        onOpenChange={(open) => {
          setAssetDialogOpen(open);
          if (!open) setSelectedAssetId(null);
        }}
      >
        <DialogContent className="max-w-lg p-0 border-0 bg-transparent shadow-none">
          {selectedAsset && (
            <AssetCheckCard
              asset={selectedAsset}
              status={selectedCheck?.status}
              photoUrls={selectedCheck?.photoUrls || []}
              notes={selectedCheck?.notes || ''}
              defectDescription={selectedCheck?.defectDescription || ''}
              onStatusChange={(status) => handleAssetCheck('status', status)}
              onPhotosChange={(urls) => handleAssetCheck('photoUrls', urls)}
              onNotesChange={(notes) => handleAssetCheck('notes', notes)}
              onDefectDescriptionChange={(desc) => handleAssetCheck('defectDescription', desc)}
              onNext={handleSaveAssetCheck}
              isLast
              nextLabel="Save & Close"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
