import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  canUseFeature,
  getMySubscription,
  listPublicPlans,
  type FeatureKey,
  type MySubscription,
  type Plan,
} from "@/lib/billing";

export function useSubscription() {
  return useQuery<MySubscription | null>({
    queryKey: ["my-subscription"],
    queryFn: getMySubscription,
    staleTime: 60_000,
  });
}

export function usePublicPlans() {
  return useQuery<Plan[]>({
    queryKey: ["plans", "public"],
    queryFn: listPublicPlans,
    staleTime: 5 * 60_000,
  });
}

export function useFeature(feature: FeatureKey | string) {
  return useQuery<boolean>({
    queryKey: ["feature", feature],
    queryFn: () => canUseFeature(feature),
    staleTime: 60_000,
  });
}

export function useTenantInvoices() {
  return useQuery({
    queryKey: ["billing-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_invoices" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(24);
      if (error) throw error;
      return data ?? [];
    },
  });
}
