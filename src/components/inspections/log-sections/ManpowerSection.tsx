import React, { useState } from 'react';
import { format } from 'date-fns';
import { Trash2, Users, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionSheet } from './shared/SectionSheet';
import { StepperInput } from './shared/StepperInput';
import { QuickPickChips } from './shared/QuickPickChips';
import { VoiceButton } from './shared/VoiceButton';
import { useSectionDraft } from './shared/useSectionDraft';
import { useCRMContacts } from '@/hooks/useCRMContacts';

interface ManpowerEntry {
  id: string;
  company: string;
  crew_type: string;
  workers: number;
  hours: number;
  location: string;
}

interface ManpowerSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  onEntriesChange?: (count: number) => void;
}

const CREW_TYPES = [
  { label: 'Day Crew', value: 'day_crew', emoji: '🌅' },
  { label: 'Night Crew', value: 'night_crew', emoji: '🌙' },
  { label: 'Subcontractor', value: 'subcontractor', emoji: '🏗️' },
  { label: 'Overtime', value: 'overtime', emoji: '⏱️' },
];

const EMPTY_FORM = (): Omit<ManpowerEntry, 'id'> => ({
  company: '',
  crew_type: '',
  workers: 1,
  hours: 8,
  location: '',
});

export function ManpowerSection({ open, onOpenChange, propertyId, onEntriesChange }: ManpowerSectionProps) {
  const { state, setState } = useSectionDraft<ManpowerEntry[]>('manpower', propertyId, []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM());
  const [companySearch, setCompanySearch] = useState('');

  const { data: contacts = [] } = useCRMContacts({ search: companySearch });

  const filteredContacts = contacts
    .filter(c => c.company_name)
    .slice(0, 5);

  const totalHours = form.workers * form.hours;

  const handleAdd = () => {
    const entry: ManpowerEntry = { ...form, id: crypto.randomUUID() };
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

  const openForm = () => { setForm(EMPTY_FORM()); setShowForm(true); };

  return (
    <SectionSheet open={open} onOpenChange={onOpenChange} title="Manpower" emoji="👷"
      onAddEntry={openForm} addLabel="Add Crew">
      <div className="p-4 space-y-3">

        {/* Existing entries */}
        {state.map((entry) => (
          <div key={entry.id}
            className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3 shadow-sm">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-800">{entry.company || 'Unknown Company'}</p>
              {entry.crew_type && (
                <p className="text-xs text-slate-400 capitalize">{entry.crew_type.replace('_', ' ')}</p>
              )}
              <div className="flex gap-4 mt-2">
                <span className="flex items-center gap-1 text-xs text-slate-600">
                  <Users className="h-3.5 w-3.5" />{entry.workers} workers
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-600">
                  <Clock className="h-3.5 w-3.5" />{entry.hours}h each
                </span>
                <span className="text-xs font-semibold text-emerald-700">
                  = {entry.workers * entry.hours}h total
                </span>
              </div>
              {entry.location && <p className="text-xs text-slate-400 mt-1">📍 {entry.location}</p>}
            </div>
            <button onClick={() => handleDelete(entry.id)}
              className="p-2 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {/* Summary */}
        {state.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
            <p className="text-xs text-emerald-600 font-medium">Total on site today</p>
            <p className="text-2xl font-bold text-emerald-700">
              {state.reduce((s, e) => s + e.workers, 0)} workers
              · {state.reduce((s, e) => s + e.workers * e.hours, 0)}h
            </p>
          </div>
        )}

        {/* Inline form */}
        {showForm && (
          <div className="bg-white rounded-xl border-2 border-blue-200 p-4 space-y-4 shadow-md">
            <p className="font-bold text-sm text-slate-800">Add Crew Entry</p>

            {/* Quick pick crew type */}
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Crew Type</Label>
              <QuickPickChips
                options={CREW_TYPES}
                value={form.crew_type}
                onChange={(v) => {
                  setForm(f => ({ ...f, crew_type: v }));
                  if (v === 'day_crew') setCompanySearch('Day Crew');
                  else if (v === 'subcontractor') setCompanySearch('');
                }}
              />
            </div>

            {/* Company search */}
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Company</Label>
              <Input
                value={form.company}
                onChange={(e) => { setForm(f => ({ ...f, company: e.target.value })); setCompanySearch(e.target.value); }}
                placeholder="Search or type company name…"
                className="h-11"
              />
              {filteredContacts.length > 0 && form.company && (
                <div className="mt-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg">
                  {filteredContacts.map(c => (
                    <button key={c.id} type="button"
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
                      onClick={() => { setForm(f => ({ ...f, company: c.company_name || c.first_name })); setCompanySearch(''); }}>
                      <span className="font-medium">{c.company_name}</span>
                      {c.first_name && <span className="text-slate-400 ml-2">· {c.first_name}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Steppers */}
            <div className="grid grid-cols-2 gap-4">
              <StepperInput
                label="Workers"
                value={form.workers}
                onChange={(v) => setForm(f => ({ ...f, workers: v }))}
                min={0} max={500}
              />
              <StepperInput
                label="Hours Each"
                value={form.hours}
                onChange={(v) => setForm(f => ({ ...f, hours: v }))}
                min={0} max={24}
              />
            </div>

            {/* Total (read-only) */}
            <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
              <p className="text-xs text-emerald-600">Total Man-Hours</p>
              <p className="text-3xl font-bold text-emerald-700">{totalHours}</p>
            </div>

            {/* Location */}
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Location</Label>
              <div className="flex gap-2">
                <Input
                  value={form.location}
                  onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Work area / zone"
                  className="flex-1 h-10"
                />
                <VoiceButton onTranscript={(t) => setForm(f => ({ ...f, location: f.location + ' ' + t }))} />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={handleAdd}
                className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold">
                Add Entry
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {state.length === 0 && !showForm && (
          <button onClick={openForm}
            className="w-full py-8 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 text-sm hover:border-slate-300 transition-colors">
            + Add first crew entry
          </button>
        )}
      </div>
    </SectionSheet>
  );
}
