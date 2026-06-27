import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Zap, Droplets, Flame, Waves, Trash2, MoreHorizontal, FileText, X, Upload, Loader2 } from 'lucide-react';
import { useAddUtilityBill, useUpdateUtilityBill, type UtilityBill } from '@/hooks/useUtilityBills';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UtilityBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  bill?: UtilityBill | null;
}

const UTILITY_TYPES = [
  { key: 'electric', label: 'Electric', icon: Zap, color: 'text-amber-500' },
  { key: 'water',    label: 'Water',    icon: Droplets, color: 'text-blue-500' },
  { key: 'gas',      label: 'Gas',      icon: Flame, color: 'text-orange-500' },
  { key: 'sewer',    label: 'Sewer',    icon: Waves, color: 'text-teal-500' },
  { key: 'trash',    label: 'Trash',    icon: Trash2, color: 'text-muted-foreground' },
  { key: 'other',    label: 'Other',    icon: MoreHorizontal, color: 'text-purple-500' },
];

const CONSUMPTION_UNITS = ['kwh', 'gallons', 'therms', 'ccf', 'hcf', 'cubic ft', 'other'];

function defaultPeriod() {
  const now = new Date();
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastOfLastMonth  = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    start: firstOfLastMonth.toISOString().slice(0, 10),
    end:   lastOfLastMonth.toISOString().slice(0, 10),
  };
}

export function UtilityBillDialog({ open, onOpenChange, propertyId, bill }: UtilityBillDialogProps) {
  const period = defaultPeriod();
  const isEditing = !!bill;

  const [utilityType,      setUtilityType]      = useState(bill?.utility_type ?? '');
  const [periodStart,      setPeriodStart]      = useState(bill?.bill_period_start ?? period.start);
  const [periodEnd,        setPeriodEnd]        = useState(bill?.bill_period_end   ?? period.end);
  const [amount,           setAmount]           = useState(bill?.amount?.toString() ?? '');
  const [status,           setStatus]           = useState(bill?.status ?? 'paid');
  const [providerName,     setProviderName]     = useState(bill?.provider_name ?? '');
  const [accountNumber,    setAccountNumber]    = useState(bill?.account_number ?? '');
  const [notes,            setNotes]            = useState(bill?.notes ?? '');
  const [consumptionValue, setConsumptionValue] = useState(bill?.consumption_value?.toString() ?? '');
  const [consumptionUnit,  setConsumptionUnit]  = useState(bill?.consumption_unit ?? 'kwh');
  const [documentName,     setDocumentName]     = useState(bill?.document_name ?? '');
  const [documentUrl,      setDocumentUrl]      = useState(bill?.document_url ?? '');
  const [uploading,        setUploading]        = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `utility-bills/${propertyId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('daily-report-files').upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('daily-report-files').getPublicUrl(path);
      setDocumentUrl(publicUrl);
      setDocumentName(file.name);
    } catch (e: any) { toast.error(e?.message || 'Upload failed'); }
    finally { setUploading(false); }
  }
  const [consumptionOpen,  setConsumptionOpen]  = useState(false);
  const [notesOpen,        setNotesOpen]        = useState(false);

  const addBill    = useAddUtilityBill();
  const updateBill = useUpdateUtilityBill();

  const handleSave = async () => {
    if (!utilityType || !amount || !periodStart || !periodEnd) return;

    const payload = {
      propertyId,
      utilityType,
      billPeriodStart: periodStart,
      billPeriodEnd:   periodEnd,
      amount:          parseFloat(amount),
      status,
      providerName:     providerName || undefined,
      accountNumber:    accountNumber || undefined,
      notes:            notes || undefined,
      consumptionValue: consumptionValue ? parseFloat(consumptionValue) : undefined,
      consumptionUnit:  consumptionValue ? consumptionUnit : undefined,
      documentUrl:      documentUrl || undefined,
      documentName:     documentName || undefined,
    };

    if (isEditing) {
      await updateBill.mutateAsync({ id: bill!.id, ...payload });
    } else {
      await addBill.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isPending = addBill.isPending || updateBill.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Utility Bill' : 'Add Utility Bill'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Utility type picker */}
          <div className="space-y-2">
            <Label>Utility Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {UTILITY_TYPES.map((u) => {
                const Icon = u.icon;
                const selected = utilityType === u.key;
                return (
                  <button
                    key={u.key}
                    type="button"
                    onClick={() => setUtilityType(u.key)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-sm font-medium transition-all',
                      selected
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-muted/30 hover:bg-muted/60'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', selected ? 'text-primary' : u.color)} />
                    <span className={selected ? 'text-primary' : 'text-muted-foreground'}>{u.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bill period */}
          <div className="space-y-2">
            <Label>Bill Period</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">From</Label>
                <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">To</Label>
                <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Total Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="pl-7 text-lg font-semibold"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          {/* Status toggle */}
          <div className="space-y-2">
            <Label>Payment Status</Label>
            <div className="flex gap-2">
              {['paid', 'pending', 'disputed'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    'flex-1 rounded-lg border-2 py-2 text-sm font-medium capitalize transition-all',
                    status === s
                      ? s === 'paid'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : s === 'disputed'
                        ? 'border-destructive bg-destructive/10 text-destructive'
                        : 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-border bg-muted/30 hover:bg-muted/60 text-muted-foreground'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Provider */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider (optional)</Label>
              <Input
                id="provider"
                placeholder="e.g. FPL, City Water"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account">Account # (optional)</Label>
              <Input
                id="account"
                placeholder="Account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Document upload */}
          <div className="space-y-2">
            <Label>Bill Document (optional)</Label>
            <div className="rounded-lg border-2 border-dashed border-border p-4 text-center">
              {documentName ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium">{documentName}</span>
                  <button
                    type="button"
                    onClick={() => { setDocumentName(''); setDocumentUrl(''); }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className={cn('inline-flex items-center gap-2 cursor-pointer rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted', uploading && 'pointer-events-none opacity-60')}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploading ? 'Uploading…' : 'Upload a file'}
                    <input type="file" accept="image/*,application/pdf" hidden disabled={uploading}
                      onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleUpload(f); }} />
                  </label>
                  <p className="text-[11px] text-muted-foreground">PDF or image. Or paste a URL:</p>
                  <Input
                    placeholder="https://… (optional)"
                    value={documentUrl}
                    onChange={(e) => {
                      setDocumentUrl(e.target.value);
                      const parts = e.target.value.split('/');
                      setDocumentName(parts[parts.length - 1] || '');
                    }}
                    className="text-xs"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Consumption — collapsible */}
          <Collapsible open={consumptionOpen} onOpenChange={setConsumptionOpen}>
            <CollapsibleTrigger asChild>
              <button type="button" className="flex items-center gap-2 text-sm text-primary hover:underline">
                <ChevronDown className={cn('h-4 w-4 transition-transform', consumptionOpen && 'rotate-180')} />
                Add consumption data (kWh / gallons)
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Consumption Amount</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={consumptionValue}
                    onChange={(e) => setConsumptionValue(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={consumptionUnit} onValueChange={setConsumptionUnit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONSUMPTION_UNITS.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Notes — collapsible */}
          <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
            <CollapsibleTrigger asChild>
              <button type="button" className="flex items-center gap-2 text-sm text-primary hover:underline">
                <ChevronDown className={cn('h-4 w-4 transition-transform', notesOpen && 'rotate-180')} />
                Add notes
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <Textarea
                placeholder="Any notes about this bill..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </CollapsibleContent>
          </Collapsible>

          <Button
            className="w-full"
            onClick={handleSave}
            disabled={!utilityType || !amount || !periodStart || isPending}
          >
            {isPending ? 'Saving…' : isEditing ? 'Update Bill' : 'Save Bill'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
