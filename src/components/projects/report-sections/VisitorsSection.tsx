import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Check, Plus, Trash2, AlertCircle } from 'lucide-react';
import { QuickPickChips } from '@/components/inspections/log-sections/shared/QuickPickChips';
import { VoiceDictation } from '@/components/ui/voice-dictation';
import { cn } from '@/lib/utils';

export interface VisitorEntry {
  id: string;
  name: string;
  organization: string;
  purpose: string;
  arrivalTime: string;
  departureTime: string;
  stillOnSite: boolean;
  inspectionResult: string;
  notes: string;
}

const PURPOSE_CHIPS = [
  { value: "Owner's Rep", label: "Owner's Rep" },
  { value: 'City Inspector', label: 'City Inspector' },
  { value: 'Safety Inspector', label: 'Safety Inspector' },
  { value: 'Engineer', label: 'Engineer' },
  { value: 'Subcontractor', label: 'Subcontractor' },
  { value: 'Media', label: 'Media' },
  { value: 'Other', label: 'Other' },
];

const INSPECTION_RESULT_CHIPS = [
  { value: 'Passed', label: '✅ Passed', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'Conditional', label: '⚠️ Conditional', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'Failed', label: '❌ Failed', color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'N/A', label: 'N/A', color: '' },
];

const isInspectorPurpose = (purpose: string) =>
  ['City Inspector', 'Safety Inspector', 'Engineer'].includes(purpose);

interface VisitorsSectionProps {
  open: boolean;
  onClose: () => void;
  data: VisitorEntry[];
  onChange: (data: VisitorEntry[]) => void;
}

function emptyEntry(): VisitorEntry {
  return {
    id: crypto.randomUUID(), name: '', organization: '', purpose: '', inspectionResult: 'N/A',
    arrivalTime: new Date().toTimeString().slice(0, 5), departureTime: '', stillOnSite: true, notes: '',
  };
}

export function VisitorsSection({ open, onClose, data, onChange }: VisitorsSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<VisitorEntry>(emptyEntry());

  const isLate = (entry: VisitorEntry) => {
    const now = new Date();
    return entry.stillOnSite && now.getHours() >= 16;
  };

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
          <button type="button" onClick={onClose} className="p-1"><ArrowLeft className="h-5 w-5" /></button>
          <span className="font-semibold">👤 Visitors & Inspections</span>
          <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8" onClick={onClose}><Check className="h-4 w-4 mr-1" /> Done</Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {data.map(entry => (
            <div key={entry.id} className={cn('p-3 rounded-xl border bg-card flex items-start justify-between gap-3', isLate(entry) && 'border-amber-300 bg-amber-50')}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate">{entry.name}</p>
                  {isLate(entry) && <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />}
                </div>
                <p className="text-sm text-muted-foreground">{entry.organization} · {entry.purpose} · {entry.arrivalTime}{entry.stillOnSite ? ' — Still on site' : ` – ${entry.departureTime}`}</p>
                {entry.inspectionResult !== 'N/A' && <p className="text-xs font-semibold mt-1">Inspection: {entry.inspectionResult}</p>}
              </div>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => { setDraft({ ...entry }); setEditingId(entry.id); }}>Edit</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => onChange(data.filter(e => e.id !== entry.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}

          {editingId ? (
            <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</label>
                  <Input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Visitor name" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Organization / Title</label>
                  <Input value={draft.organization} onChange={e => setDraft(d => ({ ...d, organization: e.target.value }))} placeholder="City, Engineering firm..." className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Purpose</label>
                <QuickPickChips options={PURPOSE_CHIPS} value={draft.purpose} onChange={v => setDraft(d => ({ ...d, purpose: v }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Arrival</label>
                  <Input type="time" value={draft.arrivalTime} onChange={e => setDraft(d => ({ ...d, arrivalTime: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Departure</label>
                  <Input type="time" value={draft.departureTime} onChange={e => setDraft(d => ({ ...d, departureTime: e.target.value }))} className="mt-1" disabled={draft.stillOnSite} />
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={draft.stillOnSite} onChange={e => setDraft(d => ({ ...d, stillOnSite: e.target.checked }))} className="rounded" />
                    <span className="text-xs text-muted-foreground">Still on site</span>
                  </label>
                </div>
              </div>
              {isInspectorPurpose(draft.purpose) && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Inspection Result</label>
                  <QuickPickChips options={INSPECTION_RESULT_CHIPS} value={draft.inspectionResult} onChange={v => setDraft(d => ({ ...d, inspectionResult: v }))} />
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</label>
                  <VoiceDictation onTranscript={t => setDraft(d => ({ ...d, notes: d.notes ? `${d.notes} ${t}` : t }))} />
                </div>
                <Textarea value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} className="min-h-[60px]" />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditingId(null)}>Cancel</Button>
                <Button type="button" className="flex-1" onClick={saveEntry} disabled={!draft.name}>Save</Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" className="w-full gap-2" onClick={() => { setDraft(emptyEntry()); setEditingId('__new__'); }}>
              <Plus className="h-4 w-4" /> Add Visitor
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
