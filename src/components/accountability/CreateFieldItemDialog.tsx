import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { VoiceDictationTextareaWithAI } from '@/components/ui/voice-dictation-textarea-ai';
import { useFieldAccountability, type FieldBallInCourt, type FieldPhoto, type FieldSeverity } from '@/hooks/useFieldAccountability';
import { toast } from 'sonner';

const CATEGORIES = [
  ['life_safety', 'Life safety'], ['water_intrusion', 'Water intrusion'], ['building_envelope', 'Building envelope'],
  ['grounds', 'Grounds'], ['cleanliness', 'Cleanliness'], ['electrical', 'Electrical'], ['plumbing', 'Plumbing'],
  ['hvac', 'HVAC'], ['structural', 'Structural'], ['accessibility', 'Accessibility'], ['security', 'Security'], ['other', 'Other'],
];

interface CreateFieldItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  propertyId?: string | null;
  photo?: FieldPhoto | null;
}

export function CreateFieldItemDialog({ open, onOpenChange, projectId, propertyId, photo }: CreateFieldItemDialogProps) {
  const { createItem } = useFieldAccountability(projectId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [severity, setSeverity] = useState<FieldSeverity>('medium');
  const [locationLabel, setLocationLabel] = useState('');
  const [ballInCourt, setBallInCourt] = useState<FieldBallInCourt>('property_management');
  const [dueDate, setDueDate] = useState('');
  const [ownerVisible, setOwnerVisible] = useState(true);
  const [ownerVerification, setOwnerVerification] = useState(false);

  useEffect(() => {
    if (!open) return;
    const suggestion = photo?.ai_suggestion ?? {};
    const suggestedCaption = typeof suggestion.caption === 'string' ? suggestion.caption : '';
    const suggestedCategory = CATEGORIES.some(([value]) => value === suggestion.category) ? String(suggestion.category) : 'other';
    const suggestedSeverity = ['low', 'medium', 'high', 'critical'].includes(String(suggestion.severity)) ? String(suggestion.severity) as FieldSeverity : 'medium';
    const clues = Array.isArray(suggestion.visible_location_clues) ? suggestion.visible_location_clues.filter((value): value is string => typeof value === 'string') : [];
    setTitle(suggestedCaption || photo?.photo.caption || '');
    setDescription(suggestedCaption || photo?.photo.caption || '');
    setLocationLabel(clues.join(' · '));
    setCategory(suggestedCategory);
    setSeverity(suggestedSeverity);
  }, [open, photo]);

  async function save() {
    if (!title.trim()) return toast.error('Add a clear condition title');
    try {
      await createItem.mutateAsync({
        title,
        description,
        category,
        severity,
        locationLabel,
        ballInCourt,
        dueDate: dueDate || null,
        propertyId,
        visitId: photo?.visit_id,
        ownerVisible,
        ownerVerificationRequired: ownerVerification || severity === 'critical',
        photoLinkIds: photo ? [photo.id] : [],
      });
      toast.success('Accountability item created and assigned');
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Could not create the item');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94dvh] max-w-2xl overflow-y-auto sm:rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Create accountable item</DialogTitle>
          <DialogDescription>Turn the observation into a clear obligation with an owner, due date, and evidence path.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {photo && (
            <div className="flex items-center gap-3 rounded-2xl border bg-slate-50 p-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div><p className="text-sm font-semibold">1 observation photograph attached</p><p className="text-xs text-muted-foreground">It remains linked to the original site walk.</p></div>
            </div>
          )}
          <div className="space-y-2">
            <Label>Condition title</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Standing water at north stair" className="h-11" />
          </div>
          <div className="space-y-2">
            <Label>What was observed?</Label>
            <VoiceDictationTextareaWithAI value={description} onValueChange={setDescription} context="site_photo" placeholder="State only what is visible or confirmed…" className="min-h-28" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Category</Label><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Severity</Label><Select value={severity} onValueChange={(value) => setSeverity(value as FieldSeverity)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Location</Label><Input value={locationLabel} onChange={(event) => setLocationLabel(event.target.value)} placeholder="Building 5 · north stair" /></div>
            <div className="space-y-2"><Label>Due date</Label><Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Ball in court</Label><Select value={ballInCourt} onValueChange={(value) => setBallInCourt(value as FieldBallInCourt)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="property_management">Property management</SelectItem><SelectItem value="maintenance">Maintenance crew</SelectItem><SelectItem value="apas">APAS / consultant</SelectItem><SelectItem value="vendor">Vendor</SelectItem><SelectItem value="owner">Owner</SelectItem></SelectContent></Select></div>
          </div>

          <div className="space-y-3 rounded-2xl border p-4">
            <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">Show in client portal</p><p className="text-xs text-muted-foreground">Only client-visible notes and evidence will appear.</p></div><Switch checked={ownerVisible} onCheckedChange={setOwnerVisible} /></div>
            <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">Require owner acceptance</p><p className="text-xs text-muted-foreground">Recommended for critical, repeat, or owner-originated conditions.</p></div><Switch checked={ownerVerification || severity === 'critical'} disabled={severity === 'critical'} onCheckedChange={setOwnerVerification} /></div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-emerald-700" /> Every status change is audited.</span>
            <div className="flex gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={createItem.isPending || !title.trim()} className="bg-[#0d6b57] hover:bg-[#095746]">{createItem.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create & assign</Button></div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
