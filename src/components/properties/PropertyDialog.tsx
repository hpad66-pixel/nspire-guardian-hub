import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateProperty, useUpdateProperty } from '@/hooks/useProperties';
import type { Database } from '@/integrations/supabase/types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

interface PropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property?: PropertyRow | null;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export function PropertyDialog({ open, onOpenChange, property }: PropertyDialogProps) {
  const isEditing = !!property;
  
  const [formData, setFormData] = useState({
    name: property?.name || '',
    address: property?.address || '',
    city: property?.city || '',
    state: property?.state || '',
    zip_code: property?.zip_code || '',
    total_units: property?.total_units || 0,
    year_built: property?.year_built || undefined as number | undefined,
    nspire_enabled: property?.nspire_enabled || false,
    projects_enabled: property?.projects_enabled || false,
    status: property?.status || 'active',
  });

  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing && property) {
        await updateProperty.mutateAsync({
          id: property.id,
          ...formData,
        });
      } else {
        await createProperty.mutateAsync(formData);
      }
      onOpenChange(false);
      resetForm();
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      total_units: 0,
      year_built: undefined,
      nspire_enabled: false,
      projects_enabled: false,
      status: 'active',
    });
  };

  const isPending = createProperty.isPending || updateProperty.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Property' : 'Add New Property'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the property details below.'
              : 'Enter the details for the new property.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Property Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Oak Ridge Apartments"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">Street Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. 123 Main Street"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state">State *</Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) => setFormData({ ...formData, state: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="zip_code">ZIP Code</Label>
                <Input
                  id="zip_code"
                  value={formData.zip_code}
                  onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                  placeholder="ZIP"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="total_units">Total Units</Label>
                <Input
                  id="total_units"
                  type="number"
                  min="0"
                  value={formData.total_units}
                  onChange={(e) => setFormData({ ...formData, total_units: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="year_built">Year Built</Label>
                <Input
                  id="year_built"
                  type="number"
                  min="1800"
                  max={new Date().getFullYear()}
                  value={formData.year_built || ''}
                  onChange={(e) => setFormData({ ...formData, year_built: parseInt(e.target.value) || undefined })}
                  placeholder="e.g. 1995"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium">Enabled Modules</h4>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="nspire">NSPIRE Inspections</Label>
                  <p className="text-xs text-muted-foreground">Enable NSPIRE-compliant inspection workflows</p>
                </div>
                <Switch
                  id="nspire"
                  checked={formData.nspire_enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, nspire_enabled: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="projects">Projects</Label>
                  <p className="text-xs text-muted-foreground">Enable capital improvement project tracking</p>
                </div>
                <Switch
                  id="projects"
                  checked={formData.projects_enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, projects_enabled: checked })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : isEditing ? 'Update Property' : 'Add Property'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
