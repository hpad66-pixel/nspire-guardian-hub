import type { ModuleConfig } from '@/types/modules';

export type ModuleKey = keyof ModuleConfig;

export interface ModuleDef { key: ModuleKey; label: string; description: string }
export interface ModuleCategory { key: string; label: string; modules: ModuleDef[] }

// The sellable module catalog, grouped by domain. Drives the admin toggle screen
// and documents what each package includes.
export const MODULE_CATALOG: ModuleCategory[] = [
  { key: 'portfolio', label: 'Portfolio', modules: [
    { key: 'cockpitEnabled', label: 'Portfolio Cockpit', description: 'Cross-project risk, health, and team leaderboard' },
  ] },
  { key: 'construction', label: 'Construction', modules: [
    { key: 'constructionEnabled', label: 'Construction suite', description: 'Financials cascade, pay apps, change orders, RFIs, submittals, punch, daily logs' },
  ] },
  { key: 'consulting', label: 'Consulting', modules: [
    { key: 'consultingEnabled', label: 'Consulting engagements', description: 'Scopes, invoicing, meetings, action items, proposals' },
  ] },
  { key: 'environmental', label: 'Environmental', modules: [
    { key: 'environmentalEnabled', label: 'Environmental Compliance', description: 'Sampling, obligations, correspondence, compliance score' },
  ] },
  { key: 'property', label: 'nSpire / Property', modules: [
    { key: 'propertyMgmtEnabled', label: 'Property management', description: 'Properties, units, assets, work orders, issues, permits' },
    { key: 'nspireEnabled', label: 'NSPIRE inspections', description: 'Unit inspections and REAC scoring' },
    { key: 'dailyGroundsEnabled', label: 'Daily grounds', description: 'Grounds and asset inspections' },
    { key: 'occupancyEnabled', label: 'Occupancy', description: 'Tenant / occupancy management' },
  ] },
  { key: 'field', label: 'Field ops', modules: [
    { key: 'equipmentTrackerEnabled', label: 'Equipment & fleet', description: 'Equipment and fleet tracking' },
    { key: 'qrScanningEnabled', label: 'QR scanning', description: 'QR asset scanning' },
    { key: 'credentialWalletEnabled', label: 'Credential wallet', description: 'Credentials & licenses' },
    { key: 'trainingHubEnabled', label: 'Training hub', description: 'Training assignments and courses' },
    { key: 'safetyModuleEnabled', label: 'Safety', description: 'Incident log & OSHA recordkeeping' },
  ] },
  { key: 'portals', label: 'Portals', modules: [
    { key: 'clientPortalEnabled', label: 'Client portal', description: 'White-labeled client sharing' },
  ] },
  { key: 'insights', label: 'Insights', modules: [
    { key: 'reportsEnabled', label: 'Reports & documents', description: 'Reports center, documents, CaseIQ' },
  ] },
  { key: 'ai', label: 'AI', modules: [
    { key: 'aiEnabled', label: 'AI capabilities', description: 'Assistant, drafting, analysis, and briefings across the app' },
  ] },
];

export interface PackageDef { key: string; name: string; description: string; modules: ModuleKey[] }

// A package is a preset: the modules it lists are turned ON, everything else OFF
// (Core is always on regardless). Rename / re-scope these to your commercial tiers.
export const PACKAGES: PackageDef[] = [
  { key: 'construction', name: 'Construction', description: 'GC / construction management', modules: ['constructionEnabled', 'cockpitEnabled', 'reportsEnabled', 'clientPortalEnabled', 'aiEnabled'] },
  { key: 'construction_nspire', name: 'Construction + nSpire', description: 'Construction plus property inspections', modules: ['constructionEnabled', 'propertyMgmtEnabled', 'nspireEnabled', 'dailyGroundsEnabled', 'equipmentTrackerEnabled', 'safetyModuleEnabled', 'cockpitEnabled', 'reportsEnabled', 'clientPortalEnabled', 'aiEnabled'] },
  { key: 'consulting', name: 'Consulting', description: 'Consulting engagements', modules: ['consultingEnabled', 'cockpitEnabled', 'clientPortalEnabled', 'reportsEnabled', 'aiEnabled'] },
  { key: 'consulting_env', name: 'Consulting + Environmental', description: 'Consulting plus environmental compliance', modules: ['consultingEnabled', 'environmentalEnabled', 'cockpitEnabled', 'clientPortalEnabled', 'reportsEnabled', 'aiEnabled'] },
  { key: 'property', name: 'Property / nSpire', description: 'Property management and inspections', modules: ['propertyMgmtEnabled', 'nspireEnabled', 'dailyGroundsEnabled', 'occupancyEnabled', 'equipmentTrackerEnabled', 'safetyModuleEnabled', 'reportsEnabled', 'aiEnabled'] },
  { key: 'enterprise', name: 'Enterprise', description: 'Everything', modules: MODULE_CATALOG.flatMap((c) => c.modules.map((m) => m.key)) },
];

// Module key → the workspace-toggle column on public.workspace_modules.
export const MODULE_WS_COLUMN: Partial<Record<ModuleKey, string>> = {
  constructionEnabled: 'construction_enabled', consultingEnabled: 'consulting_enabled', environmentalEnabled: 'environmental_enabled',
  propertyMgmtEnabled: 'property_mgmt_enabled', cockpitEnabled: 'cockpit_enabled', reportsEnabled: 'reports_enabled', aiEnabled: 'ai_enabled',
  occupancyEnabled: 'occupancy_enabled', emailInboxEnabled: 'email_inbox_enabled', qrScanningEnabled: 'qr_scanning_enabled',
  credentialWalletEnabled: 'credential_wallet_enabled', trainingHubEnabled: 'training_hub_enabled', safetyModuleEnabled: 'safety_module_enabled',
  equipmentTrackerEnabled: 'equipment_tracker_enabled', clientPortalEnabled: 'client_portal_enabled',
};
