import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import { useCreateContractor, useUpdateContractor, type Contractor } from '@/hooks/useContractors';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ContractorFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractor?: Contractor | null;
}

const TRADES = ['Plumbing', 'Electrical', 'Sewer', 'General', 'Civil', 'HVAC', 'Roofing', 'Other'];

export function ContractorFormSheet({ open, onOpenChange, contractor }: ContractorFormSheetProps) {
  const createContractor = useCreateContractor();
  const updateContractor = useUpdateContractor();
  const { data: workspaceId } = useQuery({
    queryKey: ['my-workspace-id'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_my_workspace_id');
      return data as string;
    },
  });

  const [form, setForm] = useState({
    name: '',
    company: '',
    trade: '',
    status: 'active' as string,
    email: '',
    phone: '',
    license_number: '',
    license_expiry: '',
    insurance_expiry: '',
    notes: '',
  });

  useEffect(() => {
    if (contractor) {
      setForm({
        name: contractor.name || '',
        company: contractor.company || '',
        trade: contractor.trade || '',
        status: contractor.status || 'active',
        email: contractor.email || '',
        phone: contractor.phone || '',
        license_number: contractor.license_number || '',
        license_expiry: contractor.license_expiry || '',
        insurance_expiry: contractor.insurance_expiry || '',
        notes: contractor.notes || '',
      });
    } else {
      setForm({
        name: '', company: '', trade: '', status: 'active',
        email: '', phone: '', license_number: '', license_expiry: '',
        insurance_expiry: '', notes: '',
      });
    }
  }, [contractor, open]);

  const isExpiringSoon = (dateStr: string) => {
    if (!dateStr) return false;
    const diff = new Date(dateStr).getTime() - Date.now();
    return diff < 30 * 24 * 60 * 60 * 1000 && diff > 0;
  };

  const isExpired = (dateStr: string) => {
    if (!dateStr) return false;
    return new Date(dateStr).getTime() < Date.now();
  };

  const handleSave = async () => {
    if (!form.name.trim() || !workspaceId) return;

    const payload = {
      name: form.name,
      company: form.company || null,
      trade: form.trade || null,
      status: form.status as 'active' | 'inactive' | 'suspended',
      email: form.email || null,
      phone: form.phone || null,
      license_number: form.license_number || null,
      license_expiry: form.license_expiry || null,
      insurance_expiry: form.insurance_expiry || null,
      notes: form.notes || null,
      workspace_id: workspaceId,
    };

    if (contractor) {
      await updateContractor.mutateAsync({ id: contractor.id, ...payload });
    } else {
      await createContractor.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{contractor ? 'Edit Contractor' : 'Add Contractor'}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Contractor name" />
          </div>

          <div>
            <Label>Company</Label>
            <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Company name" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Trade</Label>
              <Select value={form.trade} onValueChange={v => setForm(f => ({ ...f, trade: v }))}>
                <SelectTrigger><SelectValue placeholder="Select trade" /></SelectTrigger>
                <SelectContent>
                  {TRADES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>

          <div>
            <Label>License Number</Label>
            <Input value={form.license_number} onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))} />
          </div>

          <div>
            <Label>License Expiry</Label>
            <Input type="date" value={form.license_expiry} onChange={e => setForm(f => ({ ...f, license_expiry: e.target.value }))} />
            {isExpired(form.license_expiry) && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-1"><AlertTriangle className="h-3 w-3" /> License expired</p>
            )}
            {isExpiringSoon(form.license_expiry) && (
              <p className="text-xs text-warning flex items-center gap-1 mt-1"><AlertTriangle className="h-3 w-3" /> Expiring soon — update required</p>
            )}
          </div>

          <div>
            <Label>Insurance Expiry</Label>
            <Input type="date" value={form.insurance_expiry} onChange={e => setForm(f => ({ ...f, insurance_expiry: e.target.value }))} />
            {isExpired(form.insurance_expiry) && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-1"><AlertTriangle className="h-3 w-3" /> Insurance expired</p>
            )}
            {isExpiringSoon(form.insurance_expiry) && (
              <p className="text-xs text-warning flex items-center gap-1 mt-1"><AlertTriangle className="h-3 w-3" /> Expiring soon — update required</p>
            )}
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea rows={4} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={!form.name.trim() || createContractor.isPending || updateContractor.isPending}
            >
              {contractor ? 'Update' : 'Save Contractor'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
