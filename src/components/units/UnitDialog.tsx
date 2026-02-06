import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateUnit, useUpdateUnit } from '@/hooks/useUnits';
import { useProperties } from '@/hooks/useProperties';
import type { Database } from '@/integrations/supabase/types';

type UnitRow = Database['public']['Tables']['units']['Row'];

interface UnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit?: UnitRow | null;
  propertyId?: string;
}

export function UnitDialog({ open, onOpenChange, unit, propertyId }: UnitDialogProps) {
  const isEditing = !!unit;
  const { data: properties } = useProperties();
  
  const [formData, setFormData] = useState({
    property_id: unit?.property_id || propertyId || '',
    unit_number: unit?.unit_number || '',
    bedrooms: unit?.bedrooms || 1,
    bathrooms: unit?.bathrooms || 1,
    square_feet: unit?.square_feet || undefined as number | undefined,
    floor: unit?.floor || undefined as number | undefined,
    status: unit?.status || 'occupied',
  });

  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();

  useEffect(() => {
    if (!open) return;
    if (unit) {
      setFormData({
        property_id: unit.property_id || propertyId || '',
        unit_number: unit.unit_number || '',
        bedrooms: unit.bedrooms || 1,
        bathrooms: unit.bathrooms || 1,
        square_feet: unit.square_feet || undefined,
        floor: unit.floor || undefined,
        status: unit.status || 'occupied',
      });
    } else {
      setFormData({
        property_id: propertyId || '',
        unit_number: '',
        bedrooms: 1,
        bathrooms: 1,
        square_feet: undefined,
        floor: undefined,
        status: 'occupied',
      });
    }
  }, [open, unit, propertyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing && unit) {
        await updateUnit.mutateAsync({
          id: unit.id,
          ...formData,
        });
      } else {
        await createUnit.mutateAsync(formData);
      }
      onOpenChange(false);
      resetForm();
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const resetForm = () => {
    setFormData({
      property_id: propertyId || '',
      unit_number: '',
      bedrooms: 1,
      bathrooms: 1,
      square_feet: undefined,
      floor: undefined,
      status: 'occupied',
    });
  };

  const isPending = createUnit.isPending || updateUnit.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Unit' : 'Add New Unit'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the unit details below.'
              : 'Enter the details for the new unit.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="property">Property *</Label>
              <Select
                value={formData.property_id}
                onValueChange={(value) => setFormData({ ...formData, property_id: value })}
                disabled={!!propertyId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties?.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="unit_number">Unit Number *</Label>
                <Input
                  id="unit_number"
                  value={formData.unit_number}
                  onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                  placeholder="e.g. 101A"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="floor">Floor</Label>
                <Input
                  id="floor"
                  type="number"
                  min="1"
                  value={formData.floor || ''}
                  onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) || undefined })}
                  placeholder="e.g. 1"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  min="0"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="square_feet">Sq Ft</Label>
                <Input
                  id="square_feet"
                  type="number"
                  min="0"
                  value={formData.square_feet || ''}
                  onChange={(e) => setFormData({ ...formData, square_feet: parseInt(e.target.value) || undefined })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="vacant">Vacant</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !formData.property_id}>
              {isPending ? 'Saving...' : isEditing ? 'Update Unit' : 'Add Unit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
