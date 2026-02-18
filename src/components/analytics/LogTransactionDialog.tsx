import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ChevronDown, Package, TrendingDown, TrendingUp, RotateCcw, CheckCircle } from 'lucide-react';
import { useLogInventoryTransaction, type InventoryItem } from '@/hooks/useInventory';
import { useProjects } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';

type TxType = 'used' | 'received' | 'adjustment' | 'returned' | 'disposed';

interface LogTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem;
  defaultType?: 'used' | 'received';
}

const TX_TYPES: { key: TxType; label: string; icon: React.ElementType; description: string }[] = [
  { key: 'used',       label: 'Used / Consumed',    icon: TrendingDown, description: 'Items taken for maintenance' },
  { key: 'received',   label: 'Received New Stock',  icon: TrendingUp,   description: 'New inventory arrived' },
  { key: 'adjustment', label: 'Adjust Count',         icon: RotateCcw,    description: 'Correct to actual count' },
];

export function LogTransactionDialog({ open, onOpenChange, item, defaultType = 'used' }: LogTransactionDialogProps) {
  const [txType,      setTxType]      = useState<TxType>(defaultType);
  const [quantity,    setQuantity]    = useState('');
  const [notes,       setNotes]       = useState('');
  const [reference,   setReference]   = useState('');
  const [projectId,   setProjectId]   = useState('');
  const [extraOpen,   setExtraOpen]   = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [newStock,    setNewStock]    = useState<number | null>(null);

  const logTx    = useLogInventoryTransaction();
  const { data: projects } = useProjects();

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setTxType(defaultType);
      setQuantity('');
      setNotes('');
      setReference('');
      setProjectId('');
      setShowSuccess(false);
      setNewStock(null);
    }
  }, [open, defaultType]);

  const qty = parseFloat(quantity) || 0;

  // For adjustment: show delta
  const adjustedDelta = txType === 'adjustment'
    ? qty - item.current_quantity
    : 0;

  // Final quantity sign based on type
  const signedQty = txType === 'used' || txType === 'disposed'
    ? -Math.abs(qty)
    : txType === 'adjustment'
    ? adjustedDelta
    : Math.abs(qty);

  const projectedStock = item.current_quantity + signedQty;

  const handleLog = async () => {
    if (!quantity || qty <= 0) return;

    const result = await logTx.mutateAsync({
      itemId:           item.id,
      propertyId:       item.property_id,
      transactionType:  txType,
      quantity:         signedQty,
      linkedProjectId:  projectId || undefined,
      referenceNumber:  reference || undefined,
      notes:            notes || undefined,
    });

    setNewStock(projectedStock);
    setShowSuccess(true);
    setTimeout(() => onOpenChange(false), 2000);
  };

  const labelByType = {
    used:       'How many were used?',
    received:   'How many received?',
    adjustment: 'New actual count',
    returned:   'Quantity returned',
    disposed:   'Quantity disposed',
  };

  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Stock Updated</h3>
              <p className="text-muted-foreground text-sm mt-1">{item.name}</p>
            </div>
            <div className="rounded-xl bg-muted px-6 py-3 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">New Stock Level</p>
              <p className={cn(
                'text-3xl font-bold',
                (newStock ?? 0) <= item.minimum_quantity ? 'text-amber-600' : 'text-emerald-600'
              )}>
                {newStock} <span className="text-base font-normal text-muted-foreground">{item.unit_of_measure}</span>
              </p>
              {(newStock ?? 0) <= item.minimum_quantity && (
                <p className="text-xs text-amber-600 mt-1">⚠ Low stock alert</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Stock Movement</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Item summary */}
          <div className="rounded-xl bg-muted/50 border border-border p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold leading-tight">{item.name}</p>
              <p className="text-sm text-muted-foreground">
                Current stock:{' '}
                <span className={cn(
                  'font-semibold',
                  item.current_quantity <= item.minimum_quantity ? 'text-amber-600' : 'text-foreground'
                )}>
                  {item.current_quantity} {item.unit_of_measure}
                </span>
              </p>
            </div>
          </div>

          {/* Transaction type */}
          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {TX_TYPES.map((t) => {
                const Icon = t.icon;
                const selected = txType === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTxType(t.key)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-center transition-all',
                      selected
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-muted/30 hover:bg-muted/60'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', selected ? 'text-primary' : 'text-muted-foreground')} />
                    <span className={cn('text-xs font-medium leading-tight', selected ? 'text-primary' : 'text-muted-foreground')}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="qty">{labelByType[txType]}</Label>
            <Input
              id="qty"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              className="text-xl font-bold h-12"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              autoFocus
            />
            {txType === 'adjustment' && qty > 0 && (
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                Was: <strong>{item.current_quantity}</strong> · Now: <strong>{qty}</strong> ·{' '}
                <span className={adjustedDelta < 0 ? 'text-destructive' : 'text-emerald-600'}>
                  Difference: {adjustedDelta > 0 ? '+' : ''}{adjustedDelta}
                </span>
              </p>
            )}
            {qty > 0 && txType !== 'adjustment' && (
              <p className="text-xs text-muted-foreground">
                Stock after:{' '}
                <span className={cn(
                  'font-semibold',
                  projectedStock <= item.minimum_quantity ? 'text-amber-600' : 'text-foreground'
                )}>
                  {projectedStock} {item.unit_of_measure}
                </span>
                {projectedStock <= item.minimum_quantity && ' ⚠ low stock'}
              </p>
            )}
          </div>

          {/* Optional fields */}
          <Collapsible open={extraOpen} onOpenChange={setExtraOpen}>
            <CollapsibleTrigger asChild>
              <button type="button" className="flex items-center gap-2 text-sm text-primary hover:underline">
                <ChevronDown className={cn('h-4 w-4 transition-transform', extraOpen && 'rotate-180')} />
                Optional details
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3">
              {projects && projects.length > 0 && (
                <div className="space-y-2">
                  <Label>Link to Project (optional)</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {projects.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="ref">Reference # (optional)</Label>
                <Input
                  id="ref"
                  placeholder="PO number, delivery receipt..."
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tx-notes">Notes (optional)</Label>
                <Textarea
                  id="tx-notes"
                  rows={2}
                  placeholder="Any additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Button
            className="w-full h-11 text-base font-semibold"
            onClick={handleLog}
            disabled={!quantity || qty <= 0 || logTx.isPending}
          >
            {logTx.isPending ? 'Logging…' : 'Log It'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
