import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft, Mail, Phone, Lock, Shield, Edit, Ban,
  CheckCircle2, Clock, AlertTriangle, FileText, Wrench,
} from 'lucide-react';
import {
  useContractor, useContractorWorkOrders, useContractorPayApps,
  useUpdateContractor, computeContractorScore,
} from '@/hooks/useContractors';
import { ContractorFormSheet } from '@/components/projects/ContractorFormSheet';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

function ScoreDonut({ score }: { score: number }) {
  const color = score >= 80 ? 'hsl(142 76% 36%)' : score >= 60 ? 'hsl(38 92% 50%)' : score >= 40 ? 'hsl(24 94% 50%)' : 'hsl(0 84% 60%)';
  const data = [{ value: score }, { value: 100 - score }];
  return (
    <div className="relative w-32 h-32 mx-auto">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={55} startAngle={90} endAngle={-270} strokeWidth={0}>
            <Cell fill={color} />
            <Cell fill="hsl(var(--muted))" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-mono font-bold">{score}</span>
      </div>
    </div>
  );
}

const formatDate = (d: string | null) => d ? format(new Date(d), 'MMM d, yyyy') : '—';
const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    inactive: 'bg-muted text-muted-foreground border-border',
    suspended: 'bg-destructive/10 text-destructive border-destructive/20',
  };
  return map[status] || map.inactive;
};

const woStatusBadge = (status: string) => {
  const map: Record<string, string> = {
    open: 'bg-blue-500/10 text-blue-600', in_progress: 'bg-amber-500/10 text-amber-600',
    completed: 'bg-emerald-500/10 text-emerald-600', verified: 'bg-primary/10 text-primary',
    closed: 'bg-muted text-muted-foreground', overdue: 'bg-destructive/10 text-destructive',
  };
  return map[status] || '';
};

const payAppStatusBadge = (status: string) => {
  const map: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground', submitted: 'bg-blue-500/10 text-blue-600',
    under_review: 'bg-amber-500/10 text-amber-600', certified: 'bg-emerald-500/10 text-emerald-600',
    paid: 'bg-primary/10 text-primary', disputed: 'bg-destructive/10 text-destructive',
  };
  return map[status] || '';
};

export default function ContractorDetailPage() {
  const { contractorId } = useParams<{ contractorId: string }>();
  const navigate = useNavigate();
  const { data: contractor, isLoading } = useContractor(contractorId ?? null);
  const { data: workOrders = [] } = useContractorWorkOrders(contractorId ?? null);
  const { data: payApps = [] } = useContractorPayApps(contractorId ?? null);
  const updateContractor = useUpdateContractor();
  const [formOpen, setFormOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [notes, setNotes] = useState<string | null>(null);

  if (isLoading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64" /></div>;
  }

  if (!contractor) {
    return (
      <div className="p-6 text-center py-20">
        <h2 className="text-lg font-semibold">Contractor not found</h2>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/projects/contractors')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
        </Button>
      </div>
    );
  }

  const score = computeContractorScore(workOrders as any, payApps, contractor);
  const displayNotes = notes ?? contractor.notes ?? '';

  const expiryWarning = (dateStr: string | null) => {
    if (!dateStr) return null;
    const diff = new Date(dateStr).getTime() - Date.now();
    if (diff < 0) return <span className="text-destructive text-xs flex items-center gap-1"><Lock className="h-3 w-3" /> Expired {formatDate(dateStr)}</span>;
    if (diff < 30 * 24 * 60 * 60 * 1000) return <span className="text-warning text-xs flex items-center gap-1"><Lock className="h-3 w-3" /> Expires {formatDate(dateStr)}</span>;
    return <span className="text-xs text-muted-foreground">{formatDate(dateStr)}</span>;
  };

  const handleSuspend = async () => {
    await updateContractor.mutateAsync({ id: contractor.id, status: 'suspended' as any });
    setSuspendOpen(false);
  };

  // Activity feed: combine work orders and pay apps into timeline
  const activityItems = [
    ...workOrders.map((wo: any) => ({
      date: wo.completed_at || wo.created_at,
      text: wo.completed_at
        ? `Work order "${wo.title}" completed${wo.due_date && new Date(wo.completed_at) > new Date(wo.due_date) ? ' (late)' : ''}`
        : `Work order "${wo.title}" created`,
      icon: <Wrench className="h-3.5 w-3.5" />,
    })),
    ...payApps.map((pa: any) => ({
      date: pa.submitted_date || pa.period_from,
      text: `Pay App #${pa.pay_app_number} ${pa.status}`,
      icon: <FileText className="h-3.5 w-3.5" />,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate('/projects/contractors')}>
        <ArrowLeft className="h-4 w-4 mr-1.5" /> All Contractors
      </Button>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left — Profile */}
        <div className="w-full lg:w-[300px] flex-shrink-0 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <h2 className="text-lg font-bold">{contractor.name}</h2>
                {contractor.company && <p className="text-sm text-muted-foreground">{contractor.company}</p>}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {contractor.trade && <Badge variant="secondary" className="text-xs">{contractor.trade}</Badge>}
                <Badge variant="outline" className={`text-xs ${statusBadge(contractor.status)}`}>{contractor.status}</Badge>
              </div>

              {(contractor.email || contractor.phone) && (
                <div className="space-y-1.5">
                  {contractor.email && (
                    <a href={`mailto:${contractor.email}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Mail className="h-3.5 w-3.5" /> {contractor.email}
                    </a>
                  )}
                  {contractor.phone && (
                    <a href={`tel:${contractor.phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Phone className="h-3.5 w-3.5" /> {contractor.phone}
                    </a>
                  )}
                </div>
              )}

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">License</span>
                  <span>{contractor.license_number || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">License Expiry</span>
                  {expiryWarning(contractor.license_expiry)}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Insurance Expiry</span>
                  {expiryWarning(contractor.insurance_expiry)}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Notes</label>
                <Textarea
                  rows={3}
                  value={displayNotes}
                  onChange={e => setNotes(e.target.value)}
                  onBlur={() => {
                    if (notes !== null && notes !== contractor.notes) {
                      updateContractor.mutate({ id: contractor.id, notes });
                    }
                  }}
                  className="mt-1 text-sm"
                  placeholder="Add notes..."
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setFormOpen(true)}>
                  <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
                {contractor.status !== 'suspended' && (
                  <Button variant="destructive" size="sm" onClick={() => setSuspendOpen(true)}>
                    <Ban className="h-3.5 w-3.5 mr-1" /> Suspend
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs font-medium text-muted-foreground mb-2">Performance Score</p>
              <ScoreDonut score={score.performanceScore} />
              <p className="text-xs text-muted-foreground mt-2">
                Based on {score.totalWorkOrders} work orders, {score.totalPayApps} pay apps
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right — Tabs */}
        <div className="flex-1 min-w-0">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
              <TabsTrigger value="pay-apps">Pay Applications</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* Metric cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-muted-foreground">On-Time Work Orders</p>
                    <p className="text-2xl font-mono font-bold mt-1">{score.onTimeRate}%</p>
                    <p className="text-xs text-muted-foreground">{score.completedOnTime} of {score.completedOnTime + score.completedLate} on time</p>
                    <div className="flex gap-1 mt-2">
                      <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${score.onTimeRate}%` }} />
                      <div className="h-2 rounded-full bg-destructive flex-1" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-muted-foreground">Open Work Orders</p>
                    <p className="text-2xl font-mono font-bold mt-1">{score.openWorkOrders}</p>
                    <p className="text-xs text-muted-foreground">{score.totalWorkOrders} total assigned</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-muted-foreground">Pay App History</p>
                    <p className="text-2xl font-mono font-bold mt-1">{score.totalPayApps}</p>
                    <p className="text-xs text-muted-foreground">
                      {score.disputedPayApps > 0
                        ? <span className="text-warning">{score.disputedPayApps} disputed</span>
                        : 'No disputes'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Activity feed */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {activityItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No activity yet</p>
                  ) : (
                    <div className="space-y-3">
                      {activityItems.map((item, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span className="mt-0.5 text-muted-foreground">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{item.text}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="work-orders" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {workOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No work orders assigned</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="px-4 py-2 text-left font-medium">Title</th>
                            <th className="px-4 py-2 text-left font-medium">Property</th>
                            <th className="px-4 py-2 text-left font-medium">Status</th>
                            <th className="px-4 py-2 text-left font-medium">Due</th>
                            <th className="px-4 py-2 text-left font-medium">Completed</th>
                            <th className="px-4 py-2 text-right font-medium">Variance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(workOrders as any[]).map((wo) => {
                            const isComplete = ['completed', 'verified', 'closed'].includes(wo.status);
                            const endDate = wo.completed_at ? new Date(wo.completed_at) : new Date();
                            const dueDate = wo.due_date ? new Date(wo.due_date) : null;
                            const variance = dueDate ? differenceInDays(endDate, dueDate) : null;

                            return (
                              <tr key={wo.id} className="border-b last:border-0 hover:bg-muted/30">
                                <td className="px-4 py-2 font-medium truncate max-w-[200px]">{wo.title}</td>
                                <td className="px-4 py-2 text-muted-foreground">{(wo.property as any)?.name || '—'}</td>
                                <td className="px-4 py-2">
                                  <Badge variant="secondary" className={`text-[10px] ${woStatusBadge(wo.status)}`}>{wo.status}</Badge>
                                </td>
                                <td className="px-4 py-2 text-muted-foreground">{wo.due_date ? formatDate(wo.due_date) : '—'}</td>
                                <td className="px-4 py-2 text-muted-foreground">{wo.completed_at ? formatDate(wo.completed_at) : '—'}</td>
                                <td className="px-4 py-2 text-right font-mono text-xs">
                                  {variance === null ? '—' : variance === 0 ? (
                                    <span className="text-emerald-600">On time</span>
                                  ) : variance > 0 ? (
                                    <span className="text-destructive">↑ {variance}d late</span>
                                  ) : (
                                    <span className="text-emerald-600">↓ {Math.abs(variance)}d early</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pay-apps" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {payApps.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No pay applications</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="px-4 py-2 text-left font-medium">#</th>
                            <th className="px-4 py-2 text-left font-medium">Project</th>
                            <th className="px-4 py-2 text-left font-medium">Period</th>
                            <th className="px-4 py-2 text-left font-medium">Submitted</th>
                            <th className="px-4 py-2 text-left font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(payApps as any[]).map((pa) => (
                            <tr key={pa.id} className="border-b last:border-0 hover:bg-muted/30">
                              <td className="px-4 py-2 font-mono font-medium">{pa.pay_app_number}</td>
                              <td className="px-4 py-2 text-muted-foreground">{(pa.project as any)?.name || '—'}</td>
                              <td className="px-4 py-2 text-muted-foreground text-xs">
                                {formatDate(pa.period_from)} — {formatDate(pa.period_to)}
                              </td>
                              <td className="px-4 py-2 text-muted-foreground">{pa.submitted_date ? formatDate(pa.submitted_date) : '—'}</td>
                              <td className="px-4 py-2">
                                <Badge variant="secondary" className={`text-[10px] ${payAppStatusBadge(pa.status)}`}>{pa.status}</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ContractorFormSheet open={formOpen} onOpenChange={setFormOpen} contractor={contractor} />

      <AlertDialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend {contractor.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the contractor as suspended. They will be flagged across all projects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSuspend} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Suspend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
