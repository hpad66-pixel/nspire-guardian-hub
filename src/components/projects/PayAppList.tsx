import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, FileText, CheckCircle2 } from 'lucide-react';
import { usePayApplications, useSOVLineItems, useCreatePayApplication } from '@/hooks/useSOV';
import { PayAppSheet } from './PayAppSheet';

interface PayAppListProps {
  projectId: string;
  workspaceId: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  draft: { label: 'Draft', variant: 'secondary', className: '' },
  submitted: { label: 'Submitted', variant: 'default', className: 'bg-blue-500 hover:bg-blue-600' },
  under_review: { label: 'Under Review', variant: 'default', className: 'bg-amber-500 hover:bg-amber-600' },
  certified: { label: 'Certified', variant: 'default', className: 'bg-green-500 hover:bg-green-600' },
  paid: { label: 'Paid', variant: 'default', className: 'bg-[#C9A84C] hover:bg-[#B8973F] text-white' },
  disputed: { label: 'Disputed', variant: 'destructive', className: '' },
};

export function PayAppList({ projectId, workspaceId }: PayAppListProps) {
  const { data: payApps = [], isLoading } = usePayApplications(projectId);
  const { data: sovItems = [] } = useSOVLineItems(projectId);
  const createPayApp = useCreatePayApplication();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPayApp, setSelectedPayApp] = useState<any | null>(null);
  const [form, setForm] = useState({ period_from: '', period_to: '', contractor_name: '', contract_number: '' });

  const hasSov = sovItems.length > 0;
  const nextNumber = payApps.length > 0 ? Math.max(...payApps.map(p => p.pay_app_number)) + 1 : 1;

  const handleCreate = async () => {
    await createPayApp.mutateAsync({
      project_id: projectId,
      workspace_id: workspaceId,
      pay_app_number: nextNumber,
      period_from: form.period_from,
      period_to: form.period_to,
      contractor_name: form.contractor_name || undefined,
      contract_number: form.contract_number || undefined,
    });
    setCreateOpen(false);
    setForm({ period_from: '', period_to: '', contractor_name: '', contract_number: '' });
  };

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">Loading pay applications...</div>;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Pay Applications</CardTitle>
            <CardDescription>
              {payApps.filter(p => ['certified', 'paid'].includes(p.status)).length} certified to date
            </CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!hasSov}>
                    <Plus className="h-4 w-4 mr-1" />New Pay Application
                  </Button>
                </span>
              </TooltipTrigger>
              {!hasSov && <TooltipContent>Define SOV first</TooltipContent>}
            </Tooltip>
          </TooltipProvider>
        </CardHeader>
        <CardContent>
          {payApps.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">No pay applications yet.</p>
              {hasSov && <p className="text-xs text-muted-foreground">Create the first pay application to start tracking contractor billing.</p>}
            </div>
          ) : (
            <div className="rounded-lg border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[hsl(var(--sidebar-bg))] hover:bg-[hsl(var(--sidebar-bg))]">
                    <TableHead className="text-white">Pay App #</TableHead>
                    <TableHead className="text-white">Period</TableHead>
                    <TableHead className="text-white">Contractor</TableHead>
                    <TableHead className="text-white">Status</TableHead>
                    <TableHead className="text-right text-white">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payApps.map((pa, idx) => {
                    const statusCfg = STATUS_BADGES[pa.status] ?? STATUS_BADGES.draft;
                    return (
                      <TableRow key={pa.id} className={idx % 2 === 1 ? 'bg-muted/30' : ''}>
                        <TableCell className="font-mono font-bold">#{pa.pay_app_number}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(pa.period_from), 'MMM d')} – {format(new Date(pa.period_to), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-sm">{pa.contractor_name || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={statusCfg.variant} className={statusCfg.className}>
                            {pa.status === 'paid' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                            {statusCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => setSelectedPayApp(pa)}>Open</Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Pay Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              <span className="text-sm text-muted-foreground">Pay App #</span>
              <span className="font-mono font-bold text-lg">{nextNumber}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Period From *</Label>
                <Input type="date" value={form.period_from} onChange={e => setForm({ ...form, period_from: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Period To *</Label>
                <Input type="date" value={form.period_to} onChange={e => setForm({ ...form, period_to: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Contractor Name</Label>
              <Input value={form.contractor_name} onChange={e => setForm({ ...form, contractor_name: e.target.value })} placeholder="e.g. ABC Contractors" />
            </div>
            <div className="space-y-2">
              <Label>Contract Number</Label>
              <Input value={form.contract_number} onChange={e => setForm({ ...form, contract_number: e.target.value })} placeholder="e.g. C-2026-001" />
            </div>
            <p className="text-xs text-muted-foreground italic">Line items will be auto-populated from the SOV with previous period amounts carried forward.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.period_from || !form.period_to || createPayApp.isPending}>
              {createPayApp.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay App Sheet */}
      {selectedPayApp && (
        <PayAppSheet payApp={selectedPayApp} projectId={projectId} workspaceId={workspaceId} onClose={() => setSelectedPayApp(null)} />
      )}
    </>
  );
}
