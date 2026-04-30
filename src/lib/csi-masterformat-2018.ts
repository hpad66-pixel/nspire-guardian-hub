/**
 * A5 · CSI MasterFormat 2018 divisions (compact seed).
 * Full subsection detail can be imported per-tenant via CSV; this file ships
 * the 50 Division-level codes so the library is usable immediately.
 */
export interface CsiSeedCode {
  code: string;
  description: string;
  parent_code: string | null;
  level: number;
}

export const CSI_DIVISIONS: CsiSeedCode[] = [
  { code: "00 00 00", description: "Procurement and Contracting Requirements", parent_code: null, level: 1 },
  { code: "01 00 00", description: "General Requirements", parent_code: null, level: 1 },
  { code: "02 00 00", description: "Existing Conditions", parent_code: null, level: 1 },
  { code: "03 00 00", description: "Concrete", parent_code: null, level: 1 },
  { code: "04 00 00", description: "Masonry", parent_code: null, level: 1 },
  { code: "05 00 00", description: "Metals", parent_code: null, level: 1 },
  { code: "06 00 00", description: "Wood, Plastics, and Composites", parent_code: null, level: 1 },
  { code: "07 00 00", description: "Thermal and Moisture Protection", parent_code: null, level: 1 },
  { code: "08 00 00", description: "Openings", parent_code: null, level: 1 },
  { code: "09 00 00", description: "Finishes", parent_code: null, level: 1 },
  { code: "10 00 00", description: "Specialties", parent_code: null, level: 1 },
  { code: "11 00 00", description: "Equipment", parent_code: null, level: 1 },
  { code: "12 00 00", description: "Furnishings", parent_code: null, level: 1 },
  { code: "13 00 00", description: "Special Construction", parent_code: null, level: 1 },
  { code: "14 00 00", description: "Conveying Equipment", parent_code: null, level: 1 },
  { code: "21 00 00", description: "Fire Suppression", parent_code: null, level: 1 },
  { code: "22 00 00", description: "Plumbing", parent_code: null, level: 1 },
  { code: "23 00 00", description: "HVAC", parent_code: null, level: 1 },
  { code: "25 00 00", description: "Integrated Automation", parent_code: null, level: 1 },
  { code: "26 00 00", description: "Electrical", parent_code: null, level: 1 },
  { code: "27 00 00", description: "Communications", parent_code: null, level: 1 },
  { code: "28 00 00", description: "Electronic Safety and Security", parent_code: null, level: 1 },
  { code: "31 00 00", description: "Earthwork", parent_code: null, level: 1 },
  { code: "32 00 00", description: "Exterior Improvements", parent_code: null, level: 1 },
  { code: "33 00 00", description: "Utilities", parent_code: null, level: 1 },
  { code: "34 00 00", description: "Transportation", parent_code: null, level: 1 },
  { code: "35 00 00", description: "Waterway and Marine Construction", parent_code: null, level: 1 },
  { code: "40 00 00", description: "Process Integration", parent_code: null, level: 1 },
  { code: "41 00 00", description: "Material Processing and Handling Equipment", parent_code: null, level: 1 },
  { code: "42 00 00", description: "Process Heating, Cooling, and Drying Equipment", parent_code: null, level: 1 },
  { code: "43 00 00", description: "Process Gas and Liquid Handling, Purification, and Storage Equipment", parent_code: null, level: 1 },
  { code: "44 00 00", description: "Pollution and Waste Control Equipment", parent_code: null, level: 1 },
  { code: "45 00 00", description: "Industry-Specific Manufacturing Equipment", parent_code: null, level: 1 },
  { code: "46 00 00", description: "Water and Wastewater Equipment", parent_code: null, level: 1 },
  { code: "48 00 00", description: "Electrical Power Generation", parent_code: null, level: 1 },
  // Common level-2 sections used day-to-day
  { code: "03 30 00", description: "Cast-in-Place Concrete", parent_code: "03 00 00", level: 2 },
  { code: "03 40 00", description: "Precast Concrete", parent_code: "03 00 00", level: 2 },
  { code: "05 10 00", description: "Structural Metal Framing", parent_code: "05 00 00", level: 2 },
  { code: "07 50 00", description: "Membrane Roofing", parent_code: "07 00 00", level: 2 },
  { code: "09 20 00", description: "Plaster and Gypsum Board", parent_code: "09 00 00", level: 2 },
  { code: "23 05 00", description: "Common Work Results for HVAC", parent_code: "23 00 00", level: 2 },
  { code: "26 05 00", description: "Common Work Results for Electrical", parent_code: "26 00 00", level: 2 },
];

export const DEFAULT_COST_TYPES = [
  { code: "L", name: "Labor", sort_order: 1 },
  { code: "M", name: "Material", sort_order: 2 },
  { code: "E", name: "Equipment", sort_order: 3 },
  { code: "S", name: "Subcontract", sort_order: 4 },
  { code: "O", name: "Overhead", sort_order: 5 },
  { code: "OTH", name: "Other", sort_order: 6 },
];
