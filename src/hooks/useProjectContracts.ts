import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ContractSovItem {
  id: string;
  tenant_id: string;
  contract_id: string;
  item_number: number;
  budget_code: string | null;
  description: string;
  quantity: number | null;
  unit: string | null;
  unit_cost: number | null;
  subtotal: number | null;
  completed_qty: number;
  completed_pct: number;
  billed_to_date: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectContract {
  id: string;
  tenant_id: string;
  project_id: string;
  contract_number: string | null;
  contract_title: string;
  contract_type: string;
  status: string;
  docusign_envelope_id: string | null;
  prime_contractor_name: string | null;
  prime_contractor_address: string | null;
  prime_contractor_contact: string | null;
  prime_contractor_email: string | null;
  subcontractor_name: string | null;
  subcontractor_address: string | null;
  subcontractor_contact: string | null;
  subcontractor_email: string | null;
  project_address: string | null;
  contract_date: string | null;
  start_date: string | null;
  substantial_completion_date: string | null;
  final_completion_date: string | null;
  actual_completion_date: string | null;
  signed_contract_received_date: string | null;
  base_contract_amount: number | null;
  retainage_percent: number | null;
  mobilization_advance: number | null;
  liquidated_damages_per_day: number | null;
  retainage_release_substantial: number | null;
  retainage_release_final: number | null;
  retainage_warranty_months: number | null;
  payment_cycle_days: number | null;
  payment_due_within_days: number | null;
  scope_description: string | null;
  inclusions: string | null;
  exclusions: string | null;
  special_conditions: string | null;
  artifact_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  sov_items?: ContractSovItem[];
}

export type ContractUpsert = Omit<ProjectContract, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'sov_items'> & {
  id?: string;
};

export type SovItemUpsert = Omit<ContractSovItem, 'id' | 'tenant_id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export function useProjectContracts(projectId: string) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['project_contracts', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_contracts')
        .select('*, sov_items:contract_sov_items(*)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProjectContract[];
    },
    enabled: !!projectId,
  });

  const upsert = useMutation({
    mutationFn: async ({
      contract,
      sovItems,
    }: {
      contract: ContractUpsert;
      sovItems?: SovItemUpsert[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: ws } = await supabase
        .from('workspaces')
        .select('id')
        .limit(1)
        .single();
      const tenant_id = ws?.id;

      const payload = {
        ...contract,
        project_id: projectId,
        tenant_id,
        created_by: user?.id,
      };

      const { data: saved, error } = contract.id
        ? await supabase
            .from('project_contracts')
            .update(payload)
            .eq('id', contract.id)
            .select()
            .single()
        : await supabase
            .from('project_contracts')
            .insert(payload)
            .select()
            .single();
      if (error) throw error;

      if (sovItems?.length) {
        // Delete existing SOV items then re-insert
        await supabase.from('contract_sov_items').delete().eq('contract_id', saved.id);
        const items = sovItems.map((item) => ({
          ...item,
          contract_id: saved.id,
          tenant_id,
        }));
        const { error: sovErr } = await supabase.from('contract_sov_items').insert(items);
        if (sovErr) throw sovErr;
      }

      return saved as ProjectContract;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project_contracts', projectId] }),
  });

  const remove = useMutation({
    mutationFn: async (contractId: string) => {
      const { error } = await supabase
        .from('project_contracts')
        .delete()
        .eq('id', contractId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project_contracts', projectId] }),
  });

  const updateSovProgress = useMutation({
    mutationFn: async ({
      itemId,
      completed_pct,
      billed_to_date,
    }: {
      itemId: string;
      completed_pct: number;
      billed_to_date: number;
    }) => {
      const { error } = await supabase
        .from('contract_sov_items')
        .update({ completed_pct, billed_to_date })
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project_contracts', projectId] }),
  });

  return { ...list, upsert, remove, updateSovProgress };
}

// Sewer Extension contract template — pre-fills the new-contract form
export const SEWER_EXTENSION_TEMPLATE: Omit<ContractUpsert, 'project_id'> = {
  contract_number: 'PC-01',
  contract_title: 'Glorieta Gardens – Sewer Infrastructure Extension',
  contract_type: 'subcontract',
  status: 'executed',
  docusign_envelope_id: 'C337B6BF-365F-4F47-A7A9-C06FE380A203',
  prime_contractor_name: 'APAS Consulting LLC',
  prime_contractor_address: '3256 NW 83 Way, Cooper City, FL 33024',
  prime_contractor_contact: 'Hardeep Anand',
  prime_contractor_email: 'hardeep@apas.ai',
  subcontractor_name: "D'SHIN Plumbing LLC",
  subcontractor_address: '1150 NW 111 ST, Miami, FL 33168',
  subcontractor_contact: 'Donnell Shinhoster',
  subcontractor_email: 'donnell@dshinplumbing.com',
  project_address: '13210 Alexandria Dr, Opa-locka, FL 33054',
  contract_date: '2025-06-26',
  start_date: '2025-07-01',
  substantial_completion_date: '2025-10-01',
  final_completion_date: '2025-11-01',
  actual_completion_date: null,
  signed_contract_received_date: '2025-07-11',
  base_contract_amount: 523061.0,
  retainage_percent: 5.0,
  mobilization_advance: 55000.0,
  liquidated_damages_per_day: 250.0,
  retainage_release_substantial: 2.5,
  retainage_release_final: 2.5,
  retainage_warranty_months: 12,
  payment_cycle_days: 15,
  payment_due_within_days: 3,
  scope_description:
    'Furnish all labor, materials, tools, equipment, supervision, and all related services required to complete the sewer infrastructure extension at Glorieta Gardens Apartments.',
  inclusions:
    'Sewer main extension and connections · Lateral installation · Manhole construction · Restoration (sidewalk, sod, paving) · Site-specific safety, MOT compliance, testing, conveyance, and project reporting',
  exclusions:
    'Work not explicitly listed in the Contract Documents shall not be considered part of the Scope of Work unless a formal written Change Order is issued.',
  special_conditions:
    'Pay-when-paid: payments contingent on receipt by APAS Consulting LLC from project Owner. Liquidated damages: $250.00/calendar day after punch list deadline. Retainage released in two phases: 2.5% at Substantial Completion, 2.5% after 12-month warranty inspection.',
  artifact_id: null,
  created_by: null,
};

export const SEWER_EXTENSION_SOV: SovItemUpsert[] = [
  { contract_id: '', item_number: 1,  budget_code: 'GC',   description: 'General Conditions – Providing general condition services for the contract', quantity: 1,    unit: 'ls', unit_cost: 33000,   subtotal: 33000,    completed_qty: 0, completed_pct: 0, billed_to_date: 0 },
  { contract_id: '', item_number: 2,  budget_code: 'BASE', description: '12" Limerock Base (LBR ≥ 100)',                                                  quantity: 1,    unit: 'ls', unit_cost: 15400,   subtotal: 15400,    completed_qty: 0, completed_pct: 0, billed_to_date: 0 },
  { contract_id: '', item_number: 3,  budget_code: 'MH',   description: '48" Diameter Sanitary Manhole – Construct 48" Diameter Standard (ASTM C478)',    quantity: 2,    unit: 'ea', unit_cost: 2750,    subtotal: 5500,     completed_qty: 0, completed_pct: 0, billed_to_date: 0 },
  { contract_id: '', item_number: 4,  budget_code: 'ASPH', description: 'Asphalt Sawcutting',                                                              quantity: 1,    unit: 'ls', unit_cost: 6050,    subtotal: 6050,     completed_qty: 0, completed_pct: 0, billed_to_date: 0 },
  { contract_id: '', item_number: 5,  budget_code: 'ASPH', description: 'Asphalt Surface Course – 1.5" SP-12.5',                                           quantity: 1,    unit: 'ls', unit_cost: 21450,   subtotal: 21450,    completed_qty: 0, completed_pct: 0, billed_to_date: 0 },
  { contract_id: '', item_number: 6,  budget_code: 'DEMO', description: 'Debris Removal & Haul-Off, Manifests Will Be Provided By Event',                  quantity: 30,   unit: 'ls', unit_cost: 550,     subtotal: 16500,    completed_qty: 0, completed_pct: 0, billed_to_date: 0 },
  { contract_id: '', item_number: 7,  budget_code: 'TEST', description: 'Density Testing – Includes 3.0 Hours Labor + Trip Fee',                           quantity: 15,   unit: 'ls', unit_cost: 715,     subtotal: 10725,    completed_qty: 0, completed_pct: 0, billed_to_date: 0 },
  { contract_id: '', item_number: 8,  budget_code: 'DEWT', description: 'Dewatering – Trench Dewatering Equipment (Pumping, Tanks, Filtered Discharge)',   quantity: 1,    unit: 'ls', unit_cost: 29040,   subtotal: 29040,    completed_qty: 0, completed_pct: 0, billed_to_date: 0 },
  { contract_id: '', item_number: 9,  budget_code: 'TEMP', description: 'Fencing – Temporary Chain-Link Fence (6\') W/Sandbags',                           quantity: 1,    unit: 'ls', unit_cost: 19800,   subtotal: 19800,    completed_qty: 0, completed_pct: 0, billed_to_date: 0 },
  { contract_id: '', item_number: 10, budget_code: 'SAF',  description: 'Health & Safety – Site Specific Health & Safety',                                  quantity: 1,    unit: 'ls', unit_cost: 26400,   subtotal: 26400,    completed_qty: 0, completed_pct: 0, billed_to_date: 0 },
  { contract_id: '', item_number: 11, budget_code: 'MH',   description: 'Install Manholes',                                                                 quantity: 10,   unit: 'ls', unit_cost: 6600,    subtotal: 66000,    completed_qty: 0, completed_pct: 0, billed_to_date: 0 },
  { contract_id: '', item_number: 12, budget_code: 'MOT',  description: 'MOT – Maintenance Of Traffic (MOT) Including Flagmen & Signage',                   quantity: 1,    unit: 'ls', unit_cost: 29700,   subtotal: 29700,    completed_qty: 0, completed_pct: 0, billed_to_date: 0 },
  { contract_id: '', item_number: 13, budget_code: 'REST', description: 'Sod & 5" Concrete Sidewalk Restoration',                                           quantity: 1,    unit: 'ls', unit_cost: 11000,   subtotal: 11000,    completed_qty: 0, completed_pct: 0, billed_to_date: 0 },
  { contract_id: '', item_number: 14, budget_code: 'SURV', description: 'Survey – Pre- And Post-Construction Survey (Topo + Layout)',                        quantity: 1,    unit: 'ls', unit_cost: 9350,    subtotal: 9350,     completed_qty: 0, completed_pct: 0, billed_to_date: 0 },
  { contract_id: '', item_number: 15, budget_code: 'SEW8', description: '8" SDR-26 PVC Sewer Main – Furnish & Install 8" SDR-26 PVC Sewer Main',            quantity: 1073, unit: 'lf', unit_cost: 132,     subtotal: 141636,   completed_qty: 0, completed_pct: 0, billed_to_date: 0 },
  { contract_id: '', item_number: 16, budget_code: 'SEW6', description: '6" SDR-26 PVC Sewer Laterals – Furnish & Install 6" SDR-26 PVC Sewer Laterals Including Cleanouts', quantity: 650, unit: 'ls', unit_cost: 125.40, subtotal: 81510, completed_qty: 0, completed_pct: 0, billed_to_date: 0 },
];
