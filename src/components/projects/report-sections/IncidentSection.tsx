import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Check, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { QuickPickChips } from '@/components/inspections/log-sections/shared/QuickPickChips';
import { VoiceDictation } from '@/components/ui/voice-dictation';
import { EnhancedPhotoUpload } from '@/components/ui/enhanced-photo-upload';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface IncidentEntry {
  id: string;
  type: string;
  time: string;
  personnelInvolved: string;
  company: string;
  description: string;
  rootCause: string;
  correctiveAction: string;
  reportedToOwner: boolean;
  oshaRecordable: boolean;
  photoUrls: string[];
}

const INCIDENT_TYPES = [
  { value: 'Injury', label: '🤕 Injury', color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'Near Miss', label: '⚡ Near Miss', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'Fire', label: '🔥 Fire', color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'Spill', label: '💧 Spill', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'Property Damage', label: '🚗 Property Damage', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'Structural', label: '🏗️ Structural', color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'Environmental', label: 'Environmental', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'Other', label: 'Other', color: 'bg-gray-100 text-gray-700 border-gray-300' },
];

const ROOT_CAUSE_CHIPS = [
  { value: 'Human Error', label: 'Human Error' },
  { value: 'Equipment Failure', label: 'Equipment Failure' },
  { value: 'Environmental', label: 'Environmental' },
  { value: 'Procedure Gap', label: 'Procedure Gap' },
  { value: 'Design Issue', label: 'Design Issue' },
  { value: 'Unknown', label: 'Unknown' },
];

interface IncidentSectionProps {
  open: boolean;
  onClose: () => void;
  data: IncidentEntry[];
  onChange: (data: IncidentEntry[]) => void;
  projectId: string;
  propertyId?: string;
  isQuickSheet?: boolean;
}

function emptyEntry(): IncidentEntry {
  return {
    id: crypto.randomUUID(), type: '', time: new Date().toTimeString().slice(0, 5),
    personnelInvolved: '', company: '', description: '', rootCause: '',
    correctiveAction: '', reportedToOwner: false, oshaRecordable: false, photoUrls: [],
  };
}

async function createLinkedIssue(entry: IncidentEntry, projectId: string, propertyId?: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !propertyId) return;
    await supabase.from('issues').insert([{
      title: `Incident: ${entry.type} — ${entry.time}`,
      description: entry.description,
      severity: 'severe' as const,
      property_id: propertyId,
      created_by: user.id,
      source_module: 'core' as const,
    }]);
  } catch { /* silent */ }
}

export function IncidentSection({ open, onClose, data, onChange, projectId, propertyId, isQuickSheet }: IncidentSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(isQuickSheet ? '__new__' : null);
  const [draft, setDraft] = useState<IncidentEntry>(emptyEntry());
  const [photos, setPhotos] = useState<{ id: string; url: string; caption?: string; timestamp: Date }[]>([]);

  const saveEntry = async () => {
    if (!draft.description) { toast.error('Description is required'); return; }
    if (photos.length === 0) { toast.error('At least one photo is required for incidents'); return; }
    const withPhotos = { ...draft, photoUrls: photos.map(p => p.url) };
    if (editingId === '__new__') {
      onChange([...data, withPhotos]);
      await createLinkedIssue(withPhotos, projectId, propertyId);
    } else {
      onChange(data.map(e => e.id === editingId ? withPhotos : e));
    }
    setEditingId(null);
    setPhotos([]);
    if (isQuickSheet) onClose();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[95vh] p-0 flex flex-col rounded-t-2xl">
        <div className="flex items-center justify-between px-4 py-3 bg-red-900 text-white rounded-t-2xl flex-shrink-0">
          <button type="button" onClick={onClose} className="p-1">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {isQuickSheet ? 'Log Safety Incident' : '⚠️ Incidents & Near Misses'}
          </span>
          <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8" onClick={onClose}>
            <Check className="h-4 w-4 mr-1" /> Done
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!isQuickSheet && data.map(entry => (
            <div key={entry.id} className="p-3 rounded-xl border border-red-200 bg-red-50 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-red-800 truncate">{entry.type} — {entry.time}</p>
                <p className="text-sm text-red-600 truncate">{entry.description}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange(data.filter(e => e.id !== entry.id))}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}

          {editingId ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Incident Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {INCIDENT_TYPES.map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setDraft(d => ({ ...d, type: opt.value }))}
                      className={cn('p-2 rounded-lg border-2 text-sm font-semibold transition-all text-left',
                        draft.type === opt.value ? `${opt.color} border-current` : 'border-border bg-card hover:border-muted-foreground'
                      )}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Time</label>
                <Input type="time" value={draft.time} onChange={e => setDraft(d => ({ ...d, time: e.target.value }))} className="mt-1 max-w-[150px]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Personnel Involved</label>
                  <Input value={draft.personnelInvolved} onChange={e => setDraft(d => ({ ...d, personnelInvolved: e.target.value }))} placeholder="Name(s)" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Company</label>
                  <Input value={draft.company} onChange={e => setDraft(d => ({ ...d, company: e.target.value }))} placeholder="Employer" className="mt-1" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-red-600 uppercase tracking-wide">Description * (required)</label>
                  <VoiceDictation onTranscript={t => setDraft(d => ({ ...d, description: d.description ? `${d.description} ${t}` : t }))} />
                </div>
                <Textarea value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} placeholder="Describe what happened in detail..." className="min-h-[100px] border-red-300 focus:ring-red-500" />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Root Cause</label>
                <QuickPickChips options={ROOT_CAUSE_CHIPS} value={draft.rootCause} onChange={v => setDraft(d => ({ ...d, rootCause: v }))} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Corrective Action Taken</label>
                  <VoiceDictation onTranscript={t => setDraft(d => ({ ...d, correctiveAction: d.correctiveAction ? `${d.correctiveAction} ${t}` : t }))} />
                </div>
                <Textarea value={draft.correctiveAction} onChange={e => setDraft(d => ({ ...d, correctiveAction: e.target.value }))} className="min-h-[80px]" />
              </div>

              <div>
                <label className="text-xs font-medium text-red-600 uppercase tracking-wide">📷 Photos * (required)</label>
                <EnhancedPhotoUpload photos={photos} onPhotosChange={setPhotos} folderPath={`${projectId}/incidents/`} />
              </div>

              <div className="space-y-3 p-3 bg-muted rounded-xl">
                <div className="flex items-center gap-3">
                  <Checkbox id="reported" checked={draft.reportedToOwner} onCheckedChange={v => setDraft(d => ({ ...d, reportedToOwner: !!v }))} />
                  <label htmlFor="reported" className="text-sm font-medium cursor-pointer">Reported to Owner / Authority</label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox id="osha" checked={draft.oshaRecordable} onCheckedChange={v => setDraft(d => ({ ...d, oshaRecordable: !!v }))} />
                  <label htmlFor="osha" className="text-sm font-medium cursor-pointer">OSHA Recordable</label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {!isQuickSheet && <Button type="button" variant="outline" className="flex-1" onClick={() => setEditingId(null)}>Cancel</Button>}
                <Button type="button" className="flex-1 bg-red-600 hover:bg-red-700" onClick={saveEntry}>Save Incident</Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" className="w-full gap-2 border-red-300 text-red-600 hover:bg-red-50" onClick={() => { setDraft(emptyEntry()); setEditingId('__new__'); setPhotos([]); }}>
              <Plus className="h-4 w-4" /> Log Incident
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
