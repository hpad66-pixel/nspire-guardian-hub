/**
 * A6 · create-checkout
 *
 * Creates a Stripe Checkout Session for the current authenticated tenant.
 * Body: { plan_code: 'starter' | 'pro' | 'enterprise' }
 * Returns: { url: 'https://checkout.stripe.com/...' }
 */
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APP_ORIGIN = Deno.env.get("APP_ORIGIN") ?? "http://localhost:5173";

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Missing Authorization" }, 401);

    // Resolve the caller with their JWT
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const planCode = (body?.plan_code ?? "").toString();
    if (!["starter", "pro", "enterprise"].includes(planCode)) {
      return json({ error: "Invalid plan_code" }, 400);
    }

    // Service-role admin for tenant + plan lookups
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const tenantId = (userData.user.user_metadata as any)?.tenant_id
      ?? (userData.user.app_metadata as any)?.tenant_id;
    if (!tenantId) return json({ error: "No tenant_id claim" }, 400);

    const { data: plan, error: planErr } = await admin
      .from("plans")
      .select("*")
      .eq("code", planCode)
      .single();
    if (planErr || !plan) return json({ error: "Plan not found" }, 404);
    if (!plan.stripe_price_id) {
      return json({ error: "Plan is not billable via Stripe yet" }, 400);
    }

    // Reuse customer if already linked
    let customerId: string | null = null;
    const { data: existingSub } = await admin
      .from("tenant_subscriptions")
      .select("stripe_customer_id")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    customerId = existingSub?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.user.email ?? undefined,
        metadata: { tenant_id: tenantId },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      success_url: `${APP_ORIGIN}/admin/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_ORIGIN}/admin/billing?status=canceled`,
      client_reference_id: tenantId,
      subscription_data: {
        metadata: { tenant_id: tenantId, plan_code: planCode },
      },
      allow_promotion_codes: true,
    });

    return json({ url: session.url });
  } catch (err) {
    console.error("[create-checkout]", (err as Error).message);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
