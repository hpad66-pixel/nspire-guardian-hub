import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  compactSnapshot,
  computeEfficiencyAnalytics,
  computeKpis,
  deriveInsights,
  inferPeriodFromFilename,
  matchServiceAccount,
  parseMiamiDadeBillText,
  parseRecipients,
  rollupAccounts,
  type WaterBill,
  type WaterExecInstruction,
  type WaterExecNote,
  type WaterPropertyMeta,
  type WaterServiceAccount,
  type WaterUnitSummary,
} from '@/lib/water-intel';

export interface WaterIntelScope {
  propertyId?: string | null;
  token?: string | null;
}

function numBill(row: Record<string, unknown>): WaterBill {
  return {
    ...(row as unknown as WaterBill),
    previous_balance: Number(row.previous_balance ?? 0),
    current_charges: Number(row.current_charges ?? 0),
    amount_due: Number(row.amount_due ?? 0),
    amount_paid: Number(row.amount_paid ?? 0),
    water_charges: Number(row.water_charges ?? 0),
    sewer_charges: Number(row.sewer_charges ?? 0),
    other_fees: Number(row.other_fees ?? 0),
    consumption_gallons: Number(row.consumption_gallons ?? 0),
    prior_reading: row.prior_reading == null ? null : Number(row.prior_reading),
    current_reading: row.current_reading == null ? null : Number(row.current_reading),
    is_estimated: Boolean(row.is_estimated),
    is_duplicate: Boolean(row.is_duplicate),
    raw_extract: (row.raw_extract as Record<string, unknown>) ?? {},
  };
}

function optionalCount(value: unknown) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function numAccount(row: Record<string, unknown>): WaterServiceAccount {
  return {
    ...(row as unknown as WaterServiceAccount),
    connected_units: optionalCount(row.connected_units),
    occupied_units: optionalCount(row.occupied_units),
    resident_count: optionalCount(row.resident_count),
    occupancy_as_of: row.occupancy_as_of ? String(row.occupancy_as_of) : null,
    meter_scope: String(row.meter_scope || 'mixed'),
    allocation_source: String(row.allocation_source || 'unmapped'),
    allocation_notes: row.allocation_notes ? String(row.allocation_notes) : null,
  };
}

export function useWaterIntelligence(scope: WaterIntelScope) {
  const propertyId = scope.propertyId ?? null;
  const token = scope.token ?? null;
  const enabled = Boolean(propertyId || token);

  const query = useQuery({
    queryKey: ['water-intel', propertyId ?? 'token', token ?? 'auth'],
    enabled,
    queryFn: async () => {
      if (token) {
        const [meta, accounts, bills, notes, unitSummary] = await Promise.all([
          supabase.rpc('water_intel_resolve_token' as any, { p_token: token }),
          supabase.rpc('water_intel_public_accounts' as any, { p_token: token }),
          supabase.rpc('water_intel_public_bills' as any, { p_token: token }),
          supabase.rpc('water_intel_public_notes' as any, { p_token: token }),
          supabase.rpc('water_intel_public_unit_summary' as any, { p_token: token }),
        ]);
        if (meta.error) throw meta.error;
        const resolved = (Array.isArray(meta.data) ? meta.data[0] : meta.data) as WaterPropertyMeta | null;
        if (!resolved?.property_id) throw new Error('This Water Intelligence link is invalid or expired.');
        if (accounts.error) throw accounts.error;
        if (bills.error) throw bills.error;
        if (notes.error) throw notes.error;
        if (unitSummary.error) throw unitSummary.error;
        const units = (Array.isArray(unitSummary.data) ? unitSummary.data[0] : unitSummary.data) as {
          total_units?: number | string;
          occupied_units?: number | string;
        } | null;
        return {
          meta: { ...resolved, water_intel_enabled: true, water_intel_token: token },
          accounts: ((accounts.data ?? []) as unknown as Record<string, unknown>[]).map(numAccount),
          bills: ((bills.data ?? []) as unknown as Record<string, unknown>[]).map(numBill),
          notes: (notes.data ?? []) as unknown as WaterExecNote[],
          unitSummary: {
            totalUnits: Number(units?.total_units ?? 0),
            occupiedUnits: Number(units?.occupied_units ?? 0),
          } satisfies WaterUnitSummary,
        };
      }

      const [prop, accounts, bills, notes, units] = await Promise.all([
        supabase
          .from('properties')
          .select('id, name, workspace_id, total_units, water_intel_enabled, water_intel_token, water_intel_token_expires_at')
          .eq('id', propertyId!)
          .maybeSingle(),
        supabase
          .from('water_service_accounts' as any)
          .select('*')
          .eq('property_id', propertyId!)
          .order('sort_order'),
        supabase
          .from('water_bills' as any)
          .select('*')
          .eq('property_id', propertyId!)
          .order('bill_period_start', { ascending: false }),
        supabase
          .from('water_exec_notes' as any)
          .select('*')
          .eq('property_id', propertyId!)
          .order('created_at', { ascending: false }),
        (supabase
          .from('units') as any)
          .select('id, status, demo_seed')
          .eq('property_id', propertyId!)
          .eq('demo_seed', false),
      ]);
      if (prop.error) throw prop.error;
      if (!prop.data) throw new Error('Property not found');
      if (accounts.error) throw accounts.error;
      if (bills.error) throw bills.error;
      if (notes.error) throw notes.error;
      const unitRows = (units.data ?? []) as Array<{ status?: string | null }>;
      const totalUnits = unitRows.length || Number((prop.data as any).total_units ?? 0);
      return {
        meta: {
          property_id: (prop.data as any).id,
          property_name: (prop.data as any).name,
          workspace_id: (prop.data as any).workspace_id,
          water_intel_enabled: Boolean((prop.data as any).water_intel_enabled),
          water_intel_token: (prop.data as any).water_intel_token ?? null,
          token_expires_at: (prop.data as any).water_intel_token_expires_at ?? null,
        } satisfies WaterPropertyMeta,
        accounts: ((accounts.data ?? []) as unknown as Record<string, unknown>[]).map(numAccount),
        bills: ((bills.data ?? []) as unknown as Record<string, unknown>[]).map(numBill),
        notes: (notes.data ?? []) as unknown as WaterExecNote[],
        unitSummary: {
          totalUnits,
          occupiedUnits: unitRows.filter((unit) => String(unit.status || '').toLowerCase() === 'occupied').length,
        } satisfies WaterUnitSummary,
      };
    },
  });

  const accounts = query.data?.accounts ?? [];
  const bills = query.data?.bills ?? [];
  const unitSummary = query.data?.unitSummary ?? { totalUnits: 0, occupiedUnits: 0 };
  const asOf = new Date();
  const kpis = computeKpis(accounts, bills, asOf);
  const rollups = rollupAccounts(accounts, bills, asOf);
  const efficiency = computeEfficiencyAnalytics(accounts, bills, unitSummary);
  const insights = deriveInsights(accounts, bills, asOf, unitSummary);
  const snapshot = compactSnapshot(query.data?.meta.property_name ?? 'Property', accounts, bills, asOf, unitSummary);

  return {
    ...query,
    meta: query.data?.meta ?? null,
    accounts,
    bills,
    notes: query.data?.notes ?? [],
    unitSummary,
    kpis,
    rollups,
    efficiency,
    insights,
    snapshot,
  };
}

export interface UpdateWaterMeterProfileInput {
  accountId: string;
  connectedUnits: number | null;
  occupiedUnits: number | null;
  residentCount: number | null;
  occupancyAsOf: string | null;
  meterScope: 'indoor' | 'mixed' | 'outdoor' | 'common';
  allocationSource: 'verified' | 'unit_roster' | 'inferred' | 'unmapped';
  allocationNotes: string | null;
}

export function useUpdateWaterMeterProfile(propertyId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateWaterMeterProfileInput) => {
      if (!propertyId) throw new Error('Property is required');
      for (const [label, value] of [
        ['Connected units', input.connectedUnits],
        ['Occupied units', input.occupiedUnits],
        ['Residents', input.residentCount],
      ] as const) {
        if (value != null && (!Number.isFinite(value) || !Number.isInteger(value))) {
          throw new Error(`${label} must be a whole number.`);
        }
      }
      if (input.connectedUnits != null && input.connectedUnits < 0) throw new Error('Connected units cannot be negative.');
      if (input.occupiedUnits != null && input.occupiedUnits < 0) throw new Error('Occupied units cannot be negative.');
      if (input.residentCount != null && input.residentCount < 0) throw new Error('Residents cannot be negative.');
      if (
        input.connectedUnits != null
        && input.occupiedUnits != null
        && input.occupiedUnits > input.connectedUnits
      ) {
        throw new Error('Occupied units cannot exceed connected units.');
      }

      const { data, error } = await supabase
        .from('water_service_accounts' as any)
        .update({
          connected_units: input.connectedUnits,
          occupied_units: input.occupiedUnits,
          resident_count: input.residentCount,
          occupancy_as_of: input.occupancyAsOf,
          meter_scope: input.meterScope,
          allocation_source: input.allocationSource,
          allocation_notes: input.allocationNotes,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', input.accountId)
        .eq('property_id', propertyId)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as WaterServiceAccount;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['water-intel', propertyId] });
      toast.success('Meter population saved — analytics recalculated');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useWaterNotes(scope: WaterIntelScope) {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { body: string; accountId?: string | null; authorName?: string; authorEmail?: string }) => {
      const body = input.body.trim();
      if (body.length < 2) throw new Error('Write a short note first.');
      if (scope.token) {
        const { data, error } = await supabase.rpc('water_intel_public_add_note' as any, {
          p_token: scope.token,
          p_body: body,
          p_author_name: input.authorName ?? null,
          p_author_email: input.authorEmail ?? null,
          p_account_id: input.accountId ?? null,
        });
        if (error) throw error;
        return data as WaterExecNote;
      }
      if (!scope.propertyId) throw new Error('Property is required');
      const { data: prop, error: propErr } = await supabase
        .from('properties')
        .select('workspace_id')
        .eq('id', scope.propertyId)
        .single();
      if (propErr) throw propErr;
      const { data, error } = await supabase
        .from('water_exec_notes' as any)
        .insert({
          tenant_id: (prop as any).workspace_id,
          property_id: scope.propertyId,
          account_id: input.accountId ?? null,
          author_id: user?.id ?? null,
          author_name: input.authorName || user?.user_metadata?.full_name || user?.email || 'APAS',
          author_email: input.authorEmail || user?.email || null,
          body,
          is_shared: true,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as WaterExecNote;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['water-intel'] });
      toast.success('Note saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useWaterInstruction(scope: WaterIntelScope) {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      subject: string;
      body: string;
      recipients: string;
      accountId?: string | null;
      propertyName?: string;
    }) => {
      const recipients = parseRecipients(input.recipients);
      if (recipients.length === 0) throw new Error('Add at least one valid email address.');
      const subject = input.subject.trim() || 'Water Intelligence instruction';
      const body = input.body.trim();
      if (body.length < 2) throw new Error('Write the instruction first.');

      if (scope.token) {
        const { data, error } = await supabase.functions.invoke('water-intel-instruct', {
          body: {
            token: scope.token,
            subject,
            body,
            recipients,
            accountId: input.accountId ?? null,
            authorName: user?.user_metadata?.full_name || input.propertyName || 'Water Intelligence',
          },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        return data as { instruction: WaterExecInstruction };
      }

      if (!scope.propertyId) throw new Error('Property is required');
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Sign in to send instructions.');

      const { data: prop, error: propErr } = await supabase
        .from('properties')
        .select('workspace_id, name')
        .eq('id', scope.propertyId)
        .single();
      if (propErr) throw propErr;

      const html = `<p>${body.replace(/\n/g, '<br/>')}</p><p style="color:#878581;font-size:12px">Sent from Water Intelligence · ${prop.name}</p>`;
      const sent = await supabase.functions.invoke('send-email', {
        body: { recipients, subject, bodyHtml: html, bodyText: body },
      });
      const status = sent.error || sent.data?.success === false ? 'failed' : 'sent';

      const { data, error } = await supabase
        .from('water_exec_instructions' as any)
        .insert({
          tenant_id: (prop as any).workspace_id,
          property_id: scope.propertyId,
          account_id: input.accountId ?? null,
          created_by: user?.id ?? null,
          subject,
          body,
          recipients,
          status,
          sent_at: status === 'sent' ? new Date().toISOString() : null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      if (status === 'failed') throw new Error(sent.data?.error || sent.error?.message || 'Email failed');
      return { instruction: data as WaterExecInstruction };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['water-intel'] });
      toast.success('Instruction emailed');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useWaterChat(scope: WaterIntelScope) {
  return useMutation({
    mutationFn: async (input: { question: string; snapshot: Record<string, unknown>; history?: { role: string; content: string }[] }) => {
      const { data, error } = await supabase.functions.invoke('water-intel-chat', {
        body: {
          token: scope.token ?? null,
          propertyId: scope.propertyId ?? null,
          question: input.question,
          snapshot: input.snapshot,
          history: input.history ?? [],
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data as { answer: string; source: 'claude' | 'local' };
    },
  });
}

export function useIngestWaterBill(propertyId: string | null) {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { file: File; accountId?: string | null; extractedText?: string }) => {
      if (!propertyId) throw new Error('Property is required');
      const { data: prop, error: propErr } = await supabase
        .from('properties')
        .select('workspace_id')
        .eq('id', propertyId)
        .single();
      if (propErr) throw propErr;

      const parsed = parseMiamiDadeBillText(`${input.file.name}\n${input.extractedText || ''}`);
      const inferred = inferPeriodFromFilename(input.file.name);
      const path = `${propertyId}/${Date.now()}-${input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const up = await supabase.storage.from('water-bills').upload(path, input.file, {
        contentType: input.file.type || 'application/pdf',
        upsert: false,
      });
      if (up.error) throw up.error;

      const { data: roster, error: rosterErr } = await supabase
        .from('water_service_accounts' as any)
        .select('id, account_number, meter_number, service_address, building_label')
        .eq('property_id', propertyId)
        .order('sort_order');
      if (rosterErr) throw rosterErr;
      const accounts = (roster ?? []) as WaterServiceAccount[];

      let accountId = input.accountId ?? null;
      if (!accountId) {
        accountId = matchServiceAccount(accounts, {
          accountNumber: parsed.accountNumber,
          meterNumber: parsed.meterNumber,
          serviceAddress: parsed.serviceAddress,
          filename: input.file.name,
        })?.id ?? null;
      }
      if (!accountId) {
        throw new Error('Could not match this PDF to a service account. Pick one from the list and retry.');
      }

      const start = parsed.periodStart || inferred.start || new Date().toISOString().slice(0, 8) + '01';
      const end = parsed.periodEnd || inferred.end || start;
      const charges = parsed.currentCharges ?? parsed.amountDue ?? 0;

      const { data, error } = await supabase
        .from('water_bills' as any)
        .upsert(
          {
            tenant_id: (prop as any).workspace_id,
            property_id: propertyId,
            account_id: accountId,
            bill_period_start: start,
            bill_period_end: end,
            billing_date: parsed.billingDate ?? null,
            due_date: parsed.dueDate ?? null,
            previous_balance: parsed.previousBalance ?? 0,
            current_charges: charges,
            amount_due: parsed.amountDue ?? charges,
            water_charges: parsed.waterCharges ?? 0,
            sewer_charges: parsed.sewerCharges ?? 0,
            other_fees: parsed.otherFees ?? 0,
            consumption_gallons: parsed.consumptionGallons ?? 0,
            prior_reading: parsed.priorReading ?? null,
            current_reading: parsed.currentReading ?? null,
            days_of_service: parsed.daysOfService ?? null,
            is_estimated: Boolean(parsed.isEstimated),
            status: parsed.isEstimated || parsed.accountNumber === '2745714336' ? 'disputed' : 'open',
            document_url: path,
            document_name: input.file.name,
            source: parsed.confidence >= 0.4 ? 'ocr' : 'upload',
            raw_extract: parsed,
            created_by: user?.id ?? null,
          } as any,
          { onConflict: 'account_id,bill_period_start' },
        )
        .select()
        .single();
      if (error) throw error;
      return data as WaterBill;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['water-intel'] });
      toast.success('Bill ingested — dashboard updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useWaterIntelAdmin() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['water-intel-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name, city, state, is_managed_property, water_intel_enabled, water_intel_token, water_intel_token_expires_at')
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const setEnabled = useMutation({
    mutationFn: async (input: { propertyId: string; enabled: boolean }) => {
      const { data, error } = await supabase.rpc('water_intel_set_enabled' as any, {
        p_property_id: input.propertyId,
        p_enabled: input.enabled,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['water-intel-admin'] });
      toast.success(vars.enabled ? 'Water Intelligence enabled' : 'Water Intelligence turned off');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rotate = useMutation({
    mutationFn: async (propertyId: string) => {
      const { data, error } = await supabase.rpc('water_intel_rotate_token' as any, {
        p_property_id: propertyId,
      });
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['water-intel-admin'] });
      toast.success('New magic link issued — prior link is retired');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { ...list, setEnabled, rotate };
}
