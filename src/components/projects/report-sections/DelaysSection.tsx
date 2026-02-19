import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Check, Plus, Trash2, Clock } from 'lucide-react';
import { QuickPickChips } from '@/components/inspections/log-sections/shared/QuickPickChips';
import { VoiceDictation } from '@/components/ui/voice-dictation';
import { cn } from '@/lib/utils';

export interface DelayEntry {
  id: string;
  type: string;
  startTime: string;
  endTime: string;
  ongoing: boolean;
  description: string;
  crewsAffected: string;
  costImpact: string;
  pcoChance: string;
}

const DELAY_TYPES = [
  { value: 'Weather', label: '🌧️ Weather' },
  { value: 'Material', label: '📦 Material' },
  { value: 'RFI/Design', label: '📄 RFI/Design' },
  { value: 'Permit', label: '🏛️ Permit' },
  { value: 'Labor', label: '👷 Labor' },
  { value: 'Equipment', label: '⚙️ Equipment' },
  { value: 'Utility Conflict', label: 'Utility Conflict' },
  { value: 'Owner Decision', label: 'Owner Decision' },
  { value: 'Other', label: 'Other' },
];

const PCO_CHIPS = [
  { value: 'Yes', label: 'Yes', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'No', label: 'No', color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'Maybe', label: 'Maybe', color: 'bg-amber-100 text-amber-700 border-amber-300' },
];

function calcDuration(start: string, end: string): string {
  try {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins <= 0) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ''}`.trim() : `${m}m`;
  } catch { return ''; }
}

interface DelaysSectionProps {
  open: boolean;
  onClose: () => void;
  data: DelayEntry[];
  onChange: (data: DelayEntry[]) => void;
}

function emptyEntry(): DelayEntry {
  return { id: crypto.randomUUID(), type: '', startTime: new Date().toTimeString().slice(0, 5), endTime: '', ongoing: false, description: '', crewsAffected: '', costImpact: '', pcoChance: 'No' };
}

export function DelaysSection({ open, onClose, data, onChange }: DelaysSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DelayEntry>(emptyEntry());

  const totalMins = data.reduce((s, e) => {
    if (e.ongoing || !e.endTime) return s;
    const [sh, sm] = e.startTime.split(':').map(Number);
    const [eh, em] = e.endTime.split(':').map(Number);
    return s + Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
  }, 0);
  const totalHours = (totalMins / 60).toFixed(1);

  const saveEntry = () => {
    if (!draft.type || !draft.description) return;
    if (editingId === '__new__') onChange([...data, draft]);
    else onChange(data.map(e => e.id === editingId ? draft : e));
    setEditingId(null);
  };

  const duration = draft.endTime && !draft.ongoing ? calcDuration(draft.startTime, draft.endTime) : 'Ongoing';

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] p-0 flex flex-col rounded-t-2xl">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white rounded-t-2xl flex-shrink-0">
          <button type="button" onClick={onClose} className="p-1"><ArrowLeft className="h-5 w-5" /></button>
          <span className="font-semibold">⏱️ Delays & Impacts</span>
          <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8" onClick={onClose}><Check className="h-4 w-4 mr-1" /> Done</Button>
        </div>

        {data.length > 0 && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex-shrink-0">
            <p className="text-sm font-semibold text-red-700">{data.length} delays today · {totalHours} hours lost</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {data.map(entry => (
            <div key={entry.id} className="p-3 rounded-xl border border-red-200 bg-red-50 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-red-800">{entry.type} — {entry.ongoing ? 'Ongoing' : calcDuration(entry.startTime, entry.endTime)}</p>
                <p className="text-sm text-red-600 truncate">{entry.description}</p>
              </div>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => { setDraft({ ...entry }); setEditingId(entry.id); }}>Edit</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => onChange(data.filter(e => e.id !== entry.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}

          {editingId ? (
            <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Delay Type</label>
                <QuickPickChips options={DELAY_TYPES} value={draft.type} onChange={v => setDraft(d => ({ ...d, type: v }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Start Time</label>
                  <Input type="time" value={draft.startTime} onChange={e => setDraft(d => ({ ...d, startTime: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">End Time</label>
                  <Input type="time" value={draft.endTime} onChange={e => setDraft(d => ({ ...d, endTime: e.target.value }))} className="mt-1" disabled={draft.ongoing} />
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={draft.ongoing} onChange={e => setDraft(d => ({ ...d, ongoing: e.target.checked }))} className="rounded" />
                    <span className="text-xs text-muted-foreground">Ongoing</span>
                  </label>
                </div>
              </div>
              {duration && <div className="flex items-center gap-2 p-2 bg-muted rounded-lg text-sm font-semibold"><Clock className="h-4 w-4" />{duration}</div>}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Impact Description</label>
                  <VoiceDictation onTranscript={t => setDraft(d => ({ ...d, description: d.description ? `${d.description} ${t}` : t }))} />
                </div>
                <Textarea value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} className="min-h-[80px]" placeholder="Describe the delay and its impact..." />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Crews / Equipment Affected</label>
                <Input value={draft.crewsAffected} onChange={e => setDraft(d => ({ ...d, crewsAffected: e.target.value }))} placeholder="Who was affected?" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Estimated Cost Impact ($)</label>
                <Input type="number" value={draft.costImpact} onChange={e => setDraft(d => ({ ...d, costImpact: e.target.value }))} placeholder="Optional" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">PCO / Change Order Potential?</label>
                <QuickPickChips options={PCO_CHIPS} value={draft.pcoChance} onChange={v => setDraft(d => ({ ...d, pcoChance: v }))} />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditingId(null)}>Cancel</Button>
                <Button type="button" className="flex-1" onClick={saveEntry} disabled={!draft.type}>Save</Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" className="w-full gap-2" onClick={() => { setDraft(emptyEntry()); setEditingId('__new__'); }}>
              <Plus className="h-4 w-4" /> Add Delay
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
