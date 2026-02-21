import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useClassifyIncident, type SafetyIncident, type ClassifyIncidentPayload, type IncidentStatus } from '@/hooks/useSafety';
import { IncidentStatusBadge } from './IncidentStatusBadge';
import { ChevronDown, Info, MapPin, Clock, User, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ClassifyIncidentDrawerProps {
  incident: SafetyIncident | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type RecordableChoice = 'yes' | 'no' | 'near_miss' | 'investigating' | null;

const INJURY_TYPES = [
  { id: 'injury', label: 'Injury' },
  { id: 'skin_disorder', label: 'Skin Disorder' },
  { id: 'respiratory', label: 'Respiratory Condition' },
  { id: 'poisoning', label: 'Poisoning' },
  { id: 'hearing_loss', label: 'Hearing Loss' },
  { id: 'other_illness', label: 'All Other Illnesses' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ClassifyIncidentDrawer({ incident, open, onOpenChange }: ClassifyIncidentDrawerProps) {
  const classify = useClassifyIncident();

  // Classification form state
  const [caseNumber, setCaseNumber] = useState('');
  const [privacyCase, setPrivacyCase] = useState(false);
  const [recordable, setRecordable] = useState<RecordableChoice>(null);
  const [outcomes, setOutcomes] = useState({
    daysAway: false,
    transfer: false,
    other: false,
    death: false,
  });
  const [daysAway, setDaysAway] = useState('0');
  const [daysTransfer, setDaysTransfer] = useState('0');
  const [injuryType, setInjuryType] = useState('injury');
  const [physician, setPhysician] = useState('');
  const [facility, setFacility] = useState('');
  const [erVisit, setErVisit] = useState(false);
  const [hospitalized, setHospitalized] = useState(false);
  const [correctiveActions, setCorrectiveActions] = useState('');
  const [correctiveDue, setCorrectiveDue] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');

  // Pre-fill from incident
  useEffect(() => {
    if (!incident) return;
    setCaseNumber(incident.case_number ?? '');
    setPrivacyCase(incident.is_privacy_case);
    setInjuryType(incident.injury_type ?? 'injury');
    setPhysician(incident.physician_name ?? '');
    setFacility(incident.facility_name ?? '');
    setCorrectiveActions(incident.corrective_actions ?? '');
    setCorrectiveDue(incident.corrective_actions_due ?? '');
    setReviewNotes(incident.review_notes ?? '');
    setDaysAway(String(incident.days_away_from_work ?? 0));
    setDaysTransfer(String(incident.days_on_job_transfer ?? 0));
    setOutcomes({
      daysAway: incident.resulted_in_days_away,
      transfer: incident.resulted_in_transfer,
      other: incident.resulted_in_other_recordable,
      death: incident.resulted_in_death,
    });
    if (incident.is_osha_recordable === true) setRecordable('yes');
    else if (incident.is_osha_recordable === false) {
      if (incident.incident_classification === 'near_miss') setRecordable('near_miss');
      else setRecordable('no');
    } else {
      setRecordable(null);
    }
  }, [incident]);

  async function handleSave(close = false) {
    if (!incident) return;

    const payload: ClassifyIncidentPayload = {
      id: incident.id,
      case_number: caseNumber,
      is_privacy_case: privacyCase,
      is_osha_recordable: recordable === 'yes' ? true : recordable === 'no' ? false : recordable === 'near_miss' ? false : null,
      incident_classification:
        recordable === 'near_miss' ? 'near_miss' :
        recordable === 'no' ? 'first_aid_only' :
        recordable === 'yes' ? 'injury' : undefined,
      injury_type: injuryType,
      resulted_in_death: outcomes.death,
      resulted_in_days_away: outcomes.daysAway,
      resulted_in_transfer: outcomes.transfer,
      resulted_in_other_recordable: outcomes.other,
      days_away_from_work: parseInt(daysAway) || 0,
      days_on_job_transfer: parseInt(daysTransfer) || 0,
      physician_name: physician || undefined,
      facility_name: facility || undefined,
      corrective_actions: correctiveActions || undefined,
      corrective_actions_due: correctiveDue || undefined,
      review_notes: reviewNotes || undefined,
      status: close ? 'closed' : 'classified',
    };

    await classify.mutateAsync(payload);
    if (close) onOpenChange(false);
  }

  if (!incident) return null;

  const sourceLabelMap: Record<string, string> = {
    project: 'Project',
    grounds_inspection: 'Grounds Inspection',
    work_order: 'Work Order',
    standalone: 'Safety Log',
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl p-0 flex flex-col h-full"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <SheetTitle className="text-xl">Classify Incident</SheetTitle>
              {incident.case_number && (
                <p className="text-sm text-muted-foreground mt-0.5">Case #{incident.case_number}</p>
              )}
            </div>
            <IncidentStatusBadge
              status={incident.status}
              isOshaRecordable={incident.is_osha_recordable}
              classification={incident.incident_classification}
            />
          </div>
        </SheetHeader>

        {/* Two-panel body */}
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT — Original report (read-only) */}
          <div className="hidden lg:flex flex-col w-80 flex-shrink-0 border-r overflow-y-auto bg-muted/20">
            <div className="p-5 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Original Report</p>
                <p className="text-xs text-muted-foreground italic">Exactly as submitted by the field worker</p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{format(new Date(incident.incident_date), 'MMMM d, yyyy')}</p>
                    {incident.incident_time && <p className="text-muted-foreground">{incident.incident_time.slice(0, 5)}</p>}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p>{incident.location_description}</p>
                </div>
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{incident.injured_employee_name}</p>
                    {incident.injured_employee_job_title && (
                      <p className="text-muted-foreground">{incident.injured_employee_job_title}</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">In their own words:</p>
                <div className="rounded-lg bg-background border p-3">
                  <p className="text-sm leading-relaxed">{incident.what_happened}</p>
                </div>
              </div>

              {incident.medical_treatment && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Medical treatment</p>
                  <Badge variant="outline" className="capitalize">
                    {incident.medical_treatment.replace('_', ' ')}
                  </Badge>
                </div>
              )}

              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  Reported by {incident.reporter?.full_name ?? incident.reporter?.email ?? 'Unknown'}{' '}
                  {format(new Date(incident.reported_at), 'MMM d, yyyy h:mm a')}
                </span>
              </div>

              {incident.source_type && (
                <div>
                  <p className="text-xs text-muted-foreground">
                    Source: {sourceLabelMap[incident.source_type] ?? incident.source_type}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Classification panel */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-7">

              {/* Info box */}
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 flex gap-3">
                <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  <strong>How school assignment works:</strong> Individual assignments always take priority over organization assignments. An incident is OSHA recordable if it results in death, days away from work, restricted work, medical treatment beyond first aid, or loss of consciousness.
                </p>
              </div>

              {/* Section 1 — Case Management */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Case Management</h3>

                <div className="space-y-1.5">
                  <Label>Case Number</Label>
                  <Input value={caseNumber} onChange={e => setCaseNumber(e.target.value)} placeholder="e.g. 2024-001" />
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl border bg-muted/30">
                  <Switch checked={privacyCase} onCheckedChange={setPrivacyCase} id="privacy" />
                  <div>
                    <Label htmlFor="privacy" className="cursor-pointer">Privacy Case</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Employee name will be withheld on the OSHA 300 log (for sensitive injuries).
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2 — Is this OSHA Recordable */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">OSHA Recordability</h3>

                <div className="space-y-2">
                  {[
                    { id: 'yes', icon: '🔴', label: 'Yes — this is OSHA recordable' },
                    { id: 'no', icon: '🩹', label: 'No — first aid only / not recordable' },
                    { id: 'near_miss', icon: '⚠️', label: 'Near miss — no injury occurred' },
                    { id: 'investigating', icon: '🔍', label: 'Still investigating' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setRecordable(opt.id as RecordableChoice)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3.5 rounded-xl border text-sm text-left font-medium transition-all',
                        recordable === opt.id
                          ? 'border-primary bg-primary/8 text-primary'
                          : 'border-border hover:border-muted-foreground/40'
                      )}
                    >
                      <span className="text-lg">{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 3 — Outcome (only if recordable=yes) */}
              {recordable === 'yes' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Outcome</h3>

                  <div className="space-y-3">
                    {[
                      { key: 'daysAway' as const, label: 'Days away from work' },
                      { key: 'transfer' as const, label: 'Job transfer or restriction' },
                      { key: 'other' as const, label: 'Other recordable' },
                      { key: 'death' as const, label: 'Death' },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-3 cursor-pointer">
                        <Checkbox
                          checked={outcomes[key]}
                          onCheckedChange={v => setOutcomes(o => ({ ...o, [key]: !!v }))}
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>

                  {outcomes.daysAway && (
                    <div className="space-y-1.5">
                      <Label>Days away from work</Label>
                      <Input type="number" min="0" value={daysAway} onChange={e => setDaysAway(e.target.value)} className="w-32" />
                    </div>
                  )}
                  {outcomes.transfer && (
                    <div className="space-y-1.5">
                      <Label>Days on transfer / restriction</Label>
                      <Input type="number" min="0" value={daysTransfer} onChange={e => setDaysTransfer(e.target.value)} className="w-32" />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Injury / Illness Type (OSHA categories)</Label>
                    <div className="space-y-2">
                      {INJURY_TYPES.map(t => (
                        <label key={t.id} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="injuryType"
                            value={t.id}
                            checked={injuryType === t.id}
                            onChange={() => setInjuryType(t.id)}
                            className="h-4 w-4 text-primary"
                          />
                          <span className="text-sm">{t.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Section 4 — Medical details */}
              {recordable === 'yes' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Medical Details</h3>

                  <div className="space-y-1.5">
                    <Label>Physician / healthcare professional</Label>
                    <Input value={physician} onChange={e => setPhysician(e.target.value)} placeholder="Dr. Name or clinic" />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Treatment facility</Label>
                    <Input value={facility} onChange={e => setFacility(e.target.value)} placeholder="Hospital or clinic name" />
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox checked={erVisit} onCheckedChange={v => setErVisit(!!v)} />
                      <span className="text-sm">Emergency room visit</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox checked={hospitalized} onCheckedChange={v => setHospitalized(!!v)} />
                      <span className="text-sm">Hospitalized overnight</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Section 5 — Corrective Actions */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Corrective Actions</h3>

                <div className="space-y-1.5">
                  <Label>Actions taken or planned</Label>
                  <Textarea
                    value={correctiveActions}
                    onChange={e => setCorrectiveActions(e.target.value)}
                    placeholder="Describe corrective actions taken or planned to prevent recurrence..."
                    className="min-h-[80px] resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Due date for corrective actions</Label>
                  <Input type="date" value={correctiveDue} onChange={e => setCorrectiveDue(e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label>Review notes <span className="text-muted-foreground">(internal)</span></Label>
                  <Textarea
                    value={reviewNotes}
                    onChange={e => setReviewNotes(e.target.value)}
                    placeholder="Internal notes for the record..."
                    className="min-h-[60px] resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex-shrink-0 border-t px-6 py-4 flex gap-3">
          <Button
            variant="outline"
            onClick={() => handleSave(true)}
            disabled={classify.isPending}
          >
            Mark as Closed
          </Button>
          <Button
            className="flex-1"
            onClick={() => handleSave(false)}
            disabled={classify.isPending}
          >
            {classify.isPending ? 'Saving...' : 'Save Classification'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
