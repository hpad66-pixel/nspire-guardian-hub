import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { WeatherSelector } from './WeatherSelector';
import { InspectionProgress } from './InspectionProgress';
import { AssetCheckCard } from './AssetCheckCard';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
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
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { enqueue } from '@/lib/offlineQueue';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  CheckCircle2,
  Send,
  Paperclip,
  X,
  FileText,
  Mic,
  Upload,
  AlertTriangle,
  Download,
  Printer,
  Mail,
  Loader2,
} from 'lucide-react';
import { generatePDF, printReport } from '@/lib/generatePDF';
import { SendReportEmailDialog } from './SendReportEmailDialog';
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

// ── Dot tracker ────────────────────────────────────────────────────────────

function DotTracker({
  assets,
  checks,
}: {
  assets: Asset[];
  checks: Record<string, AssetCheckData>;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap justify-center mt-2">
      {assets.map((asset) => {
        const s = checks[asset.id]?.status;
        const color =
          s === 'ok'
            ? 'bg-green-500'
            : s === 'needs_attention'
            ? 'bg-amber-500'
            : s === 'defect_found'
            ? 'bg-red-500'
            : 'bg-slate-300';
        return (
          <div
            key={asset.id}
            title={asset.name}
            className={cn('w-3 h-3 rounded-full transition-all', color)}
          />
        );
      })}
    </div>
  );
}

// ── Confetti ───────────────────────────────────────────────────────────────

function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null;
  const colors = ['#059669', '#34D399', '#FBBF24', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6'];
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-2.5 h-2.5 rounded-sm"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-12px',
            backgroundColor: colors[i % colors.length],
            animation: `confetti-fall ${0.8 + Math.random() * 1.6}s ease-in forwards`,
            animationDelay: `${Math.random() * 0.6}s`,
            transform: `rotate(${Math.random() * 360}deg) scale(${0.6 + Math.random() * 0.8})`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export function DailyInspectionWizard({
  propertyId,
  existingInspection,
  onComplete,
  onCancel,
}: DailyInspectionWizardProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<WizardStep>('start');
  const [weather, setWeather] = useState(existingInspection?.weather || '');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [generalNotes, setGeneralNotes] = useState(existingInspection?.general_notes || '');
  const [generalNotesHtml, setGeneralNotesHtml] = useState(existingInspection?.general_notes_html || '');
  const [attachments, setAttachments] = useState<string[]>(existingInspection?.attachments || []);
  const [assetChecks, setAssetChecks] = useState<Record<string, AssetCheckData>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [inspection, setInspection] = useState<DailyInspection | null>(existingInspection || null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [certChecked, setCertChecked] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [submitTime, setSubmitTime] = useState('');
  const [isListeningNotes, setIsListeningNotes] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

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

  const checkedCount = stats.okCount + stats.attentionCount + stats.defectCount;
  const totalPhotos = Object.values(assetChecks).reduce((s, c) => s + c.photoUrls.length, 0)
    + attachments.length;

  const handleStartInspection = async () => {
    if (!weather) { toast.error('Please select the weather'); return; }
    if (!inspection) {
      try {
        const newInspection = await createInspection.mutateAsync({ property_id: propertyId, weather });
        setInspection(newInspection);
      } catch { return; }
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

  // Voice for notes
  const handleVoiceNotes = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error('Voice not supported'); return; }
    const r = new SR();
    r.lang = 'en-US';
    setIsListeningNotes(true);
    r.start();
    r.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      setGeneralNotes(prev => prev ? `${prev}\n\n${t}` : t);
      setIsListeningNotes(false);
    };
    r.onerror = () => setIsListeningNotes(false);
    r.onend = () => setIsListeningNotes(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const newUrls: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const filePath = `daily-inspections/attachments/${inspection?.id || 'temp'}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('inspection-photos').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('inspection-photos').getPublicUrl(filePath);
        newUrls.push(publicUrl);
      }
      setAttachments(prev => [...prev, ...newUrls]);
      toast.success('Photo uploaded');
    } catch { toast.error('Failed to upload'); }
    finally { setIsUploading(false); }
  };

  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!inspection || !certChecked) return;
    try {
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
      if (itemsToSave.length > 0) await Promise.all(itemsToSave);

      const { data: pm } = await supabase
        .from('property_team_members')
        .select('user_id')
        .eq('property_id', propertyId)
        .eq('role', 'manager')
        .eq('status', 'active')
        .maybeSingle();

      const issueCreates = activeAssets.flatMap((asset) => {
        const check = assetChecks[asset.id];
        if (!check?.status || check.status === 'ok') return [];
        const severity: 'severe' | 'moderate' = check.status === 'defect_found' ? 'severe' : 'moderate';
        const title = check.status === 'defect_found' ? `Defect found: ${asset.name}` : `Needs attention: ${asset.name}`;
        const descParts = [
          `Daily Grounds Inspection: ${inspection.id}`,
          asset.location_description ? `Location: ${asset.location_description}` : null,
          check.notes ? `Notes: ${check.notes}` : null,
          check.defectDescription ? `Defect: ${check.defectDescription}` : null,
        ].filter(Boolean);
        return [{ property_id: propertyId, title, description: descParts.join('\n'), source_module: 'core' as const, area: 'outside' as const, severity, status: 'open', assigned_to: pm?.user_id || null }];
      });
      if (issueCreates.length > 0) await supabase.from('issues').insert(issueCreates);

      await updateInspection.mutateAsync({
        id: inspection.id,
        general_notes: generalNotes,
        general_notes_html: generalNotesHtml,
        attachments,
        status: 'completed',
        completed_at: new Date().toISOString(),
        review_status: 'pending_review',
        submitted_at: new Date().toISOString(),
      } as any);

      setSubmitTime(format(new Date(), 'h:mm a'));
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      setStep('success');
      toast.success('Inspection submitted for review!');
    } catch (error) {
      if (!navigator.onLine) {
        await enqueue({ type: 'daily_inspection', payload: { propertyId, generalNotes, attachments, assetChecks, timestamp: Date.now() }, timestamp: Date.now() });
        toast.warning("You're offline — saved locally and will sync when reconnected.");
        setStep('success');
      } else {
        toast.error('Failed to submit inspection');
      }
    }
  };

  const handleGoToDashboard = () => { onComplete(); navigate('/dashboard'); };

  const inspectorName = user?.user_metadata?.full_name || user?.email || 'Inspector';
  const inspectorInitials = inspectorName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  const reportFilename = inspection
    ? `daily-grounds-inspection-${format(new Date(), 'yyyy-MM-dd')}-${inspection.id.slice(0, 8)}.pdf`
    : 'daily-grounds-inspection.pdf';

  const successStatusSummary = {
    ok: stats.okCount,
    attention: stats.attentionCount,
    defect: stats.defectCount,
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      await generatePDF({
        filename: reportFilename,
        elementId: 'printable-inspection-report',
        scale: 2,
      });
      toast.success('Report saved to your device');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrintReport = async () => {
    setIsPrinting(true);
    try {
      await printReport('printable-inspection-report');
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print report');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <ConfettiBurst active={showConfetti} />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ChevronLeft className="h-4 w-4 mr-1" />Exit
          </Button>
          <p className="text-xs text-muted-foreground">
            {format(new Date(), 'EEEE, MMMM d')}
          </p>
          <div className="w-16" />
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto">

        {/* ═══ START ═══ */}
        {step === 'start' && (
          <div className="space-y-6">
            <div className="text-center py-6">
              <h1 className="text-2xl font-bold mb-2">Daily Grounds Inspection</h1>
              <p className="text-muted-foreground">{activeAssets.length} assets to check today</p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What's the weather?</CardTitle>
              </CardHeader>
              <CardContent>
                <WeatherSelector value={weather} onChange={setWeather} />
              </CardContent>
            </Card>
            <Button size="lg" className="w-full h-16 text-xl gap-3"
              onClick={handleStartInspection} disabled={!weather || createInspection.isPending}>
              <Play className="h-6 w-6" />Let's Go!
            </Button>
          </div>
        )}

        {/* ═══ ASSETS ═══ */}
        {step === 'assets' && (
          <div className="space-y-4">
            {activeAssets.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground mb-4">No assets found for this property.</p>
                  <Button onClick={() => setStep('notes')}>
                    Continue to Notes <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Enhanced progress */}
                <InspectionProgress
                  current={checkedCount}
                  total={activeAssets.length}
                  okCount={stats.okCount}
                  attentionCount={stats.attentionCount}
                  defectCount={stats.defectCount}
                />
                <DotTracker assets={activeAssets} checks={assetChecks} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeAssets.map((asset) => {
                    const check = assetChecks[asset.id];
                    const s = check?.status;
                    const statusLabel = s === 'ok' ? 'OK' : s === 'needs_attention' ? 'Needs attention' : s === 'defect_found' ? 'Defect found' : 'Not checked';
                    const statusClass = s === 'ok' ? 'bg-green-100 text-green-700' : s === 'needs_attention' ? 'bg-yellow-100 text-yellow-700' : s === 'defect_found' ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground';

                    return (
                      <button key={asset.id} type="button" onClick={() => handleOpenAsset(asset.id)}
                        className={cn('text-left w-full rounded-lg border p-3 transition-colors hover:bg-muted/40', s === 'defect_found' && 'border-red-200')}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{asset.name}</p>
                            {asset.location_description && (
                              <p className="text-xs text-muted-foreground">{asset.location_description}</p>
                            )}
                          </div>
                          <span className={cn('text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap', statusClass)}>
                            {statusLabel}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <Button className="w-full h-12" onClick={() => setStep('notes')}>
                  Continue to Notes <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            )}
          </div>
        )}

        {/* ═══ NOTES ═══ */}
        {step === 'notes' && (
          <div className="space-y-5">
            {/* Day summary card */}
            <div className="rounded-2xl bg-slate-900 p-4 text-white">
              <p className="text-xs text-slate-400 font-medium mb-3 uppercase tracking-wide">Day Summary</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-slate-200">
                  {checkedCount} assets checked
                </span>
                <span className="text-slate-600">·</span>
                <span className="flex items-center gap-1 bg-green-900/60 border border-green-700 text-green-300 text-xs font-bold px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="h-3 w-3" />{stats.okCount} OK
                </span>
                <span className="flex items-center gap-1 bg-amber-900/50 border border-amber-700 text-amber-300 text-xs font-bold px-2.5 py-1 rounded-full">
                  <AlertTriangle className="h-3 w-3" />{stats.attentionCount} Attention
                </span>
                <span className="flex items-center gap-1 bg-red-900/50 border border-red-700 text-red-300 text-xs font-bold px-2.5 py-1 rounded-full">
                  ❌ {stats.defectCount} Defects
                </span>
              </div>
            </div>

            {/* Rich text editor */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  General Notes
                  <button type="button" onClick={handleVoiceNotes}
                    className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all',
                      isListeningNotes ? 'border-red-400 bg-red-50 text-red-600 animate-pulse' : 'border-slate-200 text-slate-500 hover:bg-slate-50')}>
                    <Mic className="h-3.5 w-3.5" />
                    {isListeningNotes ? 'Listening…' : '🎙 Voice'}
                  </button>
                </CardTitle>
                <CardDescription>Add any exterior observations, defects, or housekeeping notes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <RichTextEditor
                  content={generalNotes}
                  onChange={(html) => {
                    setGeneralNotes(html);
                    setGeneralNotesHtml(html);
                  }}
                  placeholder="Describe any exterior defects, general housekeeping notes, or other observations…"
                />

                {/* Day photos grid */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Day Photos — tap to add</Label>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={isUploading}
                  />
                  <div className="grid grid-cols-4 gap-2">
                    {attachments.map((url, i) => (
                      <div key={i} className="relative group aspect-square">
                        <img src={url} alt="" className="w-full h-full object-cover rounded-xl border border-slate-200" />
                        <button type="button"
                          onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={isUploading}
                      className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-slate-400 hover:text-slate-500 transition-colors">
                      {isUploading
                        ? <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                        : <>
                            <Upload className="h-5 w-5" />
                            <span className="text-xs">Add</span>
                          </>}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep('assets')}>
                <ChevronLeft className="h-4 w-4 mr-1" />Back
              </Button>
              <Button className="flex-1" onClick={() => setStep('review')}>
                Review <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ═══ REVIEW / SIGN-OFF ═══ */}
        {step === 'review' && (
          <div className="space-y-5">
            <div className="text-center py-3">
              <h2 className="text-xl font-bold">Sign Off & Submit</h2>
              <p className="text-muted-foreground text-sm">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>

            {/* Stats pills */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center p-4 bg-green-50 border border-green-200 rounded-2xl">
                <p className="text-3xl font-black text-green-600">{stats.okCount}</p>
                <p className="text-xs font-semibold text-green-600 mt-0.5">OK</p>
              </div>
              <div className="flex flex-col items-center p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <p className="text-3xl font-black text-amber-600">{stats.attentionCount}</p>
                <p className="text-xs font-semibold text-amber-600 mt-0.5">Attention</p>
              </div>
              <div className="flex flex-col items-center p-4 bg-red-50 border border-red-200 rounded-2xl">
                <p className="text-3xl font-black text-red-600">{stats.defectCount}</p>
                <p className="text-xs font-semibold text-red-600 mt-0.5">Defects</p>
              </div>
            </div>

            {/* Photos count */}
            {totalPhotos > 0 && (
              <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 font-medium">
                📷 {totalPhotos} photo{totalPhotos !== 1 ? 's' : ''} attached
              </div>
            )}

            {/* Dot tracker summary */}
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground font-medium mb-2">Asset findings pattern</p>
                <DotTracker assets={activeAssets} checks={assetChecks} />
              </CardContent>
            </Card>

            {/* Inspector sign-off */}
            <Card className="border-2 border-slate-200">
              <CardContent className="pt-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
                    {inspectorInitials}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Signing as</p>
                    <p className="font-semibold text-sm">{inspectorName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    id="cert-check"
                    checked={certChecked}
                    onChange={e => setCertChecked(e.target.checked)}
                    className="mt-0.5 h-5 w-5 rounded border-slate-300 text-primary cursor-pointer"
                  />
                  <Label htmlFor="cert-check" className="text-sm text-slate-700 leading-snug cursor-pointer">
                    I certify that this inspection report is accurate and complete to the best of my knowledge.
                  </Label>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep('notes')}>
                <ChevronLeft className="h-4 w-4 mr-1" />Back
              </Button>
              <button
                onClick={handleSubmit}
                disabled={!certChecked || updateInspection.isPending}
                className={cn(
                  'flex-1 h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all',
                  certChecked
                    ? 'bg-green-600 hover:bg-green-500 text-white shadow-md shadow-green-200 active:scale-[0.98]'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                )}
              >
                <Send className="h-4 w-4" />
                {updateInspection.isPending ? 'Submitting…' : 'Submit Daily Report →'}
              </button>
            </div>
          </div>
        )}

        {/* ═══ SUCCESS ═══ */}
        {step === 'success' && (
          <div className="space-y-5">
            {/* Celebration header */}
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 border-4 border-green-200 mb-4 shadow-lg">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <h2 className="text-3xl font-black text-green-600 mb-1">Inspection Submitted!</h2>
              {submitTime && (
                <p className="text-sm text-muted-foreground">Submitted at {submitTime}</p>
              )}
              <p className="text-muted-foreground mt-1 max-w-sm mx-auto text-sm">
                Pending supervisor review.
              </p>
            </div>

            {/* Stats summary */}
            <Card>
              <CardContent className="pt-5">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                    <p className="text-2xl font-black text-green-600">{stats.okCount}</p>
                    <p className="text-xs text-green-600 font-semibold">OK</p>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-2xl font-black text-amber-600">{stats.attentionCount}</p>
                    <p className="text-xs text-amber-600 font-semibold">Attention</p>
                  </div>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-2xl font-black text-red-600">{stats.defectCount}</p>
                    <p className="text-xs text-red-600 font-semibold">Defects</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Report action buttons ── */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground text-center mb-3 uppercase tracking-wide">Share Your Report</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  className="flex-1 gap-2 h-12"
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF}
                >
                  {isGeneratingPDF
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Download className="h-4 w-4" />
                  }
                  {isGeneratingPDF ? 'Saving…' : 'Save PDF'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2 h-12"
                  onClick={handlePrintReport}
                  disabled={isPrinting}
                >
                  {isPrinting
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Printer className="h-4 w-4" />
                  }
                  {isPrinting ? 'Printing…' : 'Print'}
                </Button>
                <Button
                  className="flex-1 gap-2 h-12"
                  onClick={() => setShowEmailDialog(true)}
                >
                  <Mail className="h-4 w-4" />
                  Email Report
                </Button>
              </div>
            </div>

            {/* Secondary navigation */}
            <div className="border-t pt-4 space-y-2">
              <Button size="sm" variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={() => setShowReportDialog(true)}>
                <FileText className="h-4 w-4" />View Full Report
              </Button>
              <Button size="lg" variant="outline" className="w-full" onClick={onComplete}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>

      <InspectionReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        inspectionId={inspection?.id}
        inspection={inspection}
      />

      {inspection && (
        <SendReportEmailDialog
          open={showEmailDialog}
          onOpenChange={setShowEmailDialog}
          inspectionId={inspection.id}
          propertyName="Property"
          inspectorName={inspectorName}
          inspectionDate={inspection.inspection_date}
          reportElementId="printable-inspection-report"
          statusSummary={successStatusSummary}
        />
      )}

      <Dialog open={assetDialogOpen && !!selectedAsset}
        onOpenChange={(open) => { setAssetDialogOpen(open); if (!open) setSelectedAssetId(null); }}>
        <DialogContent className="max-w-lg p-0 border-0 bg-transparent shadow-none">
          {selectedAsset && (() => {
            const idx = activeAssets.findIndex(a => a.id === selectedAsset.id);
            const nextAsset = idx < activeAssets.length - 1 ? activeAssets[idx + 1] : undefined;
            return (
              <AssetCheckCard
                asset={selectedAsset}
                nextAsset={nextAsset}
                status={selectedCheck?.status}
                photoUrls={selectedCheck?.photoUrls || []}
                notes={selectedCheck?.notes || ''}
                defectDescription={selectedCheck?.defectDescription || ''}
                onStatusChange={(status) => handleAssetCheck('status', status)}
                onPhotosChange={(urls) => handleAssetCheck('photoUrls', urls)}
                onNotesChange={(notes) => handleAssetCheck('notes', notes)}
                onDefectDescriptionChange={(desc) => handleAssetCheck('defectDescription', desc)}
                onNext={handleSaveAssetCheck}
                isLast={idx === activeAssets.length - 1}
                nextLabel="Save & Close"
              />
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
