import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AssetTypeIcon } from '@/components/assets/AssetTypeIcon';
import { Asset, ASSET_TYPE_LABELS, useAssetTypes } from '@/hooks/useAssets';
import { InspectionItemStatus } from '@/hooks/useDailyInspections';
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronRight,
  X,
  MapPin,
  ChevronDown,
  Mic,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type DefectSeverity = 'minor' | 'moderate' | 'severe';

interface AssetCheckCardProps {
  asset: Asset;
  nextAsset?: Asset;
  status?: InspectionItemStatus;
  photoUrls?: string[];
  notes?: string;
  defectDescription?: string;
  onStatusChange: (status: InspectionItemStatus) => void;
  onPhotosChange: (urls: string[]) => void;
  onNotesChange: (notes: string) => void;
  onDefectDescriptionChange: (description: string) => void;
  onNext: () => void;
  isLast: boolean;
  nextLabel?: string;
  hasPriorIssues?: boolean;
}

const STATUS_CONFIG = [
  {
    value: 'ok' as InspectionItemStatus,
    icon: CheckCircle2,
    label: 'OK',
    sub: 'No issues found',
    bg: 'bg-green-500',
    hoverBg: 'hover:bg-green-600',
    border: 'border-green-500',
    text: 'text-white',
    ringColor: 'ring-green-400',
  },
  {
    value: 'needs_attention' as InspectionItemStatus,
    icon: AlertTriangle,
    label: 'Attention',
    sub: 'Needs monitoring',
    bg: 'bg-amber-500',
    hoverBg: 'hover:bg-amber-600',
    border: 'border-amber-500',
    text: 'text-white',
    ringColor: 'ring-amber-400',
  },
  {
    value: 'defect_found' as InspectionItemStatus,
    icon: XCircle,
    label: 'Defect',
    sub: 'Requires repair',
    bg: 'bg-red-500',
    hoverBg: 'hover:bg-red-600',
    border: 'border-red-500',
    text: 'text-white',
    ringColor: 'ring-red-400',
  },
];

const DEFECT_SEVERITIES: { value: DefectSeverity; label: string; color: string }[] = [
  { value: 'minor', label: 'Minor', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 'moderate', label: 'Moderate', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'severe', label: 'Severe', color: 'bg-red-100 text-red-700 border-red-300' },
];

export function AssetCheckCard({
  asset,
  nextAsset,
  status,
  photoUrls = [],
  notes = '',
  defectDescription = '',
  onStatusChange,
  onPhotosChange,
  onNotesChange,
  onDefectDescriptionChange,
  onNext,
  isLast,
  nextLabel,
  hasPriorIssues = false,
}: AssetCheckCardProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [defectSeverity, setDefectSeverity] = useState<DefectSeverity>('minor');
  const [flagForAttention, setFlagForAttention] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [longPressIndex, setLongPressIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: assetTypes = [] } = useAssetTypes();
  const typeLabels = assetTypes.length > 0
    ? Object.fromEntries(assetTypes.map((t) => [t.key, t.label]))
    : ASSET_TYPE_LABELS;

  // ── Photo upload ──────────────────────────────────────────────────────────
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${asset.id}-${Date.now()}.${fileExt}`;
        const filePath = `daily-inspections/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('inspection-photos')
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('inspection-photos')
          .getPublicUrl(filePath);
        newUrls.push(publicUrl);
      }
      onPhotosChange([...photoUrls, ...newUrls]);
      toast.success('Photo uploaded');
    } catch {
      toast.error('Failed to upload photo');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    onPhotosChange(photoUrls.filter((_, i) => i !== index));
    setLongPressIndex(null);
  };

  // ── Long-press on thumbnail ───────────────────────────────────────────────
  const startLongPress = (idx: number) => {
    longPressTimer.current = setTimeout(() => setLongPressIndex(idx), 500);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  // ── Voice dictation ───────────────────────────────────────────────────────
  const handleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error('Voice not supported on this browser'); return; }
    const r = new SR();
    r.continuous = false;
    r.interimResults = false;
    r.lang = 'en-US';
    setIsListening(true);
    r.start();
    r.onresult = (e: any) => {
      onNotesChange(notes ? `${notes} ${e.results[0][0].transcript}` : e.results[0][0].transcript);
      setIsListening(false);
    };
    r.onerror = () => setIsListening(false);
    r.onend = () => setIsListening(false);
  };

  const nextButtonLabel = nextLabel
    ? nextLabel
    : isLast
    ? 'Review & Finish →'
    : nextAsset
    ? `Next: ${nextAsset.name} →`
    : 'Next Asset →';

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl border-0 overflow-hidden">
      {/* ── Asset Header ── */}
      <div className="px-5 pt-5 pb-4 bg-slate-900">
        <div className="flex items-start gap-3">
          <AssetTypeIcon type={asset.asset_type} size="lg" />
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-extrabold text-white leading-tight truncate">
              {asset.name}
            </h2>
            <p className="text-slate-400 text-sm mt-0.5">
              {typeLabels[asset.asset_type] || asset.asset_type}
            </p>
          </div>
        </div>

        {/* Location pill */}
        {asset.location_description && (
          <div className="mt-3 inline-flex items-center gap-1.5 bg-slate-800 rounded-full px-3 py-1">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs text-slate-300">{asset.location_description}</span>
          </div>
        )}

        {/* Prior issues badge */}
        {hasPriorIssues && (
          <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-900/50 border border-amber-700 rounded-full px-3 py-1 ml-2">
            <AlertTriangle className="h-3 w-3 text-amber-400" />
            <span className="text-xs text-amber-300 font-medium">Prior issues (30d)</span>
          </div>
        )}
      </div>

      <CardContent className="p-4 space-y-4 bg-white">

        {/* ── 1. PHOTO FIRST ── */}
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handlePhotoCapture}
            className="hidden"
          />

          {photoUrls.length === 0 ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full h-20 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/60 flex flex-col items-center justify-center gap-1 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all active:scale-[0.98]"
            >
              {isUploading
                ? <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                : <Camera className="h-7 w-7" />}
              <span className="text-sm font-semibold">
                {isUploading ? 'Uploading…' : '📷 Tap to photograph'}
              </span>
            </button>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {/* Add more button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex-shrink-0 w-16 h-16 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 flex items-center justify-center text-blue-500 hover:bg-blue-100 transition-colors"
              >
                {isUploading
                  ? <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  : <Camera className="h-5 w-5" />}
              </button>

              {/* Thumbnails */}
              {photoUrls.map((url, index) => (
                <div
                  key={index}
                  className="relative flex-shrink-0"
                  onMouseDown={() => startLongPress(index)}
                  onMouseUp={cancelLongPress}
                  onMouseLeave={cancelLongPress}
                  onTouchStart={() => startLongPress(index)}
                  onTouchEnd={cancelLongPress}
                >
                  <img
                    src={url}
                    alt={`Photo ${index + 1}`}
                    className="h-16 w-16 object-cover rounded-xl border border-slate-200"
                  />
                  {/* Long-press delete confirmation */}
                  {longPressIndex === index && (
                    <div className="absolute inset-0 rounded-xl bg-black/70 flex flex-col items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setLongPressIndex(null)}
                        className="text-white text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 2. STATUS BUTTONS — LARGER + MORE EXPRESSIVE ── */}
        <div className="grid grid-cols-3 gap-2">
          {STATUS_CONFIG.map((cfg) => {
            const Icon = cfg.icon;
            const isSelected = status === cfg.value;
            return (
              <button
                key={cfg.value}
                type="button"
                onClick={() => onStatusChange(cfg.value)}
                className={cn(
                  'h-20 flex flex-col items-center justify-center gap-1 rounded-2xl border-2 transition-all duration-150',
                  isSelected
                    ? `${cfg.bg} ${cfg.border} ${cfg.text} scale-105 ring-2 ${cfg.ringColor} ring-offset-1 shadow-lg`
                    : `bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50`
                )}
              >
                <Icon className={cn('h-6 w-6', isSelected ? 'text-white' : 'text-slate-400')} />
                <span className={cn('text-xs font-bold', isSelected ? 'text-white' : 'text-slate-600')}>
                  {cfg.label}
                </span>
                <span className={cn('text-[9px] leading-tight text-center px-1', isSelected ? 'text-white/80' : 'text-slate-400')}>
                  {cfg.sub}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── 3. DEFECT AUTO-ESCALATION ── */}
        {status === 'defect_found' && (
          <div className="space-y-3 rounded-2xl border-2 border-red-100 bg-red-50/40 p-4">
            <Textarea
              placeholder="Describe the defect in detail…"
              value={defectDescription}
              onChange={(e) => onDefectDescriptionChange(e.target.value)}
              className="min-h-[80px] resize-none border-red-200 bg-white text-sm"
            />

            {/* Severity chips */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-600">Severity</p>
              <div className="flex gap-2">
                {DEFECT_SEVERITIES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setDefectSeverity(s.value)}
                    className={cn(
                      'flex-1 py-1.5 rounded-xl border text-xs font-semibold transition-all',
                      defectSeverity === s.value
                        ? s.color
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Severe warning */}
            {defectSeverity === 'severe' && (
              <div className="flex items-center gap-2 p-2.5 bg-red-100 border border-red-300 rounded-xl">
                <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                <p className="text-xs text-red-700 font-medium">Will create Issue for supervisor review</p>
              </div>
            )}

            {/* Flag toggle */}
            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
              <Label htmlFor="flag-toggle" className="text-xs font-semibold text-slate-700 cursor-pointer">
                🚨 Flag for immediate attention
              </Label>
              <Switch
                id="flag-toggle"
                checked={flagForAttention}
                onCheckedChange={setFlagForAttention}
              />
            </div>
          </div>
        )}

        {/* ── 4. QUICK NOTES + VOICE ── */}
        <div className="space-y-2">
          <Textarea
            placeholder="Describe what you see…"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            className="min-h-[80px] resize-none text-sm"
          />
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleVoice}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all',
                isListening
                  ? 'border-red-400 bg-red-50 text-red-600 animate-pulse'
                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
              )}
            >
              <Mic className="h-3.5 w-3.5" />
              {isListening ? 'Listening…' : 'Voice note'}
            </button>

            {/* Keyboard dismiss (mobile) */}
            <button
              type="button"
              onClick={() => (document.activeElement as HTMLElement)?.blur?.()}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 text-xs"
            >
              <ChevronDown className="h-3.5 w-3.5" />
              Done
            </button>
          </div>
        </div>

        {/* ── 5. NEXT BUTTON — SMARTER ── */}
        <button
          type="button"
          onClick={onNext}
          disabled={!status}
          className={cn(
            'w-full h-14 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all',
            status
              ? 'bg-slate-900 hover:bg-slate-800 text-white active:scale-[0.98] shadow-md'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
          )}
        >
          {status ? (
            <>
              {nextButtonLabel}
              <ChevronRight className="h-4 w-4" />
            </>
          ) : (
            'Select a status to continue'
          )}
        </button>
      </CardContent>
    </Card>
  );
}
