import React, { useState } from 'react';
import { format } from 'date-fns';
import { Trash2, Phone, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SectionSheet } from './shared/SectionSheet';
import { VoiceButton } from './shared/VoiceButton';
import { useSectionDraft } from './shared/useSectionDraft';
import { useCRMContacts } from '@/hooks/useCRMContacts';

interface CallEntry {
  id: string;
  call_from: string;
  call_to: string;
  start_time: string;
  end_time: string;
  notes: string;
}

interface PhoneCallSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  onEntriesChange?: (count: number) => void;
}

function calcDuration(start: string, end: string): string {
  if (!start || !end) return '';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const EMPTY_FORM = (): Omit<CallEntry, 'id'> => ({
  call_from: '',
  call_to: '',
  start_time: format(new Date(), 'HH:mm'),
  end_time: '',
  notes: '',
});

export function PhoneCallSection({ open, onOpenChange, propertyId, onEntriesChange }: PhoneCallSectionProps) {
  const { state, setState } = useSectionDraft<CallEntry[]>('phone_calls', propertyId, []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM());
  const [fromSearch, setFromSearch] = useState('');
  const [toSearch, setToSearch] = useState('');

  const { data: fromContacts = [] } = useCRMContacts({ search: fromSearch });
  const { data: toContacts = [] } = useCRMContacts({ search: toSearch });

  const duration = calcDuration(form.start_time, form.end_time);

  const handleAdd = () => {
    if (!form.call_from && !form.call_to) return;
    const entry: CallEntry = { ...form, id: crypto.randomUUID() };
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

  const ContactDropdown = ({
    contacts,
    onSelect,
    visible,
  }: { contacts: typeof fromContacts; onSelect: (name: string) => void; visible: boolean }) =>
    visible && contacts.length > 0 ? (
      <div className="mt-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg z-10">
        {contacts.slice(0, 4).map(c => (
          <button key={c.id} type="button"
            className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
            onClick={() => onSelect(`${c.first_name} ${c.last_name || ''}`.trim())}>
            {c.first_name} {c.last_name}
            {c.company_name && <span className="text-slate-400 ml-2 text-xs">· {c.company_name}</span>}
          </button>
        ))}
      </div>
    ) : null;

  return (
    <SectionSheet open={open} onOpenChange={onOpenChange} title="Phone Calls" emoji="📞"
      onAddEntry={() => { setForm(EMPTY_FORM()); setShowForm(true); }} addLabel="Log Call">
      <div className="p-4 space-y-3">

        {/* Entries */}
        {state.map((call) => (
          <div key={call.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-xs text-slate-500">
                    {call.start_time}{call.end_time ? ` – ${call.end_time}` : ''}
                    {calcDuration(call.start_time, call.end_time) && (
                      <span className="ml-1.5 text-blue-600 font-medium">
                        ({calcDuration(call.start_time, call.end_time)})
                      </span>
                    )}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-800">
                  {call.call_from} → {call.call_to || '—'}
                </p>
                {call.notes && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{call.notes}</p>}
              </div>
              <button onClick={() => handleDelete(call.id)}
                className="p-2 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {/* Inline form */}
        {showForm && (
          <div className="bg-white rounded-xl border-2 border-blue-200 p-4 space-y-4 shadow-md">
            <p className="font-bold text-sm text-slate-800">Log Phone Call</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Start Time</Label>
                <Input type="time" value={form.start_time}
                  onChange={(e) => setForm(f => ({ ...f, start_time: e.target.value }))} className="h-10" />
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">End Time</Label>
                <Input type="time" value={form.end_time}
                  onChange={(e) => setForm(f => ({ ...f, end_time: e.target.value }))} className="h-10" />
              </div>
            </div>

            {duration && (
              <div className="flex items-center gap-1.5 text-sm text-blue-700 font-medium">
                <Clock className="h-4 w-4" />Duration: {duration}
              </div>
            )}

            <div className="relative">
              <Label className="text-xs text-slate-500 mb-1 block">Call From</Label>
              <Input value={form.call_from}
                onChange={(e) => { setForm(f => ({ ...f, call_from: e.target.value })); setFromSearch(e.target.value); }}
                placeholder="Search or type name…" className="h-10" />
              <ContactDropdown contacts={fromContacts}
                onSelect={(n) => { setForm(f => ({ ...f, call_from: n })); setFromSearch(''); }}
                visible={!!fromSearch} />
            </div>

            <div className="relative">
              <Label className="text-xs text-slate-500 mb-1 block">Call To</Label>
              <Input value={form.call_to}
                onChange={(e) => { setForm(f => ({ ...f, call_to: e.target.value })); setToSearch(e.target.value); }}
                placeholder="Search or type name…" className="h-10" />
              <ContactDropdown contacts={toContacts}
                onSelect={(n) => { setForm(f => ({ ...f, call_to: n })); setToSearch(''); }}
                visible={!!toSearch} />
            </div>

            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Notes</Label>
              <div className="flex gap-2">
                <Textarea value={form.notes}
                  onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Call summary…" rows={2} className="flex-1 text-sm resize-none" />
                <VoiceButton onTranscript={(t) => setForm(f => ({ ...f, notes: f.notes + ' ' + t }))} />
              </div>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={handleAdd} disabled={!form.call_from && !form.call_to}
                className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-50">
                Log Call
              </button>
            </div>
          </div>
        )}

        {state.length === 0 && !showForm && (
          <div className="py-8 text-center text-slate-400 text-sm">
            <p className="text-2xl mb-2">📞</p>
            <p>No calls logged today</p>
          </div>
        )}
      </div>
    </SectionSheet>
  );
}
