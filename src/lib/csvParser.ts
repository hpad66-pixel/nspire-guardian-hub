import type { Database } from '@/integrations/supabase/types';

type UnitInsert = Database['public']['Tables']['units']['Insert'];

export interface Property {
  id: string;
  name: string;
}

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
}

export interface ValidationResult {
  rowIndex: number;
  isValid: boolean;
  error?: string;
  rawData: Record<string, string>;
  data?: Omit<UnitInsert, 'id' | 'created_at' | 'updated_at'>;
}

export function parseCSV(text: string): ParsedCSV {
  const lines = text.split(/\r?\n/).filter(line => line.trim() && !line.trim().startsWith('#'));
  
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Parse header line
  const headers = parseCSVLine(lines[0]).map(h => 
    h.trim().toLowerCase().replace(/\s+/g, '_')
  );

  // Parse data rows
  const rows = lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });
    return row;
  });

  return { headers, rows };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

export function validateRows(
  rows: Record<string, string>[],
  properties: Property[],
  existingUnits: { unit_number: string; property_id: string }[] = []
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const seenUnits = new Set<string>();
  const existingSet = new Set(existingUnits.map(u => `${u.property_id}:${u.unit_number.toLowerCase()}`));

  rows.forEach((row, index) => {
    const result = validateRow(row, index, properties, seenUnits, existingSet);
    results.push(result);
    
    if (result.isValid && result.data) {
      seenUnits.add(`${result.data.property_id}:${result.data.unit_number.toLowerCase()}`);
    }
  });

  return results;
}

function validateRow(
  row: Record<string, string>,
  rowIndex: number,
  properties: Property[],
  seenUnits: Set<string>,
  existingUnits: Set<string>
): ValidationResult {
  const baseResult = { rowIndex, rawData: row };

  // Required fields
  if (!row.property_name?.trim()) {
    return { ...baseResult, isValid: false, error: 'Property name is required' };
  }
  if (!row.unit_number?.trim()) {
    return { ...baseResult, isValid: false, error: 'Unit number is required' };
  }

  // Find property by name (case-insensitive)
  const property = properties.find(p => 
    p.name.toLowerCase() === row.property_name.toLowerCase().trim()
  );
  if (!property) {
    return { ...baseResult, isValid: false, error: `Property "${row.property_name}" not found` };
  }

  const unitNumber = row.unit_number.trim();
  const unitKey = `${property.id}:${unitNumber.toLowerCase()}`;

  // Check for duplicates in CSV
  if (seenUnits.has(unitKey)) {
    return { ...baseResult, isValid: false, error: 'Duplicate unit in CSV file' };
  }

  // Check for existing units in database
  if (existingUnits.has(unitKey)) {
    return { ...baseResult, isValid: false, error: 'Unit already exists in database' };
  }

  // Validate status if provided
  const validStatuses = ['occupied', 'vacant', 'maintenance'];
  const status = row.status?.toLowerCase().trim() || 'occupied';
  if (row.status && !validStatuses.includes(status)) {
    return { 
      ...baseResult, 
      isValid: false, 
      error: `Invalid status "${row.status}". Use: occupied, vacant, or maintenance` 
    };
  }

  // Parse numeric fields
  const bedrooms = row.bedrooms ? parseInt(row.bedrooms) : 1;
  const bathrooms = row.bathrooms ? parseFloat(row.bathrooms) : 1;
  const squareFeet = row.square_feet ? parseInt(row.square_feet) : undefined;
  const floor = row.floor ? parseInt(row.floor) : undefined;

  if (row.bedrooms && isNaN(bedrooms)) {
    return { ...baseResult, isValid: false, error: 'Bedrooms must be a number' };
  }
  if (row.bathrooms && isNaN(bathrooms)) {
    return { ...baseResult, isValid: false, error: 'Bathrooms must be a number' };
  }
  if (row.square_feet && isNaN(squareFeet!)) {
    return { ...baseResult, isValid: false, error: 'Square feet must be a number' };
  }
  if (row.floor && isNaN(floor!)) {
    return { ...baseResult, isValid: false, error: 'Floor must be a number' };
  }

  return {
    ...baseResult,
    isValid: true,
    data: {
      property_id: property.id,
      unit_number: unitNumber,
      bedrooms,
      bathrooms,
      square_feet: squareFeet || null,
      floor: floor || null,
      status: status as 'occupied' | 'vacant' | 'maintenance',
    }
  };
}

export function generateCSVTemplate(): string {
  const headers = [
    'property_name',
    'unit_number',
    'bedrooms',
    'bathrooms',
    'square_feet',
    'floor',
    'status'
  ];

  const exampleRow = [
    'Riverside Manor',
    '101A',
    '2',
    '1.5',
    '850',
    '1',
    'occupied'
  ];

  return [
    headers.join(','),
    exampleRow.join(','),
  ].join('\n');
}

export function downloadCSVTemplate(): void {
  const csv = generateCSVTemplate();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'units-import-template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
