import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  CardPaymentEvent,
  CardPaymentRequest,
  TreasuryAccountKind,
  TreasuryPaymentAccount,
  TreasuryProviderConnection,
} from '@/lib/payments/cardPayoffs';

const numberOrNull = (value: unknown): number | null => {
  if (value == null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

function normalizeAccount(row: Record<string, unknown>): TreasuryPaymentAccount {
  return {
    ...row,
    reported_balance: numberOrNull(row.reported_balance),
  } as TreasuryPaymentAccount;
}

function normalizeRequest(row: Record<string, unknown>): CardPaymentRequest {
  return {
    ...row,
    amount: numberOrNull(row.amount) ?? 0,
    fee_amount: numberOrNull(row.fee_amount),
    total_amount: numberOrNull(row.total_amount) ?? numberOrNull(row.amount) ?? 0,
    balance_snapshot: numberOrNull(row.balance_snapshot),
  } as CardPaymentRequest;
}

export interface RegisterTreasuryAccountInput {
  accountKind: TreasuryAccountKind;
  displayName: string;
  last4: string;
  reportedBalance?: number | null;
  paymentDueDate?: string | null;
}

export interface PrepareCardPaymentInput {
  fundingAccountId: string;
  cardAccountId: string;
  amount: number;
  idempotencyKey: string;
  note?: string | null;
}

export function useCardPayoffs(enabled = true) {
  const queryClient = useQueryClient();

  const accounts = useQuery<TreasuryPaymentAccount[]>({
    queryKey: ['treasury-payment-accounts'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treasury_payment_accounts' as never)
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return ((data ?? []) as unknown as Record<string, unknown>[]).map(normalizeAccount);
    },
  });

  const connections = useQuery<TreasuryProviderConnection[]>({
    queryKey: ['treasury-provider-connections'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treasury_provider_connections' as never)
        .select('id, provider_name, connection_status, capabilities, last_health_checked_at, last_error_code');
      if (error) throw error;
      return (data ?? []) as unknown as TreasuryProviderConnection[];
    },
  });

  const requests = useQuery<CardPaymentRequest[]>({
    queryKey: ['card-payment-requests'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('card_payment_requests' as never)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as Record<string, unknown>[]).map(normalizeRequest);
    },
  });

  const events = useQuery<CardPaymentEvent[]>({
    queryKey: ['card-payment-events'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('card_payment_events' as never)
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(250);
      if (error) throw error;
      return (data ?? []) as unknown as CardPaymentEvent[];
    },
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['treasury-payment-accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['treasury-provider-connections'] }),
      queryClient.invalidateQueries({ queryKey: ['card-payment-requests'] }),
      queryClient.invalidateQueries({ queryKey: ['card-payment-events'] }),
    ]);
  };

  const registerAccount = useMutation({
    mutationFn: async (input: RegisterTreasuryAccountInput) => {
      const { data, error } = await supabase.rpc('register_treasury_payment_account' as never, {
        p_account_kind: input.accountKind,
        p_display_name: input.displayName,
        p_account_last4: input.last4,
        p_reported_balance: input.reportedBalance ?? null,
        p_payment_due_date: input.paymentDueDate ?? null,
      } as never);
      if (error) throw error;
      return normalizeAccount(data as unknown as Record<string, unknown>);
    },
    onSuccess: refresh,
  });

  const preparePayment = useMutation({
    mutationFn: async (input: PrepareCardPaymentInput) => {
      const { data, error } = await supabase.rpc('create_card_payment_request' as never, {
        p_funding_account_id: input.fundingAccountId,
        p_card_account_id: input.cardAccountId,
        p_amount: input.amount,
        p_idempotency_key: input.idempotencyKey,
        p_note: input.note ?? null,
      } as never);
      if (error) throw error;
      return normalizeRequest(data as unknown as Record<string, unknown>);
    },
    onSuccess: refresh,
  });

  const beginHandoff = useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase.rpc('begin_card_payment_handoff' as never, {
        p_request_id: requestId,
      } as never);
      if (error) throw error;
      return normalizeRequest(data as unknown as Record<string, unknown>);
    },
    onSuccess: refresh,
  });

  const recordConfirmation = useMutation({
    mutationFn: async ({ requestId, confirmation }: { requestId: string; confirmation: string }) => {
      const { data, error } = await supabase.rpc('record_card_payment_confirmation' as never, {
        p_request_id: requestId,
        p_external_confirmation: confirmation,
      } as never);
      if (error) throw error;
      return normalizeRequest(data as unknown as Record<string, unknown>);
    },
    onSuccess: refresh,
  });

  const reconcile = useMutation({
    mutationFn: async ({ requestId, status, note }: {
      requestId: string;
      status: 'settled' | 'failed' | 'returned';
      note: string;
    }) => {
      const { data, error } = await supabase.rpc('reconcile_card_payment_request' as never, {
        p_request_id: requestId,
        p_status: status,
        p_note: note,
      } as never);
      if (error) throw error;
      return normalizeRequest(data as unknown as Record<string, unknown>);
    },
    onSuccess: refresh,
  });

  const cancelPayment = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason?: string }) => {
      const { data, error } = await supabase.rpc('cancel_card_payment_request' as never, {
        p_request_id: requestId,
        p_reason: reason ?? 'Cancelled by administrator',
      } as never);
      if (error) throw error;
      return normalizeRequest(data as unknown as Record<string, unknown>);
    },
    onSuccess: refresh,
  });

  return {
    accounts,
    connections,
    requests,
    events,
    registerAccount,
    preparePayment,
    beginHandoff,
    recordConfirmation,
    reconcile,
    cancelPayment,
  };
}
