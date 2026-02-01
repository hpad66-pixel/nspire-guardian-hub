// Module Feature Flags
export interface ModuleConfig {
  nspireEnabled: boolean;        // Inside unit inspections (NSPIRE compliance)
  dailyGroundsEnabled: boolean;  // Outside/grounds/asset inspections
  projectsEnabled: boolean;      // Construction/renovation projects
  occupancyEnabled: boolean;     // Future: tenant management
  emailInboxEnabled: boolean;    // Future: email integration
  qrScanningEnabled: boolean;    // Future: QR asset scanning
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

// NSPIRE Defect Item
export interface DefectItem {
  id: string;
  area: InspectionArea;
  category: string;
  item: string;
  defectConditions: string[];
  defaultSeverity: SeverityLevel;
  proofRequired: boolean;
  notes?: string;
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
  sourceId?: string; // ID of inspection or project that created this
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
