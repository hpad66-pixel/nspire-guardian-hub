import React, { useState } from 'react';
import { format } from 'date-fns';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionSheet } from './shared/SectionSheet';
import { StepperInput } from './shared/StepperInput';
import { QuickPickChips } from './shared/QuickPickChips';
import { PhotoCapture } from './shared/PhotoCapture';
import { useSectionDraft } from './shared/useSectionDraft';
import { useCRMContacts } from '@/hooks/useCRMContacts';

interface WasteEntry {
  id: string;
  time: string;
  material: string;
  disposed_by: string;
  method: string;
  location: string;
  quantity: number;
  unit: string;
  photos: string[];
}

interface WasteSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  onEntriesChange?: (count: number) => void;
}

const MATERIALS = [
  { label: 'Concrete', value: 'concrete', emoji: '🪨' },
  { label: 'Metal', value: 'metal', emoji: '⚙️' },
  { label: 'Wood', value: 'wood', emoji: '🪵' },
  { label: 'Hazardous', value: 'hazardous', emoji: '☢️', color: 'bg-red-100 text-red-700 border-red-200' },
  { label: 'Green Waste', value: 'green_waste', emoji: '🌿' },
  { label: 'Mixed', value: 'mixed', emoji: '🗑️' },
  { label: 'Other', value: 'other', emoji: '📦' },
];

const METHODS = [
  { label: 'Dumpster', value: 'dumpster' },
  { label: 'Hauled Away', value: 'hauled' },
  { label: 'Recycled', value: 'recycled' },
  { label: 'Incinerated', value: 'incinerated' },
  { label: 'Other', value: 'other' },
];

const UNITS = [
  { label: 'tons', value: 'tons' },
  { label: 'lbs', value: 'lbs' },
  { label: 'cubic yd', value: 'cy' },
  { label: 'loads', value: 'loads' },
];

const EMPTY_FORM = (): Omit<WasteEntry, 'id'> => ({
  time: format(new Date(), 'HH:mm'),
  material: '',
  disposed_by: '',
  method: '',
  location: '',
  quantity: 1,
  unit: 'tons',
  photos: [],
});

export function WasteSection({ open, onOpenChange, propertyId, onEntriesChange }: WasteSectionProps) {
  const { state, setState } = useSectionDraft<WasteEntry[]>('waste', propertyId, []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM());
  const [contactSearch, setContactSearch] = useState('');

  const { data: contacts = [] } = useCRMContacts({ search: contactSearch });
  const isHazardous = form.material === 'hazardous';

  const handleAdd = () => {
    if (!form.material) return;
    const entry: WasteEntry = { ...form, id: crypto.randomUUID() };
    const next = [...state, entry];
    setState(next);
    onEntriesChange?.(next.length);
    setForm(EMPTY_FORM());
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    const next = state.filter(e => e.id !== id);
    setState(next);
    onEntriesChange?.(next.length);
  };

  return (
    <SectionSheet open={open} onOpenChange={onOpenChange} title="Waste Disposal" emoji="♻️"
      onAddEntry={() => { setForm(EMPTY_FORM()); setShowForm(true); }} addLabel="Log Disposal">
      <div className="p-4 space-y-3">

        {/* Entries */}
        {state.map((entry) => (
          <div key={entry.id}
            className={`bg-white rounded-xl border p-4 shadow-sm ${entry.material === 'hazardous' ? 'border-red-300' : 'border-slate-200'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    entry.material === 'hazardous'
                      ? 'bg-red-100 text-red-700 border border-red-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {MATERIALS.find(m => m.value === entry.material)?.emoji}{' '}
                    {MATERIALS.find(m => m.value === entry.material)?.label || entry.material}
                  </span>
                  <span className="text-xs text-slate-400">@ {entry.time}</span>
                </div>
                <p className="text-sm text-slate-700">
                  {entry.quantity} {entry.unit} · {METHODS.find(m => m.value === entry.method)?.label}
                </p>
                {entry.disposed_by && <p className="text-xs text-slate-400 mt-0.5">By: {entry.disposed_by}</p>}
                {entry.location && <p className="text-xs text-slate-400">📍 {entry.location}</p>}
              </div>
              <button onClick={() => handleDelete(entry.id)}
                className="p-2 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {/* Inline form */}
        {showForm && (
          <div className="bg-white rounded-xl border-2 border-slate-200 p-4 space-y-4 shadow-md">
            <p className="font-bold text-sm text-slate-800">Log Waste Disposal</p>

            {/* Hazardous warning */}
            {isHazardous && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-300 rounded-xl">
                <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-red-700">⚠️ Hazardous Material</p>
                  <p className="text-xs text-red-600">Documentation and photo are required by regulation.</p>
                </div>
              </div>
            )}

            {/* Material chips */}
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Material *</Label>
              <QuickPickChips options={MATERIALS} value={form.material}
                onChange={(v) => setForm(f => ({ ...f, material: v }))} />
            </div>

            {/* Time */}
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Time</Label>
              <Input type="time" value={form.time}
                onChange={(e) => setForm(f => ({ ...f, time: e.target.value }))} className="h-10 w-40" />
            </div>

            {/* Method */}
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Method</Label>
              <QuickPickChips options={METHODS} value={form.method}
                onChange={(v) => setForm(f => ({ ...f, method: v }))} />
            </div>

            {/* Quantity + unit */}
            <div className="flex items-end gap-4">
              <StepperInput label="Quantity" value={form.quantity} min={0} max={9999}
                onChange={(v) => setForm(f => ({ ...f, quantity: v }))} />
              <div className="flex-1">
                <Label className="text-xs text-slate-500 mb-1.5 block">Unit</Label>
                <QuickPickChips options={UNITS} value={form.unit}
                  onChange={(v) => setForm(f => ({ ...f, unit: v }))} />
              </div>
            </div>

            {/* Disposed by */}
            <div className="relative">
              <Label className="text-xs text-slate-500 mb-1 block">Disposed By</Label>
              <Input value={form.disposed_by}
                onChange={(e) => { setForm(f => ({ ...f, disposed_by: e.target.value })); setContactSearch(e.target.value); }}
                placeholder="Search contacts…" className="h-10" />
              {contacts.length > 0 && contactSearch && (
                <div className="mt-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg">
                  {contacts.slice(0, 4).map(c => (
                    <button key={c.id} type="button"
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
                      onClick={() => { setForm(f => ({ ...f, disposed_by: `${c.first_name} ${c.last_name || ''}`.trim() })); setContactSearch(''); }}>
                      {c.first_name} {c.last_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Location */}
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Location</Label>
              <Input value={form.location}
                onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="Where was it disposed?" className="h-10" />
            </div>

            {/* Photos (required for hazardous) */}
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">
                Photos {isHazardous ? '(Required*)' : '(Optional)'}
              </Label>
              <PhotoCapture photos={form.photos}
                onPhotosChange={(p) => setForm(f => ({ ...f, photos: p }))}
                folder="waste-disposal" required={isHazardous} compact />
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={handleAdd}
                disabled={!form.material || (isHazardous && form.photos.length === 0)}
                className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-50">
                Log Disposal
              </button>
            </div>
          </div>
        )}

        {state.length === 0 && !showForm && (
          <div className="py-8 text-center text-slate-400 text-sm">
            <p className="text-2xl mb-2">♻️</p>
            <p>No waste disposal logged today</p>
          </div>
        )}
      </div>
    </SectionSheet>
  );
}
