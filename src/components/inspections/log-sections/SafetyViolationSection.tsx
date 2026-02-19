import React, { useState } from 'react';
import { format, addDays } from 'date-fns';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SectionSheet } from './shared/SectionSheet';
import { QuickPickChips } from './shared/QuickPickChips';
import { VoiceButton } from './shared/VoiceButton';
import { PhotoCapture } from './shared/PhotoCapture';
import { useSectionDraft } from './shared/useSectionDraft';
import { useCreateIssue } from '@/hooks/useIssues';
import { useCreateWorkOrder } from '@/hooks/useWorkOrders';
import { useCRMContacts } from '@/hooks/useCRMContacts';
import { toast } from 'sonner';

interface SafetyEntry {
  id: string;
  time: string;
  violation_type: string;
  description: string;
  issued_to: string;
  compliance_date: string;
  photos: string[];
}

interface SafetyViolationSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  onEntriesChange?: (count: number) => void;
}

const VIOLATION_TYPES = [
  { label: 'PPE Missing', value: 'ppe_missing', emoji: '🦺' },
  { label: 'Unsafe Conditions', value: 'unsafe_conditions', emoji: '⚠️' },
  { label: 'Protocol Breach', value: 'protocol_breach', emoji: '📋' },
  { label: 'Restricted Area', value: 'restricted_area', emoji: '🚧' },
  { label: 'Other', value: 'other', emoji: '📌' },
];

const EMPTY_FORM = (): Omit<SafetyEntry, 'id'> => ({
  time: format(new Date(), 'HH:mm'),
  violation_type: '',
  description: '',
  issued_to: '',
  compliance_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
  photos: [],
});

export function SafetyViolationSection({ open, onOpenChange, propertyId, onEntriesChange }: SafetyViolationSectionProps) {
  const { state, setState } = useSectionDraft<SafetyEntry[]>('safety_violations', propertyId, []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM());
  const [contactSearch, setContactSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: contacts = [] } = useCRMContacts({ search: contactSearch });
  const createWorkOrder = useCreateWorkOrder();

  const handleAdd = async () => {
    if (!form.violation_type || !form.description) return;
    setSaving(true);
    try {
      // Auto-create work order for follow-up
      await createWorkOrder.mutateAsync({
        property_id: propertyId,
        title: `Safety Violation Follow-up: ${VIOLATION_TYPES.find(v => v.value === form.violation_type)?.label}`,
        description: `${form.description}${form.issued_to ? `\nIssued to: ${form.issued_to}` : ''}`,
        priority: 'high',
        status: 'pending',
        due_date: form.compliance_date,
      } as any);

      const entry: SafetyEntry = { ...form, id: crypto.randomUUID() };
      const next = [...state, entry];
      setState(next);
      onEntriesChange?.(next.length);
      setForm(EMPTY_FORM());
      setShowForm(false);
      toast.success('Safety violation logged + work order created');
    } catch (e) {
      // Still save entry even if work order fails
      const entry: SafetyEntry = { ...form, id: crypto.randomUUID() };
      const next = [...state, entry];
      setState(next);
      onEntriesChange?.(next.length);
      setForm(EMPTY_FORM());
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    const next = state.filter(e => e.id !== id);
    setState(next);
    onEntriesChange?.(next.length);
  };

  return (
    <SectionSheet open={open} onOpenChange={onOpenChange} title="Safety Violations" emoji="🚫"
      onAddEntry={() => { setForm(EMPTY_FORM()); setShowForm(true); }} addLabel="Log Violation"
      accent="red">
      <div className="p-4 space-y-3">

        {/* Alert banner */}
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <p className="text-xs text-red-700 font-medium">
            Safety violations auto-create a follow-up work order
          </p>
        </div>

        {/* Entries */}
        {state.map((entry) => (
          <div key={entry.id} className="bg-white rounded-xl border-l-4 border-l-red-400 border border-slate-200 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">
                    {VIOLATION_TYPES.find(v => v.value === entry.violation_type)?.label || entry.violation_type}
                  </span>
                  <span className="text-xs text-slate-400">@ {entry.time}</span>
                </div>
                <p className="text-sm text-slate-700">{entry.description}</p>
                {entry.issued_to && <p className="text-xs text-slate-400 mt-1">Issued to: {entry.issued_to}</p>}
                <p className="text-xs text-slate-400">Compliance due: {entry.compliance_date}</p>
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
          <div className="bg-white rounded-xl border-2 border-red-200 p-4 space-y-4 shadow-md">
            <p className="font-bold text-sm text-red-700">🚫 Log Safety Violation</p>

            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Violation Type *</Label>
              <QuickPickChips options={VIOLATION_TYPES} value={form.violation_type}
                onChange={(v) => setForm(f => ({ ...f, violation_type: v }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Time</Label>
                <Input type="time" value={form.time}
                  onChange={(e) => setForm(f => ({ ...f, time: e.target.value }))} className="h-10" />
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Compliance Due</Label>
                <Input type="date" value={form.compliance_date}
                  onChange={(e) => setForm(f => ({ ...f, compliance_date: e.target.value }))} className="h-10" />
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Issued To</Label>
              <Input value={form.issued_to}
                onChange={(e) => { setForm(f => ({ ...f, issued_to: e.target.value })); setContactSearch(e.target.value); }}
                placeholder="Search contacts…" className="h-10" />
              {contacts.length > 0 && contactSearch && (
                <div className="mt-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg">
                  {contacts.slice(0, 4).map(c => (
                    <button key={c.id} type="button"
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
                      onClick={() => { setForm(f => ({ ...f, issued_to: `${c.first_name} ${c.last_name || ''}`.trim() })); setContactSearch(''); }}>
                      {c.first_name} {c.last_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Description *</Label>
              <div className="flex gap-2">
                <Textarea value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the violation…" rows={3} className="flex-1 text-sm resize-none" />
                <VoiceButton onTranscript={(t) => setForm(f => ({ ...f, description: f.description + ' ' + t }))} />
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Photos (encouraged)</Label>
              <PhotoCapture photos={form.photos} onPhotosChange={(p) => setForm(f => ({ ...f, photos: p }))}
                folder="safety-violations" compact />
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={handleAdd} disabled={saving || !form.violation_type || !form.description}
                className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold disabled:opacity-50">
                {saving ? 'Saving…' : 'Log Violation'}
              </button>
            </div>
          </div>
        )}

        {state.length === 0 && !showForm && (
          <div className="py-8 text-center text-slate-400 text-sm">
            <p className="text-2xl mb-2">✅</p>
            <p>No safety violations logged today</p>
            <button onClick={() => { setForm(EMPTY_FORM()); setShowForm(true); }}
              className="mt-3 text-xs text-red-600 underline">Log a violation</button>
          </div>
        )}
      </div>
    </SectionSheet>
  );
}
