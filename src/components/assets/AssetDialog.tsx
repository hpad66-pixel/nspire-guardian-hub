import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProperties } from '@/hooks/useProperties';
import { useCreateAsset, useUpdateAsset, Asset, AssetType, ASSET_TYPE_LABELS } from '@/hooks/useAssets';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Camera, Upload, X, Lock } from 'lucide-react';

interface AssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: Asset | null;
  defaultPropertyId?: string;
}

export function AssetDialog({ open, onOpenChange, asset, defaultPropertyId }: AssetDialogProps) {
  const { data: properties = [] } = useProperties();
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();

  const [formData, setFormData] = useState({
    property_id: '',
    name: '',
    asset_type: 'cleanout' as AssetType,
    location_description: '',
    status: 'active',
    photo_url: '',
  });
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (asset) {
      setFormData({
        property_id: asset.property_id,
        name: asset.name,
        asset_type: asset.asset_type,
        location_description: asset.location_description || '',
        status: asset.status,
        photo_url: asset.photo_url || '',
      });
    } else {
      setFormData({
        property_id: defaultPropertyId || properties[0]?.id || '',
        name: '',
        asset_type: 'cleanout',
        location_description: '',
        status: 'active',
        photo_url: '',
      });
    }
  }, [asset, defaultPropertyId, properties, open]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `asset-${Date.now()}.${fileExt}`;
      const filePath = `assets/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('inspection-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('inspection-photos')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, photo_url: publicUrl }));
      toast.success('Photo uploaded');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    // Only allow removing if this is a new asset (not editing existing)
    if (!asset) {
      setFormData(prev => ({ ...prev, photo_url: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (asset) {
      // When updating, don't change the original photo
      await updateAsset.mutateAsync({
        id: asset.id,
        property_id: formData.property_id,
        name: formData.name,
        asset_type: formData.asset_type,
        location_description: formData.location_description,
        status: formData.status,
        // Keep original photo - don't allow changing it
      });
    } else {
      await createAsset.mutateAsync({
        ...formData,
        photo_url: formData.photo_url || undefined,
      });
    }

    onOpenChange(false);
  };

  const isSubmitting = createAsset.isPending || updateAsset.isPending;
  const hasExistingPhoto = asset?.photo_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{asset ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo Upload Section */}
          <div className="space-y-2">
            <Label>Asset Photo</Label>
            {formData.photo_url || hasExistingPhoto ? (
              <div className="relative">
                <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
                  <img
                    src={formData.photo_url || asset?.photo_url}
                    alt="Asset"
                    className="w-full h-full object-cover"
                  />
                  {hasExistingPhoto && (
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Original Photo
                    </div>
                  )}
                </div>
                {!asset && formData.photo_url && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute bottom-2 right-2"
                    onClick={handleRemovePhoto}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                )}
                {hasExistingPhoto && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Original photo is locked. Additional photos can be taken during inspections.
                  </p>
                )}
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="asset-photo-upload"
                  disabled={isUploading}
                />
                <label
                  htmlFor="asset-photo-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Camera className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {isUploading ? 'Uploading...' : 'Take or upload photo'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      This will be the asset's reference photo
                    </p>
                  </div>
                </label>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="property">Property</Label>
            <Select
              value={formData.property_id}
              onValueChange={(value) => setFormData({ ...formData, property_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="asset_type">Asset Type</Label>
            <Select
              value={formData.asset_type}
              onValueChange={(value) => setFormData({ ...formData, asset_type: value as AssetType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Cleanout #1"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location Description</Label>
            <Textarea
              id="location"
              value={formData.location_description}
              onChange={(e) => setFormData({ ...formData, location_description: e.target.value })}
              placeholder="e.g., North parking lot near building A"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="needs_repair">Needs Repair</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting || isUploading}>
              {isSubmitting ? 'Saving...' : asset ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
