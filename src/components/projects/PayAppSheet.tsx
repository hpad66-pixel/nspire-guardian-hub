import { useState } from 'react';
import { format } from 'date-fns';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, Check, X, FileText, Upload, Plus } from 'lucide-react';
import {
  usePayAppLineItems, useUpdatePayAppLineItem, useUpdatePayApplication,
  useLienWaivers, useCreateLienWaiver, computePayAppTotals,
} from '@/hooks/useSOV';
import { useChangeOrdersByProject } from '@/hooks/useChangeOrders';
import { useProject } from '@/hooks/useProjects';
import { useUserPermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface PayAppSheetProps {
  payApp: any;
  projectId: string;
  workspaceId: string;
  onClose: () => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const WAIVER_TYPES: Record<string, string> = {
  conditional_progress: 'Conditional Waiver on Progress Payment',
  unconditional_progress: 'Unconditional Waiver on Progress Payment',
  conditional_final: 'Conditional Waiver on Final Payment',
  unconditional_final: 'Unconditional Waiver on Final Payment',
};

export function PayAppSheet({ payApp, projectId, workspaceId, onClose }: PayAppSheetProps) {
  const { data: lineItems = [], isLoading } = usePayAppLineItems(payApp.id);
  const { data: changeOrders = [] } = useChangeOrdersByProject(projectId);
  const { data: project } = useProject(projectId);
  const { data: waivers = [] } = useLienWaivers(payApp.id);
  const updateLineItem = useUpdatePayAppLineItem();
  const updatePayApp = useUpdatePayApplication();
  const createWaiver = useCreateLienWaiver();
  const { hasPermission, isAdmin } = useUserPermissions();
  const { user } = useAuth();
  const canCertify = isAdmin || hasPermission('projects', 'approve');

  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeNotes, setDisputeNotes] = useState('');
  const [waiverFormOpen, setWaiverFormOpen] = useState(false);
  const [waiverForm, setWaiverForm] = useState({ waiver_type: '', amount: '', through_date: '', received_date: '', notes: '' });

  // G702 summary computations
  const totals = computePayAppTotals(lineItems as any);
  const approvedCOAmount = changeOrders.filter(co => co.status === 'approved').reduce((s, co) => s + (Number(co.amount) || 0), 0);
  const originalBudget = Number(project?.budget) || 0;
  const contractSumToDate = originalBudget + approvedCOAmount;

  const handleStatusChange = async (newStatus: string) => {
    const updates: any = { id: payApp.id, projectId, status: newStatus };
    if (newStatus === 'submitted') updates.submitted_date = new Date().toISOString().split('T')[0];
    if (newStatus === 'certified') {
      updates.certified_date = new Date().toISOString().split('T')[0];
      updates.certified_by = user?.id;
    }
    await updatePayApp.mutateAsync(updates);
  };

  const handleDispute = async () => {
    await updatePayApp.mutateAsync({ id: payApp.id, projectId, status: 'disputed', notes: disputeNotes });
    setDisputeOpen(false);
  };

  const handleWaiverSave = async () => {
    await createWaiver.mutateAsync({
      pay_app_id: payApp.id,
      workspace_id: workspaceId,
      waiver_type: waiverForm.waiver_type,
      amount: Number(waiverForm.amount) || undefined,
      through_date: waiverForm.through_date || undefined,
      received_date: waiverForm.received_date || undefined,
      notes: waiverForm.notes || undefined,
    });
    setWaiverFormOpen(false);
    setWaiverForm({ waiver_type: '', amount: '', through_date: '', received_date: '', notes: '' });
  };

  const handleLineItemUpdate = (id: string, field: string, value: string) => {
    updateLineItem.mutate({
      id,
      payAppId: payApp.id,
      [field]: Number(value) || 0,
    });
  };

  const statusLabel = payApp.status.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

  return (
    <>
      <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent side="right" className="w-full max-w-5xl p-0 overflow-auto sm:max-w-5xl">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold">Pay Application #{payApp.pay_app_number}</h2>
              <Badge variant="outline">{statusLabel}</Badge>
              <span className="text-sm text-muted-foreground">
                {format(new Date(payApp.period_from), 'MMM d')} – {format(new Date(payApp.period_to), 'MMM d, yyyy')}
              </span>
              {payApp.status === 'certified' && (
                <span className="text-lg font-bold text-[#C9A84C] font-mono ml-2">
                  Due: {formatCurrency(totals.netPayment)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {payApp.status === 'draft' && (
                <Button size="sm" onClick={() => handleStatusChange('submitted')}>Submit for Review</Button>
              )}
              {(payApp.status === 'submitted' || payApp.status === 'under_review') && canCertify && (
                <>
                  {payApp.status === 'submitted' && (
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange('under_review')}>Mark Under Review</Button>
                  )}
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => {
                    if (waivers.length === 0) toast.warning('No lien waivers received — proceeding anyway');
                    handleStatusChange('certified');
                  }}>
                    Certify Payment
                  </Button>
                </>
              )}
              {payApp.status === 'certified' && canCertify && (
                <Button size="sm" className="bg-[#C9A84C] hover:bg-[#B8973F] text-white" onClick={() => handleStatusChange('paid')}>
                  Mark as Paid
                </Button>
              )}
              {payApp.status === 'paid' && (
                <Badge className="bg-[#C9A84C] text-white text-sm px-3 py-1">PAID</Badge>
              )}
              {!['paid', 'disputed'].includes(payApp.status) && (
                <Button size="sm" variant="destructive" onClick={() => setDisputeOpen(true)}>Dispute</Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="g703" className="px-6 py-4">
            <TabsList>
              <TabsTrigger value="g703">G703 Continuation</TabsTrigger>
              <TabsTrigger value="g702">G702 Summary</TabsTrigger>
              <TabsTrigger value="waivers">Lien Waivers</TabsTrigger>
            </TabsList>

            {/* TAB 1 — G703 */}
            <TabsContent value="g703" className="mt-4">
              {isLoading ? (
                <p className="text-muted-foreground text-center py-8">Loading...</p>
              ) : (
                <div className="rounded-lg border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[hsl(var(--sidebar-bg))] hover:bg-[hsl(var(--sidebar-bg))]">
                        <TableHead className="text-white w-[50px]">#</TableHead>
                        <TableHead className="text-white">Description</TableHead>
                        <TableHead className="text-white text-right w-[120px]">Sched. Value</TableHead>
                        <TableHead className="text-white text-right w-[110px]">Prev. Periods</TableHead>
                        <TableHead className="text-white text-right w-[110px]">This Period</TableHead>
                        <TableHead className="text-white text-right w-[100px]">Materials</TableHead>
                        <TableHead className="text-white text-right w-[110px]">Total</TableHead>
                        <TableHead className="text-white text-center w-[70px]">%</TableHead>
                        <TableHead className="text-white text-right w-[100px] text-destructive">Retainage</TableHead>
                        {canCertify && <TableHead className="text-white text-right w-[110px]">Certified</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((li: any, idx: number) => {
                        const sov = li.sov_line_item;
                        if (!sov) return null;
                        const sv = Number(sov.scheduled_value);
                        const prev = Number(li.work_completed_previous);
                        const thisPeriod = Number(li.work_completed_this_period);
                        const mats = Number(li.materials_stored);
                        const total = prev + thisPeriod + mats;
                        const pct = sv > 0 ? Math.round((total / sv) * 100) : 0;
                        const retPct = Number(li.retainage_pct_override ?? sov.retainage_pct) / 100;
                        const retainage = total * retPct;
                        const certified = li.certified_this_period;
                        const isPaid = payApp.status === 'paid';

                        return (
                          <TableRow key={li.id} className={idx % 2 === 1 ? 'bg-muted/30' : ''}>
                            <TableCell className="font-mono text-xs">{sov.item_number}</TableCell>
                            <TableCell className="text-sm">{sov.description}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatCurrency(sv)}</TableCell>
                            <TableCell className="text-right font-mono text-sm text-muted-foreground">{formatCurrency(prev)}</TableCell>
                            <TableCell className="text-right">
                              {isPaid ? (
                                <span className="font-mono text-sm">{formatCurrency(thisPeriod)}</span>
                              ) : (
                                <Input
                                  type="number"
                                  defaultValue={thisPeriod}
                                  onBlur={e => handleLineItemUpdate(li.id, 'work_completed_this_period', e.target.value)}
                                  className="h-7 w-24 text-right font-mono text-sm ml-auto border-transparent hover:border-primary/30 focus:border-primary"
                                />
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isPaid ? (
                                <span className="font-mono text-sm">{formatCurrency(mats)}</span>
                              ) : (
                                <Input
                                  type="number"
                                  defaultValue={mats}
                                  onBlur={e => handleLineItemUpdate(li.id, 'materials_stored', e.target.value)}
                                  className="h-7 w-20 text-right font-mono text-sm ml-auto border-transparent hover:border-primary/30 focus:border-primary"
                                />
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm font-medium">{formatCurrency(total)}</TableCell>
                            <TableCell className="text-center font-mono text-sm">{pct}%</TableCell>
                            <TableCell className="text-right font-mono text-sm text-destructive">{formatCurrency(retainage)}</TableCell>
                            {canCertify && (
                              <TableCell className="text-right">
                                {isPaid ? (
                                  <span className="font-mono text-sm font-bold text-primary">
                                    {formatCurrency(Number(certified ?? thisPeriod))}
                                  </span>
                                ) : (
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      defaultValue={certified ?? ''}
                                      placeholder={String(thisPeriod)}
                                      onBlur={e => handleLineItemUpdate(li.id, 'certified_this_period', e.target.value)}
                                      className="h-7 w-24 text-right font-mono text-sm ml-auto border-transparent hover:border-primary/30 focus:border-primary font-bold text-primary"
                                    />
                                    {certified !== null && Number(certified) !== thisPeriod && (
                                      <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
                                    )}
                                  </div>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="font-bold">
                        <TableCell colSpan={2}>TOTALS</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(totals.scheduledValue)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(totals.completedPrevious)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(totals.completedThisPeriod)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(totals.materialsStored)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(totals.totalEarned)}</TableCell>
                        <TableCell className="text-center font-mono">{totals.pctComplete.toFixed(0)}%</TableCell>
                        <TableCell className="text-right font-mono text-destructive">{formatCurrency(totals.retainageHeld)}</TableCell>
                        {canCertify && <TableCell className="text-right font-mono text-primary">{formatCurrency(totals.certifiedThisPeriod)}</TableCell>}
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* TAB 2 — G702 Summary */}
            <TabsContent value="g702" className="mt-4 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>AIA G702 — Application and Certificate for Payment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Original Contract Sum</span>
                      <span className="font-mono font-medium">{formatCurrency(originalBudget)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Net Change By Change Orders</span>
                      <span className="font-mono font-medium">{formatCurrency(approvedCOAmount)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Contract Sum To Date</span>
                      <span className="font-mono font-bold">{formatCurrency(contractSumToDate)}</span>
                    </div>
                    <div />
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Total Completed & Stored To Date</span>
                      <span className="font-mono font-medium">{formatCurrency(totals.totalEarned)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Retainage Held</span>
                      <span className="font-mono font-medium text-destructive">{formatCurrency(totals.retainageHeld)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Total Earned Less Retainage</span>
                      <span className="font-mono font-medium">{formatCurrency(totals.totalEarned - totals.retainageHeld)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-sm text-muted-foreground">Less Previous Certificates</span>
                      <span className="font-mono font-medium">{formatCurrency(totals.completedPrevious)}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-between">
                    <span className="text-lg font-bold text-[#C9A84C]">CURRENT PAYMENT DUE</span>
                    <span className="text-3xl font-bold font-mono text-[#C9A84C]">{formatCurrency(totals.netPayment)}</span>
                  </div>

                  <div className="flex justify-between text-sm text-muted-foreground pt-2">
                    <span>Balance To Finish Including Retainage</span>
                    <span className="font-mono font-medium">{formatCurrency(totals.scheduledValue - totals.totalEarned + totals.retainageHeld)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Editable Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pay Application Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Contractor Name</Label>
                      <Input
                        defaultValue={payApp.contractor_name ?? ''}
                        onBlur={e => updatePayApp.mutate({ id: payApp.id, projectId, contractor_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Contract Number</Label>
                      <Input
                        defaultValue={payApp.contract_number ?? ''}
                        onBlur={e => updatePayApp.mutate({ id: payApp.id, projectId, contract_number: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      defaultValue={payApp.notes ?? ''}
                      onBlur={e => updatePayApp.mutate({ id: payApp.id, projectId, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3 — Lien Waivers */}
            <TabsContent value="waivers" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Lien Waivers</h3>
                <Button size="sm" onClick={() => setWaiverFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />Add Lien Waiver
                </Button>
              </div>

              {waivers.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  No lien waivers recorded yet.
                </div>
              ) : (
                <div className="rounded-lg border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Through Date</TableHead>
                        <TableHead>Received</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {waivers.map((w: any) => (
                        <TableRow key={w.id}>
                          <TableCell className="text-sm">{WAIVER_TYPES[w.waiver_type] ?? w.waiver_type}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{w.amount ? formatCurrency(Number(w.amount)) : '—'}</TableCell>
                          <TableCell className="text-sm">{w.through_date ? format(new Date(w.through_date), 'MMM d, yyyy') : '—'}</TableCell>
                          <TableCell className="text-sm">{w.received_date ? format(new Date(w.received_date), 'MMM d, yyyy') : '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{w.notes ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Waiver Form Dialog */}
              <Dialog open={waiverFormOpen} onOpenChange={setWaiverFormOpen}>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Lien Waiver</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Waiver Type *</Label>
                      <Select value={waiverForm.waiver_type} onValueChange={v => setWaiverForm({ ...waiverForm, waiver_type: v })}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(WAIVER_TYPES).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Amount</Label>
                        <Input type="number" value={waiverForm.amount} onChange={e => setWaiverForm({ ...waiverForm, amount: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Through Date</Label>
                        <Input type="date" value={waiverForm.through_date} onChange={e => setWaiverForm({ ...waiverForm, through_date: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Received Date</Label>
                      <Input type="date" value={waiverForm.received_date} onChange={e => setWaiverForm({ ...waiverForm, received_date: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea value={waiverForm.notes} onChange={e => setWaiverForm({ ...waiverForm, notes: e.target.value })} rows={2} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setWaiverFormOpen(false)}>Cancel</Button>
                    <Button onClick={handleWaiverSave} disabled={!waiverForm.waiver_type}>Save Waiver</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Dispute Dialog */}
      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Dispute Pay Application</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm font-medium">This will flag the pay application as disputed.</span>
            </div>
            <div className="space-y-2">
              <Label>Dispute Notes *</Label>
              <Textarea value={disputeNotes} onChange={e => setDisputeNotes(e.target.value)} rows={3} placeholder="Describe the reason for the dispute..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDispute} disabled={!disputeNotes.trim()}>Submit Dispute</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
