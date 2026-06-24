/**
 * Which recorded payments are fully reconciled (split so their allocations equal
 * the payment amount). The financial ledger view doesn't expose the underlying
 * payment id, so we return a Set of composite keys (amount + date + reference) and
 * the Payments page matches its ledger rows against it. Covers both directions:
 * receivable (owner → us, prime_payment_allocations) and payable (us → subs,
 * commitment_payment_allocations).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const r2 = (n: number) => (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
const d10 = (d?: string | null) => (d ? String(d).slice(0, 10) : "");
const norm = (s?: string | null) => (s ?? "").trim();

export const recvKey = (amount: number, date?: string | null, reference?: string | null) =>
  `recv|${r2(amount)}|${d10(date)}|${norm(reference)}`;
export const paidKey = (amount: number, date?: string | null, reference?: string | null) =>
  `paid|${r2(amount)}|${d10(date)}|${norm(reference)}`;

async function reconciledSums(
  payTable: string,
  allocTable: string,
  filterCol: string,
  filterVal: string | string[],
): Promise<{ amount: number; date: string | null; reference: string | null }[]> {
  const dateCol = payTable === "prime_contract_payments" ? "received_date" : "paid_date";
  let q = supabase.from(payTable as any).select(`id, amount, ${dateCol}, reference`);
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
    .map((p) => ({ amount: Number(p.amount), date: p[dateCol] ?? null, reference: p.reference ?? null }));
}

export function useReconciledPaymentKeys(primeContractId: string | null, commitmentIds: string[]) {
  return useQuery<Set<string>>({
    queryKey: ["reconciled-payment-keys", primeContractId, [...commitmentIds].sort()],
    enabled: Boolean(primeContractId) || commitmentIds.length > 0,
    queryFn: async () => {
      const keys = new Set<string>();
      if (primeContractId) {
        const recv = await reconciledSums(
          "prime_contract_payments", "prime_payment_allocations", "prime_contract_id", primeContractId,
        );
        recv.forEach((p) => keys.add(recvKey(p.amount, p.date, p.reference)));
      }
      if (commitmentIds.length) {
        const paid = await reconciledSums(
          "commitment_payments", "commitment_payment_allocations", "commitment_id", commitmentIds,
        );
        paid.forEach((p) => keys.add(paidKey(p.amount, p.date, p.reference)));
      }
      return keys;
    },
  });
}
