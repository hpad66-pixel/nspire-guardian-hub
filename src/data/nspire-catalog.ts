import { DefectItem, InspectionArea, SeverityLevel } from '@/types/modules';

// NSPIRE Defect Catalog - Outside Area
export const OUTSIDE_DEFECTS: DefectItem[] = [
  {
    id: 'out-001',
    area: 'outside',
    category: 'Electrical',
    item: 'GFCI Protection',
    defectConditions: ['Missing GFCI protection', 'GFCI not functioning', 'Damaged GFCI outlet'],
    defaultSeverity: 'severe',
    proofRequired: true,
    notes: 'All outdoor outlets within 6 feet of water source must have GFCI protection',
  },
  {
    id: 'out-002',
    area: 'outside',
    category: 'Electrical',
    item: 'Unshielded Wires',
    defectConditions: ['Exposed wiring', 'Damaged wire insulation', 'Improper wire connections'],
    defaultSeverity: 'severe',
    proofRequired: true,
  },
  {
    id: 'out-003',
    area: 'outside',
    category: 'Safety',
    item: 'Tripping Hazards',
    defectConditions: ['Uneven walkway', 'Cracked pavement', 'Raised tree roots', 'Missing step'],
    defaultSeverity: 'moderate',
    proofRequired: false,
  },
  {
    id: 'out-004',
    area: 'outside',
    category: 'Safety',
    item: 'Guardrails and Handrails',
    defectConditions: ['Missing guardrail', 'Loose guardrail', 'Damaged handrail', 'Improper height'],
    defaultSeverity: 'severe',
    proofRequired: true,
  },
  {
    id: 'out-005',
    area: 'outside',
    category: 'Fire Safety',
    item: 'Fire Extinguishers',
    defectConditions: ['Missing extinguisher', 'Expired extinguisher', 'Blocked access', 'Wrong type'],
    defaultSeverity: 'severe',
    proofRequired: true,
  },
  {
    id: 'out-006',
    area: 'outside',
    category: 'HVAC',
    item: 'Dryer Vents',
    defectConditions: ['Blocked vent', 'Damaged vent cover', 'Improper termination', 'Lint buildup'],
    defaultSeverity: 'moderate',
    proofRequired: false,
  },
  {
    id: 'out-007',
    area: 'outside',
    category: 'Signage',
    item: 'Required Signage',
    defectConditions: ['Missing address numbers', 'Illegible signage', 'Missing emergency info'],
    defaultSeverity: 'low',
    proofRequired: false,
  },
  {
    id: 'out-008',
    area: 'outside',
    category: 'Site',
    item: 'Fencing',
    defectConditions: ['Damaged fencing', 'Missing sections', 'Gate not functioning', 'Sharp edges'],
    defaultSeverity: 'moderate',
    proofRequired: false,
  },
  {
    id: 'out-009',
    area: 'outside',
    category: 'Site',
    item: 'Drainage',
    defectConditions: ['Standing water', 'Clogged drains', 'Erosion issues', 'Improper grading'],
    defaultSeverity: 'moderate',
    proofRequired: false,
  },
  {
    id: 'out-010',
    area: 'outside',
    category: 'Plumbing',
    item: 'Leaks and Wastewater',
    defectConditions: ['Visible leak', 'Sewage odor', 'Improper discharge', 'Damaged piping'],
    defaultSeverity: 'severe',
    proofRequired: true,
  },
];

// NSPIRE Defect Catalog - Inside (Common Areas)
export const INSIDE_DEFECTS: DefectItem[] = [
  {
    id: 'in-001',
    area: 'inside',
    category: 'Egress',
    item: 'Emergency Exits',
    defectConditions: ['Blocked exit', 'Door not functioning', 'Missing signage', 'Locked exit'],
    defaultSeverity: 'severe',
    proofRequired: true,
    notes: 'All egress paths must be clear and functional at all times',
  },
  {
    id: 'in-002',
    area: 'inside',
    category: 'Electrical',
    item: 'Electrical Enclosures',
    defectConditions: ['Open panel', 'Missing cover', 'Exposed wiring', 'Improper labeling'],
    defaultSeverity: 'severe',
    proofRequired: true,
  },
  {
    id: 'in-003',
    area: 'inside',
    category: 'Structure',
    item: 'Foundation Infiltration',
    defectConditions: ['Water stains', 'Active leak', 'Cracks with moisture', 'Efflorescence'],
    defaultSeverity: 'moderate',
    proofRequired: false,
  },
  {
    id: 'in-004',
    area: 'inside',
    category: 'Lead Paint',
    item: 'Lead-Based Paint (Pre-1978)',
    defectConditions: ['Peeling paint', 'Chipping paint', 'Chalking surfaces', 'Damaged painted surface'],
    defaultSeverity: 'severe',
    proofRequired: true,
    notes: 'Applies to buildings constructed before 1978. Requires certified remediation.',
  },
  {
    id: 'in-005',
    area: 'inside',
    category: 'Fire Safety',
    item: 'Smoke Detectors (Common)',
    defectConditions: ['Missing detector', 'Non-functional', 'Expired unit', 'Improper location'],
    defaultSeverity: 'severe',
    proofRequired: true,
  },
  {
    id: 'in-006',
    area: 'inside',
    category: 'Fire Safety',
    item: 'Fire Alarm System',
    defectConditions: ['System fault', 'Missing pull station', 'Damaged horn/strobe', 'Not tested'],
    defaultSeverity: 'severe',
    proofRequired: true,
  },
  {
    id: 'in-007',
    area: 'inside',
    category: 'Safety',
    item: 'Stairway Condition',
    defectConditions: ['Damaged treads', 'Missing handrail', 'Loose railing', 'Poor lighting'],
    defaultSeverity: 'moderate',
    proofRequired: false,
  },
  {
    id: 'in-008',
    area: 'inside',
    category: 'HVAC',
    item: 'Heating System',
    defectConditions: ['Not functioning', 'Inadequate heat', 'Gas leak odor', 'CO detected'],
    defaultSeverity: 'severe',
    proofRequired: true,
  },
];

// NSPIRE Defect Catalog - Unit
export const UNIT_DEFECTS: DefectItem[] = [
  {
    id: 'unit-001',
    area: 'unit',
    category: 'Bathroom',
    item: 'Bath Ventilation',
    defectConditions: ['No ventilation', 'Non-functional fan', 'Mold/mildew present', 'Improper venting'],
    defaultSeverity: 'moderate',
    proofRequired: false,
  },
  {
    id: 'unit-002',
    area: 'unit',
    category: 'HVAC',
    item: 'Dryer Vent',
    defectConditions: ['Blocked vent', 'Plastic/foil duct', 'Improper termination', 'Excessive lint'],
    defaultSeverity: 'severe',
    proofRequired: true,
    notes: 'Dryer vents must be rigid or semi-rigid metal and properly terminated',
  },
  {
    id: 'unit-003',
    area: 'unit',
    category: 'Electrical',
    item: 'GFCI (Within 6 Feet)',
    defectConditions: ['Missing GFCI', 'Non-functional GFCI', 'Improper wiring'],
    defaultSeverity: 'severe',
    proofRequired: true,
    notes: 'Required within 6 feet of any water source',
  },
  {
    id: 'unit-004',
    area: 'unit',
    category: 'Electrical',
    item: 'Unshielded Wires',
    defectConditions: ['Exposed wiring', 'Damaged outlets', 'Open junction box', 'Improper connections'],
    defaultSeverity: 'severe',
    proofRequired: true,
  },
  {
    id: 'unit-005',
    area: 'unit',
    category: 'Fire Safety',
    item: 'Smoke Detector',
    defectConditions: ['Missing', 'Non-functional', 'Expired', 'Wrong location', 'Painted over'],
    defaultSeverity: 'severe',
    proofRequired: true,
  },
  {
    id: 'unit-006',
    area: 'unit',
    category: 'Fire Safety',
    item: 'CO Detector',
    defectConditions: ['Missing', 'Non-functional', 'Expired', 'Wrong location'],
    defaultSeverity: 'severe',
    proofRequired: true,
    notes: 'Required in units with fuel-burning appliances or attached garage',
  },
  {
    id: 'unit-007',
    area: 'unit',
    category: 'HVAC',
    item: 'Water Heater',
    defectConditions: ['No hot water', 'Leaking', 'Improper venting', 'Missing TPR valve', 'Corrosion'],
    defaultSeverity: 'moderate',
    proofRequired: false,
  },
  {
    id: 'unit-008',
    area: 'unit',
    category: 'HVAC',
    item: 'HVAC System',
    defectConditions: ['Not heating', 'Not cooling', 'Gas odor', 'Unusual noise', 'No airflow'],
    defaultSeverity: 'moderate',
    proofRequired: false,
  },
  {
    id: 'unit-009',
    area: 'unit',
    category: 'Safety',
    item: 'Trip Hazards',
    defectConditions: ['Torn carpet', 'Loose flooring', 'Uneven threshold', 'Damaged floor'],
    defaultSeverity: 'low',
    proofRequired: false,
  },
  {
    id: 'unit-010',
    area: 'unit',
    category: 'Health',
    item: 'Infestation',
    defectConditions: ['Roaches', 'Rodents', 'Bed bugs', 'Other pests'],
    defaultSeverity: 'severe',
    proofRequired: true,
  },
  {
    id: 'unit-011',
    area: 'unit',
    category: 'Health',
    item: 'Mold-Like Substance',
    defectConditions: ['Visible mold', 'Musty odor', 'Water damage with growth', 'Widespread contamination'],
    defaultSeverity: 'moderate',
    proofRequired: false,
    notes: 'Mold-like substance > 1 sq ft requires professional assessment',
  },
  {
    id: 'unit-012',
    area: 'unit',
    category: 'Security',
    item: 'Door Locks',
    defectConditions: ['No deadbolt', 'Lock not functioning', 'Damaged frame', 'No peephole'],
    defaultSeverity: 'moderate',
    proofRequired: false,
  },
  {
    id: 'unit-013',
    area: 'unit',
    category: 'Security',
    item: 'Window Security',
    defectConditions: ['Broken lock', 'Window wont close', 'Missing screen', 'Damaged glass'],
    defaultSeverity: 'low',
    proofRequired: false,
  },
];

// Combined catalog getter
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
