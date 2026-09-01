import { parseCSV } from '@/lib/csvParser';

export interface TenantCsvUnitRef {
  id: string;
  unit_number: string;
  property_id: string;
  property_name?: string | null;
}

export interface TenantCsvRow {
  unit_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  lease_start: string;
  lease_end: string | null;
  rent_amount: number | null;
  deposit_amount: number | null;
  status: string;
  move_in_date: string | null;
  move_out_date: string | null;
  notes: string | null;
}

export interface TenantCsvValidationResult {
  rowIndex: number;
  isValid: boolean;
  error?: string;
  rawData: Record<string, string>;
  data?: TenantCsvRow;
}

const VALID_STATUSES = new Set(['active', 'notice_given', 'moved_out']);

function normalizeStatus(raw: string): string {
  const s = raw.trim().toLowerCase().replace(/\s+/g, '_');
  if (!s) return 'active';
  if (s === 'notice' || s === 'notice_given') return 'notice_given';
  if (s === 'moved_out' || s === 'movedout' || s === 'inactive') return 'moved_out';
  if (s === 'active' || s === 'current') return 'active';
  return s;
}

function parseMoney(raw: string): number | null {
  if (!raw?.trim()) return null;
  const n = Number(raw.replace(/[$,]/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

function findUnit(
  units: TenantCsvUnitRef[],
  propertyName: string,
  unitNumber: string,
): TenantCsvUnitRef | undefined {
  const unitNorm = unitNumber.trim().toLowerCase();
  const propNorm = propertyName.trim().toLowerCase();
  return units.find((u) => {
    const unitOk = u.unit_number.trim().toLowerCase() === unitNorm;
    if (!unitOk) return false;
    if (!propNorm) return true;
    return (u.property_name || '').trim().toLowerCase() === propNorm;
  });
}

export function validateTenantCsvRows(
  rows: Record<string, string>[],
  units: TenantCsvUnitRef[],
): TenantCsvValidationResult[] {
  return rows.map((rawData, rowIndex) => {
    const propertyName = rawData.property_name || rawData.property || '';
    const unitNumber = rawData.unit_number || rawData.unit || '';
    const firstName = rawData.first_name || rawData.firstname || '';
    const lastName = rawData.last_name || rawData.lastname || '';
    const leaseStart = rawData.lease_start || rawData.lease_start_date || '';

    if (!unitNumber.trim()) {
      return { rowIndex, isValid: false, error: 'Unit number is required', rawData };
    }
    if (!firstName.trim() || !lastName.trim()) {
      return { rowIndex, isValid: false, error: 'First and last name are required', rawData };
    }
    if (!leaseStart.trim()) {
      return { rowIndex, isValid: false, error: 'Lease start date is required', rawData };
    }

    const unit = findUnit(units, propertyName, unitNumber);
    if (!unit) {
      return {
        rowIndex,
        isValid: false,
        error: propertyName
          ? `Unit ${unitNumber} not found on ${propertyName}`
          : `Unit ${unitNumber} not found — include property_name`,
        rawData,
      };
    }

    const status = normalizeStatus(rawData.status || 'active');
    if (!VALID_STATUSES.has(status)) {
      return {
        rowIndex,
        isValid: false,
        error: 'Status must be active, notice_given, or moved_out',
        rawData,
      };
    }

    return {
      rowIndex,
      isValid: true,
      rawData,
      data: {
        unit_id: unit.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: rawData.email?.trim() || null,
        phone: rawData.phone?.trim() || null,
        lease_start: leaseStart.trim(),
        lease_end: rawData.lease_end?.trim() || null,
        rent_amount: parseMoney(rawData.rent_amount || rawData.rent || ''),
        deposit_amount: parseMoney(rawData.deposit_amount || rawData.deposit || ''),
        status,
        move_in_date: rawData.move_in_date?.trim() || null,
        move_out_date: rawData.move_out_date?.trim() || null,
        notes: rawData.notes?.trim() || null,
      },
    };
  });
}

export function parseTenantCsvText(text: string): Record<string, string>[] {
  return parseCSV(text).rows;
}

export function downloadTenantCsvTemplate(): void {
  const headers = [
    'property_name',
    'unit_number',
    'first_name',
    'last_name',
    'email',
    'phone',
    'lease_start',
    'lease_end',
    'rent_amount',
    'deposit_amount',
    'status',
    'move_in_date',
    'move_out_date',
    'notes',
  ];
  const example = [
    'Glorieta Gardens',
    '101',
    'Jane',
    'Doe',
    'jane@example.com',
    '555-0100',
    '2025-01-01',
    '2025-12-31',
    '1450',
    '1450',
    'active',
    '2025-01-01',
    '',
    'Imported from PMO',
  ];
  const csv = `${headers.join(',')}\n${example.map((c) => `"${c}"`).join(',')}\n`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'occupancy-tenant-import-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}
