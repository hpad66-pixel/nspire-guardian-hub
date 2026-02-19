import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Check, Plus, Trash2 } from 'lucide-react';
import { StepperInput } from '@/components/inspections/log-sections/shared/StepperInput';
import { QuickPickChips } from '@/components/inspections/log-sections/shared/QuickPickChips';
import { VoiceDictation } from '@/components/ui/voice-dictation';

export interface EquipmentEntry {
  id: string;
  name: string;
  hoursOperating: number;
  hoursIdle: number;
  operator: string;
  notes: string;
}

const EQUIPMENT_CHIPS = [
  { value: 'Excavator', label: '🚜 Excavator' },
  { value: 'Backhoe', label: '🚜 Backhoe' },
  { value: 'Dump Truck', label: '🚚 Dump Truck' },
  { value: 'Crane', label: '🏗️ Crane' },
  { value: 'Compactor', label: '⚙️ Compactor' },
  { value: 'Generator', label: '⚡ Generator' },
  { value: 'Pump', label: '💧 Pump' },
  { value: 'Boring Machine', label: '🔩 Boring Machine' },
  { value: 'Vac Truck', label: '🚚 Vac Truck' },
  { value: 'Concrete Truck', label: '🚚 Concrete Truck' },
  { value: 'Other', label: 'Other' },
];

interface EquipmentSectionProps {
  open: boolean;
  onClose: () => void;
  data: EquipmentEntry[];
  onChange: (data: EquipmentEntry[]) => void;
}

function emptyEntry(): EquipmentEntry {
  return { id: crypto.randomUUID(), name: '', hoursOperating: 8, hoursIdle: 0, operator: '', notes: '' };
}

export function EquipmentSection({ open, onClose, data, onChange }: EquipmentSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EquipmentEntry>(emptyEntry());

  const saveEntry = () => {
    if (!draft.name) return;
    if (editingId === '__new__') onChange([...data, draft]);
    else onChange(data.map(e => e.id === editingId ? draft : e));
    setEditingId(null);
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] p-0 flex flex-col rounded-t-2xl">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white rounded-t-2xl flex-shrink-0">
          <button type="button" onClick={onClose} className="p-1">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-semibold">🔧 Equipment on Site</span>
          <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8" onClick={onClose}>
            <Check className="h-4 w-4 mr-1" /> Done
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {data.map(entry => (
            <div key={entry.id} className="p-3 rounded-xl border bg-card flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{entry.name}</p>
                <p className="text-sm text-muted-foreground">{entry.hoursOperating}h operating · {entry.hoursIdle}h idle{entry.operator ? ` · ${entry.operator}` : ''}</p>
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
              <p className="font-semibold text-sm">{editingId === '__new__' ? 'Add Equipment' : 'Edit Equipment'}</p>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Equipment Type</label>
                <QuickPickChips options={EQUIPMENT_CHIPS} value={draft.name} onChange={v => setDraft(d => ({ ...d, name: v }))} />
                <Input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Or type equipment name..." className="mt-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <StepperInput label="Hours Operating" value={draft.hoursOperating} onChange={v => setDraft(d => ({ ...d, hoursOperating: v }))} min={0} max={24} />
                <StepperInput label="Hours Idle" value={draft.hoursIdle} onChange={v => setDraft(d => ({ ...d, hoursIdle: v }))} min={0} max={24} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Operator</label>
                <Input value={draft.operator} onChange={e => setDraft(d => ({ ...d, operator: e.target.value }))} placeholder="Operator name" className="mt-1" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</label>
                  <VoiceDictation onTranscript={t => setDraft(d => ({ ...d, notes: d.notes ? `${d.notes} ${t}` : t }))} />
                </div>
                <Textarea value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} placeholder="Equipment condition, issues..." className="min-h-[60px]" />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditingId(null)}>Cancel</Button>
                <Button type="button" className="flex-1" onClick={saveEntry} disabled={!draft.name}>Save</Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" className="w-full gap-2" onClick={() => { setDraft(emptyEntry()); setEditingId('__new__'); }}>
              <Plus className="h-4 w-4" /> Add Equipment
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
