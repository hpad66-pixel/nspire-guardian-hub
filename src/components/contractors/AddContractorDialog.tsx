import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness, CheckCircle2, Copy, HardHat, Link2, Loader2, Mail, Plus, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrganizations } from '@/hooks/useDirectory';
import { useActiveClients } from '@/hooks/useClients';
import { useActiveProjects } from '@/hooks/useProjects';
import { useStartContractorOnboarding, useOnboardingChecklist, type ContractorInvitationResult } from '@/hooks/useContractorReadiness';
import { RequestChecklist, type RequestSelection } from './RequestChecklist';
import { toast } from 'sonner';

type EngagementType = 'contractor' | 'consultant';
type OnboardingResultData = {
  caseId: string;
  invitation: ContractorInvitationResult;
  engagementType: EngagementType;
  crmSync: { status: 'synced' | 'pending' | 'not_applicable'; message?: string };
};

export function AddContractorDialog({ open, onOpenChange, fixedProjectId, fixedClientId }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fixedProjectId?: string | null;
  fixedClientId?: string | null;
}) {
  const navigate = useNavigate();
  const { data: organizations = [] } = useOrganizations();
  const { data: clients = [] } = useActiveClients();
  const { data: projects = [] } = useActiveProjects();
  const startOnboarding = useStartContractorOnboarding();
  const [engagementType, setEngagementType] = useState<EngagementType>('contractor');
  const [mode, setMode] = useState('existing');
  const [search, setSearch] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [trades, setTrades] = useState('');
  const [scope, setScope] = useState(fixedProjectId ? 'project' : fixedClientId ? 'client' : 'workspace');
  const [clientId, setClientId] = useState(fixedClientId ?? '');
  const [projectId, setProjectId] = useState(fixedProjectId ?? '');
  const [riskTier, setRiskTier] = useState('standard');
  const [sendPortal, setSendPortal] = useState(true);
  const [recipientName, setRecipientName] = useState('');
  const [certificateHolderName, setCertificateHolderName] = useState('');
  const [certificateHolderAddress, setCertificateHolderAddress] = useState('');
  const [additionalInsuredName, setAdditionalInsuredName] = useState('');
  const [insuranceInstructions, setInsuranceInstructions] = useState('');
  const [result, setResult] = useState<OnboardingResultData | null>(null);
  const checklist = useOnboardingChecklist(open);
  const checklistItems = useMemo(() => (checklist.data ?? []).filter(i => i.applies_to === 'both' || i.applies_to === engagementType), [checklist.data, engagementType]);
  const [selection, setSelection] = useState<RequestSelection | null>(null);
  useEffect(() => { setSelection(null); }, [engagementType, organizationId]);
  const requestSelection = selection ?? { codes: checklistItems.map(i => i.requirement_code), companyProfile: true, portfolio: true };

  const effectiveProjectId = fixedProjectId || projectId;
  const selectedProject = projects.find((project) => project.id === effectiveProjectId);
  const effectiveClientId = fixedClientId || (scope === 'project' ? selectedProject?.client_id : clientId) || '';
  const selectedClient = clients.find((client) => client.id === effectiveClientId);

  useEffect(() => {
    if (!selectedClient) return;
    const address = [selectedClient.address, selectedClient.city, selectedClient.state].filter(Boolean).join(', ');
    setCertificateHolderName((current) => current || selectedClient.name);
    setAdditionalInsuredName((current) => current || selectedClient.name);
    setCertificateHolderAddress((current) => current || address);
  }, [selectedClient]);

  const vendors = useMemo(() => {
    const q = search.toLowerCase().trim();
    return organizations.filter((o) => ['sub', 'vendor', 'consultant', 'other'].includes(o.kind))
      .filter((o) => !q || o.name.toLowerCase().includes(q) || o.email?.toLowerCase().includes(q))
      .slice(0, 30);
  }, [organizations, search]);

  const reset = () => {
    setEngagementType('contractor'); setMode('existing'); setSearch(''); setOrganizationId(''); setCompanyName(''); setEmail('');
    setPhone(''); setWebsite(''); setTrades(''); setScope(fixedProjectId ? 'project' : fixedClientId ? 'client' : 'workspace');
    setClientId(fixedClientId ?? ''); setProjectId(fixedProjectId ?? ''); setRiskTier('standard');
    setSendPortal(true); setRecipientName(''); setCertificateHolderName(''); setCertificateHolderAddress('');
    setAdditionalInsuredName(''); setInsuranceInstructions(''); setResult(null); setSelection(null);
  };

  const submit = async () => {
    try {
      if (mode === 'existing' && !organizationId) throw new Error('Select a company');
      if (mode === 'new' && !companyName.trim()) throw new Error('Enter the company name');
      if (scope === 'client' && !clientId) throw new Error('Select a client');
      if (scope === 'project' && !(fixedProjectId || projectId)) throw new Error('Select a project');
      if (sendPortal && !email.trim()) throw new Error('Enter the email that should receive the secure portal');
      if (!checklist.data || checklist.error) throw new Error('Wait for the requirements to load before sending the invitation.');
      const started = await startOnboarding.mutateAsync({
        organizationId: mode === 'existing' ? organizationId : undefined,
        companyName: mode === 'new' ? companyName : undefined,
        email, phone, website,
        trades: trades.split(',').map((s) => s.trim()).filter(Boolean),
        clientId: scope === 'client' ? fixedClientId || clientId : null,
        projectId: scope === 'project' ? fixedProjectId || projectId : null,
        riskTier,
        engagementType,
        certificateHolderName,
        certificateHolderAddress,
        additionalInsuredName,
        insuranceInstructions,
        requestedCodes: requestSelection.codes,
        requestCompanyProfile: requestSelection.companyProfile,
        requestPortfolio: requestSelection.portfolio,
        sendPortal,
        recipientEmail: email,
        recipientName,
      });
      if (started.invitation) {
        setResult({ caseId: started.caseId, invitation: started.invitation, engagementType, crmSync: started.crmSync });
        toast.success(started.invitation.emailSent ? 'Portal sent and onboarding started' : 'Secure portal created');
      } else {
        toast.success('Qualification checklist created');
        onOpenChange(false); reset();
        navigate(`/contractor-readiness/${started.caseId}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create qualification');
      const createdCaseId = (error as Error & { caseId?: string }).caseId;
      if (createdCaseId) {
        onOpenChange(false); reset();
        navigate(`/contractor-readiness/${createdCaseId}`);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) reset(); }}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{result ? `${result.engagementType === 'consultant' ? 'Consultant' : 'Contractor'} onboarding is ready` : 'Onboard a company'}</DialogTitle>
          <DialogDescription>{result ? 'The company is now in your reusable portfolio and its qualification is being tracked.' : 'Choose the relationship, create the right checklist, and send one secure no-password portal.'}</DialogDescription>
        </DialogHeader>

        {result ? <OnboardingResult result={result} onView={() => { onOpenChange(false); reset(); navigate(`/contractor-readiness/${result.caseId}`); }} /> : <>

        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Company relationship">
          <EngagementChoice active={engagementType === 'contractor'} icon={HardHat} title="Contractor" detail="Trade work, field services, construction, or maintenance" onClick={() => setEngagementType('contractor')} />
          <EngagementChoice active={engagementType === 'consultant'} icon={BriefcaseBusiness} title="Consultant" detail="Engineering, architecture, surveying, inspection, or advisory services" onClick={() => setEngagementType('consultant')} />
        </div>

        <Tabs value={mode} onValueChange={setMode}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Existing company</TabsTrigger>
            <TabsTrigger value="new">New company</TabsTrigger>
          </TabsList>
          <TabsContent value="existing" className="space-y-3 pt-2">
            <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company name or email" className="pl-9" /></div>
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border p-1">
              {vendors.map((org) => (
                <button key={org.id} type="button" onClick={() => { setOrganizationId(org.id); setEmail(org.email ?? ''); }} className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${organizationId === org.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                  <span className="font-semibold">{org.name}</span>
                  <span className={`ml-2 text-xs ${organizationId === org.id ? 'text-primary-foreground/75' : 'text-muted-foreground'}`}>{org.kind}{org.email ? ` · ${org.email}` : ''}</span>
                </button>
              ))}
              {!vendors.length && <p className="p-4 text-center text-sm text-muted-foreground">No matching vendor companies. Add a new one.</p>}
            </div>
          </TabsContent>
          <TabsContent value="new" className="grid gap-3 pt-2 sm:grid-cols-2">
            <Field label="Company name *"><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder={engagementType === 'consultant' ? 'ABC Engineering LLC' : 'ABC Roofing LLC'} /></Field>
            <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
            <Field label="Website"><Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" /></Field>
          </TabsContent>
        </Tabs>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={engagementType === 'consultant' ? 'Disciplines / services' : 'Trades / services'}><Input value={trades} onChange={(e) => setTrades(e.target.value)} placeholder={engagementType === 'consultant' ? 'Civil engineering, surveying, inspections' : 'Roofing, concrete, pressure washing'} /><p className="mt-1 text-[11px] text-muted-foreground">Separate multiple services with commas.</p></Field>
          <Field label="Risk tier"><Select value={riskTier} onValueChange={setRiskTier}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="standard">Standard</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></Field>
          {!fixedProjectId && !fixedClientId && <Field label="Qualification scope"><Select value={scope} onValueChange={setScope}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="workspace">Company-wide</SelectItem><SelectItem value="client">One client</SelectItem><SelectItem value="project">One project</SelectItem></SelectContent></Select></Field>}
          {scope === 'client' && !fixedClientId && <Field label="Client"><Select value={clientId} onValueChange={setClientId}><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger><SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></Field>}
          {scope === 'project' && !fixedProjectId && <Field label="Project"><Select value={projectId} onValueChange={setProjectId}><SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger><SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></Field>}
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-950/30">
          <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" /><div><p className="text-sm font-bold text-blue-950 dark:text-blue-100">Insurance certificate instructions</p><p className="mt-0.5 text-xs leading-5 text-blue-800 dark:text-blue-200">These exact details appear in the secure portal so the company and its broker know how the certificate must be prepared.</p></div></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Certificate holder"><Input value={certificateHolderName} onChange={(e) => setCertificateHolderName(e.target.value)} placeholder="Client legal name" /></Field>
            <Field label="Additional insured"><Input value={additionalInsuredName} onChange={(e) => setAdditionalInsuredName(e.target.value)} placeholder="Required insured party" /></Field>
            <div className="sm:col-span-2"><Field label="Certificate holder address"><Input value={certificateHolderAddress} onChange={(e) => setCertificateHolderAddress(e.target.value)} placeholder="Street, city, state, ZIP" /></Field></div>
            <div className="sm:col-span-2"><Field label="Special instructions"><Input value={insuranceInstructions} onChange={(e) => setInsuranceInstructions(e.target.value)} placeholder="Endorsements, project reference, or delivery instructions" /></Field></div>
          </div>
        </div>

        {checklist.isLoading ? <p className="text-sm text-muted-foreground">Loading your requirements…</p> : checklist.error ? <p role="alert" className="text-sm text-destructive">Requirements could not load. Close and reopen to retry.</p> : <RequestChecklist items={checklistItems} value={requestSelection} onChange={setSelection} />}

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white"><Sparkles className="h-4 w-4" /></div><div><p className="text-sm font-bold text-emerald-950 dark:text-emerald-100">Send the onboarding portal now</p><p className="mt-0.5 text-xs leading-5 text-emerald-800 dark:text-emerald-200">The {engagementType} receives a branded mobile checklist. Missing items and document expirations are monitored automatically.</p></div></div>
            <Switch checked={sendPortal} onCheckedChange={setSendPortal} aria-label="Send onboarding portal now" />
          </div>
          {sendPortal && <div className="mt-4 grid gap-3 border-t border-emerald-200 pt-4 sm:grid-cols-2 dark:border-emerald-900">
            <Field label="Contact name"><Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Primary company contact" /></Field>
            <Field label="Portal recipient email *"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="qualifications@company.com" /></Field>
          </div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={startOnboarding.isPending}>{startOnboarding.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : sendPortal ? <Mail className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}{sendPortal ? 'Create & send portal' : 'Create checklist only'}</Button>
        </DialogFooter>
        </>}
      </DialogContent>
    </Dialog>
  );
}

function OnboardingResult({ result, onView }: { result: OnboardingResultData; onView: () => void }) {
  const copy = async () => {
    await navigator.clipboard.writeText(result.invitation.link);
    toast.success('Secure link copied');
  };
  return <div className="space-y-5">
    <div className="rounded-2xl bg-gradient-to-br from-emerald-950 to-emerald-700 p-6 text-white">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15"><CheckCircle2 className="h-7 w-7" /></div>
      <h3 className="mt-4 text-xl font-bold">Company record and checklist created</h3>
      <p className="mt-1 text-sm leading-6 text-emerald-100">{result.invitation.emailSent ? `The secure onboarding email was delivered to the ${result.engagementType}.` : 'Email delivery is not configured or did not complete. Copy the secure link below and send it directly.'}</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      <ResultStep icon={ShieldCheck} number="1" label="Master record" detail="Saved for reuse" />
      <ResultStep icon={Mail} number="2" label="Portal" detail={result.invitation.emailSent ? 'Email sent' : 'Link ready'} />
      <ResultStep icon={Link2} number="3" label="APAS CRM" detail={result.crmSync.status === 'synced' ? 'Project tags synced' : result.crmSync.status === 'pending' ? 'Follow-up pending' : 'Syncs when project-linked'} />
    </div>
    <div><Label>Secure onboarding link</Label><div className="mt-1.5 flex gap-2"><Input readOnly value={result.invitation.link} /><Button type="button" variant="outline" size="icon" onClick={copy} aria-label="Copy secure onboarding link"><Copy className="h-4 w-4" /></Button></div><p className="mt-1 text-xs text-muted-foreground">Private link · expires {new Date(result.invitation.expiresAt).toLocaleDateString()}</p></div>
    <DialogFooter><Button onClick={onView}>Open qualification record<ArrowRight className="ml-2 h-4 w-4" /></Button></DialogFooter>
  </div>;
}

function EngagementChoice({ active, icon: Icon, title, detail, onClick }: { active: boolean; icon: typeof HardHat; title: string; detail: string; onClick: () => void }) {
  return <button type="button" role="radio" aria-checked={active} onClick={onClick} className={`rounded-xl border p-4 text-left transition-all ${active ? 'border-emerald-600 bg-emerald-50 shadow-sm ring-1 ring-emerald-600 dark:bg-emerald-950/30' : 'hover:border-emerald-300 hover:bg-muted/40'}`}><div className="flex items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-emerald-800 text-white' : 'bg-muted text-muted-foreground'}`}><Icon className="h-5 w-5" /></span><span><span className="block text-sm font-bold">{title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{detail}</span></span>{active && <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-700" />}</div></button>;
}

function ResultStep({ icon: Icon, number, label, detail }: { icon: typeof ShieldCheck; number: string; label: string; detail: string }) {
  return <div className="rounded-xl border bg-card p-3"><div className="flex items-center justify-between"><Icon className="h-4 w-4 text-emerald-700" /><span className="text-[10px] font-bold text-muted-foreground">{number}</span></div><p className="mt-3 text-sm font-bold">{label}</p><p className="text-xs text-muted-foreground">{detail}</p></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
