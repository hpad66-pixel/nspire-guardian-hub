import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CheckCircle2, ClipboardList, FileQuestion, FileUp, Info,
  LockKeyhole, Plus, RefreshCcw, Save, Settings2, ShieldCheck, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { requireTenantId } from '@/lib/tenant';
import { RESPONSE_TYPE_COPY } from '@/lib/contractors/requirements';
import type { ContractorResponseType } from '@/hooks/useContractorReadiness';
import { useUserPermissions } from '@/hooks/usePermissions';
import { usePlatformSuperAdmin } from '@/hooks/usePlatformAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface RequirementControls {
  required: boolean;
  responseType: ContractorResponseType;
  verificationRequired: boolean;
  expirationRequired: boolean;
}

function useReadinessSettings(enabled: boolean) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['contractor-readiness', 'settings'],
    enabled,
    queryFn: async () => {
      const { data: templateId, error: ensureError } = await (supabase.rpc as any)('ensure_default_contractor_template');
      if (ensureError) throw ensureError;
      const [template, items, policy] = await Promise.all([
        supabase.from('contractor_requirement_templates' as any).select('*').eq('id', templateId).single(),
        supabase.from('contractor_requirement_items' as any).select('*').eq('template_id', templateId).order('sort_order'),
        supabase.from('contractor_readiness_policies' as any).select('*').eq('scope_type', 'workspace').maybeSingle(),
      ]);
      if (template.error) throw template.error;
      if (items.error) throw items.error;
      if (policy.error) throw policy.error;
      return { template: template.data as any, items: (items.data ?? []) as any[], policy: policy.data as any };
    },
  });
  const updateItem = useMutation({
    mutationFn: async ({ id, controls, applyToOpenCases }: { id: string; controls: RequirementControls; applyToOpenCases: boolean }) => {
      const { data, error } = await (supabase.rpc as any)('configure_contractor_requirement_item', {
        p_item_id: id,
        p_required: controls.required,
        p_response_type: controls.responseType,
        p_verification_required: controls.verificationRequired,
        p_expiration_required: controls.expirationRequired,
        p_apply_to_open_cases: applyToOpenCases,
      });
      if (error) throw error;
      return Number(data ?? 0);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contractor-readiness'] }),
  });
  const addItem = useMutation({
    mutationFn: async (input: any) => {
      const tenantId = await requireTenantId();
      const { error } = await supabase.from('contractor_requirement_items' as any).insert({
        tenant_id: tenantId,
        template_id: query.data?.template.id,
        ...input,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contractor-readiness', 'settings'] }),
  });
  const savePolicy = useMutation({
    mutationFn: async (patch: any) => {
      const tenantId = await requireTenantId();
      const { data: existing } = await supabase.from('contractor_readiness_policies' as any)
        .select('id').eq('tenant_id', tenantId).eq('scope_type', 'workspace').maybeSingle();
      const operation = existing
        ? supabase.from('contractor_readiness_policies' as any).update(patch).eq('id', (existing as any).id)
        : supabase.from('contractor_readiness_policies' as any).insert({
          tenant_id: tenantId,
          scope_type: 'workspace',
          default_template_id: query.data?.template.id,
          ...patch,
        });
      const { error } = await operation;
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contractor-readiness', 'settings'] }),
  });
  return { ...query, updateItem, addItem, savePolicy };
}

function controlsFor(item: any): RequirementControls {
  return {
    required: item.required !== false,
    responseType: item.response_type ?? 'document',
    verificationRequired: item.verification_required !== false,
    expirationRequired: item.expiration_required === true,
  };
}

export default function ContractorSettingsPage() {
  const { currentRole, isLoading: roleLoading } = useUserPermissions();
  const { isSuperAdmin, isLoading: authorityLoading } = usePlatformSuperAdmin();
  const canManage = isSuperAdmin || ['admin', 'owner'].includes(currentRole ?? '');
  const settings = useReadinessSettings(canManage);
  const [policy, setPolicy] = useState<any>({});
  const [addOpen, setAddOpen] = useState(false);
  const [applyToOpenCases, setApplyToOpenCases] = useState(true);

  useEffect(() => { if (settings.data?.policy) setPolicy(settings.data.policy); }, [settings.data?.policy]);

  if (roleLoading || authorityLoading) return <div className="p-6 text-muted-foreground">Checking administrator access…</div>;
  if (!canManage) return <div className="mx-auto max-w-xl p-6"><Card><CardContent className="p-8 text-center"><LockKeyhole className="mx-auto h-9 w-9 text-muted-foreground" /><h1 className="mt-3 text-xl font-bold">Administrator access required</h1><p className="mt-2 text-sm text-muted-foreground">Only the workspace owner or administrator can change the standard contractor checklist.</p><Button className="mt-5" variant="outline" asChild><Link to="/contractor-readiness">Return to Contractor Readiness</Link></Button></CardContent></Card></div>;
  if (settings.isLoading) return <div className="p-6 text-muted-foreground">Loading contractor policy…</div>;
  if (settings.error) return <div className="p-6 text-red-700">{settings.error instanceof Error ? settings.error.message : 'Could not load settings'}</div>;

  const savePolicy = async () => {
    try {
      await settings.savePolicy.mutateAsync({
        enforce_work_gate: !!policy.enforce_work_gate,
        enforce_contract_gate: !!policy.enforce_contract_gate,
        enforce_payment_gate: !!policy.enforce_payment_gate,
        reminder_days: policy.reminder_days ?? [90, 60, 30, 7, 0],
      });
      toast.success('Readiness policy saved');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Save failed'); }
  };

  return <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
    <Link to="/contractor-readiness" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Contractor Readiness</Link>
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 p-6 text-white shadow-xl sm:p-8"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-amber-300"><Settings2 className="h-4 w-4" />Administrator controls</div><h1 className="mt-3 text-3xl font-bold">Build a checklist contractors can finish</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-100">Choose what is mandatory, what is optional, and exactly how a contractor should respond. These settings become the clear instructions they see in their secure portal.</p></div>

    <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white"><RefreshCcw className="h-4 w-4" /></div><div><p className="font-bold">Keep active contractor portals consistent</p><p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">When on, each saved requirement also updates open invitations and in-progress checklists. Completed, suspended, and rejected cases remain unchanged.</p></div></div><div className="flex items-center gap-3 rounded-full border bg-background px-4 py-2"><Label htmlFor="apply-open" className="whitespace-nowrap text-xs font-bold">Apply to active portals</Label><Switch id="apply-open" checked={applyToOpenCases} onCheckedChange={setApplyToOpenCases} /></div></CardContent></Card>

    <Card><CardHeader><CardTitle>Deterministic gates</CardTitle><CardDescription>Turn on the business checkpoints that should stop mobilization, contract execution, or payment when mandatory evidence has not been verified.</CardDescription></CardHeader><CardContent className="divide-y">{[
      ['enforce_work_gate', 'Work / mobilization', 'Prevent an assignment from becoming active until mandatory work requirements are verified.'],
      ['enforce_contract_gate', 'Contract execution', 'Prevent a subcontract from being executed until mandatory work and contract requirements are verified.'],
      ['enforce_payment_gate', 'Payment approval', 'Prevent invoice approval or payment until mandatory tax and upstream requirements are verified.'],
    ].map(([key, label, description]) => <div key={key} className="flex items-center gap-4 py-4"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><ShieldCheck className="h-5 w-5" /></div><div className="flex-1"><p className="font-semibold">{label}</p><p className="text-xs text-muted-foreground">{description}</p></div><Switch checked={!!policy[key]} onCheckedChange={(value) => setPolicy({ ...policy, [key]: value })} /></div>)}<Button className="mt-4" onClick={savePolicy} disabled={settings.savePolicy.isPending}><Save className="mr-2 h-4 w-4" />Save gate policy</Button></CardContent></Card>

    <Card><CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle>Contractor portal checklist</CardTitle><CardDescription className="mt-1 max-w-2xl">Every row has an explicit priority and response method. Mandatory items block submission; optional items help you learn more without creating unnecessary friction.</CardDescription></div><Button size="sm" onClick={() => setAddOpen(true)}><Plus className="mr-2 h-4 w-4" />Add requirement</Button></CardHeader><CardContent className="space-y-3">{settings.data?.items.map((item: any) => <RequirementControlCard key={item.id} item={item} applyToOpenCases={applyToOpenCases} onSave={settings.updateItem.mutateAsync} />)}</CardContent></Card>

    <AddRequirementDialog open={addOpen} onOpenChange={setAddOpen} onAdd={settings.addItem.mutateAsync} nextOrder={(settings.data?.items.length ?? 0) * 10 + 10} />
  </div>;
}

function RequirementControlCard({ item, applyToOpenCases, onSave }: { item: any; applyToOpenCases: boolean; onSave: (input: any) => Promise<number> }) {
  const initial = useMemo(() => controlsFor(item), [item]);
  const [controls, setControls] = useState<RequirementControls>(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => setControls(initial), [initial]);
  const changed = JSON.stringify(controls) !== JSON.stringify(initial);
  const response = RESPONSE_TYPE_COPY[controls.responseType];
  const Icon = controls.responseType === 'document' ? FileUp : controls.responseType === 'questionnaire' ? FileQuestion : controls.responseType === 'acknowledgement' ? CheckCircle2 : ClipboardList;
  const save = async () => {
    setBusy(true);
    try {
      const updated = await onSave({ id: item.id, controls, applyToOpenCases });
      toast.success(updated > 0 ? `Requirement saved and updated in ${updated} active portal${updated === 1 ? '' : 's'}` : 'Requirement saved');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save requirement'); }
    finally { setBusy(false); }
  };
  const setResponseType = (value: ContractorResponseType) => setControls((current) => ({ ...current, responseType: value, expirationRequired: ['document', 'either'].includes(value) ? current.expirationRequired : false }));

  return <div className={`rounded-2xl border p-4 transition-colors sm:p-5 ${controls.required ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900 dark:bg-emerald-950/10' : 'border-slate-200 bg-slate-50/40 dark:border-slate-800 dark:bg-slate-900/30'}`}><div className="flex flex-col gap-4 lg:flex-row lg:items-start"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-bold">{item.title}</p><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${controls.required ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100'}`}>{controls.required ? 'Mandatory' : 'Optional'}</span>{item.legally_required && <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-red-700"><LockKeyhole className="h-3 w-3" />Legally controlled</span>}</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description || 'No description yet.'}</p></div><div className="flex items-center justify-between gap-4 rounded-xl border bg-background px-4 py-3 lg:w-64"><div><p className="text-sm font-bold">{controls.required ? 'Mandatory' : 'Optional'}</p><p className="text-[11px] text-muted-foreground">{controls.required ? 'Blocks final submission' : 'Does not block submission'}</p></div><Switch checked={controls.required} onCheckedChange={(required) => setControls((current) => ({ ...current, required }))} aria-label={`Make ${item.title} mandatory`} /></div></div><div className="mt-4 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_1fr_auto]"><div><Label className="text-xs">What should the contractor do?</Label><Select value={controls.responseType} onValueChange={(value: ContractorResponseType) => setResponseType(value)}><SelectTrigger className="mt-1.5 bg-background"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(RESPONSE_TYPE_COPY).map(([value, copy]) => <SelectItem key={value} value={value}>{copy.label}</SelectItem>)}</SelectContent></Select><div className="mt-2 flex gap-2 text-[11px] leading-4 text-muted-foreground"><Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />{response.description}</div></div><div className="grid gap-2 sm:grid-cols-2"><ControlToggle label="Staff verification" description="A reviewer must approve the response." checked={controls.verificationRequired} onCheckedChange={(verificationRequired) => setControls((current) => ({ ...current, verificationRequired }))} /><ControlToggle label="Expiration date" description="Required when a file is uploaded." checked={controls.expirationRequired} disabled={!['document', 'either'].includes(controls.responseType)} onCheckedChange={(expirationRequired) => setControls((current) => ({ ...current, expirationRequired }))} /></div><div className="flex items-end"><Button className="w-full lg:w-auto" variant={changed ? 'default' : 'outline'} disabled={!changed || busy} onClick={save}>{busy ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save</Button></div></div></div>;
}

function ControlToggle({ label, description, checked, disabled, onCheckedChange }: { label: string; description: string; checked: boolean; disabled?: boolean; onCheckedChange: (value: boolean) => void }) {
  return <label className={`flex items-start justify-between gap-3 rounded-xl border bg-background p-3 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}><div><span className="text-xs font-bold">{label}</span><p className="mt-1 text-[10px] leading-4 text-muted-foreground">{description}</p></div><Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} /></label>;
}

function AddRequirementDialog({ open, onOpenChange, onAdd, nextOrder }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [category, setCategory] = useState('other');
  const [gate, setGate] = useState('contract');
  const [required, setRequired] = useState(true);
  const [legal, setLegal] = useState(false);
  const [verification, setVerification] = useState(true);
  const [expiration, setExpiration] = useState(false);
  const [responseType, setResponseType] = useState<ContractorResponseType>('document');
  const [busy, setBusy] = useState(false);
  const reset = () => { setTitle(''); setDescription(''); setInstructions(''); setCategory('other'); setGate('contract'); setRequired(true); setLegal(false); setVerification(true); setExpiration(false); setResponseType('document'); };
  const submit = async () => {
    if (!title.trim()) return toast.error('Title is required');
    setBusy(true);
    try {
      await onAdd({ requirement_code: title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''), title: title.trim(), description: description.trim() || null, instructions: instructions.trim() || null, category, gate_type: gate, required, legally_required: legal, response_type: responseType, verification_required: verification, expiration_required: expiration && ['document', 'either'].includes(responseType), sort_order: nextOrder });
      toast.success('Requirement added for new contractor portals');
      onOpenChange(false);
      reset();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not add requirement'); }
    finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) reset(); }}><DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto"><DialogHeader><DialogTitle>Add a contractor requirement</DialogTitle><DialogDescription>Write the instruction as the contractor should see it, then choose whether it is mandatory and how they can respond.</DialogDescription></DialogHeader><div className="space-y-4"><div><Label>Requirement name *</Label><Input className="mt-1" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Example: General liability certificate" /></div><div><Label>Why we need it</Label><Textarea className="mt-1" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="A short, welcoming explanation of the requirement." /></div><div><Label>Instructions for the contractor</Label><Textarea className="mt-1" value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Explain what to upload or answer and what a complete response looks like." /></div><div className="grid gap-3 sm:grid-cols-2"><div><Label>Contractor action</Label><Select value={responseType} onValueChange={(value: ContractorResponseType) => { setResponseType(value); if (!['document', 'either'].includes(value)) setExpiration(false); }}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(RESPONSE_TYPE_COPY).map(([value, copy]) => <SelectItem key={value} value={value}>{copy.label}</SelectItem>)}</SelectContent></Select></div><div><Label>Readiness gate</Label><Select value={gate} onValueChange={setGate}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{['work', 'contract', 'payment', 'informational'].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div><div><Label>Category</Label><Select value={category} onValueChange={setCategory}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{['identity', 'tax', 'license', 'insurance', 'safety', 'financial', 'experience', 'agreement', 'other'].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div></div><div className="grid gap-2 sm:grid-cols-2"><ControlToggle label="Mandatory" description="Blocks submission until complete." checked={required} onCheckedChange={setRequired} /><ControlToggle label="Legally controlled" description="Cannot be waived or marked not applicable." checked={legal} onCheckedChange={setLegal} /><ControlToggle label="Staff verification" description="Requires a human approval decision." checked={verification} onCheckedChange={setVerification} /><ControlToggle label="Expiration date" description="Contractor must enter a current expiration." checked={expiration} disabled={!['document', 'either'].includes(responseType)} onCheckedChange={setExpiration} /></div><div className="flex gap-2 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-900 dark:bg-blue-950 dark:text-blue-100"><Info className="mt-0.5 h-4 w-4 shrink-0" />This requirement will be included in new cases. Use the active case controls to tailor an individual contractor’s portal.</div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit} disabled={busy}>{busy ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Add requirement</Button></DialogFooter></DialogContent></Dialog>;
}
