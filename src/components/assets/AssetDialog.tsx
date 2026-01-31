import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProperties } from '@/hooks/useProperties';
import { useCreateAsset, useUpdateAsset, Asset, AssetType, ASSET_TYPE_LABELS } from '@/hooks/useAssets';

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
  });

  useEffect(() => {
    if (asset) {
      setFormData({
        property_id: asset.property_id,
        name: asset.name,
        asset_type: asset.asset_type,
        location_description: asset.location_description || '',
        status: asset.status,
      });
    } else {
      setFormData({
        property_id: defaultPropertyId || properties[0]?.id || '',
        name: '',
        asset_type: 'cleanout',
        location_description: '',
        status: 'active',
      });
    }
  }, [asset, defaultPropertyId, properties, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (asset) {
      await updateAsset.mutateAsync({
        id: asset.id,
        ...formData,
      });
    } else {
      await createAsset.mutateAsync(formData);
    }

    onOpenChange(false);
  };

  const isSubmitting = createAsset.isPending || updateAsset.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{asset ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : asset ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
