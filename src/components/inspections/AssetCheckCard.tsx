import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AssetTypeIcon } from '@/components/assets/AssetTypeIcon';
import { Asset, ASSET_TYPE_LABELS, useAssetTypes } from '@/hooks/useAssets';
import { InspectionItemStatus } from '@/hooks/useDailyInspections';
import { Camera, CheckCircle2, AlertTriangle, XCircle, ChevronRight, X, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AssetCheckCardProps {
  asset: Asset;
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
}

export function AssetCheckCard({
  asset,
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
}: AssetCheckCardProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: assetTypes = [] } = useAssetTypes();
  const typeLabels = assetTypes.length > 0
    ? Object.fromEntries(assetTypes.map((t) => [t.key, t.label]))
    : ASSET_TYPE_LABELS;

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
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removePhoto = (index: number) => {
    const updated = photoUrls.filter((_, i) => i !== index);
    onPhotosChange(updated);
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-lg">
      <CardContent className="p-4 space-y-4">
        {/* Asset Header */}
        <div className="flex items-center gap-3">
          <AssetTypeIcon type={asset.asset_type} size="lg" />
          <div className="flex-1">
            <h2 className="text-xl font-bold">{asset.name}</h2>
            <p className="text-sm text-muted-foreground">
              {typeLabels[asset.asset_type] || asset.asset_type}
            </p>
          </div>
        </div>

        {/* Location */}
        {asset.location_description && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">
            <MapPin className="h-4 w-4" />
            <span>{asset.location_description}</span>
          </div>
        )}

        {/* Photo Capture */}
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
          
          <Button
            type="button"
            variant="outline"
            className="w-full h-16 text-lg gap-3"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Camera className="h-6 w-6" />
            {isUploading ? 'Uploading...' : 'Take Photo'}
          </Button>

          {/* Photo Thumbnails */}
          {photoUrls.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {photoUrls.map((url, index) => (
                <div key={index} className="relative">
                  <img
                    src={url}
                    alt={`Photo ${index + 1}`}
                    className="h-16 w-16 object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant={status === 'ok' ? 'default' : 'outline'}
            className={cn(
              'h-16 flex-col gap-1',
              status === 'ok' && 'bg-green-500 hover:bg-green-600 text-white'
            )}
            onClick={() => onStatusChange('ok')}
          >
            <CheckCircle2 className="h-6 w-6" />
            <span className="text-xs font-medium">OK</span>
          </Button>
          
          <Button
            type="button"
            variant={status === 'needs_attention' ? 'default' : 'outline'}
            className={cn(
              'h-16 flex-col gap-1',
              status === 'needs_attention' && 'bg-yellow-500 hover:bg-yellow-600 text-white'
            )}
            onClick={() => onStatusChange('needs_attention')}
          >
            <AlertTriangle className="h-6 w-6" />
            <span className="text-xs font-medium">Attention</span>
          </Button>
          
          <Button
            type="button"
            variant={status === 'defect_found' ? 'default' : 'outline'}
            className={cn(
              'h-16 flex-col gap-1',
              status === 'defect_found' && 'bg-red-500 hover:bg-red-600 text-white'
            )}
            onClick={() => onStatusChange('defect_found')}
          >
            <XCircle className="h-6 w-6" />
            <span className="text-xs font-medium">Defect</span>
          </Button>
        </div>

        {/* Defect Description (if defect selected) */}
        {status === 'defect_found' && (
          <Textarea
            placeholder="Describe the defect..."
            value={defectDescription}
            onChange={(e) => onDefectDescriptionChange(e.target.value)}
            className="min-h-[80px]"
          />
        )}

        {/* Quick Notes */}
        <Textarea
          placeholder="Quick notes (optional)"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="min-h-[60px]"
        />

        {/* Next Button */}
        <Button
          type="button"
          className="w-full h-14 text-lg gap-2"
          onClick={onNext}
          disabled={!status}
        >
          {nextLabel || (isLast ? 'Continue to Notes' : 'Next Asset')}
          <ChevronRight className="h-5 w-5" />
        </Button>
      </CardContent>
    </Card>
  );
}
