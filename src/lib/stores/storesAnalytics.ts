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

/** Prefer total_cost; fall back to unit_cost × qty so charts never go blank. */
export function txnSpend(t: StoresTxnLike): number {
  const explicit = Number(t.total_cost);
  if (!Number.isNaN(explicit) && explicit !== 0) return Math.abs(explicit);
  const unit = Number(t.unit_cost) || 0;
  const qty = Math.abs(Number(t.quantity) || 0);
  return money(unit * qty);
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
    row.spend += txnSpend(t);
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
    row.spend += txnSpend(t);
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
    row.spend += txnSpend(t);
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
    row.spend += txnSpend(t);
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
    row.spend += txnSpend(t);
    map.set(name, row);
  }
  return [...map.values()].sort((a, b) => b.issues - a.issues);
}

export function orphanIssues(txns: StoresTxnLike[]): StoresTxnLike[] {
  return issueTxns(txns).filter((t) => !t.linked_work_order_id);
}

export interface PredictiveFlag {
  id: string;
  severity: 'critical' | 'watch' | 'info';
  title: string;
  detail: string;
  recommendation: string;
}

/** Red flags + predictive prompts for owner/ops decisions. */
export function predictiveFlags(
  items: StoresItemLike[],
  txns: StoresTxnLike[],
): PredictiveFlag[] {
  const flags: PredictiveFlag[] = [];
  const months = issuesByMonth(txns);
  const repeats = repeatOffenders(items, txns, 3);
  const movers = topMovedParts(items, txns, 5);
  const low = lowStockItems(items);
  const byId = new Map(items.map((i) => [i.id, i]));

  for (const r of repeats.slice(0, 5)) {
    flags.push({
      id: `repeat-${r.itemId}-${r.unit}`,
      severity: r.count >= 5 ? 'critical' : 'watch',
      title: `${r.name} replaced ${r.count}× in ${r.unit}`,
      detail: 'Same SKU keeps coming back to the same unit — likely root cause, not random wear.',
      recommendation:
        r.count >= 5
          ? 'Inspect supply quality / install method / water chemistry before the next swap. Pause blind reorders.'
          : 'Schedule a unit walkthrough and log the root cause on the next work order.',
    });
  }

  if (months.length >= 3) {
    const last3 = months.slice(-3);
    const rising = last3[2].spend > last3[1].spend && last3[1].spend > last3[0].spend;
    if (rising) {
      flags.push({
        id: 'spend-rising',
        severity: 'watch',
        title: 'Materials spend rising 3 months in a row',
        detail: `${last3.map((m) => `${m.month}: $${money(m.spend).toLocaleString()}`).join(' → ')}`,
        recommendation: 'Forecast next month ~10–15% above the last month and pre-approve a cage restock.',
      });
    }
  }

  for (const m of movers.slice(0, 3)) {
    const item = byId.get(m.itemId);
    if (!item) continue;
    const onHand = Number(item.current_quantity) || 0;
    const monthlyBurn = m.qty / Math.max(months.length, 1);
    if (monthlyBurn > 0 && onHand / monthlyBurn < 1.25) {
      flags.push({
        id: `stockout-${m.itemId}`,
        severity: onHand <= Number(item.minimum_quantity) ? 'critical' : 'watch',
        title: `${m.name} may stock out within ~${Math.max(1, Math.round((onHand / monthlyBurn) * 30))} days`,
        detail: `Burn ≈ ${money(monthlyBurn)} / month · on-hand ${onHand} (min ${item.minimum_quantity}).`,
        recommendation: 'Create a purchase receipt / PO now so techs are not blocked mid-WO.',
      });
    }
  }

  if (low.length > 0 && flags.every((f) => !f.id.startsWith('stockout-'))) {
    flags.push({
      id: 'low-stock',
      severity: 'info',
      title: `${low.length} SKU(s) at or below minimum`,
      detail: low.slice(0, 4).map((i) => i.name).join(', ') + (low.length > 4 ? '…' : ''),
      recommendation: 'Restock from preferred vendor (Home Depot / cage C) before the weekly maintenance run.',
    });
  }

  return flags.slice(0, 8);
}

export function buildStoresAiBrief(input: {
  propertyName: string;
  items: StoresItemLike[];
  txns: StoresTxnLike[];
  workOrders: StoresWorkOrderLike[];
}): string {
  const movers = topMovedParts(input.items, input.txns, 3);
  const repeats = repeatOffenders(input.items, input.txns, 2).slice(0, 3);
  const flags = predictiveFlags(input.items, input.txns).slice(0, 4);
  const low = lowStockItems(input.items);
  const openWos = input.workOrders.filter((w) => !['verified', 'closed', 'completed', 'rejected'].includes(w.status));
  const monthSpend = issuesByMonth(input.txns);
  const last = monthSpend[monthSpend.length - 1];
  const totalSpend = money(monthSpend.reduce((s, m) => s + m.spend, 0));

  const lines = [
    `Stores & Materials brief — ${input.propertyName}`,
    `Window: last ${Math.max(monthSpend.length, 1)} month(s) · materials issued $${totalSpend.toLocaleString()}`,
    '',
    `On-hand inventory value: $${onHandValue(input.items).toLocaleString()}`,
    `Low-stock SKUs: ${low.length}`,
    `Open maintenance work orders: ${openWos.length}`,
    last ? `Latest month issues: ${last.qty} parts · $${money(last.spend).toLocaleString()} materials` : 'No issue history yet.',
    '',
    'Top movers:',
    ...(movers.length
      ? movers.map((m) => `• ${m.name} — ${m.qty} issued across ${m.unitsTouched} unit(s) · $${money(m.spend).toLocaleString()}`)
      : ['• No issues logged yet']),
    '',
    'Repeat replacements (same part + unit):',
    ...(repeats.length
      ? repeats.map((r) => `• ${r.name} in ${r.unit} — ${r.count}× (investigate root cause)`)
      : ['• None flagged']),
    '',
    'Predictive / red flags:',
    ...(flags.length
      ? flags.map((f) => `• [${f.severity.toUpperCase()}] ${f.title} — ${f.recommendation}`)
      : ['• No predictive flags this period']),
    '',
    'Control note: every issue requires a work order + unit. Emergency overrides are audited.',
  ];
  return lines.join('\n');
}

/** Full simulated owner report (printable). */
export function buildOwnerStoresReport(input: {
  propertyName: string;
  projectName: string;
  items: StoresItemLike[];
  txns: StoresTxnLike[];
  workOrders: StoresWorkOrderLike[];
  generatedAt?: Date;
}): string {
  const when = (input.generatedAt ?? new Date()).toLocaleString();
  const months = issuesByMonth(input.txns);
  const byCat = spendByCategory(input.items, input.txns);
  const movers = topMovedParts(input.items, input.txns, 8);
  const units = issuesByUnit(input.txns, 8);
  const flags = predictiveFlags(input.items, input.txns);
  const brief = buildStoresAiBrief(input);
  const closed = input.workOrders.filter((w) => ['completed', 'verified', 'closed'].includes(w.status)).length;
  const open = input.workOrders.length - closed;

  return [
    '══════════════════════════════════════════════════════════════',
    '  APAS · projOS — OWNER MATERIALS & MAINTENANCE REPORT',
    '══════════════════════════════════════════════════════════════',
    `Property: ${input.propertyName}`,
    `Project:  ${input.projectName}`,
    `Generated: ${when} (simulated live report)`,
    '',
    '1. EXECUTIVE SNAPSHOT',
    `   On-hand cage value:     $${onHandValue(input.items).toLocaleString()}`,
    `   Parts issued (window):  ${issueTxns(input.txns).length}`,
    `   Materials spend:        $${money(byCat.reduce((s, c) => s + c.spend, 0)).toLocaleString()}`,
    `   Work orders:            ${closed} closed / ${Math.max(open, 0)} open`,
    '',
    '2. MONTHLY TREND',
    ...(months.length
      ? months.map((m) => `   ${m.month}  ·  ${m.qty} parts  ·  $${money(m.spend).toLocaleString()}`)
      : ['   (no issue history)']),
    '',
    '3. SPEND BY TRADE',
    ...(byCat.length
      ? byCat.map((c) => `   ${c.category.padEnd(14)} ${String(c.qty).padStart(4)} pcs  $${money(c.spend).toLocaleString()}`)
      : ['   (none)']),
    '',
    '4. TOP PARTS ISSUED',
    ...movers.map((m, i) => `   ${i + 1}. ${m.name} — ${m.qty}× / ${m.unitsTouched} units / $${money(m.spend).toLocaleString()}`),
    '',
    '5. UNIT HEAT (where work concentrates)',
    ...units.map((u) => `   ${u.unit} — ${u.issues} issues · $${money(u.spend).toLocaleString()}`),
    '',
    '6. RED FLAGS & PREDICTIVE ACTIONS',
    ...(flags.length
      ? flags.map((f) => `   [${f.severity.toUpperCase()}] ${f.title}\n      → ${f.recommendation}`)
      : ['   None this period.']),
    '',
    '7. NARRATIVE BRIEF',
    ...brief.split('\n').map((l) => `   ${l}`),
    '',
    '──────────────────────────────────────────────────────────────',
    'Control: No part leaves the cage without a work order + unit.',
    'Demo data can be reset by a super-admin before go-live.',
    '══════════════════════════════════════════════════════════════',
  ].join('\n');
}
