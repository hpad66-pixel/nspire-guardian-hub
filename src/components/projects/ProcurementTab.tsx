import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Package, DollarSign, Truck } from 'lucide-react';
import { usePurchaseOrders, useCreatePurchaseOrder, useUpdatePurchaseOrder, useProcurementStats } from '@/hooks/useProjectProcurement';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending: 'bg-amber-500/10 text-amber-500',
  approved: 'bg-green-500/10 text-green-500',
  ordered: 'bg-blue-500/10 text-blue-500',
  delivered: 'bg-primary/10 text-primary',
  cancelled: 'bg-destructive/10 text-destructive',
};

export function ProcurementTab({ projectId }: { projectId: string }) {
  const { data: orders } = usePurchaseOrders(projectId);
  const { data: stats } = useProcurementStats(projectId);
  const createPO = useCreatePurchaseOrder();
  const updatePO = useUpdatePurchaseOrder();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ vendor_name: '', description: '', total: '', order_date: '', expected_delivery: '' });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createPO.mutateAsync({
      project_id: projectId,
      vendor_name: form.vendor_name,
      description: form.description,
      total: parseFloat(form.total) || 0,
      order_date: form.order_date || undefined,
      expected_delivery: form.expected_delivery || undefined,
    });
    setDialogOpen(false);
    setForm({ vendor_name: '', description: '', total: '', order_date: '', expected_delivery: '' });
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-3xl font-bold">{stats?.totalPOs || 0}</p>
            <p className="text-xs text-muted-foreground">Total POs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-3xl font-bold">{formatCurrency(stats?.totalSpent || 0)}</p>
            <p className="text-xs text-muted-foreground">Total Committed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Truck className="h-8 w-8 mx-auto mb-2 text-amber-500" />
            <p className="text-3xl font-bold">{stats?.pending || 0}</p>
            <p className="text-xs text-muted-foreground">Pending Approval</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>Manage procurement and material orders</CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New PO
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!orders?.length ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No purchase orders yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(po => (
                <div key={po.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <span className="text-sm font-bold text-muted-foreground">#{po.po_number}</span>
                    </div>
                    <div>
                      <p className="font-medium">{po.vendor_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {po.description && <span className="truncate max-w-[200px]">{po.description}</span>}
                        {po.expected_delivery && <span>• ETA {format(new Date(po.expected_delivery), 'MMM d')}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatCurrency(Number(po.total) || 0)}</span>
                    <Badge variant="outline" className={statusColors[po.status] || ''}>
                      {po.status}
                    </Badge>
                    <Select value={po.status} onValueChange={(v) => updatePO.mutate({ id: po.id, status: v })}>
                      <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="ordered">Ordered</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-2">
              <Label>Vendor *</Label>
              <Input value={form.vendor_name} onChange={e => setForm({ ...form, vendor_name: e.target.value })} required />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid gap-2">
              <Label>Total Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input className="pl-7" value={form.total} onChange={e => setForm({ ...form, total: e.target.value })} type="number" step="0.01" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Order Date</Label>
                <Input type="date" value={form.order_date} onChange={e => setForm({ ...form, order_date: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Expected Delivery</Label>
                <Input type="date" value={form.expected_delivery} onChange={e => setForm({ ...form, expected_delivery: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createPO.isPending}>Create PO</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
