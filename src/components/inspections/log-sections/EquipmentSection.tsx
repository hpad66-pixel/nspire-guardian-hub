import React, { useState } from 'react';
import { Trash2, Wrench, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { SectionSheet } from './shared/SectionSheet';
import { StepperInput } from './shared/StepperInput';
import { PhotoCapture } from './shared/PhotoCapture';
import { useSectionDraft } from './shared/useSectionDraft';
import { useAssets } from '@/hooks/useAssets';

interface EquipmentEntry {
  id: string;
  name: string;
  hours_operating: number;
  hours_idle: number;
  cost_code: string;
  location: string;
  inspected: boolean;
  photos: string[];
}

interface EquipmentSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  onEntriesChange?: (count: number) => void;
}

const EMPTY_FORM = (): Omit<EquipmentEntry, 'id'> => ({
  name: '',
  hours_operating: 0,
  hours_idle: 0,
  cost_code: '',
  location: '',
  inspected: false,
  photos: [],
});

export function EquipmentSection({ open, onOpenChange, propertyId, onEntriesChange }: EquipmentSectionProps) {
  const { state, setState } = useSectionDraft<EquipmentEntry[]>('equipment', propertyId, []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM());
  const [assetSearch, setAssetSearch] = useState('');

  const { data: assets = [] } = useAssets(propertyId);
  const filteredAssets = assets
    .filter(a => a.name.toLowerCase().includes(assetSearch.toLowerCase()))
    .slice(0, 5);

  const totalHours = form.hours_operating + form.hours_idle;

  const handleAdd = () => {
    if (!form.name) return;
    const entry: EquipmentEntry = { ...form, id: crypto.randomUUID() };
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
    <SectionSheet open={open} onOpenChange={onOpenChange} title="Equipment Log" emoji="🚜"
      onAddEntry={() => { setForm(EMPTY_FORM()); setShowForm(true); }} addLabel="Add Equipment">
      <div className="p-4 space-y-3">

        {/* Existing entries */}
        {state.map((entry) => (
          <div key={entry.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-slate-800">{entry.name}</p>
                  {entry.inspected && (
                    <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full">
                      ✓ Inspected
                    </span>
                  )}
                </div>
                <div className="flex gap-3 mt-1.5">
                  <span className="text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{entry.hours_operating}h</span> operating
                  </span>
                  <span className="text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{entry.hours_idle}h</span> idle
                  </span>
                  <span className="text-xs font-bold text-blue-700">
                    {entry.hours_operating + entry.hours_idle}h total
                  </span>
                </div>
                {entry.cost_code && <p className="text-xs text-slate-400 mt-1">Code: {entry.cost_code}</p>}
                {entry.location && <p className="text-xs text-slate-400">📍 {entry.location}</p>}
              </div>
              <button onClick={() => handleDelete(entry.id)}
                className="p-2 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {entry.photos.length > 0 && (
              <div className="flex gap-2 mt-3 overflow-x-auto">
                {entry.photos.map((url, i) => (
                  <img key={i} src={url} alt="" className="h-16 w-16 rounded-lg object-cover flex-shrink-0 border border-slate-200" />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Inline form */}
        {showForm && (
          <div className="bg-white rounded-xl border-2 border-blue-200 p-4 space-y-4 shadow-md">
            <p className="font-bold text-sm text-slate-800">Add Equipment Entry</p>

            {/* Equipment name */}
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Equipment Name</Label>
              <Input
                value={form.name}
                onChange={(e) => { setForm(f => ({ ...f, name: e.target.value })); setAssetSearch(e.target.value); }}
                placeholder="Search assets or type name…"
                className="h-11"
              />
              {filteredAssets.length > 0 && assetSearch && (
                <div className="mt-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg">
                  {filteredAssets.map(a => (
                    <button key={a.id} type="button"
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
                      onClick={() => { setForm(f => ({ ...f, name: a.name })); setAssetSearch(''); }}>
                      {a.name}
                      <span className="text-slate-400 ml-2 text-xs">· {a.asset_type}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Hours steppers */}
            <div className="grid grid-cols-2 gap-4">
              <StepperInput label="Hours Operating" value={form.hours_operating}
                onChange={(v) => setForm(f => ({ ...f, hours_operating: v }))} min={0} max={24} />
              <StepperInput label="Hours Idle" value={form.hours_idle}
                onChange={(v) => setForm(f => ({ ...f, hours_idle: v }))} min={0} max={24} />
            </div>

            {/* Total */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
              <p className="text-xs text-blue-500">Total Hours on Site</p>
              <p className="text-3xl font-bold text-blue-700">{totalHours}</p>
            </div>

            {/* Cost code + location */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Cost Code</Label>
                <Input value={form.cost_code}
                  onChange={(e) => setForm(f => ({ ...f, cost_code: e.target.value }))}
                  placeholder="e.g. EQ-001" className="h-10 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Location</Label>
                <Input value={form.location}
                  onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Zone / area" className="h-10 text-sm" />
              </div>
            </div>

            {/* Inspected checkbox */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <Checkbox
                id="eq-inspected"
                checked={form.inspected}
                onCheckedChange={(v) => setForm(f => ({ ...f, inspected: !!v }))}
                className="w-6 h-6"
              />
              <Label htmlFor="eq-inspected" className="text-sm font-semibold text-slate-700 cursor-pointer">
                ✅ Inspected Today
              </Label>
            </div>

            {/* Photos (shown when inspected) */}
            {form.inspected && (
              <div>
                <Label className="text-xs text-slate-500 mb-2 block">Inspection Photos</Label>
                <PhotoCapture photos={form.photos}
                  onPhotosChange={(p) => setForm(f => ({ ...f, photos: p }))}
                  folder="equipment-inspections" maxPhotos={5} />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={handleAdd} disabled={!form.name}
                className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-50">
                Add Entry
              </button>
            </div>
          </div>
        )}

        {state.length === 0 && !showForm && (
          <button onClick={() => { setForm(EMPTY_FORM()); setShowForm(true); }}
            className="w-full py-8 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 text-sm hover:border-slate-300">
            + Add first equipment entry
          </button>
        )}
      </div>
    </SectionSheet>
  );
}
