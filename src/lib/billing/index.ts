/**
 * A6 · Billing + Feature Gating (client side).
 *
 * Canonical API for plan lookups and feature gating.
 * Every plan-gated module MUST go through canUseFeature() — do not branch
 * on plan_code directly.
 */
import { supabase } from "@/integrations/supabase/client";

export type FeatureKey =
  | "sso"
  | "scim"
  | "api"
  | "webhooks"
  | "subcontractor_portal"
  | "owner_portal"
  | "reporting_advanced"
  | "custom_workflows";

export interface Plan {
  id: string;
  code: "starter" | "pro" | "enterprise";
  name: string;
  stripe_price_id: string | null;
  seat_limit: number | null;
  features: Record<string, unknown>;
  price_cents: number;
  currency: string;
  billing_interval: "month" | "year";
  is_public: boolean;
  sort_order: number;
}

export interface MySubscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status:
    | "trialing" | "active" | "past_due" | "canceled"
    | "incomplete" | "incomplete_expired" | "unpaid";
  seats: number;
  trial_end: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  plan_code: Plan["code"];
  plan_name: string;
  seat_limit: number | null;
  features: Record<string, unknown>;
  price_cents: number;
}

/** Fetch the current tenant's subscription (joined with plan). Null if never subscribed. */
export async function getMySubscription(): Promise<MySubscription | null> {
  const { data, error } = await supabase
    .from("my_subscription" as any)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as MySubscription | null;
}

/** Server-evaluated feature check. Honors super_admin bypass. */
export async function canUseFeature(feature: FeatureKey | string): Promise<boolean> {
  const { data, error } = await supabase.rpc("can_use_feature" as any, {
    p_feature: feature,
  } as any);
  if (error) return false;
  return Boolean(data);
}

export class PlanLimitError extends Error {
  constructor(feature: string) {
    super(`Plan does not include feature: ${feature}`);
    this.name = "PlanLimitError";
  }
}

export async function requireFeature(feature: FeatureKey | string): Promise<void> {
  const ok = await canUseFeature(feature);
  if (!ok) throw new PlanLimitError(feature);
}

/** Returns true if the tenant can add another seat (null seat_limit = unlimited). */
export async function canAddSeat(currentSeats?: number): Promise<boolean> {
  const { data, error } = await supabase.rpc("can_add_seat" as any, {
    p_current_seats: currentSeats ?? null,
  } as any);
  if (error) return false;
  return Boolean(data);
}

/** List public plans for the marketing /pricing page. */
export async function listPublicPlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from("plans" as any)
    .select("*")
    .eq("is_public", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as Plan[];
}

/** Start a Stripe Checkout session for the given plan. Returns the URL to redirect to. */
export async function startCheckout(planCode: Plan["code"]): Promise<string> {
  const { data, error } = await supabase.functions.invoke("create-checkout", {
    body: { plan_code: planCode },
  });
  if (error) throw error;
  const url = (data as any)?.url as string | undefined;
  if (!url) throw new Error("No checkout URL returned from create-checkout");
  return url;
}

/** Redirect to the Stripe Customer Portal for the current tenant. */
export async function openBillingPortal(): Promise<string> {
  const { data, error } = await supabase.functions.invoke("stripe-billing-portal", {
    body: {},
  });
  if (error) throw error;
  const url = (data as any)?.url as string | undefined;
  if (!url) throw new Error("No portal URL returned");
  return url;
}
