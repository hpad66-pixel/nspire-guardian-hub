import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Copy, Link2, Loader2, Mail, Plus, Search, ShieldCheck, Sparkles } from 'lucide-react';
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
import { useStartContractorOnboarding, type ContractorInvitationResult } from '@/hooks/useContractorReadiness';
import { toast } from 'sonner';

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
  const [result, setResult] = useState<{ caseId: string; invitation: ContractorInvitationResult } | null>(null);

  const vendors = useMemo(() => {
    const q = search.toLowerCase().trim();
    return organizations.filter((o) => ['sub', 'vendor', 'consultant', 'other'].includes(o.kind))
      .filter((o) => !q || o.name.toLowerCase().includes(q) || o.email?.toLowerCase().includes(q))
      .slice(0, 30);
  }, [organizations, search]);

  const reset = () => {
    setMode('existing'); setSearch(''); setOrganizationId(''); setCompanyName(''); setEmail('');
    setPhone(''); setWebsite(''); setTrades(''); setScope(fixedProjectId ? 'project' : fixedClientId ? 'client' : 'workspace');
    setClientId(fixedClientId ?? ''); setProjectId(fixedProjectId ?? ''); setRiskTier('standard');
    setSendPortal(true); setRecipientName(''); setResult(null);
  };

  const submit = async () => {
    try {
      if (mode === 'existing' && !organizationId) throw new Error('Select a company');
      if (mode === 'new' && !companyName.trim()) throw new Error('Enter the company name');
      if (scope === 'client' && !clientId) throw new Error('Select a client');
      if (scope === 'project' && !(fixedProjectId || projectId)) throw new Error('Select a project');
      if (sendPortal && !email.trim()) throw new Error('Enter the email that should receive the secure portal');
      const started = await startOnboarding.mutateAsync({
        organizationId: mode === 'existing' ? organizationId : undefined,
        companyName: mode === 'new' ? companyName : undefined,
        email, phone, website,
        trades: trades.split(',').map((s) => s.trim()).filter(Boolean),
        clientId: scope === 'client' ? fixedClientId || clientId : null,
        projectId: scope === 'project' ? fixedProjectId || projectId : null,
        riskTier,
        sendPortal,
        recipientEmail: email,
        recipientName,
      });
      if (started.invitation) {
        setResult({ caseId: started.caseId, invitation: started.invitation });
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
          <DialogTitle>{result ? 'Contractor onboarding is ready' : 'Onboard a contractor'}</DialogTitle>
          <DialogDescription>{result ? 'The company is now in your master contractor portfolio and its qualification is being tracked.' : 'Create the company record, qualification checklist, and secure no-password portal in one step.'}</DialogDescription>
        </DialogHeader>

        {result ? <OnboardingResult result={result} onView={() => { onOpenChange(false); reset(); navigate(`/contractor-readiness/${result.caseId}`); }} /> : <>

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
            <Field label="Company name *"><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="ABC Roofing LLC" /></Field>
            <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
            <Field label="Website"><Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" /></Field>
          </TabsContent>
        </Tabs>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Trades / services"><Input value={trades} onChange={(e) => setTrades(e.target.value)} placeholder="Roofing, concrete, pressure washing" /><p className="mt-1 text-[11px] text-muted-foreground">Separate multiple trades with commas.</p></Field>
          <Field label="Risk tier"><Select value={riskTier} onValueChange={setRiskTier}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="standard">Standard</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></Field>
          {!fixedProjectId && !fixedClientId && <Field label="Qualification scope"><Select value={scope} onValueChange={setScope}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="workspace">Company-wide</SelectItem><SelectItem value="client">One client</SelectItem><SelectItem value="project">One project</SelectItem></SelectContent></Select></Field>}
          {scope === 'client' && !fixedClientId && <Field label="Client"><Select value={clientId} onValueChange={setClientId}><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger><SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></Field>}
          {scope === 'project' && !fixedProjectId && <Field label="Project"><Select value={projectId} onValueChange={setProjectId}><SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger><SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></Field>}
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          The standard checklist includes W-9, applicable trade license, general liability, workers compensation/exemption, commercial auto, safety program, relevant experience, and vendor standards acknowledgement. You can tailor the requirement template later.
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white"><Sparkles className="h-4 w-4" /></div><div><p className="text-sm font-bold text-emerald-950 dark:text-emerald-100">Send the onboarding portal now</p><p className="mt-0.5 text-xs leading-5 text-emerald-800 dark:text-emerald-200">The contractor receives a branded mobile checklist. Missing items and document expirations are monitored automatically.</p></div></div>
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

function OnboardingResult({ result, onView }: { result: { caseId: string; invitation: ContractorInvitationResult }; onView: () => void }) {
  const copy = async () => {
    await navigator.clipboard.writeText(result.invitation.link);
    toast.success('Secure link copied');
  };
  return <div className="space-y-5">
    <div className="rounded-2xl bg-gradient-to-br from-emerald-950 to-emerald-700 p-6 text-white">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15"><CheckCircle2 className="h-7 w-7" /></div>
      <h3 className="mt-4 text-xl font-bold">Company record and checklist created</h3>
      <p className="mt-1 text-sm leading-6 text-emerald-100">{result.invitation.emailSent ? 'The secure onboarding email was delivered to the contractor.' : 'Email delivery is not configured or did not complete. Copy the secure link below and send it directly.'}</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      <ResultStep icon={ShieldCheck} number="1" label="Master record" detail="Saved for reuse" />
      <ResultStep icon={Mail} number="2" label="Portal" detail={result.invitation.emailSent ? 'Email sent' : 'Link ready'} />
      <ResultStep icon={Link2} number="3" label="Monitoring" detail="Reminders active" />
    </div>
    <div><Label>Secure onboarding link</Label><div className="mt-1.5 flex gap-2"><Input readOnly value={result.invitation.link} /><Button type="button" variant="outline" size="icon" onClick={copy} aria-label="Copy secure onboarding link"><Copy className="h-4 w-4" /></Button></div><p className="mt-1 text-xs text-muted-foreground">Private link · expires {new Date(result.invitation.expiresAt).toLocaleDateString()}</p></div>
    <DialogFooter><Button onClick={onView}>Open contractor record<ArrowRight className="ml-2 h-4 w-4" /></Button></DialogFooter>
  </div>;
}

function ResultStep({ icon: Icon, number, label, detail }: { icon: typeof ShieldCheck; number: string; label: string; detail: string }) {
  return <div className="rounded-xl border bg-card p-3"><div className="flex items-center justify-between"><Icon className="h-4 w-4 text-emerald-700" /><span className="text-[10px] font-bold text-muted-foreground">{number}</span></div><p className="mt-3 text-sm font-bold">{label}</p><p className="text-xs text-muted-foreground">{detail}</p></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
