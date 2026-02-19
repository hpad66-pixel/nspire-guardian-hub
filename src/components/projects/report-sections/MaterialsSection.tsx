import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Check, Plus, Trash2, Camera, Upload } from 'lucide-react';
import { StepperInput } from '@/components/inspections/log-sections/shared/StepperInput';
import { QuickPickChips } from '@/components/inspections/log-sections/shared/QuickPickChips';
import { VoiceDictation } from '@/components/ui/voice-dictation';
import { EnhancedPhotoUpload } from '@/components/ui/enhanced-photo-upload';

export interface MaterialDelivery {
  id: string;
  description: string;
  vendor: string;
  trackingNumber: string;
  quantity: number;
  unit: string;
  status: 'accepted' | 'partial' | 'rejected';
  notes: string;
  photoUrls: string[];
  time: string;
}

const STATUS_CHIPS = [
  { value: 'accepted', label: '✅ Accepted', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'partial', label: '⚠️ Partial', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'rejected', label: '❌ Rejected', color: 'bg-red-100 text-red-700 border-red-200' },
];

const UNIT_CHIPS = [
  { value: 'LF', label: 'LF' },
  { value: 'EA', label: 'EA' },
  { value: 'CY', label: 'CY' },
  { value: 'TON', label: 'TON' },
  { value: 'GAL', label: 'GAL' },
  { value: 'LBS', label: 'LBS' },
];

interface MaterialsSectionProps {
  open: boolean;
  onClose: () => void;
  data: MaterialDelivery[];
  onChange: (data: MaterialDelivery[]) => void;
  projectId: string;
}

function emptyEntry(): MaterialDelivery {
  return {
    id: crypto.randomUUID(), description: '', vendor: '', trackingNumber: '',
    quantity: 0, unit: 'EA', status: 'accepted', notes: '', photoUrls: [],
    time: new Date().toTimeString().slice(0, 5),
  };
}

export function MaterialsSection({ open, onClose, data, onChange, projectId }: MaterialsSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MaterialDelivery>(emptyEntry());
  const [photos, setPhotos] = useState<{ id: string; url: string; caption?: string; timestamp: Date }[]>([]);

  const saveEntry = () => {
    if (!draft.description) return;
    const withPhotos = { ...draft, photoUrls: photos.map(p => p.url) };
    if (editingId === '__new__') onChange([...data, withPhotos]);
    else onChange(data.map(e => e.id === editingId ? withPhotos : e));
    setEditingId(null);
    setPhotos([]);
  };

  const startAdd = () => {
    const e = emptyEntry();
    setDraft(e);
    setEditingId('__new__');
    setPhotos([]);
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] p-0 flex flex-col rounded-t-2xl">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white rounded-t-2xl flex-shrink-0">
          <button type="button" onClick={onClose} className="p-1">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-semibold">🚚 Materials & Deliveries</span>
          <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8" onClick={onClose}>
            <Check className="h-4 w-4 mr-1" /> Done
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {data.map(entry => (
            <div key={entry.id} className="p-3 rounded-xl border bg-card flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{entry.description}</p>
                <p className="text-sm text-muted-foreground">{entry.vendor} · {entry.quantity} {entry.unit} · {entry.status}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button type="button" variant="ghost" size="sm" onClick={() => { setDraft({ ...entry }); setPhotos(entry.photoUrls.map(url => ({ id: url, url, timestamp: new Date() }))); setEditingId(entry.id); }}>Edit</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => onChange(data.filter(e => e.id !== entry.id))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}

          {editingId ? (
            <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-4">
              <p className="font-semibold text-sm">Delivery Details</p>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">📷 Delivery Photos</p>
                <EnhancedPhotoUpload photos={photos} onPhotosChange={setPhotos} folderPath={`${projectId}/materials/`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Time</label>
                  <Input type="time" value={draft.time} onChange={e => setDraft(d => ({ ...d, time: e.target.value }))} className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Material Description</label>
                <Input value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} placeholder='e.g., 8" PVC Pipe, 20ft lengths' className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vendor</label>
                  <Input value={draft.vendor} onChange={e => setDraft(d => ({ ...d, vendor: e.target.value }))} placeholder="Supplier name" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">PO / Tracking #</label>
                  <Input value={draft.trackingNumber} onChange={e => setDraft(d => ({ ...d, trackingNumber: e.target.value }))} placeholder="PO-1234" className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <StepperInput label="Quantity" value={draft.quantity} onChange={v => setDraft(d => ({ ...d, quantity: v }))} min={0} max={99999} />
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Unit</label>
                  <QuickPickChips options={UNIT_CHIPS} value={draft.unit} onChange={v => setDraft(d => ({ ...d, unit: v }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Status</label>
                <QuickPickChips options={STATUS_CHIPS} value={draft.status} onChange={v => setDraft(d => ({ ...d, status: v as any }))} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</label>
                  <VoiceDictation onTranscript={t => setDraft(d => ({ ...d, notes: d.notes ? `${d.notes} ${t}` : t }))} />
                </div>
                <Textarea value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} className="min-h-[60px]" />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => { setEditingId(null); setPhotos([]); }}>Cancel</Button>
                <Button type="button" className="flex-1" onClick={saveEntry} disabled={!draft.description}>Save</Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" className="w-full gap-2" onClick={startAdd}>
              <Plus className="h-4 w-4" /> Add Delivery
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
