/**
 * Which recorded payments are fully reconciled — their allocations sum to the
 * payment amount. The financial ledger view embeds the source payment id in
 * ledger_id ("prime_payment:<uuid>" / "commitment_payment:<uuid>"), so callers
 * extract it with ledgerPaymentId() and test membership in this Set. Exact match,
 * both directions: receivable (prime_payment_allocations) and payable
 * (commitment_payment_allocations).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** "commitment_payment:abc-123" → "abc-123". */
export const ledgerPaymentId = (ledgerId?: string | null) =>
  String(ledgerId ?? "").split(":")[1] ?? "";

async function reconciledIdsFor(
  payTable: string,
  allocTable: string,
  filterCol: string,
  filterVal: string | string[],
): Promise<string[]> {
  let q = supabase.from(payTable as any).select("id, amount");
  q = Array.isArray(filterVal) ? q.in(filterCol, filterVal) : q.eq(filterCol, filterVal);
  const { data: pays } = await q;
  const payList = (pays ?? []) as any[];
  if (!payList.length) return [];

  const { data: allocs } = await supabase
    .from(allocTable as any)
    .select("payment_id, amount")
    .in("payment_id", payList.map((p) => p.id));
  const byPayment = new Map<string, number>();
  for (const a of (allocs ?? []) as any[]) {
    byPayment.set(a.payment_id, (byPayment.get(a.payment_id) ?? 0) + Number(a.amount));
  }

  return payList
    .filter((p) => {
      const sum = byPayment.get(p.id);
      return sum != null && Math.abs(sum - Number(p.amount)) < 0.01;
    })
    .map((p) => p.id as string);
}

export function useReconciledPaymentIds(primeContractId: string | null, commitmentIds: string[]) {
  return useQuery<Set<string>>({
    queryKey: ["reconciled-payment-ids", primeContractId, [...commitmentIds].sort()],
    enabled: Boolean(primeContractId) || commitmentIds.length > 0,
    queryFn: async () => {
      const ids = new Set<string>();
      if (primeContractId) {
        (await reconciledIdsFor(
          "prime_contract_payments", "prime_payment_allocations", "prime_contract_id", primeContractId,
        )).forEach((i) => ids.add(i));
      }
      if (commitmentIds.length) {
        (await reconciledIdsFor(
          "commitment_payments", "commitment_payment_allocations", "commitment_id", commitmentIds,
        )).forEach((i) => ids.add(i));
      }
      return ids;
    },
  });
}
