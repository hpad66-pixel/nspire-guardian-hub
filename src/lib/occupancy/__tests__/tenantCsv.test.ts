import { describe, expect, it } from 'vitest';
import { parseTenantCsvText, validateTenantCsvRows } from '@/lib/occupancy/tenantCsv';

const units = [
  {
    id: 'u1',
    unit_number: '101',
    property_id: 'p1',
    property_name: 'Glorieta Gardens',
  },
];

describe('tenantCsv', () => {
  it('validates a happy-path PMO export row', () => {
    const rows = parseTenantCsvText(
      [
        'property_name,unit_number,first_name,last_name,lease_start,status,rent_amount',
        'Glorieta Gardens,101,Jane,Doe,2025-01-01,active,"$1,450.00"',
      ].join('\n'),
    );
    const results = validateTenantCsvRows(rows, units);
    expect(results).toHaveLength(1);
    expect(results[0].isValid).toBe(true);
    expect(results[0].data?.unit_id).toBe('u1');
    expect(results[0].data?.first_name).toBe('Jane');
    expect(results[0].data?.rent_amount).toBe(1450);
  });

  it('rejects unknown units so imports cannot invent occupancy', () => {
    const rows = parseTenantCsvText(
      'property_name,unit_number,first_name,last_name,lease_start\nGlorieta Gardens,999,Jane,Doe,2025-01-01',
    );
    const results = validateTenantCsvRows(rows, units);
    expect(results[0].isValid).toBe(false);
    expect(results[0].error).toMatch(/not found/i);
  });
});
