import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, TrendingUp, TrendingDown, BarChart3, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useProgressEntries, useCreateProgressEntry, useEarnedValueMetrics } from '@/hooks/useProjectProgress';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function ProgressTab({ projectId }: { projectId: string }) {
  const { data: entries } = useProgressEntries(projectId);
  const { data: metrics } = useEarnedValueMetrics(projectId);
  const createEntry = useCreateProgressEntry();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ trade: '', percent_complete: '0', planned_value: '', earned_value: '', actual_cost: '', notes: '' });

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createEntry.mutateAsync({
      project_id: projectId,
      trade: form.trade,
      percent_complete: parseFloat(form.percent_complete) || 0,
      planned_value: parseFloat(form.planned_value) || 0,
      earned_value: parseFloat(form.earned_value) || 0,
      actual_cost: parseFloat(form.actual_cost) || 0,
      notes: form.notes || undefined,
    });
    setDialogOpen(false);
    setForm({ trade: '', percent_complete: '0', planned_value: '', earned_value: '', actual_cost: '', notes: '' });
  };

  const tradeChartData = metrics?.trades.map(t => ({
    name: t.trade,
    progress: Number(t.percent_complete) || 0,
    pv: Number(t.planned_value) || 0,
    ev: Number(t.earned_value) || 0,
    ac: Number(t.actual_cost) || 0,
  })) || [];

  const pieData = tradeChartData.map(t => ({ name: t.name, value: t.progress }));

  return (
    <div className="space-y-6">
      {/* EV Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-3xl font-bold">{Math.round(metrics?.overallProgress || 0)}%</p>
            <p className="text-xs text-muted-foreground">Overall Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{(metrics?.cpi || 0).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">CPI (Cost Performance)</p>
            {(metrics?.cpi || 0) >= 1 ? (
              <Badge variant="outline" className="mt-1 text-green-500 border-green-500/20"><TrendingUp className="h-3 w-3 mr-1" />Under Budget</Badge>
            ) : metrics?.cpi ? (
              <Badge variant="outline" className="mt-1 text-destructive border-destructive/20"><TrendingDown className="h-3 w-3 mr-1" />Over Budget</Badge>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{(metrics?.spi || 0).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">SPI (Schedule Performance)</p>
            {(metrics?.spi || 0) >= 1 ? (
              <Badge variant="outline" className="mt-1 text-green-500 border-green-500/20"><TrendingUp className="h-3 w-3 mr-1" />Ahead</Badge>
            ) : metrics?.spi ? (
              <Badge variant="outline" className="mt-1 text-amber-500 border-amber-500/20"><TrendingDown className="h-3 w-3 mr-1" />Behind</Badge>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-3xl font-bold">{metrics?.trades.length || 0}</p>
            <p className="text-xs text-muted-foreground">Trades Tracked</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {tradeChartData.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progress by Trade</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tradeChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Bar dataKey="progress" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Progress %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trade Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trade Progress List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Trade Progress</CardTitle>
              <CardDescription>Percent complete per trade/scope</CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!metrics?.trades.length ? (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No progress entries yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {metrics.trades.map(t => (
                <div key={t.id} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{t.trade}</h4>
                    <span className="text-sm font-bold">{Math.round(Number(t.percent_complete) || 0)}%</span>
                  </div>
                  <Progress value={Number(t.percent_complete) || 0} className="h-2 mb-2" />
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>PV: {formatCurrency(Number(t.planned_value) || 0)}</span>
                    <span>EV: {formatCurrency(Number(t.earned_value) || 0)}</span>
                    <span>AC: {formatCurrency(Number(t.actual_cost) || 0)}</span>
                    <span className="ml-auto">{format(new Date(t.entry_date), 'MMM d')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Progress Entry</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-2">
              <Label>Trade / Scope *</Label>
              <Input value={form.trade} onChange={e => setForm({ ...form, trade: e.target.value })} placeholder="e.g. Electrical, Plumbing, HVAC" required />
            </div>
            <div className="grid gap-2">
              <Label>Percent Complete</Label>
              <Input type="number" min="0" max="100" value={form.percent_complete} onChange={e => setForm({ ...form, percent_complete: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label>Planned Value</Label>
                <Input type="number" step="0.01" value={form.planned_value} onChange={e => setForm({ ...form, planned_value: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Earned Value</Label>
                <Input type="number" step="0.01" value={form.earned_value} onChange={e => setForm({ ...form, earned_value: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Actual Cost</Label>
                <Input type="number" step="0.01" value={form.actual_cost} onChange={e => setForm({ ...form, actual_cost: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createEntry.isPending}>Add Entry</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
