/**
 * Pure analytics helpers for the Stores & Materials module.
 * Used by the project Stores tab and the owner portal Operations view.
 */

export type StoresTxnType = 'received' | 'used' | 'adjustment' | 'returned' | 'disposed' | string;

export interface StoresItemLike {
  id: string;
  name: string;
  category: string;
  current_quantity: number;
  minimum_quantity: number;
  unit_cost: number | null;
  sku?: string | null;
}

export interface StoresTxnLike {
  id: string;
  item_id: string;
  transaction_type: StoresTxnType;
  quantity: number;
  total_cost: number | null;
  unit_cost?: number | null;
  transaction_date: string;
  deployed_at?: string | null;
  unit_label?: string | null;
  requester_name?: string | null;
  reason?: string | null;
  issued_to_name?: string | null;
  linked_work_order_id?: string | null;
  vendor?: string | null;
  emergency_override?: boolean | null;
}

export interface StoresWorkOrderLike {
  id: string;
  title: string;
  status: string;
  requester_name?: string | null;
  unit_id?: string | null;
}

export function money(n: number | null | undefined): number {
  if (n == null || Number.isNaN(Number(n))) return 0;
  return Math.round(Number(n) * 100) / 100;
}

export function onHandValue(items: StoresItemLike[]): number {
  return money(
    items.reduce((sum, item) => sum + Number(item.current_quantity || 0) * Number(item.unit_cost || 0), 0),
  );
}

export function lowStockItems(items: StoresItemLike[]): StoresItemLike[] {
  return items.filter((item) => Number(item.current_quantity) <= Number(item.minimum_quantity || 0));
}

export function issueTxns(txns: StoresTxnLike[]): StoresTxnLike[] {
  return txns.filter((t) => t.transaction_type === 'used');
}

export function receiveTxns(txns: StoresTxnLike[]): StoresTxnLike[] {
  return txns.filter((t) => t.transaction_type === 'received');
}

export interface CategorySpend {
  category: string;
  qty: number;
  spend: number;
}

export function spendByCategory(
  items: StoresItemLike[],
  txns: StoresTxnLike[],
): CategorySpend[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const map = new Map<string, CategorySpend>();
  for (const t of issueTxns(txns)) {
    const item = byId.get(t.item_id);
    const category = item?.category ?? 'general';
    const row = map.get(category) ?? { category, qty: 0, spend: 0 };
    row.qty += Math.abs(Number(t.quantity) || 0);
    row.spend += Math.abs(Number(t.total_cost) || 0);
    map.set(category, row);
  }
  return [...map.values()].sort((a, b) => b.spend - a.spend);
}

export interface PartMover {
  itemId: string;
  name: string;
  category: string;
  qty: number;
  spend: number;
  unitsTouched: number;
}

export function topMovedParts(
  items: StoresItemLike[],
  txns: StoresTxnLike[],
  limit = 8,
): PartMover[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const map = new Map<string, PartMover & { units: Set<string> }>();
  for (const t of issueTxns(txns)) {
    const item = byId.get(t.item_id);
    if (!item) continue;
    const row = map.get(item.id) ?? {
      itemId: item.id,
      name: item.name,
      category: item.category,
      qty: 0,
      spend: 0,
      unitsTouched: 0,
      units: new Set<string>(),
    };
    row.qty += Math.abs(Number(t.quantity) || 0);
    row.spend += Math.abs(Number(t.total_cost) || 0);
    if (t.unit_label) row.units.add(t.unit_label);
    map.set(item.id, row);
  }
  return [...map.values()]
    .map(({ units, ...rest }) => ({ ...rest, unitsTouched: units.size }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit);
}

export interface MonthlyIssue {
  month: string;
  qty: number;
  spend: number;
}

export function issuesByMonth(txns: StoresTxnLike[]): MonthlyIssue[] {
  const map = new Map<string, MonthlyIssue>();
  for (const t of issueTxns(txns)) {
    const month = (t.deployed_at || t.transaction_date || '').slice(0, 7);
    if (!month) continue;
    const row = map.get(month) ?? { month, qty: 0, spend: 0 };
    row.qty += Math.abs(Number(t.quantity) || 0);
    row.spend += Math.abs(Number(t.total_cost) || 0);
    map.set(month, row);
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export interface UnitHeat {
  unit: string;
  issues: number;
  spend: number;
}

export function issuesByUnit(txns: StoresTxnLike[], limit = 10): UnitHeat[] {
  const map = new Map<string, UnitHeat>();
  for (const t of issueTxns(txns)) {
    const unit = (t.unit_label || 'Unassigned').trim() || 'Unassigned';
    const row = map.get(unit) ?? { unit, issues: 0, spend: 0 };
    row.issues += 1;
    row.spend += Math.abs(Number(t.total_cost) || 0);
    map.set(unit, row);
  }
  return [...map.values()].sort((a, b) => b.issues - a.issues).slice(0, limit);
}

export interface RepeatOffender {
  itemId: string;
  name: string;
  unit: string;
  count: number;
}

/** Same part replaced in the same unit 2+ times — root-cause flag for owners. */
export function repeatOffenders(
  items: StoresItemLike[],
  txns: StoresTxnLike[],
  minCount = 2,
): RepeatOffender[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const map = new Map<string, RepeatOffender>();
  for (const t of issueTxns(txns)) {
    const item = byId.get(t.item_id);
    const unit = (t.unit_label || '').trim();
    if (!item || !unit) continue;
    const key = `${item.id}::${unit}`;
    const row = map.get(key) ?? { itemId: item.id, name: item.name, unit, count: 0 };
    row.count += 1;
    map.set(key, row);
  }
  return [...map.values()].filter((r) => r.count >= minCount).sort((a, b) => b.count - a.count);
}

export interface TechVolume {
  name: string;
  issues: number;
  spend: number;
}

export function issuesByTech(txns: StoresTxnLike[]): TechVolume[] {
  const map = new Map<string, TechVolume>();
  for (const t of issueTxns(txns)) {
    const name = (t.issued_to_name || 'Unassigned').trim() || 'Unassigned';
    const row = map.get(name) ?? { name, issues: 0, spend: 0 };
    row.issues += 1;
    row.spend += Math.abs(Number(t.total_cost) || 0);
    map.set(name, row);
  }
  return [...map.values()].sort((a, b) => b.issues - a.issues);
}

export function orphanIssues(txns: StoresTxnLike[]): StoresTxnLike[] {
  return issueTxns(txns).filter((t) => !t.linked_work_order_id);
}

export function buildStoresAiBrief(input: {
  propertyName: string;
  items: StoresItemLike[];
  txns: StoresTxnLike[];
  workOrders: StoresWorkOrderLike[];
}): string {
  const movers = topMovedParts(input.items, input.txns, 3);
  const repeats = repeatOffenders(input.items, input.txns, 2).slice(0, 3);
  const low = lowStockItems(input.items);
  const openWos = input.workOrders.filter((w) => !['verified', 'closed', 'completed', 'rejected'].includes(w.status));
  const monthSpend = issuesByMonth(input.txns);
  const last = monthSpend[monthSpend.length - 1];

  const lines = [
    `Stores & Materials brief — ${input.propertyName}`,
    '',
    `On-hand inventory value: $${onHandValue(input.items).toLocaleString()}`,
    `Low-stock SKUs: ${low.length}`,
    `Open maintenance work orders: ${openWos.length}`,
    last ? `Latest month issues: ${last.qty} parts · $${money(last.spend).toLocaleString()} materials` : 'No issue history yet.',
    '',
    'Top movers:',
    ...(movers.length
      ? movers.map((m) => `• ${m.name} — ${m.qty} issued across ${m.unitsTouched} unit(s)`)
      : ['• No issues logged yet']),
    '',
    'Repeat replacements (same part + unit):',
    ...(repeats.length
      ? repeats.map((r) => `• ${r.name} in ${r.unit} — ${r.count}× (investigate root cause)`)
      : ['• None flagged']),
    '',
    'Control note: every issue requires a work order + unit. Emergency overrides are audited.',
  ];
  return lines.join('\n');
}
