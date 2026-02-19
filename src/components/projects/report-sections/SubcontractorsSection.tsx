import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Check, Plus, Trash2 } from 'lucide-react';
import { StepperInput } from '@/components/inspections/log-sections/shared/StepperInput';
import { VoiceDictation } from '@/components/ui/voice-dictation';

export interface SubEntry {
  id: string;
  company: string;
  trade: string;
  superintendent: string;
  workers: number;
  hours: number;
  workArea: string;
  workCompleted: string;
}

interface SubcontractorsSectionProps {
  open: boolean;
  onClose: () => void;
  data: SubEntry[];
  onChange: (data: SubEntry[]) => void;
}

function emptyEntry(): SubEntry {
  return { id: crypto.randomUUID(), company: '', trade: '', superintendent: '', workers: 0, hours: 8, workArea: '', workCompleted: '' };
}

export function SubcontractorsSection({ open, onClose, data, onChange }: SubcontractorsSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SubEntry>(emptyEntry());

  const totalWorkers = data.reduce((s, e) => s + e.workers, 0);
  const totalManHours = data.reduce((s, e) => s + e.workers * e.hours, 0);

  const saveEntry = () => {
    if (!draft.company) return;
    if (editingId === '__new__') onChange([...data, draft]);
    else onChange(data.map(e => e.id === editingId ? draft : e));
    setEditingId(null);
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] p-0 flex flex-col rounded-t-2xl">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white rounded-t-2xl flex-shrink-0">
          <button type="button" onClick={onClose} className="p-1">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-semibold">🏗️ Subcontractors on Site</span>
          <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8" onClick={onClose}>
            <Check className="h-4 w-4 mr-1" /> Done
          </Button>
        </div>

        {data.length > 0 && (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex-shrink-0">
            <p className="text-sm font-semibold text-blue-700">
              {data.length} subs · {totalWorkers} workers · {totalManHours} man-hours
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {data.map(entry => (
            <div key={entry.id} className="p-3 rounded-xl border bg-card flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{entry.company}</p>
                <p className="text-sm text-muted-foreground">{entry.trade} · {entry.workers} workers · {entry.hours}h</p>
                {entry.workCompleted && <p className="text-xs text-muted-foreground mt-1 truncate">{entry.workCompleted}</p>}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button type="button" variant="ghost" size="sm" onClick={() => { setDraft({ ...entry }); setEditingId(entry.id); }}>Edit</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => onChange(data.filter(e => e.id !== entry.id))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}

          {editingId ? (
            <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-4">
              <p className="font-semibold text-sm">{editingId === '__new__' ? 'Add Subcontractor' : 'Edit Subcontractor'}</p>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Company Name</label>
                <Input value={draft.company} onChange={e => setDraft(d => ({ ...d, company: e.target.value }))} placeholder="Subcontractor company" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Trade / Scope</label>
                  <Input value={draft.trade} onChange={e => setDraft(d => ({ ...d, trade: e.target.value }))} placeholder="e.g., Electrical rough-in" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Superintendent</label>
                  <Input value={draft.superintendent} onChange={e => setDraft(d => ({ ...d, superintendent: e.target.value }))} placeholder="Foreman name" className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <StepperInput label="Workers" value={draft.workers} onChange={v => setDraft(d => ({ ...d, workers: v }))} min={0} max={200} />
                <StepperInput label="Hours" value={draft.hours} onChange={v => setDraft(d => ({ ...d, hours: v }))} min={0} max={24} step={0.5} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Work Area / Location</label>
                <Input value={draft.workArea} onChange={e => setDraft(d => ({ ...d, workArea: e.target.value }))} placeholder="Work area on site" className="mt-1" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Work Completed Today</label>
                  <VoiceDictation onTranscript={t => setDraft(d => ({ ...d, workCompleted: d.workCompleted ? `${d.workCompleted} ${t}` : t }))} />
                </div>
                <Textarea value={draft.workCompleted} onChange={e => setDraft(d => ({ ...d, workCompleted: e.target.value }))} className="min-h-[80px]" />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditingId(null)}>Cancel</Button>
                <Button type="button" className="flex-1" onClick={saveEntry} disabled={!draft.company}>Save</Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" className="w-full gap-2" onClick={() => { setDraft(emptyEntry()); setEditingId('__new__'); }}>
              <Plus className="h-4 w-4" /> Add Subcontractor
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
