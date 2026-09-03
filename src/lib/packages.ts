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
    { key: 'contractorReadinessEnabled', label: 'Contractor Readiness', description: 'Vendor qualification, secure document collection, expiration monitoring, and deterministic work/payment gates' },
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
    { key: 'projectsEnabled', label: 'Projects (legacy)', description: 'Capital improvements, daily reports, change orders, and closeout' },
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
  { key: 'communication', label: 'Communication', modules: [
    { key: 'emailInboxEnabled', label: 'Email inbox integration', description: 'Unified email inbox with AI-powered triage' },
  ] },
  { key: 'insights', label: 'Insights', modules: [
    { key: 'reportsEnabled', label: 'Reports & documents', description: 'Reports center, documents, CaseIQ' },
  ] },
  { key: 'ai', label: 'AI', modules: [
    {
      key: 'aiEnabled',
      label: 'AI + Resident Voice',
      description: 'Assistant, drafting, analysis, briefings, and the ElevenLabs Voice Complaints hotline (sidebar → Resident Voice)',
    },
  ] },
];

export interface PackageDef { key: string; name: string; description: string; modules: ModuleKey[] }

// A package is a preset: the modules it lists are turned ON, everything else OFF
// (Core is always on regardless). Rename / re-scope these to your commercial tiers.
export const PACKAGES: PackageDef[] = [
  { key: 'construction', name: 'Construction', description: 'GC / construction management', modules: ['constructionEnabled', 'cockpitEnabled', 'reportsEnabled', 'clientPortalEnabled', 'aiEnabled'] },
  { key: 'construction_nspire', name: 'Construction + nSpire', description: 'Construction plus property inspections', modules: ['constructionEnabled', 'contractorReadinessEnabled', 'propertyMgmtEnabled', 'nspireEnabled', 'dailyGroundsEnabled', 'equipmentTrackerEnabled', 'safetyModuleEnabled', 'cockpitEnabled', 'reportsEnabled', 'clientPortalEnabled', 'aiEnabled'] },
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
  contractorReadinessEnabled: 'contractor_readiness_enabled',
};

/** Module key → matching platform gate column (`platform_*`). */
export const MODULE_PLATFORM_COLUMN: Partial<Record<ModuleKey, string>> = Object.fromEntries(
  Object.entries(MODULE_WS_COLUMN).map(([mk, col]) => [
    mk,
    `platform_${(col as string).replace(/_enabled$/, '')}`,
  ]),
) as Partial<Record<ModuleKey, string>>;

/**
 * Build the workspace_modules upsert patch for a package preset.
 * Sets both workspace toggles AND platform gates so modules do not stay
 * grayed as "Not in plan" after applying Enterprise (or any package).
 */
export function buildPackageModulePatch(packageKey: string): Record<string, string | boolean> {
  const pkg = PACKAGES.find((p) => p.key === packageKey);
  if (!pkg) throw new Error(`Unknown package: ${packageKey}`);
  const has = (k: ModuleKey) => pkg.modules.includes(k);
  const patch: Record<string, string | boolean> = { package: pkg.name };
  for (const mk of Object.keys(MODULE_WS_COLUMN) as ModuleKey[]) {
    const on = has(mk);
    const wsCol = MODULE_WS_COLUMN[mk];
    const platformCol = MODULE_PLATFORM_COLUMN[mk];
    if (wsCol) patch[wsCol] = on;
    if (platformCol) patch[platformCol] = on;
  }
  return patch;
}

/** Property-table flags that accompany a package apply. */
export function buildPackagePropertyFlags(packageKey: string): {
  nspire_enabled: boolean;
  daily_grounds_enabled: boolean;
  projects_enabled: boolean;
} {
  const pkg = PACKAGES.find((p) => p.key === packageKey);
  if (!pkg) throw new Error(`Unknown package: ${packageKey}`);
  const has = (k: ModuleKey) => pkg.modules.includes(k);
  return {
    nspire_enabled: has('nspireEnabled'),
    daily_grounds_enabled: has('dailyGroundsEnabled'),
    projects_enabled: has('constructionEnabled') || has('consultingEnabled') || has('projectsEnabled'),
  };
}
