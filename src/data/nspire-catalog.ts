import { DefectItem, InspectionArea, SeverityLevel } from '@/types/modules';

// ============================================================================
// NSPIRE Defect Catalog — Enterprise-Grade
// Source: NSPIRE Standards Book (complete catalog)
// ============================================================================

// ============================================================================
// OUTSIDE DEFECTS (35 items)
// ============================================================================
export const OUTSIDE_DEFECTS: DefectItem[] = [
  // --- Electrical ---
  {
    id: 'out-001', area: 'outside', category: 'Electrical', item: 'GFCI/AFCI Protection',
    defectConditions: ['Missing GFCI protection', 'GFCI not functioning', 'Damaged GFCI outlet', 'Missing AFCI where required'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: 2.5, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Required within 6 feet of any water source. Exemptions: dedicated appliance outlets, below-counter cabinet outlets, outlets technically in a different room.',
    conditionalRules: [{ type: 'proximity', description: 'Must be within 6 feet of water source' }],
  },
  {
    id: 'out-002', area: 'outside', category: 'Electrical', item: 'Electrical Enclosures',
    defectConditions: ['Open panel', 'Missing cover', 'Damaged enclosure', 'Improper labeling'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: 2.5, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'All electrical panels and junction boxes must have covers securely attached.',
  },
  {
    id: 'out-003', area: 'outside', category: 'Electrical', item: 'Outlets/Switches',
    defectConditions: ['Missing cover plate', 'Damaged outlet', 'Non-functional', 'Sparking', 'Burn marks'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: 2.5, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'All outlets and switches must have cover plates. Sparking or burn marks are severe.',
  },
  {
    id: 'out-004', area: 'outside', category: 'Electrical', item: 'Unshielded Wires/Conductors',
    defectConditions: ['Exposed wiring', 'Damaged wire insulation', 'Improper wire connections', 'Open breaker', 'Missing knockout', 'Missing covers'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: 2.5, inside: null, unit: null }, isLifeThreatening: true, isUnscored: false,
    regulatoryHint: 'All sub-conditions are Severe. Exposed or unshielded wiring is a life-threatening hazard.',
  },
  {
    id: 'out-005', area: 'outside', category: 'Electrical', item: 'Lighting',
    defectConditions: ['Missing fixture', 'Not secure', 'Non-functional', 'Broken lens/globe'],
    defaultSeverity: 'low', proofRequired: false,
    pointValue: { outside: 1.0, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'All exterior lighting must be functional and securely mounted.',
  },
  // --- Safety ---
  {
    id: 'out-006', area: 'outside', category: 'Safety', item: 'Tripping Hazards',
    defectConditions: ['Uneven walkway >3/4 inch vertical', 'Cracked pavement >2 inch horizontal gap', 'Raised tree roots', 'Missing step'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: 2.5, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Trip hazard threshold: >3/4 inch vertical displacement or >2 inch horizontal gap.',
  },
  {
    id: 'out-007', area: 'outside', category: 'Safety', item: 'Guardrails',
    defectConditions: ['Missing guardrail', 'Loose guardrail', 'Damaged guardrail', 'Improper height', 'Spacing too wide'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: 2.5, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Required where fall height exceeds 30 inches. Must be 36-42 inches tall. Baluster spacing must not allow passage of a 4-inch sphere.',
  },
  {
    id: 'out-008', area: 'outside', category: 'Safety', item: 'Handrails',
    defectConditions: ['Missing handrail', 'Loose handrail', 'Not graspable', 'Not continuous', 'Improper height'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: 2.5, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Required for 4+ risers. Height: 28-42 inches. Must be graspable and continuous from top to bottom riser. Two rails required for ramps >72 inches wide or with >6 inch rise.',
    conditionalRules: [{ type: 'structural', description: 'Required for 4 or more risers' }],
  },
  {
    id: 'out-009', area: 'outside', category: 'Safety', item: 'Sharp Edges',
    defectConditions: ['Exposed metal edges', 'Broken glass', 'Protruding hardware', 'Damaged surfaces with sharp edges'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: 2.5, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Must be within normal path of travel to be cited. Edges not in areas of normal use are not defects.',
  },
  {
    id: 'out-010', area: 'outside', category: 'Safety', item: 'Infestation',
    defectConditions: ['Evidence of pests', 'Extensive infestation', 'Rodent droppings', 'Insect nests'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: 2.5, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Evidence = moderate. Extensive infestation = severe.',
  },
  // --- Fire Safety ---
  {
    id: 'out-011', area: 'outside', category: 'Fire Safety', item: 'Fire Extinguishers',
    defectConditions: ['Missing extinguisher', 'Expired extinguisher', 'Blocked access', 'Wrong type', 'Not charged'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: 3.0, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Non-chargeable units valid for 12 years from manufacturer date. Check gauge and inspection tag.',
  },
  {
    id: 'out-012', area: 'outside', category: 'Fire Safety', item: 'Flammable/Combustible Items',
    defectConditions: ['Improper storage near building', 'Flammable materials in common area', 'Propane stored improperly'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: 3.0, inside: null, unit: null }, isLifeThreatening: true, isUnscored: false,
    regulatoryHint: 'All flammable/combustible items must be stored properly away from ignition sources and egress paths.',
  },
  {
    id: 'out-013', area: 'outside', category: 'Fire Safety', item: 'Sprinkler Assembly',
    defectConditions: ['Head blocked >75%', 'Head corroded', 'Missing escutcheon', 'Painted head', 'Damaged piping'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: 3.0, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Sprinkler head is defective if >75% blocked. Painted or corroded heads must be replaced.',
  },
  // --- HVAC ---
  {
    id: 'out-014', area: 'outside', category: 'HVAC', item: 'Dryer Vents',
    defectConditions: ['Blocked vent', 'Damaged vent cover', 'Improper termination', 'Lint buildup', 'Clogged vent'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: 2.0, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Clogged dryer vent = Severe (fire hazard). Damaged cover = Moderate.',
  },
  {
    id: 'out-015', area: 'outside', category: 'HVAC', item: 'Chimney/Fireplace',
    defectConditions: ['Damaged chimney cap', 'Cracked flue', 'Missing spark arrestor', 'Deteriorated mortar'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: 2.0, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Damaged chimneys can allow CO infiltration. Check cap, flue, and mortar joints.',
  },
  // --- Signage ---
  {
    id: 'out-016', area: 'outside', category: 'Signage', item: 'Address and Required Signage',
    defectConditions: ['Missing address numbers', 'Illegible signage', 'Missing emergency info', 'Missing building ID'],
    defaultSeverity: 'low', proofRequired: false,
    pointValue: { outside: 1.0, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Address must be visible from street. Emergency contact info must be posted.',
  },
  // --- Site ---
  {
    id: 'out-017', area: 'outside', category: 'Site', item: 'Fencing/Security Fencing',
    defectConditions: ['Damaged fencing', 'Missing sections', 'Gate not functioning', 'Sharp edges', 'Below 48 inches', 'Not lockable'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: 1.5, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Security fencing must be at least 48 inches tall and lockable where required.',
  },
  {
    id: 'out-018', area: 'outside', category: 'Site', item: 'Drainage/Site Drainage',
    defectConditions: ['Standing water', 'Clogged drains', 'Erosion issues', 'Improper grading'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: 1.5, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Standing water creates health and safety hazards. Check grading and drain function.',
  },
  {
    id: 'out-019', area: 'outside', category: 'Site', item: 'Parking Lot/Roads',
    defectConditions: ['Pothole >4 inches', 'Damaged surface', 'Missing markings', 'Drainage issues'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: 1.5, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Potholes exceeding 4 inches in depth are a defect.',
  },
  {
    id: 'out-020', area: 'outside', category: 'Site', item: 'Walks and Ramps',
    defectConditions: ['Damaged surface', 'Obstructed path', 'Missing handrails on ramp', 'Excessive slope'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: 1.5, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Clear path of travel must be maintained. Ramps require handrails per ADA.',
  },
  {
    id: 'out-021', area: 'outside', category: 'Site', item: 'Steps/Stairs',
    defectConditions: ['Damaged tread', 'Nosing defect (>1 inch deep / >4 inch wide)', 'Damaged stringer', 'Uneven risers'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: 1.5, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Nosing defect: >1 inch deep or >4 inch wide. Damaged stringer is severe.',
  },
  {
    id: 'out-022', area: 'outside', category: 'Site', item: 'Retaining Walls',
    defectConditions: ['Leaning', 'Cracked', 'Crumbling', 'Below 24-inch minimum'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: 1.5, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Retaining walls must be at least 24 inches in height where required.',
  },
  {
    id: 'out-023', area: 'outside', category: 'Site', item: 'Erosion',
    defectConditions: ['Footer exposure', 'Undermined walkway', 'Soil loss near foundation', 'Erosion channel'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: 1.5, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Footer exposure from erosion is a structural concern. Check foundation perimeter.',
  },
  {
    id: 'out-024', area: 'outside', category: 'Site', item: 'Litter',
    defectConditions: ['Small debris/litter', 'Large items/dumping', 'Hazardous materials'],
    defaultSeverity: 'low', proofRequired: false,
    pointValue: { outside: 1.0, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Large items or dumping = moderate. Hazardous materials = severe.',
  },
  {
    id: 'out-025', area: 'outside', category: 'Site', item: 'Garage Doors',
    defectConditions: ['Non-functional', 'Damaged panels', 'Missing safety sensor', 'Won\'t close/open'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: 1.5, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Garage doors with auto-openers must have functioning safety sensors.',
  },
  // --- Plumbing ---
  {
    id: 'out-026', area: 'outside', category: 'Plumbing', item: 'Leaks and Wastewater',
    defectConditions: ['Visible leak', 'Sewage odor', 'Improper discharge', 'Damaged piping', 'Hose bib leak', 'Sewer cleanout issue'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: 2.0, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Active sewage leaks are severe. Gas or oil leaks are life-threatening.',
  },
  {
    id: 'out-027', area: 'outside', category: 'Plumbing', item: 'Guttering/Downspouts',
    defectConditions: ['Missing sections', 'Damaged gutters', 'Clogged', 'Not directing water away', 'Detached from building'],
    defaultSeverity: 'low', proofRequired: false,
    pointValue: { outside: 1.5, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Gutters must direct water away from foundation. Missing/damaged sections cause water intrusion.',
  },
  // --- Structure ---
  {
    id: 'out-028', area: 'outside', category: 'Structure', item: 'Wall Covering/Siding',
    defectConditions: ['Penetrating holes', 'Structural failure', 'Peeling paint >25sf', 'Missing sections', 'Water damage'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: 2.5, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Penetrating holes allowing pest/water entry = severe. Peeling paint >25 sq ft on exterior = defect.',
  },
  {
    id: 'out-029', area: 'outside', category: 'Structure', item: 'Roofing Material',
    defectConditions: ['Missing shingles >25sf', 'Active leak evidence', 'Damaged flashing', 'Ponding water', 'Sagging'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: 2.5, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Missing roofing material exceeding 25 sq ft threshold is a defect.',
  },
  {
    id: 'out-030', area: 'outside', category: 'Structure', item: 'Soffit/Fascia',
    defectConditions: ['Missing sections', 'Damaged/rotted', 'Pest entry points', 'Detached'],
    defaultSeverity: 'low', proofRequired: false,
    pointValue: { outside: 1.5, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Damaged soffit/fascia allowing pest entry = moderate.',
  },
  {
    id: 'out-031', area: 'outside', category: 'Structure', item: 'Foundation/Structural Defects',
    defectConditions: ['Major cracks', 'Heaving', 'Settlement', 'Exposed rebar', 'Water infiltration'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: 2.5, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Structural cracks that indicate movement or compromise integrity are severe.',
  },
  {
    id: 'out-032', area: 'outside', category: 'Structure', item: 'General Hardware/Surface Damage',
    defectConditions: ['Damaged mailboxes', 'Broken benches', 'Damaged playground equipment', 'Missing/damaged hardware'],
    defaultSeverity: 'low', proofRequired: false,
    pointValue: { outside: 1.0, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Damaged playground equipment with sharp edges or pinch points = severe.',
  },
  // --- Egress ---
  {
    id: 'out-033', area: 'outside', category: 'Egress', item: 'Obstructed Exit/Fire Escape',
    defectConditions: ['Blocked exit path', 'Locked gate on egress', 'Obstructed fire escape', 'Missing exit sign'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: 3.0, inside: null, unit: null }, isLifeThreatening: true, isUnscored: false,
    regulatoryHint: 'All egress paths must be clear and functional at all times. Blocked egress is life-threatening.',
  },
  // --- Lead Paint ---
  {
    id: 'out-034', area: 'outside', category: 'Lead Paint', item: 'Lead-Based Paint (Pre-1978)',
    defectConditions: ['Peeling paint on exterior', 'Chipping paint', 'Chalking surfaces', 'Damaged painted surface >25sf'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: 3.0, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Only for buildings built before 1978. All painted surfaces assumed to contain lead. Large surfaces: >2sf per room. Small surfaces: >10% per component.',
    conditionalRules: [{ type: 'pre1978', description: 'Only applies to buildings constructed before 1978' }],
  },
  // --- Health ---
  {
    id: 'out-035', area: 'outside', category: 'Health', item: 'Mold-Like Substance',
    defectConditions: ['Visible mold on exterior', 'Widespread contamination', 'Mold near HVAC intake'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: 2.0, inside: null, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Mold-like substance >1 sq ft requires professional assessment.',
  },
];

// ============================================================================
// INSIDE DEFECTS - Common Areas (45 items)
// ============================================================================
export const INSIDE_DEFECTS: DefectItem[] = [
  // --- Egress ---
  {
    id: 'in-001', area: 'inside', category: 'Egress', item: 'Emergency Exits',
    defectConditions: ['Blocked exit', 'Door not functioning', 'Missing signage', 'Locked exit', 'Obstructed corridor'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: 3.0, unit: null }, isLifeThreatening: true, isUnscored: false,
    regulatoryHint: 'All egress paths must be clear and functional at all times. Blocked exit is life-threatening.',
  },
  {
    id: 'in-002', area: 'inside', category: 'Egress', item: 'Exit Signs',
    defectConditions: ['Missing exit sign', 'Non-illuminated', 'Damaged', 'Wrong location'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: 3.0, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Exit signs must be illuminated and visible from all points in the corridor.',
  },
  {
    id: 'in-003', area: 'inside', category: 'Egress', item: 'Fire Escapes',
    defectConditions: ['Obstructed', 'Damaged structure', 'Missing sections', 'Not accessible'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: 3.0, unit: null }, isLifeThreatening: true, isUnscored: false,
    regulatoryHint: 'Fire escapes must be unobstructed and structurally sound.',
  },
  // --- Electrical ---
  {
    id: 'in-004', area: 'inside', category: 'Electrical', item: 'Electrical Enclosures',
    defectConditions: ['Open panel', 'Missing cover', 'Exposed wiring', 'Improper labeling'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: 2.5, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'All electrical panels and junction boxes must have covers securely attached.',
  },
  {
    id: 'in-005', area: 'inside', category: 'Electrical', item: 'Outlets/Switches',
    defectConditions: ['Missing cover plate', 'Damaged outlet', 'Non-functional', 'Sparking', 'Burn marks'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: 2.5, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Missing cover plates expose internal wiring. Sparking/burn marks = severe.',
  },
  {
    id: 'in-006', area: 'inside', category: 'Electrical', item: 'GFCI Protection',
    defectConditions: ['Missing GFCI', 'GFCI not functioning', 'Improper wiring'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: 2.5, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Required within 6 feet of any water source in common areas.',
    conditionalRules: [{ type: 'proximity', description: 'Must be within 6 feet of water source' }],
  },
  {
    id: 'in-007', area: 'inside', category: 'Electrical', item: 'Unshielded Wires/Conductors',
    defectConditions: ['Exposed wiring', 'Damaged insulation', 'Open junction box', 'Improper connections', 'Open breaker', 'Missing knockout'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: 2.5, unit: null }, isLifeThreatening: true, isUnscored: false,
    regulatoryHint: 'All sub-conditions are Severe. Any exposed conductor is life-threatening.',
  },
  {
    id: 'in-008', area: 'inside', category: 'Electrical', item: 'Light Fixtures',
    defectConditions: ['Missing fixture', 'Not secure', 'Non-functional', 'Broken lens', 'Exposed bulb in common area'],
    defaultSeverity: 'low', proofRequired: false,
    pointValue: { outside: null, inside: 1.5, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Common area lighting must be functional for safety.',
  },
  // --- Structure ---
  {
    id: 'in-009', area: 'inside', category: 'Structure', item: 'Foundation/Basement Infiltration',
    defectConditions: ['Water stains', 'Active leak', 'Cracks with moisture', 'Efflorescence', 'Standing water'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: 2.5, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Active water infiltration in foundation/basement areas. Standing water = severe.',
  },
  {
    id: 'in-010', area: 'inside', category: 'Structure', item: 'Structural Defects',
    defectConditions: ['Major cracks in walls', 'Sagging ceiling', 'Buckled floor', 'Compromised load-bearing'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: 2.5, unit: null }, isLifeThreatening: true, isUnscored: false,
    regulatoryHint: 'Any structural compromise that threatens occupant safety is life-threatening.',
  },
  {
    id: 'in-011', area: 'inside', category: 'Structure', item: 'Ceilings',
    defectConditions: ['Water stains', 'Sagging', 'Holes', 'Missing tiles', 'Peeling paint'],
    defaultSeverity: 'low', proofRequired: false,
    pointValue: { outside: null, inside: 1.5, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Sagging ceiling that appears ready to fall = severe.',
  },
  {
    id: 'in-012', area: 'inside', category: 'Structure', item: 'Walls/Wall Covering',
    defectConditions: ['Penetrating holes', 'Structural failure', 'Peeling paint', 'Water damage', 'Missing sections'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: 2.0, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Penetrating holes that allow pest entry or compromise fire rating = severe.',
  },
  {
    id: 'in-013', area: 'inside', category: 'Structure', item: 'Floors',
    defectConditions: ['Damaged flooring', 'Missing sections', 'Buckling', 'Water damage'],
    defaultSeverity: 'low', proofRequired: false,
    pointValue: { outside: null, inside: 1.5, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Floor damage creating trip hazard = moderate.',
  },
  // --- Lead Paint ---
  {
    id: 'in-014', area: 'inside', category: 'Lead Paint', item: 'Lead-Based Paint (Pre-1978)',
    defectConditions: ['Peeling paint', 'Chipping paint', 'Chalking surfaces', 'Damaged painted surface'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: 3.0, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Applies to buildings constructed before 1978. Requires certified remediation. Large surfaces: >2sf per room. Small surfaces: >10% per component.',
    conditionalRules: [{ type: 'pre1978', description: 'Only applies to buildings constructed before 1978' }],
  },
  // --- Fire Safety ---
  {
    id: 'in-015', area: 'inside', category: 'Fire Safety', item: 'Smoke Detectors (Common Area)',
    defectConditions: ['Missing detector', 'Non-functional', 'Expired unit', 'Improper location', 'Painted over', 'Missing battery'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: null, unit: null }, isLifeThreatening: false, isUnscored: true,
    regulatoryHint: 'UNSCORED H&S item - generates 24hr work order but does not affect REAC score. Must be on every level and within 21 feet of bedrooms.',
    conditionalRules: [{ type: 'placement', description: 'Ceiling mount: max 4" from wall. Wall mount: 4-12" from ceiling. Not within 3ft of windows/doors/vents, not within 10ft of stove.' }],
  },
  {
    id: 'in-016', area: 'inside', category: 'Fire Safety', item: 'Carbon Monoxide Detector',
    defectConditions: ['Missing detector', 'Non-functional', 'Expired unit', 'Wrong location'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: null, unit: null }, isLifeThreatening: false, isUnscored: true,
    regulatoryHint: 'UNSCORED H&S item. Required where fuel-fired appliances or attached garages are present.',
    conditionalRules: [{ type: 'proximity', description: 'Required near fuel-fired appliances or attached garages' }],
  },
  {
    id: 'in-017', area: 'inside', category: 'Fire Safety', item: 'Fire Alarm System',
    defectConditions: ['System fault', 'Missing pull station', 'Damaged horn/strobe', 'Not tested', 'Disabled'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: 3.0, unit: null }, isLifeThreatening: true, isUnscored: false,
    regulatoryHint: 'Disabled fire alarm system is life-threatening.',
  },
  {
    id: 'in-018', area: 'inside', category: 'Fire Safety', item: 'Fire Extinguishers (Common)',
    defectConditions: ['Missing extinguisher', 'Expired', 'Blocked access', 'Wrong type', 'Not charged'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: 3.0, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Non-chargeable units valid for 12 years from manufacturer date.',
  },
  {
    id: 'in-019', area: 'inside', category: 'Fire Safety', item: 'Flammable/Combustible Items',
    defectConditions: ['Stored in common area', 'Near ignition source', 'In egress path', 'Improper container'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: 3.0, unit: null }, isLifeThreatening: true, isUnscored: false,
    regulatoryHint: 'Flammable items in egress paths are life-threatening.',
  },
  {
    id: 'in-020', area: 'inside', category: 'Fire Safety', item: 'Sprinkler Assembly (Common)',
    defectConditions: ['Head blocked >75%', 'Head corroded', 'Missing escutcheon', 'Painted head', 'Damaged piping'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: 3.0, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Sprinkler head is defective if >75% blocked.',
  },
  {
    id: 'in-021', area: 'inside', category: 'Fire Safety', item: 'Auxiliary Lights/Emergency Lighting',
    defectConditions: ['Non-functional', 'Missing', 'Battery dead', 'Not illuminating egress'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: 3.0, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Emergency lighting must illuminate egress paths during power failure.',
  },
  // --- Safety ---
  {
    id: 'in-022', area: 'inside', category: 'Safety', item: 'Stairway Condition',
    defectConditions: ['Damaged treads', 'Missing handrail', 'Loose railing', 'Poor lighting', 'Uneven risers'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: 2.0, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Missing handrail on stairs with 4+ risers = severe.',
  },
  {
    id: 'in-023', area: 'inside', category: 'Safety', item: 'Guardrails (Common)',
    defectConditions: ['Missing guardrail', 'Loose', 'Improper height', 'Spacing too wide'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: 2.5, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Required where fall height exceeds 30 inches.',
  },
  {
    id: 'in-024', area: 'inside', category: 'Safety', item: 'Handrails (Common)',
    defectConditions: ['Missing', 'Loose', 'Not graspable', 'Not continuous', 'Improper height'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: 2.5, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Required for 4+ risers. Height: 28-42 inches.',
  },
  {
    id: 'in-025', area: 'inside', category: 'Safety', item: 'Sharp Edges (Common)',
    defectConditions: ['Exposed metal', 'Broken glass', 'Protruding hardware'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: 2.0, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Must be within normal path of travel.',
  },
  {
    id: 'in-026', area: 'inside', category: 'Safety', item: 'Trip Hazards (Common)',
    defectConditions: ['Torn carpet', 'Uneven threshold >3/4 inch', 'Loose flooring', 'Damaged floor'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: 2.0, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Trip hazard threshold: >3/4 inch vertical displacement.',
  },
  {
    id: 'in-027', area: 'inside', category: 'Safety', item: 'Elevator',
    defectConditions: ['Non-functional', 'Door not closing properly', 'Missing inspection certificate', 'Call button broken'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: 2.5, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Elevator must have current inspection certificate posted.',
  },
  {
    id: 'in-028', area: 'inside', category: 'Safety', item: 'Infestation (Common)',
    defectConditions: ['Evidence of pests', 'Extensive infestation', 'Rodent droppings', 'Insect nests'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: 2.5, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Evidence = moderate. Extensive infestation = severe.',
  },
  // --- HVAC ---
  {
    id: 'in-029', area: 'inside', category: 'HVAC', item: 'Heating System (Common)',
    defectConditions: ['Not functioning', 'Inadequate heat', 'Gas leak odor', 'CO detected', 'Below 68°F'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: 2.5, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Heating inspection: Oct 1 - Mar 31. Must maintain 68°F. Below 64°F = Life-Threatening.',
    conditionalRules: [{ type: 'seasonal', description: 'Heating system inspected Oct 1 - Mar 31. Temperature below 64°F is Life-Threatening.' }],
  },
  {
    id: 'in-030', area: 'inside', category: 'HVAC', item: 'Cooling System (Common)',
    defectConditions: ['Not functioning', 'Inadequate cooling', 'Refrigerant leak', 'Excessive noise'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: 2.0, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Cooling inspection: Apr 1 - Sep 30.',
    conditionalRules: [{ type: 'seasonal', description: 'Cooling system inspected Apr 1 - Sep 30.' }],
  },
  {
    id: 'in-031', area: 'inside', category: 'HVAC', item: 'Dryer Vent (Common)',
    defectConditions: ['Non-metal duct', 'Improvised filter', 'Clogged', 'Improper termination', 'Lint buildup'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: 2.5, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Non-metal duct = Severe. Improvised filter = Severe. Clogged = Severe (fire hazard).',
  },
  {
    id: 'in-032', area: 'inside', category: 'HVAC', item: 'Water Heater (Common)',
    defectConditions: ['No hot water', 'Leaking', 'Improper venting', 'Missing TPR valve', 'Corrosion', 'Missing discharge pipe'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: 2.0, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Missing TPR valve or discharge pipe = Severe. TPR valve must discharge within 6 inches of floor or to exterior.',
  },
  // --- Plumbing ---
  {
    id: 'in-033', area: 'inside', category: 'Plumbing', item: 'Leaks and Wastewater (Common)',
    defectConditions: ['Visible leak', 'Sewage odor', 'Water damage', 'Damaged piping'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: 2.0, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Active sewage leaks are severe.',
  },
  {
    id: 'in-034', area: 'inside', category: 'Plumbing', item: 'Floor Drain (Common)',
    defectConditions: ['Clogged', 'Missing cover', 'Odor', 'Standing water'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: 1.5, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Floor drains must be clear and have proper trap seal.',
  },
  // --- Doors ---
  {
    id: 'in-035', area: 'inside', category: 'Doors', item: 'General Doors (Common)',
    defectConditions: ['Won\'t close/latch', 'Damaged', 'Missing hardware', 'Self-closer not functioning'],
    defaultSeverity: 'low', proofRequired: false,
    pointValue: { outside: null, inside: 1.5, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Doors to common areas must close and latch properly.',
  },
  {
    id: 'in-036', area: 'inside', category: 'Doors', item: 'Fire-Rated Doors',
    defectConditions: ['Self-closer not functioning', 'Missing fire rating label', 'Held open improperly', 'Damaged seal/gasket', 'Penetrations through door'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: 3.0, unit: null }, isLifeThreatening: true, isUnscored: false,
    regulatoryHint: 'Fire-rated doors must self-close and latch. Check manufacturer documentation for rating. Held open without magnetic hold-open device = severe.',
  },
  // --- Health ---
  {
    id: 'in-037', area: 'inside', category: 'Health', item: 'Mold-Like Substance (Common)',
    defectConditions: ['Visible mold', 'Musty odor', 'Water damage with growth', 'Widespread contamination'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: 2.5, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Mold-like substance >1 sq ft requires professional assessment.',
  },
  {
    id: 'in-038', area: 'inside', category: 'Health', item: 'Litter/Debris (Common)',
    defectConditions: ['Accumulated debris', 'Unsanitary conditions', 'Hazardous materials'],
    defaultSeverity: 'low', proofRequired: false,
    pointValue: { outside: null, inside: 1.0, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Hazardous materials in common areas = severe.',
  },
  // --- Windows ---
  {
    id: 'in-039', area: 'inside', category: 'Windows', item: 'Windows (Common)',
    defectConditions: ['Broken glass', 'Won\'t open/close', 'Missing lock', 'Damaged frame', 'Missing screen'],
    defaultSeverity: 'low', proofRequired: false,
    pointValue: { outside: null, inside: 1.5, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Broken glass = moderate. Windows required for egress must be operable.',
  },
  // --- Misc ---
  {
    id: 'in-040', area: 'inside', category: 'Safety', item: 'Call-for-Aid (Common)',
    defectConditions: ['Non-functional pull cord', 'Missing pull cord', 'System not connected'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: 2.5, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Call-for-aid devices in bathrooms must be functional where installed.',
  },
  {
    id: 'in-041', area: 'inside', category: 'Safety', item: 'Trash Chute',
    defectConditions: ['Door won\'t close', 'Missing fusible link', 'Damaged chute', 'Odor/unsanitary'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: 2.0, unit: null }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Trash chute doors must self-close. Missing fusible link = severe (fire safety).',
  },
];

// ============================================================================
// UNIT DEFECTS (55 items)
// ============================================================================
export const UNIT_DEFECTS: DefectItem[] = [
  // --- Bathroom ---
  {
    id: 'unit-001', area: 'unit', category: 'Bathroom', item: 'Bath Ventilation',
    defectConditions: ['No ventilation', 'Non-functional fan', 'Mold/mildew present', 'Improper venting'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 2.0 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Bathroom must have operable window or exhaust fan.',
  },
  {
    id: 'unit-002', area: 'unit', category: 'Bathroom', item: 'Tub/Shower Hardware',
    defectConditions: ['Diverter not working', 'Drain clogged', 'Faucet leaking', 'Discoloration/staining', 'Missing hardware'],
    defaultSeverity: 'low', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 1.5 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Clogged drain = moderate. Active leak = moderate.',
  },
  {
    id: 'unit-003', area: 'unit', category: 'Bathroom', item: 'Toilet',
    defectConditions: ['Running constantly', 'Base loose/rocking', 'Doesn\'t flush', 'Leaking at base', 'Cracked tank/bowl'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 2.0 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Toilet must flush and refill properly. Cracked tank/bowl with active leak = severe.',
  },
  {
    id: 'unit-004', area: 'unit', category: 'Bathroom', item: 'Sink',
    defectConditions: ['Stopper missing/broken', 'Leak', 'Won\'t hold water', 'Clogged drain', 'Faucet dripping'],
    defaultSeverity: 'low', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 1.5 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Sink must hold water and drain properly.',
  },
  {
    id: 'unit-005', area: 'unit', category: 'Bathroom', item: 'Grab Bars',
    defectConditions: ['Missing where required', 'Loose', 'Damaged', 'Improperly installed'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 2.0 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Required in accessible units per ADA/Section 504.',
  },
  {
    id: 'unit-006', area: 'unit', category: 'Bathroom', item: 'Cabinets/Countertops',
    defectConditions: ['Damaged doors/drawers', 'Missing hardware', 'Water damage', 'Delaminating countertop'],
    defaultSeverity: 'low', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 1.0 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Cabinets must be functional. Water damage with mold = moderate.',
  },
  // --- Kitchen ---
  {
    id: 'unit-007', area: 'unit', category: 'Kitchen', item: 'Range/Oven',
    defectConditions: ['Burner not working', 'Oven not heating', 'Gas odor', 'Missing knobs', 'Anti-tip bracket missing', 'Microwave as primary (no range)'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 2.0 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'At least 2 burners must work. Gas odor = Life-Threatening. Anti-tip bracket required on all freestanding ranges. Microwave cannot serve as primary cooking appliance.',
  },
  {
    id: 'unit-008', area: 'unit', category: 'Kitchen', item: 'Refrigerator',
    defectConditions: ['Not cooling', 'Damaged door seal', 'Freezer not working', 'Excessive ice buildup', 'Missing shelves'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 2.0 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Refrigerator must maintain food-safe temperature (below 40°F).',
  },
  {
    id: 'unit-009', area: 'unit', category: 'Kitchen', item: 'Kitchen Ventilation',
    defectConditions: ['Non-functional range hood', 'Missing exhaust fan', 'Grease buildup', 'Not venting properly'],
    defaultSeverity: 'low', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 1.5 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Kitchen must have ventilation (range hood or window).',
  },
  {
    id: 'unit-010', area: 'unit', category: 'Kitchen', item: 'Kitchen Sink',
    defectConditions: ['Stopper missing', 'Leak', 'Won\'t hold water', 'Clogged', 'Faucet dripping'],
    defaultSeverity: 'low', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 1.5 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Kitchen sink must provide hot and cold running water.',
  },
  {
    id: 'unit-011', area: 'unit', category: 'Kitchen', item: 'Kitchen Cabinets/Countertops',
    defectConditions: ['Damaged doors/drawers', 'Missing hardware', 'Water damage', 'Delaminating', 'Missing shelf'],
    defaultSeverity: 'low', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 1.0 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Cabinets must be functional with working hardware.',
  },
  // --- HVAC ---
  {
    id: 'unit-012', area: 'unit', category: 'HVAC', item: 'Dryer Vent',
    defectConditions: ['Blocked vent', 'Plastic/foil duct', 'Improper termination', 'Excessive lint', 'Clogged'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: null, unit: 2.5 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Dryer vents must be rigid or semi-rigid metal and properly terminated. Condensing dryers are exempt from vent requirements. Clogged = Severe (fire hazard).',
  },
  {
    id: 'unit-013', area: 'unit', category: 'HVAC', item: 'HVAC System',
    defectConditions: ['Not heating', 'Not cooling', 'Gas odor', 'Unusual noise', 'No airflow', 'Below 68°F', 'Below 64°F'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 2.5 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Heating (Oct 1-Mar 31): must maintain 68°F. Below 64°F = Life-Threatening. Cooling (Apr 1-Sep 30): system must function. Gas odor = Life-Threatening.',
    conditionalRules: [
      { type: 'seasonal', description: 'Heating system inspected Oct 1 - Mar 31. Temperature below 64°F is Life-Threatening.' },
      { type: 'seasonal', description: 'Cooling system inspected Apr 1 - Sep 30.' },
    ],
  },
  {
    id: 'unit-014', area: 'unit', category: 'HVAC', item: 'Water Heater',
    defectConditions: ['No hot water', 'Leaking', 'Improper venting', 'Missing TPR valve', 'Corrosion', 'Missing discharge pipe'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 2.0 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Missing TPR valve or discharge pipe = Severe. Discharge pipe must terminate within 6 inches of floor or to exterior.',
  },
  // --- Electrical ---
  {
    id: 'unit-015', area: 'unit', category: 'Electrical', item: 'GFCI (Within 6 Feet)',
    defectConditions: ['Missing GFCI', 'Non-functional GFCI', 'Improper wiring'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: null, unit: 2.5 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Required within 6 feet of any water source. Exemptions: dedicated appliance outlets, below-counter cabinet outlets, outlets technically in a different room.',
    conditionalRules: [{ type: 'proximity', description: 'Must be within 6 feet of water source' }],
  },
  {
    id: 'unit-016', area: 'unit', category: 'Electrical', item: 'Unshielded Wires',
    defectConditions: ['Exposed wiring', 'Damaged outlets', 'Open junction box', 'Improper connections'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: null, unit: 2.5 }, isLifeThreatening: true, isUnscored: false,
    regulatoryHint: 'All sub-conditions are Severe. Any exposed conductor is life-threatening.',
  },
  {
    id: 'unit-017', area: 'unit', category: 'Electrical', item: 'Outlets/Switches',
    defectConditions: ['Missing cover plate', 'Damaged outlet', 'Non-functional', 'Sparking', 'Burn marks', 'Insufficient outlets'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 2.0 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Missing cover plates expose internal wiring. Sparking/burn marks = severe.',
  },
  {
    id: 'unit-018', area: 'unit', category: 'Electrical', item: 'Electrical Enclosures',
    defectConditions: ['Open panel', 'Missing cover', 'Damaged', 'Improper labeling'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: null, unit: 2.5 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'All electrical panels must have covers securely attached.',
  },
  {
    id: 'unit-019', area: 'unit', category: 'Electrical', item: 'Light Fixtures',
    defectConditions: ['Missing fixture', 'Not secure', 'Non-functional', 'Broken lens', 'Exposed bulb'],
    defaultSeverity: 'low', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 1.0 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Each room must have at least one working light source.',
  },
  // --- Fire Safety ---
  {
    id: 'unit-020', area: 'unit', category: 'Fire Safety', item: 'Smoke Detector',
    defectConditions: ['Missing', 'Non-functional', 'Expired', 'Wrong location', 'Painted over', 'Missing battery'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: null, unit: null }, isLifeThreatening: false, isUnscored: true,
    regulatoryHint: 'UNSCORED H&S item. Required in each bedroom, outside each bedroom within 21ft, and on every level. Ceiling mount: max 4" from wall. Wall mount: 4-12" from ceiling. Not within 3ft of windows/doors/vents, not within 10ft of stove.',
    conditionalRules: [
      { type: 'placement', description: 'Required in each bedroom, outside each bedroom within 21ft, on every level.' },
      { type: 'placement', description: 'Ceiling mount: max 4 inches from wall. Wall mount: 4-12 inches from ceiling.' },
      { type: 'proximity', description: 'Not within 3ft of windows/doors/vents. Not within 10ft of cooking appliance.' },
    ],
  },
  {
    id: 'unit-021', area: 'unit', category: 'Fire Safety', item: 'CO Detector',
    defectConditions: ['Missing', 'Non-functional', 'Expired', 'Wrong location'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: null, unit: null }, isLifeThreatening: false, isUnscored: true,
    regulatoryHint: 'UNSCORED H&S item. Required in units with fuel-fired appliances or attached garage. Must be on every level with sleeping rooms.',
    conditionalRules: [{ type: 'proximity', description: 'Required near fuel-fired appliances or attached garages' }],
  },
  {
    id: 'unit-022', area: 'unit', category: 'Fire Safety', item: 'Fire Extinguisher (Unit)',
    defectConditions: ['Missing (where previously installed)', 'Expired', 'Not charged'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 1.5 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Not required in units unless evidence of prior installation exists.',
  },
  {
    id: 'unit-023', area: 'unit', category: 'Fire Safety', item: 'Sprinkler Assembly (Unit)',
    defectConditions: ['Head blocked >75%', 'Head corroded', 'Missing escutcheon', 'Painted head'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: null, unit: 3.0 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Sprinkler head is defective if >75% blocked.',
  },
  // --- Safety ---
  {
    id: 'unit-024', area: 'unit', category: 'Safety', item: 'Trip Hazards',
    defectConditions: ['Torn carpet', 'Loose flooring', 'Uneven threshold >3/4 inch', 'Damaged floor'],
    defaultSeverity: 'low', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 1.5 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Trip hazard threshold: >3/4 inch vertical displacement or >2 inch horizontal gap.',
  },
  {
    id: 'unit-025', area: 'unit', category: 'Safety', item: 'Sharp Edges',
    defectConditions: ['Exposed metal', 'Broken glass', 'Protruding hardware', 'Damaged surfaces'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 2.0 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Must be within normal path of travel.',
  },
  {
    id: 'unit-026', area: 'unit', category: 'Safety', item: 'Guardrails (Unit)',
    defectConditions: ['Missing guardrail', 'Loose', 'Improper height', 'Spacing too wide'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: null, unit: 2.5 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Required where fall height exceeds 30 inches (balconies, lofts).',
  },
  {
    id: 'unit-027', area: 'unit', category: 'Safety', item: 'Handrails (Unit)',
    defectConditions: ['Missing', 'Loose', 'Not graspable', 'Not continuous'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: null, unit: 2.5 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Required for 4+ risers within the unit (e.g., townhouse/duplex stairs).',
  },
  {
    id: 'unit-028', area: 'unit', category: 'Safety', item: 'Stairs/Steps (Unit)',
    defectConditions: ['Damaged treads', 'Uneven risers', 'Missing nosing', 'Damaged stringer'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 2.0 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Applies to interior stairs in multi-level units.',
  },
  {
    id: 'unit-029', area: 'unit', category: 'Safety', item: 'Infestation',
    defectConditions: ['Roaches', 'Rodents', 'Bed bugs', 'Other pests', 'Extensive infestation'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: null, unit: 2.5 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Evidence = moderate. Extensive infestation = severe.',
  },
  // --- Health ---
  {
    id: 'unit-030', area: 'unit', category: 'Health', item: 'Mold-Like Substance',
    defectConditions: ['Visible mold', 'Musty odor', 'Water damage with growth', 'Widespread contamination'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 2.5 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Mold-like substance >1 sq ft requires professional assessment.',
  },
  {
    id: 'unit-031', area: 'unit', category: 'Health', item: 'Litter/Debris (Unit)',
    defectConditions: ['Unsanitary conditions', 'Accumulated debris', 'Hazardous materials'],
    defaultSeverity: 'low', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 1.0 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Hazardous materials = severe.',
  },
  // --- Security ---
  {
    id: 'unit-032', area: 'unit', category: 'Security', item: 'Door Locks',
    defectConditions: ['No deadbolt', 'Lock not functioning', 'Damaged frame', 'No peephole', 'Strike plate loose'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 1.5 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Entry door must have functioning deadbolt and peephole.',
  },
  {
    id: 'unit-033', area: 'unit', category: 'Security', item: 'Window Security',
    defectConditions: ['Broken lock', 'Window won\'t close', 'Missing screen', 'Damaged glass'],
    defaultSeverity: 'low', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 1.0 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Ground floor windows must have functioning locks.',
  },
  {
    id: 'unit-034', area: 'unit', category: 'Security', item: 'Secondary Entry Door',
    defectConditions: ['No deadbolt', 'Lock not functioning', 'Damaged', 'Won\'t close/latch'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 1.5 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'All entry doors must have functioning locks.',
  },
  // --- Doors ---
  {
    id: 'unit-035', area: 'unit', category: 'Doors', item: 'General Doors (Unit)',
    defectConditions: ['Won\'t close/latch', 'Damaged', 'Missing hardware', 'Holes'],
    defaultSeverity: 'low', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 1.0 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Interior doors must close and latch. Missing doors where privacy is expected = defect.',
  },
  // --- Structure ---
  {
    id: 'unit-036', area: 'unit', category: 'Structure', item: 'Ceilings (Unit)',
    defectConditions: ['Water stains', 'Sagging', 'Holes', 'Peeling paint', 'Missing tiles'],
    defaultSeverity: 'low', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 1.5 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Active water stain (wet) = moderate. Sagging ceiling ready to fall = severe.',
  },
  {
    id: 'unit-037', area: 'unit', category: 'Structure', item: 'Walls/Wall Covering (Unit)',
    defectConditions: ['Penetrating holes', 'Water damage', 'Peeling paint', 'Missing sections', 'Structural cracks'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 2.0 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Penetrating holes allowing pest entry = severe.',
  },
  {
    id: 'unit-038', area: 'unit', category: 'Structure', item: 'Floors (Unit)',
    defectConditions: ['Damaged flooring', 'Missing sections', 'Buckling', 'Water damage', 'Subfloor exposed'],
    defaultSeverity: 'low', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 1.5 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Floor damage creating trip hazard = moderate.',
  },
  {
    id: 'unit-039', area: 'unit', category: 'Structure', item: 'Structural Defects (Unit)',
    defectConditions: ['Major cracks', 'Sagging floor', 'Compromised load-bearing', 'Foundation issue'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: null, unit: 2.5 }, isLifeThreatening: true, isUnscored: false,
    regulatoryHint: 'Structural compromise threatening occupant safety is life-threatening.',
  },
  // --- Windows ---
  {
    id: 'unit-040', area: 'unit', category: 'Windows', item: 'Windows (Unit)',
    defectConditions: ['Broken glass', 'Won\'t open/close', 'Missing lock', 'Damaged frame', 'Missing screen', 'Failed seal (foggy)'],
    defaultSeverity: 'low', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 1.5 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Broken glass = moderate. Bedroom windows must be operable for egress.',
  },
  // --- Egress ---
  {
    id: 'unit-041', area: 'unit', category: 'Egress', item: 'Bedroom Egress',
    defectConditions: ['Only one point of egress', 'Window painted shut', 'Window too small for egress', 'Blocked egress window'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: null, unit: 3.0 }, isLifeThreatening: true, isUnscored: false,
    regulatoryHint: 'Sleeping rooms must have 2 points of egress (typically door + operable window). Egress windows: min 5.7 sq ft opening, max 44" sill height.',
    conditionalRules: [{ type: 'count', description: 'Each sleeping room requires 2 points of egress' }],
  },
  // --- Plumbing ---
  {
    id: 'unit-042', area: 'unit', category: 'Plumbing', item: 'Leaks and Wastewater (Unit)',
    defectConditions: ['Visible leak', 'Sewage odor', 'Water damage', 'Damaged piping', 'Slow drain'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: null, unit: 2.0 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Active sewage leaks are severe.',
  },
  {
    id: 'unit-043', area: 'unit', category: 'Plumbing', item: 'Hot Water',
    defectConditions: ['No hot water', 'Water too hot (>120°F)', 'Insufficient pressure', 'Discolored water'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 2.0 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Hot water must be available at all fixtures. Max temperature 120°F at tap.',
  },
  // --- Lead Paint ---
  {
    id: 'unit-044', area: 'unit', category: 'Lead Paint', item: 'Lead-Based Paint (Pre-1978)',
    defectConditions: ['Peeling paint', 'Chipping paint', 'Chalking surfaces', 'Damaged painted surface'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: null, unit: 3.0 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Only for buildings built before 1978. Large surfaces: >2sf per room. Small surfaces: >10% per component. Friction/impact surfaces are high priority.',
    conditionalRules: [{ type: 'pre1978', description: 'Only applies to buildings constructed before 1978' }],
  },
  // --- Flammable ---
  {
    id: 'unit-045', area: 'unit', category: 'Fire Safety', item: 'Flammable/Combustible Items (Unit)',
    defectConditions: ['Improper propane storage', 'Gasoline inside unit', 'Flammable items near heat source'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: null, unit: 3.0 }, isLifeThreatening: true, isUnscored: false,
    regulatoryHint: 'No flammable liquids (gasoline, propane) permitted inside dwelling units.',
  },
  // --- Call for Aid ---
  {
    id: 'unit-046', area: 'unit', category: 'Safety', item: 'Call-for-Aid (Unit)',
    defectConditions: ['Non-functional pull cord', 'Missing pull cord', 'System not connected'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: null, unit: 2.5 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Required in accessible unit bathrooms. Must be functional where installed.',
  },
  // --- Additional unit-specific items ---
  {
    id: 'unit-047', area: 'unit', category: 'Bathroom', item: 'Floor Drain (Unit)',
    defectConditions: ['Clogged', 'Missing cover', 'Odor', 'Standing water'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 1.5 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Floor drains must be clear and functional.',
  },
  {
    id: 'unit-048', area: 'unit', category: 'HVAC', item: 'Chimney/Fireplace (Unit)',
    defectConditions: ['Damaged flue', 'Missing damper', 'Cracked firebox', 'CO risk'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 2.0 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Fireplace with evidence of use must have functioning damper and intact flue.',
  },
  {
    id: 'unit-049', area: 'unit', category: 'Electrical', item: 'AFCI Protection',
    defectConditions: ['Missing AFCI where required', 'Non-functional', 'Tripping repeatedly'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: null, unit: 2.5 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'AFCI required in bedrooms and living areas per current code.',
  },
  {
    id: 'unit-050', area: 'unit', category: 'Health', item: 'Paint Condition (Post-1978)',
    defectConditions: ['Peeling >25% of surface', 'Chipping with debris', 'Widespread deterioration'],
    defaultSeverity: 'low', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 1.0 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'For post-1978 buildings. Cosmetic paint issues are low severity unless creating debris.',
  },
  {
    id: 'unit-051', area: 'unit', category: 'Doors', item: 'Fire-Rated Door (Unit)',
    defectConditions: ['Self-closer not functioning', 'Missing fire rating label', 'Held open improperly', 'Damaged seal'],
    defaultSeverity: 'severe', proofRequired: true,
    pointValue: { outside: null, inside: null, unit: 3.0 }, isLifeThreatening: true, isUnscored: false,
    regulatoryHint: 'Fire-rated doors (e.g., to attached garage) must self-close and latch.',
  },
  {
    id: 'unit-052', area: 'unit', category: 'Safety', item: 'Balcony/Patio',
    defectConditions: ['Damaged railing', 'Structural deterioration', 'Missing guardrail', 'Water damage'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 2.0 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Balcony guardrails must meet the same requirements as other guardrails (36-42" height).',
  },
  {
    id: 'unit-053', area: 'unit', category: 'Plumbing', item: 'Washer Connection',
    defectConditions: ['Leaking supply valve', 'No drain connection', 'Missing shutoff', 'Damaged hoses'],
    defaultSeverity: 'low', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 1.5 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Where washer hookup is provided, supply and drain must be functional.',
  },
  {
    id: 'unit-054', area: 'unit', category: 'Windows', item: 'Window Coverings',
    defectConditions: ['Missing blinds/curtains (ground floor bedroom)', 'Damaged coverings', 'Non-functional'],
    defaultSeverity: 'low', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 1.0 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Window coverings required for privacy in bedrooms and bathrooms.',
  },
  {
    id: 'unit-055', area: 'unit', category: 'Safety', item: 'Closet/Storage Safety',
    defectConditions: ['Light without proper clearance from combustibles', 'Exposed wiring in closet', 'No light source'],
    defaultSeverity: 'moderate', proofRequired: false,
    pointValue: { outside: null, inside: null, unit: 1.5 }, isLifeThreatening: false, isUnscored: false,
    regulatoryHint: 'Incandescent bulbs in closets must have proper clearance from stored items (12" sides, 6" front).',
  },
];

// ============================================================================
// Combined catalog getter
// ============================================================================
export function getDefectCatalog(area?: InspectionArea): DefectItem[] {
  if (!area) {
    return [...OUTSIDE_DEFECTS, ...INSIDE_DEFECTS, ...UNIT_DEFECTS];
  }

  switch (area) {
    case 'outside':
      return OUTSIDE_DEFECTS;
    case 'inside':
      return INSIDE_DEFECTS;
    case 'unit':
      return UNIT_DEFECTS;
  }
}

// Get unique categories for a given area
export function getCategories(area: InspectionArea): string[] {
  const catalog = getDefectCatalog(area);
  return [...new Set(catalog.map((item) => item.category))];
}

// Get items by category and area
export function getItemsByCategory(area: InspectionArea, category: string): DefectItem[] {
  return getDefectCatalog(area).filter((item) => item.category === category);
}

// Get deadline date based on severity
export function calculateDeadline(severity: SeverityLevel): Date {
  const deadline = new Date();
  switch (severity) {
    case 'severe':
      deadline.setDate(deadline.getDate() + 1); // 24 hours
      break;
    case 'moderate':
      deadline.setDate(deadline.getDate() + 30);
      break;
    case 'low':
      deadline.setDate(deadline.getDate() + 60);
      break;
  }
  return deadline;
}

// Determine if current date is in heating season
export function isHeatingSeason(date: Date = new Date()): boolean {
  const month = date.getMonth() + 1; // 1-indexed
  return month >= 10 || month <= 3; // Oct 1 - Mar 31
}

// Determine if current date is in cooling season
export function isCoolingSeason(date: Date = new Date()): boolean {
  const month = date.getMonth() + 1;
  return month >= 4 && month <= 9; // Apr 1 - Sep 30
}

// Severity display helpers
export const SEVERITY_CONFIG: Record<SeverityLevel, { label: string; className: string; deadline: string }> = {
  severe: {
    label: 'Severe',
    className: 'severity-severe',
    deadline: '24 hours',
  },
  moderate: {
    label: 'Moderate',
    className: 'severity-moderate',
    deadline: '30 days',
  },
  low: {
    label: 'Low',
    className: 'severity-low',
    deadline: '60 days',
  },
};

// Area display helpers
export const AREA_CONFIG: Record<InspectionArea, { label: string; className: string; color: string }> = {
  outside: {
    label: 'Outside',
    className: 'area-outside',
    color: 'emerald',
  },
  inside: {
    label: 'Inside (Common)',
    className: 'area-inside',
    color: 'blue',
  },
  unit: {
    label: 'Unit',
    className: 'area-unit',
    color: 'violet',
  },
};
