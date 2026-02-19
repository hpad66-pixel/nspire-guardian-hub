import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Check } from 'lucide-react';
import { QuickPickChips } from '@/components/inspections/log-sections/shared/QuickPickChips';
import { StepperInput } from '@/components/inspections/log-sections/shared/StepperInput';
import { VoiceDictation } from '@/components/ui/voice-dictation';
import { Checkbox } from '@/components/ui/checkbox';
import { EnhancedPhotoUpload } from '@/components/ui/enhanced-photo-upload';
import { useState } from 'react';

export interface SafetyData {
  toolboxTalkTopic: string;
  attendees: number;
  ppeCompliance: string;
  violationDescription: string;
  safetyObservations: string;
  jsaCompleted: boolean;
  emergencyEquipmentVerified: boolean;
  fireExtinguisherCommunicated: boolean;
  photoUrls: string[];
}

const PPE_CHIPS = [
  { value: 'Full Compliance', label: '✅ Full Compliance', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'Minor Issues', label: '⚠️ Minor Issues', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'Violations Found', label: '❌ Violations Found', color: 'bg-red-100 text-red-700 border-red-300' },
];

interface SafetySectionProps {
  open: boolean;
  onClose: () => void;
  data: SafetyData;
  onChange: (data: SafetyData) => void;
  projectId: string;
}

export function SafetySection({ open, onClose, data, onChange, projectId }: SafetySectionProps) {
  const [photos, setPhotos] = useState<{ id: string; url: string; caption?: string; timestamp: Date }[]>(
    data.photoUrls.map(url => ({ id: url, url, timestamp: new Date() }))
  );
  const update = (patch: Partial<SafetyData>) => onChange({ ...data, ...patch });

  const handleDone = () => {
    onChange({ ...data, photoUrls: photos.map(p => p.url) });
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] p-0 flex flex-col rounded-t-2xl">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white rounded-t-2xl flex-shrink-0">
          <button type="button" onClick={onClose} className="p-1">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-semibold">🦺 Safety Observations</span>
          <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8" onClick={handleDone}>
            <Check className="h-4 w-4 mr-1" /> Done
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Toolbox Talk Topic</label>
              <VoiceDictation onTranscript={t => update({ toolboxTalkTopic: t })} />
            </div>
            <Input value={data.toolboxTalkTopic} onChange={e => update({ toolboxTalkTopic: e.target.value })} placeholder="e.g., Confined space entry, Struck-by hazards" />
          </div>

          <StepperInput label="Attendees" value={data.attendees} onChange={v => update({ attendees: v })} min={0} max={500} />

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">PPE Compliance</label>
            <QuickPickChips options={PPE_CHIPS} value={data.ppeCompliance} onChange={v => update({ ppeCompliance: v })} />
          </div>

          {data.ppeCompliance === 'Violations Found' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-red-600 uppercase tracking-wide">Violation Description</label>
                <VoiceDictation onTranscript={t => update({ violationDescription: data.violationDescription ? `${data.violationDescription} ${t}` : t })} />
              </div>
              <Textarea value={data.violationDescription} onChange={e => update({ violationDescription: e.target.value })} className="min-h-[80px]" placeholder="Describe violations and corrective actions..." />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Safety Observations</label>
              <VoiceDictation onTranscript={t => update({ safetyObservations: data.safetyObservations ? `${data.safetyObservations} ${t}` : t })} />
            </div>
            <Textarea value={data.safetyObservations} onChange={e => update({ safetyObservations: e.target.value })} className="min-h-[80px]" placeholder="Positive and negative observations..." />
          </div>

          <div className="space-y-3 p-4 bg-muted rounded-xl">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Daily Safety Checklist</p>
            {[
              { key: 'jsaCompleted', label: 'JSA/JHA Completed' },
              { key: 'emergencyEquipmentVerified', label: 'Emergency Equipment Verified' },
              { key: 'fireExtinguisherCommunicated', label: 'Fire Extinguisher Location Communicated' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <Checkbox
                  id={key}
                  checked={data[key as keyof SafetyData] as boolean}
                  onCheckedChange={v => update({ [key]: !!v } as any)}
                />
                <label htmlFor={key} className="text-sm font-medium cursor-pointer">{label}</label>
              </div>
            ))}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Photos (optional)</label>
            <EnhancedPhotoUpload photos={photos} onPhotosChange={setPhotos} folderPath={`${projectId}/safety/`} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
