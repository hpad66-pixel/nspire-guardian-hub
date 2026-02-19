import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { SectionSheet } from './shared/SectionSheet';
import { StepperInput } from './shared/StepperInput';
import { useSectionDraft } from './shared/useSectionDraft';
import { useCRMContacts } from '@/hooks/useCRMContacts';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DumpsterEntry {
  id: string;
  company: string;
  delivered: number;
  removed: number;
}

interface DumpsterSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  onEntriesChange?: (count: number) => void;
}

const EMPTY_FORM = (): Omit<DumpsterEntry, 'id'> => ({
  company: '',
  delivered: 0,
  removed: 0,
});

export function DumpsterSection({ open, onOpenChange, propertyId, onEntriesChange }: DumpsterSectionProps) {
  const { state, setState } = useSectionDraft<DumpsterEntry[]>('dumpster', propertyId, []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM());
  const [companySearch, setCompanySearch] = useState('');

  const { data: contacts = [] } = useCRMContacts({ search: companySearch });

  const totalDelivered = state.reduce((s, e) => s + e.delivered, 0);
  const totalRemoved = state.reduce((s, e) => s + e.removed, 0);
  const netOnSite = totalDelivered - totalRemoved;

  const handleAdd = () => {
    if (form.delivered === 0 && form.removed === 0) return;
    const entry: DumpsterEntry = { ...form, id: crypto.randomUUID() };
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
    <SectionSheet open={open} onOpenChange={onOpenChange} title="Dumpster Log" emoji="🗑️"
      onAddEntry={() => { setForm(EMPTY_FORM()); setShowForm(true); }} addLabel="Add Entry">
      <div className="p-4 space-y-3">

        {/* Net summary */}
        {state.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-4 text-center">
            <p className="text-slate-400 text-xs font-medium mb-1">Net Containers on Site</p>
            <p className={`text-4xl font-black ${netOnSite > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
              {netOnSite}
            </p>
            <div className="flex justify-center gap-6 mt-2">
              <span className="text-xs text-slate-400">↓ {totalDelivered} delivered</span>
              <span className="text-xs text-slate-400">↑ {totalRemoved} removed</span>
            </div>
          </div>
        )}

        {/* Entries */}
        {state.map((entry) => (
          <div key={entry.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="font-semibold text-sm text-slate-800">{entry.company || 'Unknown company'}</p>
                <div className="flex gap-4 mt-1.5">
                  <span className="text-sm">
                    <span className="font-bold text-emerald-700">+{entry.delivered}</span>
                    <span className="text-slate-400 text-xs ml-1">delivered</span>
                  </span>
                  <span className="text-sm">
                    <span className="font-bold text-red-600">−{entry.removed}</span>
                    <span className="text-slate-400 text-xs ml-1">removed</span>
                  </span>
                </div>
              </div>
              <button onClick={() => handleDelete(entry.id)}
                className="p-2 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {/* Inline form — very large steppers */}
        {showForm && (
          <div className="bg-white rounded-xl border-2 border-slate-200 p-5 space-y-5 shadow-md">
            <p className="font-bold text-sm text-slate-800">Add Dumpster Entry</p>

            {/* Company */}
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Company</Label>
              <Input value={form.company}
                onChange={(e) => { setForm(f => ({ ...f, company: e.target.value })); setCompanySearch(e.target.value); }}
                placeholder="Search contacts…" className="h-11" />
              {contacts.length > 0 && companySearch && (
                <div className="mt-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg">
                  {contacts.slice(0, 4).map(c => (
                    <button key={c.id} type="button"
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
                      onClick={() => { setForm(f => ({ ...f, company: c.company_name || c.first_name })); setCompanySearch(''); }}>
                      {c.company_name || c.first_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Big steppers */}
            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Delivered</p>
                <StepperInput size="lg" value={form.delivered} min={0} max={20}
                  onChange={(v) => setForm(f => ({ ...f, delivered: v }))} />
              </div>
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Removed</p>
                <StepperInput size="lg" value={form.removed} min={0} max={20}
                  onChange={(v) => setForm(f => ({ ...f, removed: v }))} />
              </div>
            </div>

            {/* Net preview */}
            <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
              <p className="text-xs text-slate-500">Net this entry</p>
              <p className="text-2xl font-bold text-slate-800">{form.delivered - form.removed} containers</p>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={handleAdd} disabled={form.delivered === 0 && form.removed === 0}
                className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-50">
                Add Entry
              </button>
            </div>
          </div>
        )}

        {state.length === 0 && !showForm && (
          <div className="py-8 text-center text-slate-400 text-sm">
            <p className="text-2xl mb-2">🗑️</p>
            <p>No dumpster entries today</p>
          </div>
        )}
      </div>
    </SectionSheet>
  );
}
