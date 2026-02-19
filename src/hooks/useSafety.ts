import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type IncidentStatus = 'pending_review' | 'under_review' | 'classified' | 'closed';
export type IncidentClassification = 'injury' | 'illness' | 'near_miss' | 'first_aid_only' | 'property_damage';
export type InjuryType = 'injury' | 'skin_disorder' | 'respiratory' | 'poisoning' | 'hearing_loss' | 'other_illness';
export type BodyPart = 'head' | 'neck' | 'back' | 'arm' | 'hand' | 'leg' | 'foot' | 'eye' | 'multiple' | 'other';
export type MedicalTreatment = 'none' | 'first_aid' | 'physician' | 'emergency_room' | 'hospitalized';
export type SourceType = 'project' | 'grounds_inspection' | 'work_order' | 'standalone';

export interface SafetyIncident {
  id: string;
  workspace_id: string;
  source_type: SourceType | null;
  source_id: string | null;
  incident_date: string;
  incident_time: string | null;
  location_description: string;
  what_happened: string;
  injured_employee_id: string | null;
  injured_employee_name: string;
  injured_employee_job_title: string | null;
  injured_employee_department: string | null;
  days_employed: number | null;
  injury_involved: boolean;
  injury_icon: string | null;
  body_part_affected: string | null;
  witness_name: string | null;
  witness_contact: string | null;
  reported_by: string;
  reported_at: string;
  photo_urls: string[] | null;
  is_osha_recordable: boolean | null;
  incident_classification: string | null;
  injury_type: string | null;
  days_away_from_work: number;
  days_on_job_transfer: number;
  days_on_restriction: number;
  resulted_in_death: boolean;
  resulted_in_days_away: boolean;
  resulted_in_transfer: boolean;
  resulted_in_other_recordable: boolean;
  medical_treatment: string | null;
  physician_name: string | null;
  facility_name: string | null;
  is_privacy_case: boolean;
  case_number: string | null;
  status: IncidentStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  corrective_actions: string | null;
  corrective_actions_due: string | null;
  corrective_actions_completed: boolean;
  created_at: string;
  updated_at: string;
  // joined
  reporter?: { full_name: string | null; email: string | null } | null;
  employee?: { full_name: string | null; email: string | null } | null;
}

export interface LogIncidentPayload {
  source_type: SourceType;
  source_id?: string;
  incident_date: string;
  incident_time?: string;
  location_description: string;
  what_happened: string;
  injured_employee_name: string;
  injured_employee_id?: string;
  injured_employee_job_title?: string;
  injury_involved: boolean;
  injury_icon?: string;
  body_part_affected?: string;
  witness_name?: string;
  witness_contact?: string;
  medical_treatment?: string;
  physician_name?: string;
  facility_name?: string;
  resulted_in_days_away?: boolean;
  resulted_in_transfer?: boolean;
  photo_urls?: string[];
}

export interface ClassifyIncidentPayload {
  id: string;
  is_osha_recordable: boolean | null;
  incident_classification?: string;
  injury_type?: string;
  body_part_affected?: string;
  days_away_from_work?: number;
  days_on_job_transfer?: number;
  days_on_restriction?: number;
  resulted_in_death?: boolean;
  resulted_in_days_away?: boolean;
  resulted_in_transfer?: boolean;
  resulted_in_other_recordable?: boolean;
  medical_treatment?: string;
  physician_name?: string;
  facility_name?: string;
  is_privacy_case?: boolean;
  case_number?: string;
  corrective_actions?: string;
  corrective_actions_due?: string;
  review_notes?: string;
  status?: IncidentStatus;
}

export interface IncidentFilters {
  year?: number;
  status?: string;
  classification?: string;
  source_type?: string;
  search?: string;
}

export interface OSHA300ATotals {
  totalDeaths: number;
  totalDaysAway: number;
  totalTransfer: number;
  totalOtherRecordable: number;
  totalCases: number;
  totalDaysAwayCount: number;
  totalTransferDays: number;
  byType: {
    injuries: number;
    skinDisorder: number;
    respiratory: number;
    poisoning: number;
    hearingLoss: number;
    otherIllness: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getIncidentStatusColor(
  status: IncidentStatus,
  isOshaRecordable?: boolean | null
): string {
  if (status === 'closed') return 'text-green-600 bg-green-50 border-green-200';
  if (isOshaRecordable === true) return 'text-red-600 bg-red-50 border-red-200';
  if (status === 'pending_review' || status === 'under_review') return 'text-amber-600 bg-amber-50 border-amber-200';
  if (status === 'classified') return 'text-blue-600 bg-blue-50 border-blue-200';
  return 'text-gray-600 bg-gray-50 border-gray-200';
}

export function getIncidentStatusLabel(status: IncidentStatus, isOshaRecordable?: boolean | null): string {
  if (status === 'closed') return 'Closed';
  if (isOshaRecordable === true) return 'OSHA Recordable';
  if (isOshaRecordable === false) return 'First Aid Only';
  if (status === 'pending_review') return 'Pending Review';
  if (status === 'under_review') return 'Under Review';
  if (status === 'classified') return 'Classified';
  return status;
}

export function formatCaseNumber(year: number, sequence: number): string {
  return `${year}-${String(sequence).padStart(3, '0')}`;
}

export function isOSHARecordable(incident: SafetyIncident): boolean {
  return (
    incident.resulted_in_death ||
    incident.resulted_in_days_away ||
    incident.resulted_in_transfer ||
    incident.resulted_in_other_recordable ||
    (incident.medical_treatment !== undefined &&
      incident.medical_treatment !== null &&
      incident.medical_treatment !== 'none' &&
      incident.medical_treatment !== 'first_aid')
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────────────────

const KEYS = {
  all: ['safety_incidents'] as const,
  mine: () => [...KEYS.all, 'mine'] as const,
  list: (filters?: IncidentFilters) => [...KEYS.all, 'list', filters] as const,
  pending: () => [...KEYS.all, 'pending'] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
  osha300: (year: number) => [...KEYS.all, 'osha300', year] as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useMyIncidents() {
  const { user } = useAuth();

  return useQuery({
    queryKey: KEYS.mine(),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('safety_incidents')
        .select('*, reporter:profiles!reported_by(full_name, email)')
        .eq('reported_by', user!.id)
        .order('reported_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as SafetyIncident[];
    },
  });
}

export function useAllIncidents(filters?: IncidentFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: KEYS.list(filters),
    enabled: !!user,
    queryFn: async () => {
      let query = supabase
        .from('safety_incidents')
        .select(`
          *,
          reporter:profiles!reported_by(full_name, email),
          employee:profiles!injured_employee_id(full_name, email)
        `)
        .order('incident_date', { ascending: false });

      if (filters?.year) {
        const start = `${filters.year}-01-01`;
        const end = `${filters.year}-12-31`;
        query = query.gte('incident_date', start).lte('incident_date', end);
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.source_type && filters.source_type !== 'all') {
        query = query.eq('source_type', filters.source_type);
      }

      const { data, error } = await query;
      if (error) throw error;

      let result = (data ?? []) as SafetyIncident[];

      if (filters?.search) {
        const s = filters.search.toLowerCase();
        result = result.filter(
          i =>
            i.injured_employee_name.toLowerCase().includes(s) ||
            i.what_happened.toLowerCase().includes(s) ||
            i.location_description.toLowerCase().includes(s) ||
            (i.case_number ?? '').toLowerCase().includes(s)
        );
      }
      if (filters?.classification && filters.classification !== 'all') {
        if (filters.classification === 'recordable') {
          result = result.filter(i => i.is_osha_recordable === true);
        } else if (filters.classification === 'first_aid') {
          result = result.filter(i => i.is_osha_recordable === false);
        } else if (filters.classification === 'near_miss') {
          result = result.filter(i => i.incident_classification === 'near_miss');
        }
      }

      return result;
    },
  });
}

export function usePendingIncidents() {
  const { user } = useAuth();

  return useQuery({
    queryKey: KEYS.pending(),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('safety_incidents')
        .select('*, reporter:profiles!reported_by(full_name, email)')
        .in('status', ['pending_review', 'under_review'])
        .order('incident_date', { ascending: true });

      if (error) throw error;
      return (data ?? []) as SafetyIncident[];
    },
  });
}

export function useIncident(id: string | null) {
  return useQuery({
    queryKey: KEYS.detail(id ?? ''),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('safety_incidents')
        .select(`
          *,
          reporter:profiles!reported_by(full_name, email),
          employee:profiles!injured_employee_id(full_name, email)
        `)
        .eq('id', id!)
        .single();

      if (error) throw error;
      return data as SafetyIncident;
    },
  });
}

export function useLogIncident() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { workspaceId } = useWorkspaceContext();

  return useMutation({
    mutationFn: async (payload: LogIncidentPayload) => {
      if (!user) throw new Error('Not authenticated');

      // Generate case number: count incidents this year + 1
      const year = new Date(payload.incident_date).getFullYear();
      const { count } = await supabase
        .from('safety_incidents')
        .select('id', { count: 'exact', head: true })
        .gte('incident_date', `${year}-01-01`)
        .lte('incident_date', `${year}-12-31`);

      const sequence = (count ?? 0) + 1;
      const caseNumber = formatCaseNumber(year, sequence);

      const { data, error } = await supabase
        .from('safety_incidents')
        .insert({
          workspace_id: workspaceId ?? '00000000-0000-0000-0000-000000000001',
          reported_by: user.id,
          case_number: caseNumber,
          status: 'pending_review',
          ...payload,
        })
        .select()
        .single();

      if (error) throw error;
      return data as SafetyIncident;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
      toast.success(`Incident reported · Case #${data.case_number}`);
    },
    onError: (error) => {
      console.error('Failed to log incident:', error);
      toast.error('Failed to log incident. Please try again.');
    },
  });
}

export function useClassifyIncident() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: ClassifyIncidentPayload) => {
      const { id, ...rest } = payload;

      const { data, error } = await supabase
        .from('safety_incidents')
        .update({
          ...rest,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SafetyIncident;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Incident classified ✓');
    },
    onError: () => {
      toast.error('Failed to save classification. Please try again.');
    },
  });
}

export function useUploadIncidentPhoto(incidentId: string) {
  const { workspaceId } = useWorkspaceContext();

  return useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split('.').pop();
      const path = `${workspaceId ?? 'default'}/${incidentId}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from('safety-incident-photos')
        .upload(path, file, { upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('safety-incident-photos')
        .getPublicUrl(path);

      return urlData.publicUrl;
    },
  });
}

export function useOSHA300Data(year: number) {
  return useQuery({
    queryKey: KEYS.osha300(year),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('safety_incidents')
        .select('*')
        .eq('is_osha_recordable', true)
        .gte('incident_date', `${year}-01-01`)
        .lte('incident_date', `${year}-12-31`)
        .order('case_number', { ascending: true });

      if (error) throw error;
      return (data ?? []) as SafetyIncident[];
    },
  });
}

export function useOSHA300ATotals(year: number) {
  const { data: incidents = [] } = useOSHA300Data(year);

  const totals: OSHA300ATotals = {
    totalDeaths: incidents.filter(i => i.resulted_in_death).length,
    totalDaysAway: incidents.filter(i => i.resulted_in_days_away).length,
    totalTransfer: incidents.filter(i => i.resulted_in_transfer).length,
    totalOtherRecordable: incidents.filter(i => i.resulted_in_other_recordable).length,
    totalCases: incidents.length,
    totalDaysAwayCount: incidents.reduce((sum, i) => sum + (i.days_away_from_work ?? 0), 0),
    totalTransferDays: incidents.reduce((sum, i) => sum + (i.days_on_job_transfer ?? 0) + (i.days_on_restriction ?? 0), 0),
    byType: {
      injuries: incidents.filter(i => i.injury_type === 'injury').length,
      skinDisorder: incidents.filter(i => i.injury_type === 'skin_disorder').length,
      respiratory: incidents.filter(i => i.injury_type === 'respiratory').length,
      poisoning: incidents.filter(i => i.injury_type === 'poisoning').length,
      hearingLoss: incidents.filter(i => i.injury_type === 'hearing_loss').length,
      otherIllness: incidents.filter(i => i.injury_type === 'other_illness').length,
    },
  };

  return totals;
}
