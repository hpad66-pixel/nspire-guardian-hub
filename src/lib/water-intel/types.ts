export type WaterAccountStatus = 'active' | 'closed' | 'disputed' | 'inactive';
export type WaterBillStatus = 'open' | 'paid' | 'past_due' | 'disputed' | 'credited';
export type WaterBillSource = 'seed' | 'upload' | 'ocr' | 'manual' | 'api';
export type WaterMeterScope = 'indoor' | 'mixed' | 'outdoor' | 'common';
export type WaterAllocationSource = 'verified' | 'unit_roster' | 'inferred' | 'unmapped';

export interface WaterServiceAccount {
  id: string;
  tenant_id: string;
  property_id: string;
  account_number: string;
  meter_number: string | null;
  service_address: string;
  building_label: string | null;
  folio_number: string | null;
  provider_name: string;
  status: WaterAccountStatus | string;
  notes: string | null;
  sort_order: number;
  connected_units?: number | null;
  occupied_units?: number | null;
  resident_count?: number | null;
  occupancy_as_of?: string | null;
  meter_scope?: WaterMeterScope | string;
  allocation_source?: WaterAllocationSource | string;
  allocation_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WaterUnitSummary {
  totalUnits: number;
  occupiedUnits: number;
}

export interface WaterBill {
  id: string;
  tenant_id: string;
  property_id: string;
  account_id: string;
  bill_period_start: string;
  bill_period_end: string;
  billing_date: string | null;
  due_date: string | null;
  previous_balance: number;
  current_charges: number;
  amount_due: number;
  amount_paid: number;
  water_charges: number;
  sewer_charges: number;
  other_fees: number;
  consumption_gallons: number;
  prior_reading: number | null;
  current_reading: number | null;
  days_of_service: number | null;
  is_estimated: boolean;
  is_duplicate: boolean;
  status: WaterBillStatus | string;
  document_url: string | null;
  document_name: string | null;
  source: WaterBillSource | string;
  raw_extract: Record<string, unknown>;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WaterExecNote {
  id: string;
  tenant_id: string;
  property_id: string;
  account_id: string | null;
  author_id: string | null;
  author_name: string | null;
  author_email: string | null;
  body: string;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export interface WaterExecInstruction {
  id: string;
  tenant_id: string;
  property_id: string;
  account_id: string | null;
  created_by: string | null;
  subject: string;
  body: string;
  recipients: string[];
  status: 'draft' | 'sent' | 'failed' | string;
  sent_at: string | null;
  created_at: string;
}

export interface WaterPropertyMeta {
  property_id: string;
  property_name: string;
  workspace_id?: string;
  token_expires_at?: string | null;
  water_intel_enabled?: boolean;
  water_intel_token?: string | null;
}

export interface MonthlyPoint {
  month: string;
  label: string;
  spend: number;
  water: number;
  sewer: number;
  fees: number;
  gallons: number;
  estimatedGallons: number;
  actualGallons: number;
  billCount: number;
}

export interface AccountRollup {
  accountId: string;
  accountNumber: string;
  buildingLabel: string;
  serviceAddress: string;
  status: string;
  folioNumber: string | null;
  ytdSpend: number;
  ytdGallons: number;
  last12Spend: number;
  last12Gallons: number;
  prior12Spend: number;
  spendDeltaPct: number | null;
  estimatedSpend: number;
  latestBill: WaterBill | null;
  openAmount: number;
}

export type WaterPerformanceBand = 'below_reference' | 'near_reference' | 'above_reference' | 'unavailable';

export interface MeterWaterPerformance {
  accountId: string;
  accountNumber: string;
  meterNumber: string | null;
  buildingLabel: string;
  serviceAddress: string;
  meterScope: string;
  allocationSource: string;
  allocationNotes: string | null;
  occupancyAsOf: string | null;
  connectedUnits: number | null;
  occupiedUnits: number | null;
  residentCount: number | null;
  residentCountIsModeled: boolean;
  reportingBillCount: number;
  reportingDays: number;
  readingCoveragePct: number;
  actualGallons: number;
  actualSpend: number;
  variableCharges: number;
  gallonsPerUnitDay: number | null;
  gallonsPerCapitaDay: number | null;
  annualizedCostPerUnit: number | null;
  costPerThousandGallons: number | null;
  baselineGallons: number;
  comparedGallons: number;
  avoidedGallons: number | null;
  avoidedCost: number | null;
  comparisonCoveragePct: number;
  benchmarkVariancePct: number | null;
  performanceBand: WaterPerformanceBand;
}

export interface MonthlyWaterPerformance {
  month: string;
  label: string;
  actualGallons: number;
  baselineGallons: number | null;
  avoidedGallons: number | null;
  avoidedCost: number | null;
}

export interface WaterEfficiencyAnalytics {
  reportingStart: string | null;
  reportingEnd: string | null;
  baselineStart: string | null;
  baselineEnd: string | null;
  totalUnits: number;
  occupiedUnits: number;
  modeledResidents: number | null;
  actualGallons: number;
  actualSpend: number;
  variableCharges: number;
  gallonsPerUnitDay: number | null;
  gallonsPerCapitaDay: number | null;
  annualizedCostPerUnit: number | null;
  costPerThousandGallons: number | null;
  epaMedianGallonsPerUnitYear: number;
  epaMedianGallonsPerUnitDay: number;
  benchmarkGallons: number | null;
  benchmarkCost: number | null;
  benchmarkGapGallons: number | null;
  benchmarkGapCost: number | null;
  avoidedGallons: number | null;
  avoidedCost: number | null;
  readingCoveragePct: number;
  sourceDocumentCoveragePct: number;
  comparisonCoveragePct: number;
  meterMappingCoveragePct: number;
  status: 'verified' | 'modeled' | 'insufficient';
  meters: MeterWaterPerformance[];
  monthly: MonthlyWaterPerformance[];
}

export interface WaterKpis {
  ytdSpend: number;
  priorYtdSpend: number;
  ytdDeltaPct: number | null;
  last12Spend: number;
  last12Gallons: number;
  openAmount: number;
  pastDueAmount: number;
  estimatedSpend: number;
  disputedSpend: number;
  accountCount: number;
  latestPeriod: string | null;
}

export type InsightSeverity = 'critical' | 'watch' | 'opportunity' | 'info';

export interface WaterInsight {
  id: string;
  severity: InsightSeverity;
  title: string;
  body: string;
  action: string;
  accountId?: string;
}

export interface YearRollup {
  year: number;
  spend: number;
  gallons: number;
  estimatedSpend: number;
}
