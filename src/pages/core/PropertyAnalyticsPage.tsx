import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ChevronRight, Plus, Pencil, FileText, ExternalLink, BarChart2,
} from 'lucide-react';
import { useProperty } from '@/hooks/useProperties';
import { useUtilityBills } from '@/hooks/useUtilityBills';
import { PropertyCostSummary } from '@/components/analytics/PropertyCostSummary';
import { UtilityTrendChart } from '@/components/analytics/UtilityTrendChart';
import { InventoryStatusPanel } from '@/components/analytics/InventoryStatusPanel';
import { UtilityBillDialog } from '@/components/analytics/UtilityBillDialog';
import { type UtilityBill } from '@/hooks/useUtilityBills';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

function statusBadge(status: string) {
  switch (status) {
    case 'paid':     return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-100 text-xs">Paid</Badge>;
    case 'disputed': return <Badge variant="destructive" className="text-xs">Disputed</Badge>;
    default:         return <Badge className="bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-100 text-xs">Pending</Badge>;
  }
}

function formatPeriod(start: string, end: string) {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end   + 'T00:00:00');
  return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export default function PropertyAnalyticsPage() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();

  const [selectedYear, setSelectedYear]   = useState(CURRENT_YEAR);
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [editingBill, setEditingBill]      = useState<UtilityBill | null>(null);

  const { data: property, isLoading: propertyLoading } = useProperty(propertyId!);
  const { data: recentBills, isLoading: billsLoading } = useUtilityBills(propertyId!);

  const latest12 = (recentBills ?? []).slice(0, 12);

  if (!propertyId) return null;

  return (
    <div className="p-4 md:p-6 space-y-8 animate-fade-in max-w-[1200px] mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            <button
              type="button"
              onClick={() => navigate('/properties')}
              className="hover:text-foreground transition-colors"
            >
              Properties
            </button>
            <ChevronRight className="h-3.5 w-3.5" />
            {propertyLoading ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              <button
                type="button"
                onClick={() => navigate(`/units?propertyId=${propertyId}`)}
                className="hover:text-foreground transition-colors"
              >
                {property?.name}
              </button>
            )}
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">Analytics</span>
          </nav>

          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              {propertyLoading ? (
                <Skeleton className="h-7 w-56" />
              ) : (
                <h1 className="text-2xl font-bold tracking-tight">
                  {property?.name} — Operations Intelligence
                </h1>
              )}
              <p className="text-sm text-muted-foreground">Utilities, inventory, and cost analytics</p>
            </div>
          </div>
        </div>

        {/* Year selector */}
        <Select
          value={String(selectedYear)}
          onValueChange={(v) => setSelectedYear(Number(v))}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEAR_OPTIONS.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Row 2: KPI summary + YoY ── */}
      <PropertyCostSummary
        propertyId={propertyId}
        totalUnits={property?.total_units ?? null}
        selectedYear={selectedYear}
      />

      {/* ── Row 3: Utility Trend Chart ── */}
      <Card>
        <CardContent className="p-6">
          <UtilityTrendChart propertyId={propertyId} year={selectedYear} />
        </CardContent>
      </Card>

      {/* ── Row 4: Inventory ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Materials & Supplies</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <InventoryStatusPanel propertyId={propertyId} />
        </CardContent>
      </Card>

      {/* ── Row 5: Recent Bills Table ── */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Recent Utility Bills</CardTitle>
          <Button size="sm" onClick={() => { setEditingBill(null); setBillDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Bill
          </Button>
        </CardHeader>
        <CardContent className="p-0 pb-4">
          {billsLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
            </div>
          ) : latest12.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No bills uploaded yet.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setBillDialogOpen(true)}
              >
                Add your first bill
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utility</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Consumption</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latest12.map((bill) => (
                    <TableRow key={bill.id} className="hover:bg-muted/30">
                      <TableCell>
                        <span className="font-medium capitalize">{bill.utility_type}</span>
                        {bill.provider_name && (
                          <p className="text-xs text-muted-foreground">{bill.provider_name}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatPeriod(bill.bill_period_start, bill.bill_period_end)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${bill.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {bill.consumption_value != null
                          ? `${bill.consumption_value.toLocaleString()} ${bill.consumption_unit ?? ''}`
                          : '—'}
                      </TableCell>
                      <TableCell>{statusBadge(bill.status)}</TableCell>
                      <TableCell>
                        {bill.document_url ? (
                          <a
                            href={bill.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline text-xs"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => { setEditingBill(bill); setBillDialogOpen(true); }}
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Dialogs ── */}
      <UtilityBillDialog
        open={billDialogOpen}
        onOpenChange={(o) => {
          setBillDialogOpen(o);
          if (!o) setEditingBill(null);
        }}
        propertyId={propertyId}
        bill={editingBill}
      />
    </div>
  );
}
