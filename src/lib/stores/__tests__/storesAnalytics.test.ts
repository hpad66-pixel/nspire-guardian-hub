import { describe, expect, it } from 'vitest';
import {
  buildStoresAiBrief,
  issuesByMonth,
  issuesByUnit,
  lowStockItems,
  onHandValue,
  orphanIssues,
  repeatOffenders,
  spendByCategory,
  topMovedParts,
  type StoresItemLike,
  type StoresTxnLike,
} from '../storesAnalytics';

const items: StoresItemLike[] = [
  { id: 'i1', name: 'Faucet cartridge', category: 'plumbing', current_quantity: 2, minimum_quantity: 4, unit_cost: 18.5 },
  { id: 'i2', name: 'HVAC filter', category: 'hvac', current_quantity: 10, minimum_quantity: 4, unit_cost: 6.5 },
];

const txns: StoresTxnLike[] = [
  {
    id: 't1', item_id: 'i1', transaction_type: 'used', quantity: -1, total_cost: 18.5,
    transaction_date: '2026-07-01', deployed_at: '2026-07-01', unit_label: 'B5-201',
    linked_work_order_id: 'wo1', issued_to_name: 'James',
  },
  {
    id: 't2', item_id: 'i1', transaction_type: 'used', quantity: -1, total_cost: 18.5,
    transaction_date: '2026-07-15', deployed_at: '2026-07-15', unit_label: 'B5-201',
    linked_work_order_id: 'wo2', issued_to_name: 'Greg',
  },
  {
    id: 't3', item_id: 'i2', transaction_type: 'used', quantity: -1, total_cost: 6.5,
    transaction_date: '2026-08-01', deployed_at: '2026-08-01', unit_label: 'B3-101',
    linked_work_order_id: 'wo3', issued_to_name: 'James',
  },
  {
    id: 't4', item_id: 'i2', transaction_type: 'received', quantity: 8, total_cost: 52,
    transaction_date: '2026-06-01', vendor: 'Home Depot',
  },
];

describe('storesAnalytics', () => {
  it('computes on-hand value and low stock', () => {
    expect(onHandValue(items)).toBe(2 * 18.5 + 10 * 6.5);
    expect(lowStockItems(items).map((i) => i.id)).toEqual(['i1']);
  });

  it('ranks top movers and category spend from issues only', () => {
    const movers = topMovedParts(items, txns, 5);
    expect(movers[0].name).toBe('Faucet cartridge');
    expect(movers[0].qty).toBe(2);
    expect(movers[0].unitsTouched).toBe(1);
    expect(spendByCategory(items, txns)[0].category).toBe('plumbing');
  });

  it('flags repeat offenders and monthly / unit heat', () => {
    const repeats = repeatOffenders(items, txns, 2);
    expect(repeats).toHaveLength(1);
    expect(repeats[0].unit).toBe('B5-201');
    expect(issuesByMonth(txns).map((m) => m.month)).toEqual(['2026-07', '2026-08']);
    expect(issuesByUnit(txns)[0].unit).toBe('B5-201');
  });

  it('detects orphan issues and builds an owner brief', () => {
    expect(orphanIssues(txns)).toHaveLength(0);
    expect(orphanIssues([...txns, {
      id: 'bad', item_id: 'i1', transaction_type: 'used', quantity: -1, total_cost: 18.5,
      transaction_date: '2026-08-02', unit_label: 'B6-301', linked_work_order_id: null,
    }])).toHaveLength(1);

    const brief = buildStoresAiBrief({
      propertyName: 'Glorieta Gardens',
      items,
      txns,
      workOrders: [{ id: 'wo1', title: 'Leak', status: 'in_progress', requester_name: 'Tenant' }],
    });
    expect(brief).toContain('Glorieta Gardens');
    expect(brief).toContain('Faucet cartridge');
    expect(brief).toContain('B5-201');
  });
});
