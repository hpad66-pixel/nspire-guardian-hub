
# Implementation Plan: CSV Import for Units

## Overview

Add a bulk import feature to the Units page that allows users to upload a CSV file containing unit data. The system will parse the CSV, validate the data, match property names to IDs, and insert all valid units into the database with a preview and confirmation workflow.

---

## Part 1: Feature Design

### User Flow

```text
1. User clicks "Import CSV" button on Units page
2. Dialog opens with:
   - File drop zone for CSV upload
   - Download template link
3. User uploads CSV file
4. System parses and validates data
5. Preview table shows:
   - Valid rows (green) ready to import
   - Invalid rows (red) with error messages
   - Property name to ID mapping status
6. User reviews and clicks "Import X Units"
7. System bulk inserts valid records
8. Success toast with count of imported units
```

### CSV Template Format

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| property_name | Yes | Must match existing property name | Riverside Manor |
| unit_number | Yes | Unit identifier | 101A |
| bedrooms | No | Number of bedrooms (default: 1) | 2 |
| bathrooms | No | Number of bathrooms (default: 1) | 1.5 |
| square_feet | No | Unit size in sq ft | 850 |
| floor | No | Floor number | 2 |
| status | No | occupied/vacant/maintenance (default: occupied) | vacant |

---

## Part 2: New Components

### UnitImportDialog.tsx

Main dialog component with:

```text
+----------------------------------------------------------+
|  Import Units from CSV                              [X]  |
+----------------------------------------------------------+
|                                                          |
|  [Download CSV Template]                                 |
|                                                          |
|  +----------------------------------------------------+  |
|  |                                                    |  |
|  |     📄 Drag and drop your CSV file here           |  |
|  |        or click to browse                         |  |
|  |                                                    |  |
|  +----------------------------------------------------+  |
|                                                          |
|  PREVIEW (after file upload):                            |
|  +----------------------------------------------------+  |
|  | ✓ 101A | Riverside Manor | 2 bed | 1 bath | vacant |  |
|  | ✓ 102B | Riverside Manor | 1 bed | 1 bath | occ.   |  |
|  | ✗ 201  | Unknown Prop    | Error: Property not found |
|  | ✗ 301A | Riverside Manor | Error: Invalid status   |  |
|  +----------------------------------------------------+  |
|                                                          |
|  Summary: 15 valid, 2 errors                             |
|                                                          |
|  [Cancel]                      [Import 15 Units]         |
+----------------------------------------------------------+
```

### Features
- Drag and drop file upload
- CSV parsing with Papa Parse (no external dependency - use native parsing)
- Property name to ID matching
- Row validation with detailed error messages
- Preview table with status indicators
- Downloadable CSV template
- Bulk insert with progress feedback

---

## Part 3: CSV Parsing Logic

### Native CSV Parser

```typescript
function parseCSV(text: string): { headers: string[], rows: string[][] } {
  const lines = text.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const rows = lines.slice(1).map(line => {
    // Handle quoted values with commas
    const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    return matches ? matches.map(v => v.replace(/^"|"$/g, '').trim()) : [];
  });
  return { headers, rows };
}
```

### Validation Rules

```typescript
interface ValidationResult {
  isValid: boolean;
  error?: string;
  data?: UnitInsert;
}

function validateRow(row: Record<string, string>, properties: Property[]): ValidationResult {
  // Required fields
  if (!row.property_name) return { isValid: false, error: 'Property name is required' };
  if (!row.unit_number) return { isValid: false, error: 'Unit number is required' };
  
  // Find property by name (case-insensitive)
  const property = properties.find(p => 
    p.name.toLowerCase() === row.property_name.toLowerCase()
  );
  if (!property) return { isValid: false, error: `Property "${row.property_name}" not found` };
  
  // Validate status if provided
  const validStatuses = ['occupied', 'vacant', 'maintenance'];
  if (row.status && !validStatuses.includes(row.status.toLowerCase())) {
    return { isValid: false, error: `Invalid status "${row.status}". Use: occupied, vacant, or maintenance` };
  }
  
  // Parse numeric fields
  const bedrooms = row.bedrooms ? parseInt(row.bedrooms) : 1;
  const bathrooms = row.bathrooms ? parseFloat(row.bathrooms) : 1;
  const squareFeet = row.square_feet ? parseInt(row.square_feet) : undefined;
  const floor = row.floor ? parseInt(row.floor) : undefined;
  
  if (isNaN(bedrooms)) return { isValid: false, error: 'Bedrooms must be a number' };
  if (isNaN(bathrooms)) return { isValid: false, error: 'Bathrooms must be a number' };
  
  return {
    isValid: true,
    data: {
      property_id: property.id,
      unit_number: row.unit_number.trim(),
      bedrooms,
      bathrooms,
      square_feet: squareFeet,
      floor,
      status: (row.status?.toLowerCase() || 'occupied') as 'occupied' | 'vacant' | 'maintenance',
    }
  };
}
```

---

## Part 4: Hook for Bulk Import

### useBulkCreateUnits

Add to `src/hooks/useUnits.ts`:

```typescript
export function useBulkCreateUnits() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (units: UnitInsert[]) => {
      // Insert in batches of 100 to avoid request size limits
      const batchSize = 100;
      const results = [];
      
      for (let i = 0; i < units.length; i += batchSize) {
        const batch = units.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from('units')
          .insert(batch)
          .select();
        
        if (error) throw error;
        results.push(...(data || []));
      }
      
      return results;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast.success(`Successfully imported ${data.length} units`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to import units: ${error.message}`);
    },
  });
}
```

---

## Part 5: CSV Template Generation

### Template Download Function

```typescript
function downloadTemplate() {
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
  
  const csv = [
    headers.join(','),
    exampleRow.join(','),
    '# Add your units below. Delete this example row.',
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'units-import-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}
```

---

## Part 6: UI Updates

### UnitsPage.tsx Changes

Add import button next to "Add Unit":

```tsx
<div className="flex gap-2">
  <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
    <Upload className="h-4 w-4 mr-2" />
    Import CSV
  </Button>
  <Button onClick={() => setDialogOpen(true)}>
    <Plus className="h-4 w-4 mr-2" />
    Add Unit
  </Button>
</div>
```

---

## Part 7: Preview Table Design

### Import Preview Component

```text
┌────────────────────────────────────────────────────────────────┐
│ Status │ Unit # │ Property        │ Beds │ Baths │ Sq Ft │ Fl │
├────────────────────────────────────────────────────────────────┤
│   ✓    │ 101A   │ Riverside Manor │  2   │  1.5  │  850  │  1 │
│   ✓    │ 102B   │ Riverside Manor │  1   │  1    │  700  │  1 │
│   ✓    │ 201A   │ Oak Gardens     │  3   │  2    │ 1200  │  2 │
│   ✗    │ 301    │ Unknown Prop    │  -   │   -   │   -   │  - │
│        │        │ ⚠ Property "Unknown Prop" not found        │
│   ✗    │ 401A   │ Riverside Manor │  2   │  1    │  850  │  4 │
│        │        │ ⚠ Invalid status "rented" - use occupied   │
└────────────────────────────────────────────────────────────────┘
```

### Summary Section

```text
┌──────────────────────────────────────────────────────────┐
│  📊 Import Summary                                       │
├──────────────────────────────────────────────────────────┤
│  ✓ 23 units ready to import                             │
│  ✗ 2 units have errors (will be skipped)                │
│                                                          │
│  Properties detected:                                    │
│  • Riverside Manor - 15 units                            │
│  • Oak Gardens - 8 units                                 │
└──────────────────────────────────────────────────────────┘
```

---

## Part 8: File Structure

### New Files

| File | Purpose |
|------|---------|
| `src/components/units/UnitImportDialog.tsx` | Main import dialog with file upload and preview |
| `src/lib/csvParser.ts` | CSV parsing and validation utilities |

### Modified Files

| File | Changes |
|------|---------|
| `src/pages/core/UnitsPage.tsx` | Add Import CSV button and dialog state |
| `src/hooks/useUnits.ts` | Add `useBulkCreateUnits` hook |

---

## Part 9: Error Handling

### Duplicate Detection

```typescript
// Check for duplicates within the CSV
const seenUnits = new Set<string>();
for (const row of rows) {
  const key = `${row.property_name}:${row.unit_number}`;
  if (seenUnits.has(key)) {
    return { isValid: false, error: 'Duplicate unit in CSV' };
  }
  seenUnits.add(key);
}

// Check against existing units in database
const existingUnits = await supabase
  .from('units')
  .select('unit_number, property_id');
  
const existingSet = new Set(existingUnits.data?.map(u => `${u.property_id}:${u.unit_number}`));
```

### Database Error Handling

```typescript
try {
  await bulkCreate.mutateAsync(validUnits);
} catch (error) {
  if (error.message.includes('unique_unit_per_property')) {
    toast.error('Some units already exist in the database');
  } else {
    toast.error(`Import failed: ${error.message}`);
  }
}
```

---

## Part 10: Implementation Order

1. Create `src/lib/csvParser.ts` with parsing and validation utilities
2. Add `useBulkCreateUnits` hook to `src/hooks/useUnits.ts`
3. Create `src/components/units/UnitImportDialog.tsx` with:
   - File upload drop zone
   - CSV parsing on file select
   - Validation with property matching
   - Preview table with error highlighting
   - Import button with progress
   - Template download
4. Update `src/pages/core/UnitsPage.tsx` to include import button and dialog

---

## Technical Notes

1. **Native CSV Parsing**: Using native JavaScript to parse CSV avoids adding external dependencies
2. **Property Matching**: Case-insensitive matching to be user-friendly
3. **Batch Inserts**: Insert in batches of 100 to handle large files
4. **Validation First**: All validation happens client-side before any database calls
5. **Skip Invalid Rows**: Only valid rows are imported; invalid rows are shown with errors
6. **Template**: Downloadable template includes headers and one example row
