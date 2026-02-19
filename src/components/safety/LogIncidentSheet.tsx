import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { useLogIncident, type SourceType, type LogIncidentPayload } from '@/hooks/useSafety';
import { CheckCircle2, ChevronLeft, ChevronRight, MapPin, TriangleAlert, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface LogIncidentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceType: SourceType;
  sourceId?: string;
  sourceName?: string;
  onSuccess?: () => void;
}

type InjuryInvolvement = 'yes' | 'no' | 'near_miss';

interface FormState {
  // Step 1
  incident_date: string;
  incident_time: string;
  what_happened: string;
  location_description: string;
  // Step 2
  injury_involvement: InjuryInvolvement;
  injured_employee_name: string;
  injured_employee_job_title: string;
  injury_icon: string;
  body_part_affected: string;
  witness_name: string;
  witness_contact: string;
  // Step 3
  medical_treatment: string;
  physician_name: string;
  resulted_in_days_away: boolean;
  resulted_in_transfer: boolean;
  // Step 4
  confirmed: boolean;
}

const INJURY_ICONS = [
  { id: 'physical', emoji: '🤕', label: 'Physical injury' },
  { id: 'illness', emoji: '🫁', label: 'Illness / respiratory' },
  { id: 'eye', emoji: '👁️', label: 'Eye injury' },
  { id: 'hearing', emoji: '🦻', label: 'Hearing' },
  { id: 'hazmat', emoji: '☠️', label: 'Hazmat / chemical' },
  { id: 'first_aid', emoji: '🩹', label: 'Minor — first aid only' },
];

const BODY_PARTS = [
  'Head / neck', 'Back / spine', 'Arm / shoulder',
  'Hand / fingers', 'Leg / knee', 'Foot / ankle',
  'Eye', 'Multiple', 'Other',
];

const MEDICAL_OPTIONS = [
  { id: 'none', emoji: '🩹', label: 'None / First aid only' },
  { id: 'physician', emoji: '🏥', label: 'Saw a doctor or clinic' },
  { id: 'emergency_room', emoji: '🚑', label: 'Emergency room visit' },
  { id: 'hospitalized', emoji: '🛏️', label: 'Hospitalized overnight' },
];

const defaultForm = (): FormState => ({
  incident_date: format(new Date(), 'yyyy-MM-dd'),
  incident_time: format(new Date(), 'HH:mm'),
  what_happened: '',
  location_description: '',
  injury_involvement: 'yes',
  injured_employee_name: '',
  injured_employee_job_title: '',
  injury_icon: '',
  body_part_affected: '',
  witness_name: '',
  witness_contact: '',
  medical_treatment: '',
  physician_name: '',
  resulted_in_days_away: false,
  resulted_in_transfer: false,
  confirmed: false,
});

// ─────────────────────────────────────────────────────────────────────────────
// Progress indicator
// ─────────────────────────────────────────────────────────────────────────────

function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 px-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-1 flex-1 rounded-full transition-all duration-300',
            i < current ? 'bg-primary' : 'bg-muted'
          )}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function LogIncidentSheet({
  open,
  onOpenChange,
  sourceType,
  sourceId,
  sourceName,
  onSuccess,
}: LogIncidentSheetProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [submitted, setSubmitted] = useState(false);
  const [submittedCaseNumber, setSubmittedCaseNumber] = useState('');
  const logIncident = useLogIncident();

  const totalSteps = form.injury_involvement === 'near_miss' ? 3 : 4;

  function updateForm(partial: Partial<FormState>) {
    setForm(prev => ({ ...prev, ...partial }));
  }

  function handleClose() {
    if (!logIncident.isPending) {
      setStep(1);
      setForm(defaultForm());
      setSubmitted(false);
      onOpenChange(false);
    }
  }

  function canProceedStep1() {
    return form.what_happened.trim().length > 0 && form.location_description.trim().length > 0;
  }

  function canProceedStep2() {
    if (form.injury_involvement === 'yes') {
      return form.injured_employee_name.trim().length > 0;
    }
    return true;
  }

  function getEffectiveStep() {
    // Near miss: skip step 3 (medical)
    if (form.injury_involvement === 'near_miss' && step === 3) return 4;
    return step;
  }

  async function handleSubmit() {
    const payload: LogIncidentPayload = {
      source_type: sourceType,
      source_id: sourceId,
      incident_date: form.incident_date,
      incident_time: form.incident_time || undefined,
      location_description: sourceName ?? form.location_description,
      what_happened: form.what_happened,
      injured_employee_name: form.injury_involvement === 'yes' ? form.injured_employee_name : 'N/A',
      injured_employee_job_title: form.injured_employee_job_title || undefined,
      injury_involved: form.injury_involvement === 'yes',
      injury_icon: form.injury_icon || undefined,
      body_part_affected: form.body_part_affected || undefined,
      witness_name: form.witness_name || undefined,
      witness_contact: form.witness_contact || undefined,
      medical_treatment: form.medical_treatment || undefined,
      physician_name: form.physician_name || undefined,
      resulted_in_days_away: form.resulted_in_days_away,
      resulted_in_transfer: form.resulted_in_transfer,
    };

    try {
      const result = await logIncident.mutateAsync(payload);
      setSubmittedCaseNumber(result.case_number ?? '');
      setSubmitted(true);
      onSuccess?.();
    } catch {
      // error toast handled in hook
    }
  }

  function nextStep() {
    if (form.injury_involvement === 'near_miss' && step === 2) {
      setStep(4); // skip medical step for near miss
    } else {
      setStep(s => Math.min(s + 1, 4));
    }
  }

  // ── Success screen ──
  if (submitted) {
    return (
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-2xl sm:side-right sm:rounded-l-2xl sm:rounded-t-none sm:h-full sm:max-h-full">
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-4">
            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Incident reported</h2>
              <p className="text-muted-foreground mt-2">
                Your supervisor has been notified.
                {submittedCaseNumber && (
                  <> Case <span className="font-semibold text-foreground">#{submittedCaseNumber}</span></>
                )}
              </p>
            </div>
            <Button className="w-full max-w-xs" onClick={handleClose}>Done</Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="bottom"
        className="h-[95dvh] rounded-t-2xl flex flex-col sm:right-0 sm:top-0 sm:h-full sm:w-[480px] sm:max-w-[480px] sm:rounded-l-2xl sm:rounded-t-none sm:border-l sm:bottom-auto"
      >
        <SheetHeader className="px-6 pt-6 pb-2 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TriangleAlert className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground font-medium">Step {step} of {totalSteps}</span>
            </div>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <StepProgress current={step} total={totalSteps} />
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

          {/* ── STEP 1 — What happened ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <SheetTitle className="text-2xl font-bold">Log a Safety Incident</SheetTitle>
                <p className="text-muted-foreground text-sm mt-1">Takes about 2 minutes</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.incident_date}
                    onChange={e => updateForm({ incident_date: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="time">Time <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    id="time"
                    type="time"
                    value={form.incident_time}
                    onChange={e => updateForm({ incident_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="what">What happened?</Label>
                <Textarea
                  id="what"
                  placeholder="Describe what happened in your own words. Don't worry about technical terms."
                  value={form.what_happened}
                  onChange={e => updateForm({ what_happened: e.target.value })}
                  className="min-h-[120px] resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="location">Where did it happen?</Label>
                {sourceName ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/60 border text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1">{sourceName}</span>
                  </div>
                ) : (
                  <Input
                    id="location"
                    placeholder="Building, floor, room, or area..."
                    value={form.location_description}
                    onChange={e => updateForm({ location_description: e.target.value })}
                  />
                )}
              </div>
            </div>
          )}

          {/* ── STEP 2 — Who was involved ── */}
          {step === 2 && (
            <div className="space-y-5">
              <SheetTitle className="text-2xl font-bold">Who was involved?</SheetTitle>

              {/* Injury toggle */}
              <div className="space-y-2">
                <Label>Was anyone injured or hurt?</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'yes' as InjuryInvolvement, label: '🤕 Yes' },
                    { id: 'no' as InjuryInvolvement, label: '✅ No' },
                    { id: 'near_miss' as InjuryInvolvement, label: '⚠️ Near miss' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => updateForm({ injury_involvement: opt.id })}
                      className={cn(
                        'flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-medium transition-all',
                        form.injury_involvement === opt.id
                          ? 'border-primary bg-primary/8 text-primary'
                          : 'border-border hover:border-muted-foreground/40'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.injury_involvement === 'yes' && (
                <>
                  <div className="space-y-1.5">
                    <Label>Employee name</Label>
                    <Input
                      placeholder="Full name or 'Unknown subcontractor'"
                      value={form.injured_employee_name}
                      onChange={e => updateForm({ injured_employee_name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Job title <span className="text-muted-foreground">(optional)</span></Label>
                    <Input
                      placeholder="e.g. Laborer, Carpenter..."
                      value={form.injured_employee_job_title}
                      onChange={e => updateForm({ injured_employee_job_title: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Type of injury or illness</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {INJURY_ICONS.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => updateForm({ injury_icon: opt.id })}
                          className={cn(
                            'flex items-center gap-2.5 p-3 rounded-xl border text-xs text-left font-medium transition-all',
                            form.injury_icon === opt.id
                              ? 'border-primary bg-primary/8 text-primary'
                              : 'border-border hover:border-muted-foreground/40'
                          )}
                        >
                          <span className="text-lg">{opt.emoji}</span>
                          <span className="leading-tight">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Part of the body affected</Label>
                    <div className="flex flex-wrap gap-2">
                      {BODY_PARTS.map(part => (
                        <button
                          key={part}
                          onClick={() => updateForm({ body_part_affected: part })}
                          className={cn(
                            'px-3 py-1.5 rounded-full border text-xs font-medium transition-all',
                            form.body_part_affected === part
                              ? 'border-primary bg-primary/8 text-primary'
                              : 'border-border hover:border-muted-foreground/40'
                          )}
                        >
                          {part}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {form.injury_involvement === 'near_miss' && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                  <p className="text-sm text-amber-700 font-medium">Thank you for reporting this.</p>
                  <p className="text-sm text-amber-600 mt-1">
                    Near misses are just as important to document — they help prevent future injuries.
                  </p>
                </div>
              )}

              <div className="space-y-3 pt-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wide">Witnesses (optional)</Label>
                <Input
                  placeholder="Witness name"
                  value={form.witness_name}
                  onChange={e => updateForm({ witness_name: e.target.value })}
                />
                <Input
                  placeholder="Witness contact (phone or email)"
                  value={form.witness_contact}
                  onChange={e => updateForm({ witness_contact: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* ── STEP 3 — Medical care (skip for near miss) ── */}
          {step === 3 && form.injury_involvement !== 'near_miss' && (
            <div className="space-y-5">
              <SheetTitle className="text-2xl font-bold">What care was needed?</SheetTitle>

              <div className="space-y-2">
                <Label>Medical treatment received</Label>
                <div className="space-y-2">
                  {MEDICAL_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => updateForm({ medical_treatment: opt.id })}
                      className={cn(
                        'w-full flex items-center gap-3 p-3.5 rounded-xl border text-sm text-left font-medium transition-all',
                        form.medical_treatment === opt.id
                          ? 'border-primary bg-primary/8 text-primary'
                          : 'border-border hover:border-muted-foreground/40'
                      )}
                    >
                      <span className="text-xl">{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {form.medical_treatment && form.medical_treatment !== 'none' && (
                <div className="space-y-1.5">
                  <Label>Doctor or facility name <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    placeholder="e.g. Miami Urgent Care..."
                    value={form.physician_name}
                    onChange={e => updateForm({ physician_name: e.target.value })}
                  />
                </div>
              )}

              <div className="space-y-3">
                <Label>Did the person: <span className="text-muted-foreground font-normal">(check all that apply)</span></Label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={form.resulted_in_days_away}
                    onCheckedChange={v => updateForm({ resulted_in_days_away: !!v })}
                  />
                  <span className="text-sm">Miss work because of this</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={form.resulted_in_transfer}
                    onCheckedChange={v => updateForm({ resulted_in_transfer: !!v })}
                  />
                  <span className="text-sm">Get moved to light duty / different job</span>
                </label>
              </div>

              {/* Photo upload placeholder */}
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
                <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">Add photos</p>
                <p className="text-xs text-muted-foreground mt-1">Photos of the scene (optional)</p>
              </div>
            </div>
          )}

          {/* ── STEP 4 — Review & Submit ── */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <SheetTitle className="text-2xl font-bold">Review & Submit</SheetTitle>
                <p className="text-muted-foreground text-sm mt-1">Your supervisor will be notified</p>
              </div>

              {/* Summary */}
              <div className="rounded-xl border bg-muted/30 divide-y text-sm">
                <div className="px-4 py-3 grid grid-cols-[100px_1fr] gap-2">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{format(new Date(form.incident_date), 'MMMM d, yyyy')}{form.incident_time && ` at ${form.incident_time}`}</span>
                </div>
                <div className="px-4 py-3 grid grid-cols-[100px_1fr] gap-2">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium">{sourceName ?? form.location_description}</span>
                </div>
                <div className="px-4 py-3 grid grid-cols-[100px_1fr] gap-2">
                  <span className="text-muted-foreground">What happened</span>
                  <span className="font-medium line-clamp-3">{form.what_happened}</span>
                </div>
                <div className="px-4 py-3 grid grid-cols-[100px_1fr] gap-2">
                  <span className="text-muted-foreground">Involved</span>
                  <span className="font-medium">
                    {form.injury_involvement === 'near_miss' ? 'Near miss — no one hurt' :
                     form.injury_involvement === 'no' ? 'No injuries' :
                     form.injured_employee_name}
                  </span>
                </div>
                {form.medical_treatment && (
                  <div className="px-4 py-3 grid grid-cols-[100px_1fr] gap-2">
                    <span className="text-muted-foreground">Treatment</span>
                    <span className="font-medium capitalize">{form.medical_treatment.replace('_', ' ')}</span>
                  </div>
                )}
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={form.confirmed}
                  onCheckedChange={v => updateForm({ confirmed: !!v })}
                  className="mt-0.5"
                />
                <span className="text-sm text-muted-foreground">
                  I confirm this information is accurate to the best of my knowledge
                </span>
              </label>
            </div>
          )}
        </div>

        {/* ── Navigation footer ── */}
        <div className="flex-shrink-0 px-6 pb-8 pt-4 border-t flex gap-3">
          {step > 1 && (
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                if (form.injury_involvement === 'near_miss' && step === 4) {
                  setStep(2);
                } else {
                  setStep(s => s - 1);
                }
              }}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          )}

          {step < 4 ? (
            <Button
              className="flex-1 gap-1.5"
              disabled={step === 1 ? !canProceedStep1() : step === 2 ? !canProceedStep2() : false}
              onClick={nextStep}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              className="flex-1"
              disabled={!form.confirmed || logIncident.isPending}
              onClick={handleSubmit}
            >
              {logIncident.isPending ? 'Submitting...' : 'Submit Report'}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

