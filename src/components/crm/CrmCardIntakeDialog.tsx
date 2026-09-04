import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Camera,
  Check,
  ChevronRight,
  ExternalLink,
  FileImage,
  Loader2,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  TriangleAlert,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCrmCategories, useCrmIntakeActions, useCrmIntakes } from '@/hooks/useCrmIntegration';
import {
  readDuplicateCandidates,
  readSuggestedContact,
  STATE_COPY,
  validateCardFile,
  type ContactProposal,
} from '@/lib/crm-integration/contract';
import { cn } from '@/lib/utils';

type ProjectChoice = { id: string; name: string };
type Step = 'capture' | 'review' | 'approval' | 'status';
type ContactFields = ContactProposal['contact'];

const fieldDefinitions: Array<{ key: keyof ContactFields; label: string; placeholder: string }> = [
  { key: 'displayName', label: 'Display name', placeholder: 'Name shown on the card' },
  { key: 'jobTitle', label: 'Title', placeholder: 'Role or title' },
  { key: 'companyName', label: 'Company', placeholder: 'Company name' },
  { key: 'email', label: 'Email', placeholder: 'name@company.com' },
  { key: 'phone', label: 'Phone', placeholder: 'Business phone' },
  { key: 'mobile', label: 'Mobile', placeholder: 'Mobile phone' },
  { key: 'website', label: 'Website', placeholder: 'https://…' },
  { key: 'address', label: 'Address', placeholder: 'Mailing address' },
];

function FilePicker({
  label,
  required,
  file,
  onChange,
}: {
  label: string;
  required?: boolean;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const id = `crm-card-${label.toLowerCase()}`;
  return (
    <label htmlFor={id} className={cn(
      'group flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-4 text-center transition-colors',
      file ? 'border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20' : 'hover:border-primary/50 hover:bg-muted/40',
    )}>
      <input
        id={id}
        type="file"
        className="sr-only"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        capture="environment"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <div className={cn('mb-2 rounded-full p-2.5', file ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground')}>
        {file ? <Check className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
      </div>
      <span className="text-sm font-semibold">{label}{required ? ' · required' : ' · optional'}</span>
      <span className="mt-1 max-w-full truncate text-xs text-muted-foreground">
        {file ? file.name : 'Take a photo or choose a file'}
      </span>
    </label>
  );
}

function StepRail({ step }: { step: Step }) {
  const steps: Array<{ value: Step; label: string }> = [
    { value: 'capture', label: 'Capture' },
    { value: 'review', label: 'Review' },
    { value: 'approval', label: 'Approve' },
    { value: 'status', label: 'CRM review' },
  ];
  const current = steps.findIndex((item) => item.value === step);
  return (
    <div className="grid grid-cols-4 gap-1" aria-label="Card intake progress">
      {steps.map((item, index) => (
        <div key={item.value} className="min-w-0">
          <div className={cn('h-1 rounded-full', index <= current ? 'bg-primary' : 'bg-muted')} />
          <div className={cn('mt-1 truncate text-[10px] font-medium', index === current ? 'text-foreground' : 'text-muted-foreground')}>{item.label}</div>
        </div>
      ))}
    </div>
  );
}

export function CrmCardIntakeDialog({
  open,
  onOpenChange,
  projects,
  initialProjectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectChoice[];
  initialProjectId?: string;
}) {
  const [step, setStep] = useState<Step>('capture');
  const [projectId, setProjectId] = useState(initialProjectId ?? '');
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [sourceContext, setSourceContext] = useState({ whereMet: '', eventOrLocation: '', introducer: '', projectPrivateNotes: '' });
  const [shareNote, setShareNote] = useState(false);
  const [contact, setContact] = useState<ContactFields>({});
  const [projectRole, setProjectRole] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [duplicateDecision, setDuplicateDecision] = useState<ContactProposal['duplicateDecision'] | ''>('');
  const [duplicateContactId, setDuplicateContactId] = useState('');
  const [activeIntakeId, setActiveIntakeId] = useState('');
  const [reviewPayload, setReviewPayload] = useState<Record<string, unknown>>({});
  const [approval, setApproval] = useState<{
    approvalId: string;
    approvalToken: string;
    proposalHash: string;
    expiresAt: string;
    exactPreview: ContactProposal;
  } | null>(null);
  const [clientRequestId, setClientRequestId] = useState(() => crypto.randomUUID());

  const actions = useCrmIntakeActions(projectId || undefined);
  const categories = useCrmCategories(projectId || undefined);
  const { data: intakes = [] } = useCrmIntakes(projectId || undefined);
  const activeIntake = intakes.find((item) => item.id === activeIntakeId);
  const duplicates = useMemo(() => readDuplicateCandidates(reviewPayload), [reviewPayload]);

  useEffect(() => {
    if (open && initialProjectId) setProjectId(initialProjectId);
  }, [open, initialProjectId]);

  const reset = () => {
    setStep('capture');
    setProjectId(initialProjectId ?? '');
    setFront(null);
    setBack(null);
    setSourceContext({ whereMet: '', eventOrLocation: '', introducer: '', projectPrivateNotes: '' });
    setShareNote(false);
    setContact({});
    setProjectRole('');
    setSelectedCategories([]);
    setDuplicateDecision('');
    setDuplicateContactId('');
    setActiveIntakeId('');
    setReviewPayload({});
    setApproval(null);
    setClientRequestId(crypto.randomUUID());
  };

  const setOpen = (next: boolean) => {
    onOpenChange(next);
    if (!next) window.setTimeout(reset, 150);
  };

  const scanCard = async () => {
    if (!projectId) return toast.error('Choose the project this contact belongs to.');
    if (!front) return toast.error('Add the front of the business card.');
    const frontError = validateCardFile(front);
    const backError = back ? validateCardFile(back) : null;
    if (frontError || backError) return toast.error(frontError || backError!);
    try {
      const result = await actions.scan.mutateAsync({
        front,
        back,
        clientRequestId,
        sourceContext,
      });
      setActiveIntakeId(result.intakeId);
      setReviewPayload(result.reviewPayload);
      setContact(readSuggestedContact(result.reviewPayload));
      const matches = readDuplicateCandidates(result.reviewPayload);
      setDuplicateDecision(matches.length ? '' : 'create');
      setStep('review');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The card could not be submitted.');
    }
  };

  const proposal: ContactProposal | null = useMemo(() => {
    if (!categories.data || !duplicateDecision) return null;
    return {
      contact,
      duplicateDecision,
      ...(duplicateContactId ? { duplicateContactId } : {}),
      requestedCategoryIds: selectedCategories,
      catalogVersion: categories.data.catalogVersion,
      projectRole: projectRole || null,
      promotedSourceContext: {
        ...(sourceContext.whereMet ? { whereMet: sourceContext.whereMet } : {}),
        ...(sourceContext.eventOrLocation ? { eventOrLocation: sourceContext.eventOrLocation } : {}),
        ...(sourceContext.introducer ? { introducer: sourceContext.introducer } : {}),
        ...(shareNote && sourceContext.projectPrivateNotes ? { notes: sourceContext.projectPrivateNotes } : {}),
      },
    };
  }, [categories.data, contact, duplicateContactId, duplicateDecision, projectRole, selectedCategories, shareNote, sourceContext]);

  const prepareApproval = async () => {
    if (!proposal || !activeIntakeId) return toast.error('Finish the contact and duplicate review first.');
    if (['update', 'link'].includes(proposal.duplicateDecision) && !proposal.duplicateContactId) {
      return toast.error('Select the matching APAS CRM contact.');
    }
    try {
      const result = await actions.prepareApproval.mutateAsync({ intakeId: activeIntakeId, proposal });
      setApproval(result);
      setStep('approval');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The approval preview could not be prepared.');
    }
  };

  const executeApproval = async () => {
    if (!approval || !activeIntakeId) return;
    try {
      await actions.executeApproval.mutateAsync({ intakeId: activeIntakeId, ...approval });
      setApproval(null);
      setStep('status');
      toast.success('Exact proposal sent to APAS CRM for curator review.');
    } catch (error) {
      setStep('status');
      toast.error(error instanceof Error ? error.message : 'The approved proposal was queued for safe retry.');
    }
  };

  const statusCopy = activeIntake ? STATE_COPY[activeIntake.status] : STATE_COPY.waiting_crm_review;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto p-0 sm:max-w-3xl">
        <div className="border-b bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 p-5 text-white sm:p-7">
          <DialogHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
              <ScanLine className="h-5 w-5" />
            </div>
            <DialogTitle className="text-2xl text-white">Scan into APAS CRM</DialogTitle>
            <DialogDescription className="max-w-xl text-emerald-100/80">
              Capture the card here, approve exactly what leaves this project, and let an APAS CRM administrator resolve the master contact.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5"><StepRail step={step} /></div>
        </div>

        <div className="space-y-5 p-5 sm:p-7">
          {step === 'capture' && (
            <>
              {!initialProjectId && (
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger><SelectValue placeholder="Choose a permitted project" /></SelectTrigger>
                    <SelectContent>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">The project scope is verified again by the server before anything leaves Proj OS.</p>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <FilePicker label="Front" required file={front} onChange={setFront} />
                <FilePicker label="Back" file={back} onChange={setBack} />
              </div>
              <div className="rounded-2xl border bg-muted/25 p-4">
                <div className="mb-3 flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-emerald-600" />Meeting context</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label>Where you met</Label><Input value={sourceContext.whereMet} onChange={(e) => setSourceContext((value) => ({ ...value, whereMet: e.target.value }))} placeholder="Conference, jobsite, introduction…" /></div>
                  <div className="space-y-1.5"><Label>Event or location</Label><Input value={sourceContext.eventOrLocation} onChange={(e) => setSourceContext((value) => ({ ...value, eventOrLocation: e.target.value }))} placeholder="Optional" /></div>
                  <div className="space-y-1.5 sm:col-span-2"><Label>Introduced by</Label><Input value={sourceContext.introducer} onChange={(e) => setSourceContext((value) => ({ ...value, introducer: e.target.value }))} placeholder="Optional" /></div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Project-private note</Label>
                    <Textarea value={sourceContext.projectPrivateNotes} onChange={(e) => setSourceContext((value) => ({ ...value, projectPrivateNotes: e.target.value }))} placeholder="Stays inside this Proj OS project unless you explicitly include it in the approval." />
                  </div>
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={scanCard} disabled={actions.scan.isPending}>
                  {actions.scan.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                  Upload securely &amp; read card
                </Button>
              </div>
            </>
          )}

          {step === 'review' && (
            <>
              <div>
                <h3 className="text-lg font-semibold">Review every field</h3>
                <p className="text-sm text-muted-foreground">Missing text stays missing. Correct uncertain values or leave them blank.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {fieldDefinitions.map((field) => (
                  <div key={field.key} className={cn('space-y-1.5', field.key === 'address' && 'sm:col-span-2')}>
                    <Label>{field.label}</Label>
                    <Input value={contact[field.key] ?? ''} onChange={(e) => setContact((value) => ({ ...value, [field.key]: e.target.value }))} placeholder={field.placeholder} />
                  </div>
                ))}
              </div>

              {duplicates.length > 0 ? (
                <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2 font-semibold"><TriangleAlert className="h-4 w-4 text-amber-600" />Possible APAS CRM matches</div>
                  <div className="space-y-2">
                    {duplicates.map((candidate) => (
                      <button key={candidate.id} type="button" onClick={() => { setDuplicateContactId(candidate.id); setDuplicateDecision('link'); }} className={cn('w-full rounded-xl border bg-background p-3 text-left', duplicateContactId === candidate.id && 'border-primary ring-2 ring-primary/15')}>
                        <div className="flex items-center justify-between gap-3"><span className="font-medium">{candidate.displayName}</span>{typeof candidate.score === 'number' && <Badge variant="outline">{Math.round(candidate.score * (candidate.score <= 1 ? 100 : 1))}% match</Badge>}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{[candidate.companyName, candidate.reason].filter(Boolean).join(' · ')}</div>
                      </button>
                    ))}
                  </div>
                  <Select value={duplicateDecision} onValueChange={(value) => setDuplicateDecision(value as ContactProposal['duplicateDecision'])}>
                    <SelectTrigger><SelectValue placeholder="Choose the duplicate decision" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="link">Link the selected existing contact</SelectItem>
                      <SelectItem value="update">Propose updates to the selected contact</SelectItem>
                      <SelectItem value="create">Create a new contact</SelectItem>
                      <SelectItem value="keep_separate">Keep separate from the matches</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="rounded-xl border bg-muted/25 p-3 text-sm"><BadgeCheck className="mr-2 inline h-4 w-4 text-emerald-600" />No possible match was returned. A CRM curator will still verify the record.</div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Role on this project</Label><Input value={projectRole} onChange={(e) => setProjectRole(e.target.value)} placeholder="Owner, vendor, inspector…" /></div>
                <div className="space-y-2">
                  <Label>APAS CRM categories</Label>
                  {categories.isLoading ? <div className="text-sm text-muted-foreground">Loading controlled catalog…</div> : categories.isError ? <div className="text-sm text-destructive">The controlled category catalog is unavailable.</div> : (
                    <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto rounded-xl border p-2">
                      {categories.data?.categories.filter((item) => item.active).map((category) => {
                        const selected = selectedCategories.includes(category.id);
                        return <button type="button" key={category.id} onClick={() => setSelectedCategories((current) => selected ? current.filter((id) => id !== category.id) : [...current, category.id])} className={cn('rounded-full border px-2.5 py-1 text-xs', selected && 'border-primary bg-primary text-primary-foreground')}>{category.name}</button>;
                      })}
                    </div>
                  )}
                </div>
              </div>

              {sourceContext.projectPrivateNotes && (
                <label className="flex items-start gap-3 rounded-xl border p-3">
                  <Checkbox checked={shareNote} onCheckedChange={(value) => setShareNote(value === true)} />
                  <span><span className="block text-sm font-medium">Include this note in the exact APAS CRM proposal</span><span className="block text-xs text-muted-foreground">Off by default. If selected, the full note appears on the next approval screen.</span></span>
                </label>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button variant="outline" onClick={() => setStep('capture')}>Back</Button>
                <Button onClick={prepareApproval} disabled={actions.prepareApproval.isPending || categories.isError || !duplicateDecision}>
                  {actions.prepareApproval.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronRight className="mr-2 h-4 w-4" />}
                  Review exact approval
                </Button>
              </div>
            </>
          )}

          {step === 'approval' && approval && (
            <>
              <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5">
                <div className="mb-4 flex items-start gap-3"><div className="rounded-full bg-primary p-2 text-primary-foreground"><ShieldCheck className="h-5 w-5" /></div><div><h3 className="font-semibold">Approve this exact proposal</h3><p className="text-sm text-muted-foreground">This approval can be used once, for this action, by you, until {new Date(approval.expiresAt).toLocaleTimeString()}.</p></div></div>
                <dl className="grid gap-x-5 gap-y-3 text-sm sm:grid-cols-2">
                  {Object.entries(approval.exactPreview.contact).filter(([, value]) => value).map(([key, value]) => <div key={key}><dt className="text-xs capitalize text-muted-foreground">{key.replace(/([A-Z])/g, ' $1')}</dt><dd className="font-medium">{String(value)}</dd></div>)}
                  <div><dt className="text-xs text-muted-foreground">Duplicate decision</dt><dd className="font-medium capitalize">{approval.exactPreview.duplicateDecision.replace('_', ' ')}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Project role</dt><dd className="font-medium">{approval.exactPreview.projectRole || 'Not specified'}</dd></div>
                </dl>
                {Object.keys(approval.exactPreview.promotedSourceContext).length > 0 && <div className="mt-4 rounded-xl bg-background p-3"><div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Source context leaving Proj OS</div><div className="space-y-1 text-sm">{Object.entries(approval.exactPreview.promotedSourceContext).map(([key, value]) => <div key={key}><span className="capitalize text-muted-foreground">{key.replace(/([A-Z])/g, ' $1')}:</span> {value}</div>)}</div></div>}
              </div>
              <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">Approval hash: <code className="break-all">{approval.proposalHash}</code></div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button variant="outline" onClick={() => { setApproval(null); setStep('review'); }}>Make changes</Button>
                <Button onClick={executeApproval} disabled={actions.executeApproval.isPending}>
                  {actions.executeApproval.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                  Approve once &amp; send
                </Button>
              </div>
            </>
          )}

          {step === 'status' && (
            <div className="space-y-5">
              <div className={cn('rounded-2xl border p-5', statusCopy.tone === 'success' && 'border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20', statusCopy.tone === 'danger' && 'border-red-200 bg-red-50/60 dark:bg-red-950/20', statusCopy.tone === 'warning' && 'border-amber-200 bg-amber-50/60 dark:bg-amber-950/20')}>
                <div className="mb-2 flex items-center gap-2"><BadgeCheck className="h-5 w-5" /><h3 className="text-lg font-semibold">{statusCopy.label}</h3></div>
                <p className="text-sm text-muted-foreground">{activeIntake?.safe_failure_reason || statusCopy.detail}</p>
                {activeIntake?.correlation_id && <p className="mt-3 text-xs text-muted-foreground">Correlation: {activeIntake.correlation_id}</p>}
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {activeIntake?.status === 'retry_queued' && activeIntake.retryable && <Button variant="outline" onClick={() => actions.retry.mutate(activeIntake.id)} disabled={actions.retry.isPending}><RefreshCw className={cn('mr-2 h-4 w-4', actions.retry.isPending && 'animate-spin')} />Retry safely</Button>}
                {activeIntake && ['waiting_crm_review', 'sent_to_apas_crm'].includes(activeIntake.status) && <Button variant="outline" onClick={() => actions.refresh.mutate(activeIntake.id)} disabled={actions.refresh.isPending}><RefreshCw className={cn('mr-2 h-4 w-4', actions.refresh.isPending && 'animate-spin')} />Check status</Button>}
                {activeIntake?.status === 'linked_to_master_contact' && activeIntake.canonical_apas_contact_id && <Button asChild><a href={`https://apascrm.com/contacts/${encodeURIComponent(activeIntake.canonical_apas_contact_id)}`} target="_blank" rel="noreferrer">Open APAS CRM contact<ExternalLink className="ml-2 h-4 w-4" /></a></Button>}
                {activeIntake?.status === 'linked_to_master_contact' && <Button variant="outline" asChild><a href={`/projects/${encodeURIComponent(projectId)}/directory`}>Open project directory</a></Button>}
                <Button onClick={() => setOpen(false)}>Done</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CrmIntakeStatusPanel({ projectId }: { projectId: string }) {
  const { data: intakes = [], isLoading } = useCrmIntakes(projectId);
  const actions = useCrmIntakeActions(projectId);
  if (isLoading || intakes.length === 0) return null;
  return (
    <div className="mb-5 overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-3"><FileImage className="h-4 w-4 text-primary" /><span className="font-semibold">APAS CRM intake activity</span><Badge variant="outline" className="ml-auto">{intakes.length}</Badge></div>
      <div className="divide-y">
        {intakes.slice(0, 5).map((intake) => {
          const copy = STATE_COPY[intake.status];
          return <div key={intake.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="text-sm font-medium">{copy.label}</div><div className="truncate text-xs text-muted-foreground">{intake.safe_failure_reason || copy.detail}</div></div><div className="flex items-center gap-2">{intake.status === 'retry_queued' && intake.retryable && <Button size="sm" variant="outline" onClick={() => actions.retry.mutate(intake.id)}>Retry</Button>}{intake.status === 'linked_to_master_contact' && intake.canonical_apas_contact_id && <Button size="sm" variant="outline" asChild><a href={`https://apascrm.com/contacts/${encodeURIComponent(intake.canonical_apas_contact_id)}`} target="_blank" rel="noreferrer">Master contact<ExternalLink className="ml-1.5 h-3.5 w-3.5" /></a></Button>}</div></div>;
        })}
      </div>
    </div>
  );
}
