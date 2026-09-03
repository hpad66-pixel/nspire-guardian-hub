import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrganizations } from '@/hooks/useDirectory';
import { useActiveClients } from '@/hooks/useClients';
import { useActiveProjects } from '@/hooks/useProjects';
import { useCreateContractorCase } from '@/hooks/useContractorReadiness';
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
  const createCase = useCreateContractorCase();
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
  };

  const submit = async () => {
    try {
      if (mode === 'existing' && !organizationId) throw new Error('Select a company');
      if (mode === 'new' && !companyName.trim()) throw new Error('Enter the company name');
      if (scope === 'client' && !clientId) throw new Error('Select a client');
      if (scope === 'project' && !(fixedProjectId || projectId)) throw new Error('Select a project');
      const id = await createCase.mutateAsync({
        organizationId: mode === 'existing' ? organizationId : undefined,
        companyName: mode === 'new' ? companyName : undefined,
        email, phone, website,
        trades: trades.split(',').map((s) => s.trim()).filter(Boolean),
        clientId: scope === 'client' ? fixedClientId || clientId : null,
        projectId: scope === 'project' ? fixedProjectId || projectId : null,
        riskTier,
      });
      toast.success('Qualification checklist created');
      onOpenChange(false); reset();
      navigate(`/contractor-readiness/${id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create qualification');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) reset(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Start contractor qualification</DialogTitle>
          <DialogDescription>Create a scoped checklist, then send the company a secure no-password link.</DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={setMode}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Existing company</TabsTrigger>
            <TabsTrigger value="new">New company</TabsTrigger>
          </TabsList>
          <TabsContent value="existing" className="space-y-3 pt-2">
            <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company name or email" className="pl-9" /></div>
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border p-1">
              {vendors.map((org) => (
                <button key={org.id} type="button" onClick={() => setOrganizationId(org.id)} className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${organizationId === org.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                  <span className="font-semibold">{org.name}</span>
                  <span className={`ml-2 text-xs ${organizationId === org.id ? 'text-primary-foreground/75' : 'text-muted-foreground'}`}>{org.kind}{org.email ? ` · ${org.email}` : ''}</span>
                </button>
              ))}
              {!vendors.length && <p className="p-4 text-center text-sm text-muted-foreground">No matching vendor companies. Add a new one.</p>}
            </div>
          </TabsContent>
          <TabsContent value="new" className="grid gap-3 pt-2 sm:grid-cols-2">
            <Field label="Company name *"><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="ABC Roofing LLC" /></Field>
            <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="qualifications@company.com" /></Field>
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={createCase.isPending}>{createCase.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Create checklist</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
