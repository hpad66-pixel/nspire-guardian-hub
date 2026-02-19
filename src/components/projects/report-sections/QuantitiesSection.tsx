import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Check, Plus, Trash2 } from 'lucide-react';
import { StepperInput } from '@/components/inspections/log-sections/shared/StepperInput';
import { QuickPickChips } from '@/components/inspections/log-sections/shared/QuickPickChips';
import { VoiceDictation } from '@/components/ui/voice-dictation';

export interface QuantityEntry {
  id: string;
  workItem: string;
  quantity: number;
  unit: string;
  location: string;
  notes: string;
}

const UNIT_CHIPS = [
  { value: 'LF', label: 'LF' },
  { value: 'SF', label: 'SF' },
  { value: 'CY', label: 'CY' },
  { value: 'EA', label: 'EA' },
  { value: 'LBS', label: 'LBS' },
  { value: 'TON', label: 'TON' },
  { value: 'GAL', label: 'GAL' },
  { value: 'HR', label: 'HR' },
  { value: 'LS', label: 'LS' },
];

interface QuantitiesSectionProps {
  open: boolean;
  onClose: () => void;
  data: QuantityEntry[];
  onChange: (data: QuantityEntry[]) => void;
}

function emptyEntry(): QuantityEntry {
  return { id: crypto.randomUUID(), workItem: '', quantity: 0, unit: 'LF', location: '', notes: '' };
}

export function QuantitiesSection({ open, onClose, data, onChange }: QuantitiesSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<QuantityEntry>(emptyEntry());

  const saveEntry = () => {
    if (!draft.workItem) return;
    if (editingId === '__new__') onChange([...data, draft]);
    else onChange(data.map(e => e.id === editingId ? draft : e));
    setEditingId(null);
  };

  // Group totals by unit
  const unitTotals = data.reduce<Record<string, number>>((acc, e) => {
    acc[e.unit] = (acc[e.unit] || 0) + e.quantity;
    return acc;
  }, {});

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] p-0 flex flex-col rounded-t-2xl">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white rounded-t-2xl flex-shrink-0">
          <button type="button" onClick={onClose} className="p-1">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-semibold">📐 Quantities Installed</span>
          <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8" onClick={onClose}>
            <Check className="h-4 w-4 mr-1" /> Done
          </Button>
        </div>

        {Object.keys(unitTotals).length > 0 && (
          <div className="px-4 py-2 bg-green-50 border-b border-green-100 flex gap-3 flex-wrap flex-shrink-0">
            {Object.entries(unitTotals).map(([unit, total]) => (
              <span key={unit} className="text-sm font-semibold text-green-700">{total} {unit}</span>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {data.map(entry => (
            <div key={entry.id} className="p-3 rounded-xl border bg-card flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{entry.workItem}</p>
                <p className="text-sm text-muted-foreground">{entry.quantity} {entry.unit}{entry.location ? ` · ${entry.location}` : ''}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button type="button" variant="ghost" size="sm" onClick={() => { setDraft({ ...entry }); setEditingId(entry.id); }}>Edit</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => onChange(data.filter(e => e.id !== entry.id))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}

          {editingId ? (
            <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Work Item</label>
                <Input value={draft.workItem} onChange={e => setDraft(d => ({ ...d, workItem: e.target.value }))} placeholder='e.g., 8-inch PVC pipe, concrete, fittings' className="mt-1" />
              </div>
              <StepperInput label="Quantity" value={draft.quantity} onChange={v => setDraft(d => ({ ...d, quantity: v }))} min={0} max={99999} step={1} />
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Unit</label>
                <QuickPickChips options={UNIT_CHIPS} value={draft.unit} onChange={v => setDraft(d => ({ ...d, unit: v }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Location / Station</label>
                <Input value={draft.location} onChange={e => setDraft(d => ({ ...d, location: e.target.value }))} placeholder='e.g., Sta. 10+00 to 11+20' className="mt-1" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</label>
                  <VoiceDictation onTranscript={t => setDraft(d => ({ ...d, notes: d.notes ? `${d.notes} ${t}` : t }))} />
                </div>
                <Textarea value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} placeholder="Additional notes..." className="min-h-[60px]" />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditingId(null)}>Cancel</Button>
                <Button type="button" className="flex-1" onClick={saveEntry} disabled={!draft.workItem}>Save</Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" className="w-full gap-2" onClick={() => { setDraft(emptyEntry()); setEditingId('__new__'); }}>
              <Plus className="h-4 w-4" /> Add Quantity
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
