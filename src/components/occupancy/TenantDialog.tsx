import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VoiceDictationTextareaWithAI } from '@/components/ui/voice-dictation-textarea-ai';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProperties } from '@/hooks/useProperties';
import { useUnitsByProperty } from '@/hooks/useUnits';
import { useCreateTenant, useUpdateTenant, type Tenant } from '@/hooks/useTenants';

interface TenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant?: Tenant | null;
}

export function TenantDialog({ open, onOpenChange, tenant }: TenantDialogProps) {
  const isEditing = !!tenant;
  const { data: properties } = useProperties();
  
  const [formData, setFormData] = useState({
    property_id: '',
    unit_id: tenant?.unit_id || '',
    first_name: tenant?.first_name || '',
    last_name: tenant?.last_name || '',
    email: tenant?.email || '',
    phone: tenant?.phone || '',
    lease_start: tenant?.lease_start || '',
    lease_end: tenant?.lease_end || '',
    rent_amount: tenant?.rent_amount?.toString() || '',
    deposit_amount: tenant?.deposit_amount?.toString() || '',
    status: tenant?.status || 'active',
    move_in_date: tenant?.move_in_date || '',
    notes: tenant?.notes || '',
  });

  const { data: units } = useUnitsByProperty(formData.property_id);
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();

  // Initialize property_id from tenant's unit if editing
  useEffect(() => {
    if (tenant?.unit?.property?.id) {
      setFormData(prev => ({ ...prev, property_id: tenant.unit!.property!.id }));
    }
  }, [tenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.unit_id) {
      toast.error('Please select a unit before saving.');
      return;
    }
    if (!formData.first_name || !formData.last_name) {
      toast.error('First name and last name are required.');
      return;
    }
    if (!formData.lease_start) {
      toast.error('Lease start date is required.');
      return;
    }
    
    try {
      const tenantData = {
        unit_id: formData.unit_id,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email || null,
        phone: formData.phone || null,
        lease_start: formData.lease_start,
        lease_end: formData.lease_end || null,
        rent_amount: formData.rent_amount ? parseFloat(formData.rent_amount) : null,
        deposit_amount: formData.deposit_amount ? parseFloat(formData.deposit_amount) : null,
        status: formData.status,
        move_in_date: formData.move_in_date || null,
        move_out_date: null,
        notes: formData.notes || null,
      };

      if (isEditing && tenant) {
        await updateTenant.mutateAsync({
          id: tenant.id,
          ...tenantData,
        });
      } else {
        await createTenant.mutateAsync(tenantData as any);
      }
      
      onOpenChange(false);
      resetForm();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const resetForm = () => {
    setFormData({
      property_id: '',
      unit_id: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      lease_start: '',
      lease_end: '',
      rent_amount: '',
      deposit_amount: '',
      status: 'active',
      move_in_date: '',
      notes: '',
    });
  };

  const isPending = createTenant.isPending || updateTenant.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Tenant' : 'Add New Tenant'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update tenant information and lease details.'
              : 'Enter tenant information and assign them to a unit.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Property and Unit Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Property *</Label>
              <Select
                value={formData.property_id}
                onValueChange={(value) => setFormData({ ...formData, property_id: value, unit_id: '' })}
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

            <div className="space-y-2">
              <Label>Unit *</Label>
              <Select
                value={formData.unit_id}
                onValueChange={(value) => setFormData({ ...formData, unit_id: value })}
                disabled={!formData.property_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {units?.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      Unit {unit.unit_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tenant Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="John"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Doe"
                required
              />
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          {/* Lease Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lease_start">Lease Start *</Label>
              <Input
                id="lease_start"
                type="date"
                value={formData.lease_start}
                onChange={(e) => setFormData({ ...formData, lease_start: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lease_end">Lease End</Label>
              <Input
                id="lease_end"
                type="date"
                value={formData.lease_end}
                onChange={(e) => setFormData({ ...formData, lease_end: e.target.value })}
              />
            </div>
          </div>

          {/* Financial Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rent_amount">Monthly Rent</Label>
              <Input
                id="rent_amount"
                type="number"
                value={formData.rent_amount}
                onChange={(e) => setFormData({ ...formData, rent_amount: e.target.value })}
                placeholder="1500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deposit_amount">Deposit</Label>
              <Input
                id="deposit_amount"
                type="number"
                value={formData.deposit_amount}
                onChange={(e) => setFormData({ ...formData, deposit_amount: e.target.value })}
                placeholder="1500"
              />
            </div>
          </div>

          {/* Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="notice_given">Notice Given</SelectItem>
                  <SelectItem value="moved_out">Moved Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="move_in_date">Move-in Date</Label>
              <Input
                id="move_in_date"
                type="date"
                value={formData.move_in_date}
                onChange={(e) => setFormData({ ...formData, move_in_date: e.target.value })}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <VoiceDictationTextareaWithAI
              id="notes"
              value={formData.notes}
              onValueChange={(value) => setFormData({ ...formData, notes: value })}
              placeholder="Additional notes about the tenant..."
              className="min-h-[80px]"
              context="notes"
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isPending || !formData.unit_id || !formData.first_name || !formData.last_name || !formData.lease_start}
            >
              {isPending ? 'Saving...' : isEditing ? 'Update Tenant' : 'Add Tenant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
