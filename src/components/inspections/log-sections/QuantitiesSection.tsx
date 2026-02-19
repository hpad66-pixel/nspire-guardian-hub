import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionSheet } from './shared/SectionSheet';
import { StepperInput } from './shared/StepperInput';
import { QuickPickChips } from './shared/QuickPickChips';
import { useSectionDraft } from './shared/useSectionDraft';

interface QuantityEntry {
  id: string;
  cost_code: string;
  quantity: number;
  unit: string;
  location: string;
}

interface QuantitiesSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  onEntriesChange?: (count: number) => void;
}

const UNITS = [
  { label: 'cubic yd', value: 'cy' },
  { label: 'sq ft', value: 'sf' },
  { label: 'linear ft', value: 'lf' },
  { label: 'lbs', value: 'lbs' },
  { label: 'tons', value: 'tons' },
  { label: 'each', value: 'ea' },
  { label: 'other', value: 'other' },
];

const EMPTY_FORM = (): Omit<QuantityEntry, 'id'> => ({
  cost_code: '',
  quantity: 1,
  unit: 'cy',
  location: '',
});

export function QuantitiesSection({ open, onOpenChange, propertyId, onEntriesChange }: QuantitiesSectionProps) {
  const { state, setState } = useSectionDraft<QuantityEntry[]>('quantities', propertyId, []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM());

  // Aggregate totals by unit
  const totals = state.reduce<Record<string, number>>((acc, e) => {
    acc[e.unit] = (acc[e.unit] || 0) + e.quantity;
    return acc;
  }, {});

  const handleAdd = () => {
    const entry: QuantityEntry = { ...form, id: crypto.randomUUID() };
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
    <SectionSheet open={open} onOpenChange={onOpenChange} title="Quantities" emoji="📊"
      onAddEntry={() => { setForm(EMPTY_FORM()); setShowForm(true); }} addLabel="Add Quantity">
      <div className="p-4 space-y-3">

        {/* Summary totals */}
        {Object.keys(totals).length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
            <p className="text-xs font-semibold text-blue-600 mb-2">Running Totals</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(totals).map(([unit, total]) => (
                <div key={unit} className="text-center">
                  <p className="text-2xl font-bold text-blue-700">{total}</p>
                  <p className="text-xs text-blue-500">{unit}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Entries */}
        {state.map((entry) => (
          <div key={entry.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800">
                <span className="text-xl font-bold text-blue-700">{entry.quantity}</span>
                <span className="text-slate-500 ml-1 text-sm">{entry.unit}</span>
              </p>
              {entry.cost_code && <p className="text-xs text-slate-400">Code: {entry.cost_code}</p>}
              {entry.location && <p className="text-xs text-slate-400">📍 {entry.location}</p>}
            </div>
            <button onClick={() => handleDelete(entry.id)}
              className="p-2 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {/* Inline form */}
        {showForm && (
          <div className="bg-white rounded-xl border-2 border-blue-200 p-4 space-y-4 shadow-md">
            <p className="font-bold text-sm text-slate-800">Add Quantity</p>

            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Unit</Label>
              <QuickPickChips options={UNITS} value={form.unit}
                onChange={(v) => setForm(f => ({ ...f, unit: v }))} />
            </div>

            <div className="flex justify-center py-2">
              <StepperInput label="Quantity" value={form.quantity} size="lg"
                onChange={(v) => setForm(f => ({ ...f, quantity: v }))} min={0} max={99999} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Cost Code</Label>
                <Input value={form.cost_code}
                  onChange={(e) => setForm(f => ({ ...f, cost_code: e.target.value }))}
                  placeholder="e.g. 03-300" className="h-10 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Location</Label>
                <Input value={form.location}
                  onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Area / zone" className="h-10 text-sm" />
              </div>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={handleAdd}
                className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold">
                Add Quantity
              </button>
            </div>
          </div>
        )}

        {state.length === 0 && !showForm && (
          <div className="py-8 text-center text-slate-400 text-sm">
            <p className="text-2xl mb-2">📊</p>
            <p>No quantities logged yet</p>
          </div>
        )}
      </div>
    </SectionSheet>
  );
}
