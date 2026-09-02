export type WaterAccountStatus = 'active' | 'closed' | 'disputed' | 'inactive';
export type WaterBillStatus = 'open' | 'paid' | 'past_due' | 'disputed' | 'credited';
export type WaterBillSource = 'seed' | 'upload' | 'ocr' | 'manual' | 'api';

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
  created_at: string;
  updated_at: string;
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
