// Module Feature Flags
export interface ModuleConfig {
  nspireEnabled: boolean;           // Inside unit inspections (NSPIRE compliance)
  dailyGroundsEnabled: boolean;     // Outside/grounds/asset inspections
  projectsEnabled: boolean;         // Construction/renovation projects
  occupancyEnabled: boolean;        // Future: tenant management
  emailInboxEnabled: boolean;       // Future: email integration
  qrScanningEnabled: boolean;       // Future: QR asset scanning
  credentialWalletEnabled: boolean; // Credential & License Wallet
  trainingHubEnabled: boolean;      // Training Hub (LearnWorlds integration)
  safetyModuleEnabled: boolean;     // Safety Incident Log & OSHA recordkeeping
}

// NSPIRE Severity Levels
export type SeverityLevel = 'severe' | 'moderate' | 'low';

// NSPIRE Inspectable Areas
export type InspectionArea = 'outside' | 'inside' | 'unit';

// Deadline logic based on severity
export const SEVERITY_DEADLINES: Record<SeverityLevel, number> = {
  severe: 1, // 24 hours (1 day)
  moderate: 30, // 30 days
  low: 60, // 60 days
};

// Issue source tracking
export type IssueSource = 'core' | 'nspire' | 'projects';

// Conditional rule types for regulatory logic
export interface ConditionalRule {
  type: 'seasonal' | 'proximity' | 'structural' | 'pre1978' | 'placement' | 'count';
  description: string;
}

// NSPIRE Defect Item (enhanced with book data)
export interface DefectItem {
  id: string;
  area: InspectionArea;
  category: string;
  item: string;
  defectConditions: string[];
  defaultSeverity: SeverityLevel;
  proofRequired: boolean;
  notes?: string;
  // New fields from the book
  pointValue: {
    outside: number | null;
    inside: number | null;
    unit: number | null;
  };
  isLifeThreatening: boolean;
  isUnscored: boolean; // Smoke/CO detectors - generate work orders but don't affect REAC score
  regulatoryHint: string;
  conditionalRules?: ConditionalRule[];
}

// Inspection Record
export interface Inspection {
  id: string;
  propertyId: string;
  area: InspectionArea;
  unitId?: string;
  inspectorId: string;
  scheduledDate: string;
  completedDate?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed';
  defects: InspectionDefect[];
  nspireScore?: number;
  unitPerformanceScore?: number;
  dataRetentionUntil?: string;
  createdAt: string;
  updatedAt: string;
}

// Individual Defect Finding
export interface InspectionDefect {
  id: string;
  inspectionId: string;
  defectItemId: string;
  condition: string;
  severity: SeverityLevel;
  lifeThreatening: boolean;
  pointValue?: number;
  location: string;
  photos: string[];
  notes: string;
  repairDeadline: string;
  proofRequired: boolean;
  repairStatus: 'pending' | 'in_progress' | 'completed' | 'verified';
  repairCompletedDate?: string;
  repairProofPhotos?: string[];
}

// Issue (Cross-module spine)
export interface Issue {
  id: string;
  title: string;
  description: string;
  sourceModule: IssueSource;
  sourceId?: string;
  propertyId: string;
  unitId?: string;
  assetId?: string;
  area?: InspectionArea;
  severity: SeverityLevel;
  deadline: string;
  proofRequired: boolean;
  status: 'open' | 'in_progress' | 'resolved' | 'verified';
  assigneeId?: string;
  createdAt: string;
  updatedAt: string;
}

// Project (Separate module)
export interface Project {
  id: string;
  propertyId: string;
  name: string;
  description: string;
  scope: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'closed';
  startDate: string;
  endDate?: string;
  budget?: number;
  milestones: ProjectMilestone[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  name: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
}

// Property (Core)
export interface Property {
  id: string;
  tenantId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  unitCount: number;
  yearBuilt?: number;
  createdAt: string;
  updatedAt: string;
}

// Unit (Core)
export interface Unit {
  id: string;
  propertyId: string;
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  sqft?: number;
  status: 'vacant' | 'occupied' | 'maintenance';
  lastInspectionDate?: string;
  nextInspectionDue?: string;
}

// Priority Pyramid tiers (highest to lowest impact)
export const PRIORITY_PYRAMID_TIERS = [
  { area: 'unit' as InspectionArea, severity: 'severe' as SeverityLevel, lt: true, label: 'Unit | Severe-LT', rank: 1 },
  { area: 'inside' as InspectionArea, severity: 'severe' as SeverityLevel, lt: true, label: 'Inside | Severe-LT', rank: 2 },
  { area: 'outside' as InspectionArea, severity: 'severe' as SeverityLevel, lt: true, label: 'Outside | Severe-LT', rank: 3 },
  { area: 'unit' as InspectionArea, severity: 'severe' as SeverityLevel, lt: false, label: 'Unit | Severe', rank: 4 },
  { area: 'inside' as InspectionArea, severity: 'severe' as SeverityLevel, lt: false, label: 'Inside | Severe', rank: 5 },
  { area: 'outside' as InspectionArea, severity: 'severe' as SeverityLevel, lt: false, label: 'Outside | Severe', rank: 6 },
  { area: 'unit' as InspectionArea, severity: 'moderate' as SeverityLevel, lt: false, label: 'Unit | Moderate', rank: 7 },
  { area: 'inside' as InspectionArea, severity: 'moderate' as SeverityLevel, lt: false, label: 'Inside | Moderate', rank: 8 },
  { area: 'outside' as InspectionArea, severity: 'moderate' as SeverityLevel, lt: false, label: 'Outside | Moderate', rank: 9 },
  { area: 'unit' as InspectionArea, severity: 'low' as SeverityLevel, lt: false, label: 'Unit | Low', rank: 10 },
  { area: 'inside' as InspectionArea, severity: 'low' as SeverityLevel, lt: false, label: 'Inside | Low', rank: 11 },
  { area: 'outside' as InspectionArea, severity: 'low' as SeverityLevel, lt: false, label: 'Outside | Low', rank: 12 },
] as const;
