import React, { useState } from 'react';
import { format } from 'date-fns';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { SectionSheet } from './shared/SectionSheet';
import { QuickPickChips } from './shared/QuickPickChips';
import { VoiceButton } from './shared/VoiceButton';
import { PhotoCapture } from './shared/PhotoCapture';
import { useSectionDraft } from './shared/useSectionDraft';
import { useCreateIssue } from '@/hooks/useIssues';
import { useCRMContacts, CRMContact } from '@/hooks/useCRMContacts';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface IncidentEntry {
  id: string;
  incident_type: string;
  time: string;
  party_involved: string;
  company_involved: string;
  description: string;
  photos: string[];
  issue_id?: string;
}

// ─── Shared constants ─────────────────────────────────────────────────────────

export const INCIDENT_TYPES = [
  { label: 'Injury', value: 'injury', emoji: '🤕', color: 'bg-red-100 text-red-700 border-red-300' },
  { label: 'Near Miss', value: 'near_miss', emoji: '⚡', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { label: 'Fire', value: 'fire', emoji: '🔥', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { label: 'Spill', value: 'spill', emoji: '💧', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { label: 'Property Damage', value: 'property_damage', emoji: '🚗', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { label: 'Other', value: 'other', emoji: '📌', color: 'bg-slate-100 text-slate-600 border-slate-200' },
];

const EMPTY_FORM = (): Omit<IncidentEntry, 'id'> => ({
  incident_type: '',
  time: format(new Date(), 'HH:mm'),
  party_involved: '',
  company_involved: '',
  description: '',
  photos: [],
});

// ─── Shared incident form (used in both components) ───────────────────────────

interface IncidentFormProps {
  form: Omit<IncidentEntry, 'id'>;
  onFormChange: (form: Omit<IncidentEntry, 'id'>) => void;
  contacts: CRMContact[];
  onContactSearch: (q: string) => void;
  saving: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  propertyId: string;
}

function IncidentForm({
  form,
  onFormChange,
  contacts,
  onContactSearch,
  saving,
  onCancel,
  onSubmit,
  propertyId,
}: IncidentFormProps) {
  const [partySearch, setPartySearch] = useState('');
  const [coSearch, setCoSearch] = useState('');

  const set = (patch: Partial<Omit<IncidentEntry, 'id'>>) =>
    onFormChange({ ...form, ...patch });

  return (
    <div className="space-y-4">
      {/* Incident type chips */}
      <div>
        <Label className="text-xs text-slate-500 mb-1.5 block">Incident Type *</Label>
        <QuickPickChips
          options={INCIDENT_TYPES.map(t => ({ ...t, color: t.color }))}
          value={form.incident_type}
          onChange={(v) => set({ incident_type: v })}
        />
      </div>

      {/* Time */}
      <div>
        <Label className="text-xs text-slate-500 mb-1 block">Time</Label>
        <Input type="time" value={form.time}
          onChange={(e) => set({ time: e.target.value })} className="h-10 w-40" />
      </div>

      {/* Party involved */}
      <div className="relative">
        <Label className="text-xs text-slate-500 mb-1 block">Party Involved</Label>
        <Input value={form.party_involved}
          onChange={(e) => { set({ party_involved: e.target.value }); onContactSearch(e.target.value); setPartySearch(e.target.value); }}
          placeholder="Name (free-text or search)" className="h-10" />
        {partySearch && contacts && contacts.length > 0 && (
          <div className="mt-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg z-20">
            {(contacts as any[]).slice(0, 4).map((c: any) => (
              <button key={c.id} type="button"
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
                onClick={() => { set({ party_involved: `${c.first_name} ${c.last_name || ''}`.trim() }); setPartySearch(''); }}>
                {c.first_name} {c.last_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Company involved */}
      <div className="relative">
        <Label className="text-xs text-slate-500 mb-1 block">Company Involved</Label>
        <Input value={form.company_involved}
          onChange={(e) => { set({ company_involved: e.target.value }); onContactSearch(e.target.value); setCoSearch(e.target.value); }}
          placeholder="Search contacts…" className="h-10" />
        {coSearch && contacts && contacts.length > 0 && (
          <div className="mt-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg z-20">
            {(contacts as any[]).slice(0, 4).map((c: any) => (
              <button key={c.id} type="button"
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
                onClick={() => { set({ company_involved: c.company_name || c.first_name }); setCoSearch(''); }}>
                {c.company_name || c.first_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <Label className="text-xs text-slate-500 mb-1.5 block">Description *</Label>
        <div className="flex gap-2">
          <Textarea value={form.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="Describe what happened…" rows={4} className="flex-1 text-sm resize-none" />
          <VoiceButton onTranscript={(t) => set({ description: form.description + ' ' + t })} />
        </div>
      </div>

      {/* Photos — REQUIRED */}
      <div>
        <Label className="text-xs text-slate-500 mb-1.5 block">
          Photos <span className="text-red-500 font-bold">*</span>
        </Label>
        <PhotoCapture photos={form.photos}
          onPhotosChange={(p) => set({ photos: p })}
          folder="incidents" required maxPhotos={10} />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="flex-1 h-12 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">
          Cancel
        </button>
        <button type="button" onClick={onSubmit}
          disabled={saving || !form.incident_type || !form.description || form.photos.length === 0}
          className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold disabled:opacity-50">
          {saving ? 'Saving…' : '⚠️ Submit Incident'}
        </button>
      </div>
    </div>
  );
}

// ─── IncidentSection (inside the daily log sheet) ─────────────────────────────

interface IncidentSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  onEntriesChange?: (count: number) => void;
}

export function IncidentSection({ open, onOpenChange, propertyId, onEntriesChange }: IncidentSectionProps) {
  const { state, setState } = useSectionDraft<IncidentEntry[]>('incidents', propertyId, []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM());
  const [contactSearch, setContactSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: contacts = [] } = useCRMContacts({ search: contactSearch });
  const createIssue = useCreateIssue();

  const handleSubmit = async () => {
    if (!form.incident_type || !form.description || form.photos.length === 0) return;
    setSaving(true);
    try {
      const issue = await createIssue.mutateAsync({
        property_id: propertyId,
        title: `Incident: ${INCIDENT_TYPES.find(t => t.value === form.incident_type)?.label} – ${form.time}`,
        description: `${form.description}${form.party_involved ? `\nParty: ${form.party_involved}` : ''}${form.company_involved ? `\nCompany: ${form.company_involved}` : ''}`,
        severity: 'severe',
        area: 'outside',
        source_module: 'daily_inspection',
        status: 'open',
      } as any);

      const entry: IncidentEntry = { ...form, id: crypto.randomUUID(), issue_id: issue?.id };
      const next = [...state, entry];
      setState(next);
      onEntriesChange?.(next.length);
      setForm(EMPTY_FORM());
      setShowForm(false);
      toast.success('Incident logged + issue created for supervisor review');
    } catch {
      toast.error('Failed to save incident');
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
    <SectionSheet open={open} onOpenChange={onOpenChange} title="Incidents & Accidents" emoji="⚠️"
      onAddEntry={() => { setForm(EMPTY_FORM()); setShowForm(true); }} addLabel="Report Incident"
      accent="red">
      <div className="p-4 space-y-3">

        {state.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <p className="text-xs font-semibold text-red-700">
              {state.length} incident{state.length > 1 ? 's' : ''} logged today — supervisor notified
            </p>
          </div>
        )}

        {/* Incident cards */}
        {state.map((entry) => {
          const itype = INCIDENT_TYPES.find(t => t.value === entry.incident_type);
          return (
            <div key={entry.id}
              className="bg-white border-l-4 border-l-red-500 border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-lg">{itype?.emoji}</span>
                    <span className="font-bold text-sm text-red-700">{itype?.label}</span>
                    <span className="text-xs text-slate-400">@ {entry.time}</span>
                  </div>
                  <p className="text-sm text-slate-700 line-clamp-2">{entry.description}</p>
                  {entry.party_involved && (
                    <p className="text-xs text-slate-400 mt-1">Party: {entry.party_involved}</p>
                  )}
                  {entry.issue_id && (
                    <p className="text-xs text-blue-600 mt-1">✓ Issue #{entry.issue_id.slice(0, 8)} created</p>
                  )}
                  {entry.photos.length > 0 && (
                    <div className="flex gap-1.5 mt-2">
                      {entry.photos.slice(0, 3).map((url, i) => (
                        <img key={i} src={url} alt=""
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                      ))}
                      {entry.photos.length > 3 && (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-500 font-medium">
                          +{entry.photos.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button onClick={() => handleDelete(entry.id)}
                  className="p-2 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Inline form */}
        {showForm && (
          <div className="bg-white rounded-xl border-2 border-red-200 p-4 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-red-700">⚠️ Report Incident</p>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <IncidentForm
              form={form} onFormChange={setForm}
              contacts={contacts} onContactSearch={setContactSearch}
              saving={saving} onCancel={() => setShowForm(false)} onSubmit={handleSubmit}
              propertyId={propertyId}
            />
          </div>
        )}

        {state.length === 0 && !showForm && (
          <div className="py-8 text-center text-slate-400 text-sm">
            <p className="text-3xl mb-2">✅</p>
            <p>No incidents reported today</p>
            <button onClick={() => { setForm(EMPTY_FORM()); setShowForm(true); }}
              className="mt-3 text-xs text-red-600 underline">Report an incident</button>
          </div>
        )}
      </div>
    </SectionSheet>
  );
}

// ─── IncidentQuickLog (floating bottom sheet from FAB) ────────────────────────

interface IncidentQuickLogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  onIncidentLogged?: () => void;
}

export function IncidentQuickLog({ open, onOpenChange, propertyId, onIncidentLogged }: IncidentQuickLogProps) {
  const { state, setState } = useSectionDraft<IncidentEntry[]>('incidents', propertyId, []);
  const [form, setForm] = useState(EMPTY_FORM());
  const [contactSearch, setContactSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: contacts = [] } = useCRMContacts({ search: contactSearch });
  const createIssue = useCreateIssue();

  const handleSubmit = async () => {
    if (!form.incident_type || !form.description || form.photos.length === 0) return;
    setSaving(true);
    try {
      const issue = await createIssue.mutateAsync({
        property_id: propertyId,
        title: `Incident: ${INCIDENT_TYPES.find(t => t.value === form.incident_type)?.label} – ${form.time}`,
        description: form.description,
        severity: 'severe',
        area: 'outside',
        source_module: 'daily_inspection',
        status: 'open',
      } as any);

      const entry: IncidentEntry = { ...form, id: crypto.randomUUID(), issue_id: issue?.id };
      setState([...state, entry]);
      setForm(EMPTY_FORM());
      onIncidentLogged?.();
      onOpenChange(false);
      toast.success('🚨 Incident reported — supervisor has been notified');
    } catch {
      toast.error('Failed to save incident');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90dvh] flex flex-col p-0 rounded-t-2xl overflow-hidden">
        {/* Red urgent header */}
        <SheetHeader className="flex-shrink-0 px-4 py-4" style={{ background: '#DC2626' }}>
          <div className="flex items-center justify-between">
            <SheetTitle className="text-white font-black text-lg flex items-center gap-2">
              ⚠️ Report Incident
            </SheetTitle>
            <button onClick={() => onOpenChange(false)}
              className="p-2 rounded-xl hover:bg-red-700 text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-red-100 text-xs">
            All incidents are immediately flagged for supervisor review
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
          <IncidentForm
            form={form} onFormChange={setForm}
            contacts={contacts} onContactSearch={setContactSearch}
            saving={saving} onCancel={() => onOpenChange(false)} onSubmit={handleSubmit}
            propertyId={propertyId}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
