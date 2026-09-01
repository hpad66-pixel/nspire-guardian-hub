/**
 * Work-order parts panel — assign from Glorieta stores, capture before/after
 * Field Camera photos, mark Installed (inventory adjusts), block close without photos.
 */
import { useMemo, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Loader2,
  Package,
  PackagePlus,
  ShieldCheck,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FieldCameraDialog } from '@/components/camera/FieldCameraDialog';
import { cn } from '@/lib/utils';
import { useStoresItems } from '@/hooks/useProjectStores';
import { useUnitsByProperty } from '@/hooks/useUnits';
import {
  useAssignWorkOrderPart,
  useCancelWorkOrderPart,
  useInstallWorkOrderPart,
  useUpdateWorkOrderPartPhoto,
  useWorkOrderParts,
  type WorkOrderPartRow,
} from '@/hooks/useWorkOrderParts';
import {
  canMarkPartInstalled,
  hasAfterPhoto,
  hasBeforePhoto,
  partsCompletionBlocker,
} from '@/lib/workorders/workOrderParts';
import type { WorkOrder } from '@/hooks/useWorkOrders';

interface WorkOrderPartsPanelProps {
  workOrder: WorkOrder;
  /** Crew tech display name for issued_to */
  crewName?: string | null;
  readOnly?: boolean;
}

export function WorkOrderPartsPanel({
  workOrder,
  crewName,
  readOnly = false,
}: WorkOrderPartsPanelProps) {
  const { data: parts = [], isLoading } = useWorkOrderParts(workOrder.id);
  const { data: items = [] } = useStoresItems(workOrder.property_id);
  const { data: units = [] } = useUnitsByProperty(workOrder.property_id);
  const assign = useAssignWorkOrderPart();
  const updatePhoto = useUpdateWorkOrderPartPhoto();
  const install = useInstallWorkOrderPart();
  const cancel = useCancelWorkOrderPart();

  const [assignOpen, setAssignOpen] = useState(false);
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState('1');
  const [unitId, setUnitId] = useState(workOrder.unit_id || '');
  const [reason, setReason] = useState(workOrder.title || '');

  const [cameraPart, setCameraPart] = useState<WorkOrderPartRow | null>(null);
  const [cameraKind, setCameraKind] = useState<'before' | 'after'>('before');

  const blocker = useMemo(() => partsCompletionBlocker(parts), [parts]);
  const stockItems = items.filter((i) => Number(i.current_quantity) > 0);
  const selectedItem = items.find((i) => i.id === itemId);

  const unitLabel =
    units.find((u) => u.id === unitId)?.unit_number
    || workOrder.unit?.unit_number
    || '';

  const openCamera = (part: WorkOrderPartRow, kind: 'before' | 'after') => {
    setCameraPart(part);
    setCameraKind(kind);
  };

  return (
    <div className="space-y-3" data-testid="work-order-parts-panel">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Label className="text-muted-foreground text-xs uppercase tracking-wider">
            Parts & stores
          </Label>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Assign from Glorieta stores · before (removed) + after (installed) photos required
          </p>
        </div>
        {!readOnly && (
          <Button
            size="sm"
            className="bg-[var(--apas-sapphire,#1D6FE8)] hover:bg-[var(--apas-sapphire,#1D6FE8)]/90"
            onClick={() => setAssignOpen(true)}
            disabled={['verified', 'closed', 'rejected'].includes(workOrder.status)}
          >
            <PackagePlus className="mr-1.5 h-4 w-4" />
            Assign part
          </Button>
        )}
      </div>

      {blocker && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-2.5 text-xs text-amber-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>{blocker}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : parts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#dedbd1] bg-[#FDFCF9] px-4 py-6 text-center">
          <Package className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm font-medium text-foreground">No parts assigned yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Supervisor / PM assigns stock to this WO. Crew captures before & after photos, then marks Installed — inventory drops automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {parts.map((part) => {
            const name = part.inventory_item?.name || 'Part';
            const catalog = part.catalog_photo_url || part.inventory_item?.photo_url;
            const ready = canMarkPartInstalled(part);
            const installed = part.status === 'installed';
            return (
              <div
                key={part.id}
                className={cn(
                  'rounded-2xl border bg-white p-3 shadow-sm',
                  installed ? 'border-emerald-200' : 'border-[#dedbd1]',
                )}
                data-testid={`wo-part-${part.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-sm text-[#1A1714] truncate">{name}</p>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] uppercase',
                          installed
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                            : 'border-amber-300 bg-amber-50 text-amber-900',
                        )}
                      >
                        {installed ? 'Installed' : 'Assigned'}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Qty {Number(part.quantity)}
                      {part.unit_label ? ` · Unit ${part.unit_label}` : ''}
                      {part.issued_to_name ? ` · ${part.issued_to_name}` : ''}
                    </p>
                  </div>
                  {!readOnly && !installed && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={() =>
                        cancel.mutate({ partId: part.id, workOrderId: workOrder.id })
                      }
                      aria-label="Cancel part"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <PhotoTile
                    label="Catalog"
                    url={catalog}
                    empty="No catalog photo"
                    muted
                  />
                  <PhotoTile
                    label="Before · removed"
                    url={part.before_photo_url}
                    empty="Required"
                    onCapture={
                      !readOnly && !installed
                        ? () => openCamera(part, 'before')
                        : undefined
                    }
                    ok={hasBeforePhoto(part)}
                  />
                  <PhotoTile
                    label="After · installed"
                    url={part.after_photo_url}
                    empty="Required"
                    onCapture={
                      !readOnly && !installed
                        ? () => openCamera(part, 'after')
                        : undefined
                    }
                    ok={hasAfterPhoto(part)}
                  />
                </div>

                {!installed && !readOnly && (
                  <Button
                    className="mt-3 w-full bg-[#0D3B30] hover:bg-[#0D3B30]/90"
                    disabled={!ready || install.isPending}
                    onClick={() =>
                      install.mutate({
                        partId: part.id,
                        workOrderId: workOrder.id,
                        propertyId: workOrder.property_id,
                      })
                    }
                  >
                    {install.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="mr-2 h-4 w-4" />
                    )}
                    Mark Installed · adjust stores
                  </Button>
                )}
                {installed && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Installed
                    {part.installed_at
                      ? ` · ${new Date(part.installed_at).toLocaleString()}`
                      : ''}
                    {' · '}inventory deducted
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign part from stores</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Stock is reserved on this work order. Inventory only drops when the crew marks the part <strong>Installed</strong> with before &amp; after photos.
            </p>
            {stockItems.length === 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
                No stock on hand. Receive inventory in Stores first.
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Part *</Label>
              <Select value={itemId} onValueChange={setItemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stock item" />
                </SelectTrigger>
                <SelectContent>
                  {stockItems.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name} ({Number(i.current_quantity)} on hand)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Select value={unitId} onValueChange={setUnitId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.unit_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Qty *</Label>
                <Input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason / repair</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!itemId || assign.isPending}
              onClick={() => {
                assign.mutate(
                  {
                    workOrderId: workOrder.id,
                    propertyId: workOrder.property_id,
                    inventoryItemId: itemId,
                    quantity: Math.max(1, Number(qty) || 1),
                    unitId: unitId || workOrder.unit_id || null,
                    unitLabel,
                    issuedToName: crewName || null,
                    reason: reason || workOrder.title,
                    catalogPhotoUrl: selectedItem?.photo_url || null,
                  },
                  {
                    onSuccess: () => {
                      setAssignOpen(false);
                      setItemId('');
                      setQty('1');
                    },
                  },
                );
              }}
            >
              {assign.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Assign to work order'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FieldCameraDialog
        open={!!cameraPart}
        onOpenChange={(open) => {
          if (!open) setCameraPart(null);
        }}
        folder={`work-orders/${workOrder.id}/parts`}
        title={
          cameraKind === 'before'
            ? 'Before · removed / failed part'
            : 'After · installed part'
        }
        showNotation
        attachLabel={
          cameraKind === 'before' ? 'Save BEFORE photo' : 'Save AFTER photo'
        }
        context={{
          workOrderLabel:
            cameraKind === 'before'
              ? `${cameraPart?.inventory_item?.name || 'Part'} · REMOVED`
              : `${cameraPart?.inventory_item?.name || 'Part'} · INSTALLED`,
          unitLabel: cameraPart?.unit_label
            ? `Unit ${cameraPart.unit_label}`
            : workOrder.unit?.unit_number
              ? `Unit ${workOrder.unit.unit_number}`
              : null,
          propertyLabel: workOrder.property?.name ?? null,
          projectLabel: workOrder.title,
        }}
        onCaptured={async ({ url }) => {
          if (!cameraPart) return;
          await updatePhoto.mutateAsync({
            partId: cameraPart.id,
            workOrderId: workOrder.id,
            kind: cameraKind,
            url,
          });
          setCameraPart(null);
        }}
      />
    </div>
  );
}

function PhotoTile({
  label,
  url,
  empty,
  onCapture,
  ok,
  muted,
}: {
  label: string;
  url?: string | null;
  empty: string;
  onCapture?: () => void;
  ok?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border',
        ok ? 'border-emerald-300' : 'border-[#e8e4da]',
        muted && 'opacity-90',
      )}
    >
      <div className="absolute left-1.5 top-1.5 z-10 rounded-md bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
        {label}
      </div>
      {url ? (
        <img src={url} alt={label} className="aspect-square w-full object-cover" />
      ) : (
        <button
          type="button"
          disabled={!onCapture}
          onClick={onCapture}
          className={cn(
            'flex aspect-square w-full flex-col items-center justify-center gap-1 bg-[#F7F4EC] px-1 text-center text-[10px] text-muted-foreground',
            onCapture && 'hover:bg-[#efe9dc] cursor-pointer',
            !onCapture && 'cursor-default',
          )}
        >
          {onCapture ? <Camera className="h-4 w-4 text-[var(--apas-sapphire,#1D6FE8)]" /> : null}
          <span>{empty}</span>
        </button>
      )}
      {url && onCapture && (
        <button
          type="button"
          onClick={onCapture}
          className="absolute bottom-1 right-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white"
        >
          Retake
        </button>
      )}
    </div>
  );
}
