import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Check, Plus, Trash2 } from 'lucide-react';
import { StepperInput } from '@/components/inspections/log-sections/shared/StepperInput';
import { QuickPickChips } from '@/components/inspections/log-sections/shared/QuickPickChips';
import { VoiceDictation } from '@/components/ui/voice-dictation';
import { cn } from '@/lib/utils';

export interface CrewEntry {
  id: string;
  company: string;
  trade: string;
  workers: number;
  hours: number;
  notes: string;
}

const TRADE_CHIPS = [
  { value: 'General Labor', label: 'General Labor' },
  { value: 'Operator', label: 'Operator' },
  { value: 'Foreman', label: 'Foreman' },
  { value: 'Superintendent', label: 'Superintendent' },
  { value: 'Engineer', label: 'Engineer' },
  { value: 'Inspector', label: 'Inspector' },
  { value: 'Other', label: 'Other' },
];

interface ManpowerSectionProps {
  open: boolean;
  onClose: () => void;
  data: CrewEntry[];
  onChange: (data: CrewEntry[]) => void;
}

function emptyEntry(): CrewEntry {
  return { id: crypto.randomUUID(), company: '', trade: '', workers: 1, hours: 8, notes: '' };
}

export function ManpowerSection({ open, onClose, data, onChange }: ManpowerSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CrewEntry>(emptyEntry());

  const totalWorkers = data.reduce((s, c) => s + c.workers, 0);
  const totalManHours = data.reduce((s, c) => s + c.workers * c.hours, 0);

  const addEntry = () => {
    setDraft(emptyEntry());
    setEditingId('__new__');
  };

  const saveEntry = () => {
    if (!draft.company) return;
    if (editingId === '__new__') {
      onChange([...data, draft]);
    } else {
      onChange(data.map(e => e.id === editingId ? draft : e));
    }
    setEditingId(null);
  };

  const deleteEntry = (id: string) => onChange(data.filter(e => e.id !== id));

  const editEntry = (e: CrewEntry) => { setDraft({ ...e }); setEditingId(e.id); };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] p-0 flex flex-col rounded-t-2xl">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white rounded-t-2xl flex-shrink-0">
          <button type="button" onClick={onClose} className="p-1">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-semibold">👷 Manpower & Crew</span>
          <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8" onClick={onClose}>
            <Check className="h-4 w-4 mr-1" /> Done
          </Button>
        </div>

        {/* Running total */}
        {data.length > 0 && (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex-shrink-0">
            <p className="text-sm font-semibold text-blue-700">
              Total: {totalWorkers} workers · {totalManHours} man-hours
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Crew cards */}
          {data.map(entry => (
            <div key={entry.id} className="p-3 rounded-xl border bg-card flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{entry.company}</p>
                <p className="text-sm text-muted-foreground">{entry.trade} · {entry.workers} workers · {entry.hours}h</p>
                {entry.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{entry.notes}</p>}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button type="button" variant="ghost" size="sm" onClick={() => editEntry(entry)}>Edit</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => deleteEntry(entry.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}

          {/* Entry form */}
          {editingId ? (
            <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-4">
              <p className="font-semibold text-sm">{editingId === '__new__' ? 'Add Crew' : 'Edit Crew'}</p>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Company / Contractor</label>
                <Input
                  value={draft.company}
                  onChange={e => setDraft(d => ({ ...d, company: e.target.value }))}
                  placeholder="Company name"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Trade / Role</label>
                <QuickPickChips
                  options={TRADE_CHIPS}
                  value={draft.trade}
                  onChange={v => setDraft(d => ({ ...d, trade: v }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <StepperInput label="Workers" value={draft.workers} onChange={v => setDraft(d => ({ ...d, workers: v }))} min={0} max={200} />
                <StepperInput label="Hours" value={draft.hours} onChange={v => setDraft(d => ({ ...d, hours: v }))} min={0} max={24} step={0.5} />
              </div>

              <div className="p-2 bg-muted rounded-lg text-center text-sm font-semibold">
                {draft.workers * draft.hours} man-hours total
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</label>
                  <VoiceDictation onTranscript={t => setDraft(d => ({ ...d, notes: d.notes ? `${d.notes} ${t}` : t }))} />
                </div>
                <Textarea value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} placeholder="Work area, scope notes..." className="min-h-[60px]" />
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditingId(null)}>Cancel</Button>
                <Button type="button" className="flex-1" onClick={saveEntry} disabled={!draft.company}>Save</Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" className="w-full gap-2" onClick={addEntry}>
              <Plus className="h-4 w-4" /> Add Crew
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
