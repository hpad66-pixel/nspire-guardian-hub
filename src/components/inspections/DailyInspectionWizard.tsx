import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { WeatherSelector } from './WeatherSelector';
import { InspectionProgress } from './InspectionProgress';
import { AssetCheckCard } from './AssetCheckCard';
import { VoiceDictation } from '@/components/ui/voice-dictation';
import { useAssets, Asset } from '@/hooks/useAssets';
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
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

type WizardStep = 'start' | 'assets' | 'notes' | 'review';

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
  const [currentAssetIndex, setCurrentAssetIndex] = useState(0);
  const [generalNotes, setGeneralNotes] = useState(existingInspection?.general_notes || '');
  const [attachments, setAttachments] = useState<string[]>(existingInspection?.attachments || []);
  const [assetChecks, setAssetChecks] = useState<Record<string, AssetCheckData>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [inspection, setInspection] = useState<DailyInspection | null>(existingInspection || null);

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

  const currentAsset = activeAssets[currentAssetIndex];
  const currentCheck = currentAsset ? assetChecks[currentAsset.id] : undefined;

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
    if (!currentAsset) return;
    
    setAssetChecks(prev => ({
      ...prev,
      [currentAsset.id]: {
        ...prev[currentAsset.id] || { photoUrls: [], notes: '', defectDescription: '' },
        [field]: value,
      },
    }));
  };

  const handleNextAsset = async () => {
    if (!currentAsset || !inspection) return;
    
    const check = assetChecks[currentAsset.id];
    if (check?.status) {
      await upsertItem.mutateAsync({
        daily_inspection_id: inspection.id,
        asset_id: currentAsset.id,
        status: check.status,
        photo_urls: check.photoUrls,
        notes: check.notes || undefined,
        defect_description: check.defectDescription || undefined,
      });
    }

    if (currentAssetIndex < activeAssets.length - 1) {
      setCurrentAssetIndex(prev => prev + 1);
    } else {
      setStep('notes');
    }
  };

  const handlePrevAsset = () => {
    if (currentAssetIndex > 0) {
      setCurrentAssetIndex(prev => prev - 1);
    }
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
      await updateInspection.mutateAsync({
        id: inspection.id,
        general_notes: generalNotes,
        attachments,
        status: 'completed',
        completed_at: new Date().toISOString(),
        review_status: 'pending_review',
        submitted_at: new Date().toISOString(),
      } as any);

      toast.success('Inspection submitted for review!');
      navigate('/');
    } catch (error) {
      console.error('Submit error:', error);
    }
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
            ) : currentAsset ? (
              <>
                <InspectionProgress
                  current={currentAssetIndex + 1}
                  total={activeAssets.length}
                  okCount={stats.okCount}
                  attentionCount={stats.attentionCount}
                  defectCount={stats.defectCount}
                />

                {/* Navigation Arrows */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevAsset}
                    disabled={currentAssetIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {currentAssetIndex + 1} / {activeAssets.length}
                  </span>
                  <div className="w-20" />
                </div>

                <AssetCheckCard
                  asset={currentAsset}
                  status={currentCheck?.status}
                  photoUrls={currentCheck?.photoUrls || []}
                  notes={currentCheck?.notes || ''}
                  defectDescription={currentCheck?.defectDescription || ''}
                  onStatusChange={(status) => handleAssetCheck('status', status)}
                  onPhotosChange={(urls) => handleAssetCheck('photoUrls', urls)}
                  onNotesChange={(notes) => handleAssetCheck('notes', notes)}
                  onDefectDescriptionChange={(desc) => handleAssetCheck('defectDescription', desc)}
                  onNext={handleNextAsset}
                  isLast={currentAssetIndex === activeAssets.length - 1}
                />
              </>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">Loading assets...</p>
                </CardContent>
              </Card>
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
                Submit Inspection
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
