import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { ChevronDown, Plus, Package, TrendingDown, TrendingUp } from 'lucide-react';
import {
  useInventoryItems, useLowStockCount, useInventoryConsumptionByMonth,
  type InventoryItem,
} from '@/hooks/useInventory';
import { InventoryItemDialog } from './InventoryItemDialog';
import { LogTransactionDialog } from './LogTransactionDialog';
import { cn } from '@/lib/utils';

interface InventoryStatusPanelProps {
  propertyId: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  hvac:       '#3B82F6',
  plumbing:   '#06B6D4',
  electrical: '#F59E0B',
  cleaning:   '#10B981',
  grounds:    '#84CC16',
  safety:     '#EF4444',
  paint:      '#EC4899',
  hardware:   '#8B5CF6',
  general:    '#6B7280',
};

function StockBadge({ item }: { item: InventoryItem }) {
  if (item.current_quantity <= 0) {
    return <Badge variant="destructive" className="text-xs">Out of Stock</Badge>;
  }
  if (item.current_quantity <= item.minimum_quantity) {
    return <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-100">Low Stock</Badge>;
  }
  return <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-100">In Stock</Badge>;
}

function groupByCategory(items: InventoryItem[]): Record<string, InventoryItem[]> {
  return items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);
}

export function InventoryStatusPanel({ propertyId }: InventoryStatusPanelProps) {
  const [addItemOpen, setAddItemOpen]   = useState(false);
  const [editItem,    setEditItem]      = useState<InventoryItem | null>(null);
  const [logItem,     setLogItem]       = useState<InventoryItem | null>(null);
  const [logType,     setLogType]       = useState<'used' | 'received'>('used');
  const [openGroups,  setOpenGroups]    = useState<Record<string, boolean>>({});

  const { data: items,        isLoading: itemsLoading }       = useInventoryItems(propertyId);
  const { data: lowStockCount }                               = useLowStockCount(propertyId);
  const { data: consumption,  isLoading: consumptionLoading } = useInventoryConsumptionByMonth(propertyId, 6);

  const grouped    = groupByCategory(items ?? []);
  const categories = Object.keys(grouped).sort();

  // Donut chart data
  const donutData = Object.entries(
    (consumption ?? []).reduce((acc, row) => {
      acc[row.category] = (acc[row.category] ?? 0) + row.total_spent;
      return acc;
    }, {} as Record<string, number>)
  )
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);

  const toggleGroup = (cat: string) =>
    setOpenGroups((prev) => ({ ...prev, [cat]: !prev[cat] }));

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left: Item list */}
      <div className="flex-[3] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">Inventory</h3>
            {(lowStockCount ?? 0) > 0 && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-100 text-xs">
                ⚠ {lowStockCount} low stock
              </Badge>
            )}
          </div>
          <Button size="sm" onClick={() => setAddItemOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Item
          </Button>
        </div>

        {itemsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : (items ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No inventory items yet.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setAddItemOpen(true)}>
              Add your first item
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map((cat) => {
              const catItems  = grouped[cat];
              const isOpen    = openGroups[cat] !== false; // default open
              const catLabel  = cat.charAt(0).toUpperCase() + cat.slice(1);
              const lowInCat  = catItems.filter((i) => i.current_quantity <= i.minimum_quantity).length;

              return (
                <Collapsible key={cat} open={isOpen} onOpenChange={() => toggleGroup(cat)}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 hover:bg-muted/70 transition-colors">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: CATEGORY_COLORS[cat] ?? '#6B7280' }}
                        />
                        <span className="text-sm font-medium">{catLabel}</span>
                        <span className="text-xs text-muted-foreground">({catItems.length})</span>
                        {lowInCat > 0 && (
                          <span className="text-xs text-amber-600">⚠ {lowInCat} low</span>
                        )}
                      </div>
                      <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-1 space-y-1 pl-2">
                      {catItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 rounded-lg border border-border/50 bg-background px-3 py-2.5 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => setEditItem(item)}
                              className="text-sm font-medium hover:underline text-left leading-tight truncate block"
                            >
                              {item.name}
                            </button>
                            <p className="text-xs text-muted-foreground">
                              {item.current_quantity} {item.unit_of_measure}
                              {item.storage_location && ` · ${item.storage_location}`}
                            </p>
                          </div>
                          <StockBadge item={item} />
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Log Use"
                              onClick={() => { setLogItem(item); setLogType('used'); }}
                            >
                              <TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Receive Stock"
                              onClick={() => { setLogItem(item); setLogType('received'); }}
                            >
                              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: Donut chart */}
      <div className="flex-[2] space-y-4">
        <h3 className="font-semibold text-foreground">Supply Spend by Category</h3>
        <p className="text-xs text-muted-foreground -mt-2">Last 6 months · used + disposed</p>

        {consumptionLoading ? (
          <Skeleton className="h-56 w-full rounded-xl" />
        ) : donutData.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">No consumption data yet.</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {donutData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={CATEGORY_COLORS[entry.name] ?? '#6B7280'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => [`$${v.toFixed(2)}`, 'Spent']}
                  contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))' }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend list */}
            <div className="space-y-1.5">
              {donutData.slice(0, 5).map((entry) => (
                <div key={entry.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ background: CATEGORY_COLORS[entry.name] ?? '#6B7280' }}
                    />
                    <span className="capitalize text-muted-foreground">{entry.name}</span>
                  </div>
                  <span className="font-medium">${entry.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Dialogs */}
      <InventoryItemDialog
        open={addItemOpen}
        onOpenChange={setAddItemOpen}
        propertyId={propertyId}
      />
      {editItem && (
        <InventoryItemDialog
          open={!!editItem}
          onOpenChange={(o) => !o && setEditItem(null)}
          propertyId={propertyId}
          item={editItem}
        />
      )}
      {logItem && (
        <LogTransactionDialog
          open={!!logItem}
          onOpenChange={(o) => !o && setLogItem(null)}
          item={logItem}
          defaultType={logType}
        />
      )}
    </div>
  );
}
