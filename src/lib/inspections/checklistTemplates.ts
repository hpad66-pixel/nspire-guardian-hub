// Structured per-asset-type inspection checklists — a direct translation of the
// "Manhole and Cleanout Inspection Report" paper form into discrete fields, so
// every item is captured (and reported) rather than typed into a notes box.
//
// Answers are stored on `daily_inspection_items.checklist` (jsonb), keyed by
// field id. Templates are keyed by asset_type; asset types without a template
// (lift_station, retention_pond, general_grounds) just use status + notes.

export type ChecklistFieldType = 'select' | 'yesno' | 'yesnona' | 'text' | 'date';

export interface ChecklistField {
  id: string;
  label: string;
  type: ChecklistFieldType;
  options?: string[]; // for 'select'
  /** Only show this field when another field has a given value (e.g. leak location when leaks = Yes). */
  showIf?: { field: string; equals: string };
}

const EGFP = ['Excellent', 'Good', 'Fair', 'Poor'];

export const CHECKLIST_TEMPLATES: Record<string, ChecklistField[]> = {
  // Sewer Cleanout System
  cleanout: [
    { id: 'caps_missing', label: 'Any clean-out caps missing?', type: 'yesno' },
    { id: 'access', label: 'Cleanout access', type: 'select', options: ['Accessible', 'Inaccessible', 'Damaged'] },
    { id: 'location_number', label: 'Cleanout location number(s)', type: 'text' },
    { id: 'sewer_leaks', label: 'Any signs of sewer leaks or damage?', type: 'yesno' },
    { id: 'leak_location', label: 'Location of leak(s)', type: 'text', showIf: { field: 'sewer_leaks', equals: 'Yes' } },
    { id: 'cleaned_disinfected', label: 'Sewer discharges cleaned & disinfected?', type: 'yesnona' },
    { id: 'reported_protocol', label: 'Leak(s) reported per established protocols?', type: 'yesnona' },
    { id: 'damages_repaired', label: 'Any damages identified were repaired?', type: 'yesnona' },
    { id: 'repair_date', label: 'Date of repairs', type: 'date', showIf: { field: 'damages_repaired', equals: 'Yes' } },
    { id: 'repair_method', label: 'Method of repair', type: 'text', showIf: { field: 'damages_repaired', equals: 'Yes' } },
  ],
  // Sewer By-pass Pump Station
  bypass_station: [
    { id: 'operational', label: 'By-pass pump station operational?', type: 'yesno' },
    { id: 'concerns', label: 'Areas of concern for the by-pass pump station', type: 'text' },
  ],
  // Manhole Inspection
  manhole: [
    { id: 'cover_condition', label: 'Condition of manhole cover & frame', type: 'select', options: EGFP },
    { id: 'infiltration', label: 'Signs of infiltration or inflow?', type: 'yesno' },
    { id: 'flow', label: 'Observed flow in lateral lines', type: 'select', options: ['Normal', 'High', 'Low', 'None'] },
    { id: 'blockages', label: 'Any signs of blockages or backups?', type: 'yesno' },
  ],
  // Catch Basins & Stormwater System
  catch_basin: [
    { id: 'grate_condition', label: 'Condition of grate & frame', type: 'select', options: EGFP },
    { id: 'sediment', label: 'Sediment or debris accumulation', type: 'select', options: ['None', 'Low', 'Moderate', 'High'] },
    { id: 'outlet_pipe', label: 'Condition of outlet pipe', type: 'select', options: EGFP },
  ],
};

export function templateFor(assetType: string): ChecklistField[] {
  return CHECKLIST_TEMPLATES[assetType] ?? [];
}

/** Whether a field should render given the current answers (showIf logic). */
export function fieldVisible(field: ChecklistField, answers: Record<string, string>): boolean {
  if (!field.showIf) return true;
  return (answers[field.showIf.field] ?? '') === field.showIf.equals;
}

/** Count of answered fields in a template for a given asset's checklist. */
export function answeredCount(assetType: string, answers: Record<string, string> = {}): { answered: number; total: number } {
  const fields = templateFor(assetType).filter(f => fieldVisible(f, answers));
  const answered = fields.filter(f => (answers[f.id] ?? '').toString().trim() !== '').length;
  return { answered, total: fields.length };
}

export const PROPERTY_CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor'];
