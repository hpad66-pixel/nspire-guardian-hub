import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Wind, Pipette, Zap, SprayCan, Leaf, ShieldCheck, Paintbrush, Wrench, Box,
} from 'lucide-react';
import { useAddInventoryItem, useUpdateInventoryItem, type InventoryItem } from '@/hooks/useInventory';
import { cn } from '@/lib/utils';

interface InventoryItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  item?: InventoryItem | null;
}

const CATEGORIES = [
  { key: 'hvac',      label: 'HVAC',       icon: Wind },
  { key: 'plumbing',  label: 'Plumbing',   icon: Pipette },
  { key: 'electrical',label: 'Electrical', icon: Zap },
  { key: 'cleaning',  label: 'Cleaning',   icon: SprayCan },
  { key: 'grounds',   label: 'Grounds',    icon: Leaf },
  { key: 'safety',    label: 'Safety',     icon: ShieldCheck },
  { key: 'paint',     label: 'Paint',      icon: Paintbrush },
  { key: 'hardware',  label: 'Hardware',   icon: Wrench },
  { key: 'general',   label: 'General',    icon: Box },
];

const UOM_OPTIONS = ['each', 'box', 'gallon', 'bag', 'roll', 'pair', 'set', 'lb', 'oz', 'ft'];

export function InventoryItemDialog({ open, onOpenChange, propertyId, item }: InventoryItemDialogProps) {
  const isEditing = !!item;

  const [name,            setName]            = useState(item?.name ?? '');
  const [category,        setCategory]        = useState(item?.category ?? 'general');
  const [unitOfMeasure,   setUnitOfMeasure]   = useState(item?.unit_of_measure ?? 'each');
  const [currentQty,      setCurrentQty]      = useState(item?.current_quantity?.toString() ?? '0');
  const [minimumQty,      setMinimumQty]      = useState(item?.minimum_quantity?.toString() ?? '0');
  const [unitCost,        setUnitCost]        = useState(item?.unit_cost?.toString() ?? '');
  const [storageLocation, setStorageLocation] = useState(item?.storage_location ?? '');
  const [preferredVendor, setPreferredVendor] = useState(item?.preferred_vendor ?? '');
  const [description,     setDescription]     = useState(item?.description ?? '');
  const [sku,             setSku]             = useState(item?.sku ?? '');

  const addItem    = useAddInventoryItem();
  const updateItem = useUpdateInventoryItem();

  const handleSave = async () => {
    if (!name || !category) return;
    const payload = {
      propertyId,
      name,
      category,
      unitOfMeasure,
      currentQuantity:  parseFloat(currentQty)  || 0,
      minimumQuantity:  parseFloat(minimumQty)  || 0,
      unitCost:         unitCost ? parseFloat(unitCost) : undefined,
      storageLocation:  storageLocation || undefined,
      preferredVendor:  preferredVendor || undefined,
      description:      description || undefined,
      sku:              sku || undefined,
    };

    if (isEditing) {
      await updateItem.mutateAsync({ id: item!.id, ...payload });
    } else {
      await addItem.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isPending = addItem.isPending || updateItem.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Inventory Item' : 'Add Inventory Item'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Item name */}
          <div className="space-y-2">
            <Label htmlFor="item-name">Item Name <span className="text-destructive">*</span></Label>
            <Input
              id="item-name"
              placeholder='e.g. "HVAC Filter 20x25x1", "Interior Paint - Eggshell White"'
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                const selected = category === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCategory(c.key)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg border-2 p-2.5 text-xs font-medium transition-all',
                      selected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-muted/30 hover:bg-muted/60 text-muted-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* UOM + SKU */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Unit of Measure</Label>
              <Select value={unitOfMeasure} onValueChange={setUnitOfMeasure}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UOM_OPTIONS.map((u) => (
                    <SelectItem key={u} value={u} className="capitalize">{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU / Item Code (optional)</Label>
              <Input
                id="sku"
                placeholder="SKU-001"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>
          </div>

          {/* Stock levels */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="current-qty">Current Quantity</Label>
              <Input
                id="current-qty"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={currentQty}
                onChange={(e) => setCurrentQty(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">How many on hand right now?</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="min-qty">Minimum Quantity</Label>
              <Input
                id="min-qty"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={minimumQty}
                onChange={(e) => setMinimumQty(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Alert when stock falls below</p>
            </div>
          </div>

          {/* Cost + vendor */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="unit-cost">Unit Cost (optional)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="unit-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-7"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor">Preferred Vendor (optional)</Label>
              <Input
                id="vendor"
                placeholder="e.g. Home Depot"
                value={preferredVendor}
                onChange={(e) => setPreferredVendor(e.target.value)}
              />
            </div>
          </div>

          {/* Storage location */}
          <div className="space-y-2">
            <Label htmlFor="location">Storage Location (optional)</Label>
            <Input
              id="location"
              placeholder="e.g. Maintenance closet B2, Tool shed"
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Additional notes about this item..."
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSave}
            disabled={!name || isPending}
          >
            {isPending ? 'Saving…' : isEditing ? 'Update Item' : 'Save Item'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
