/**
 * A6 · Stripe webhook handler (idempotent).
 *
 * Events handled:
 *  - customer.subscription.created / updated / deleted
 *  - invoice.paid / invoice.payment_failed
 *
 * Idempotency: Every event is dedup'd via public.stripe_webhook_events (PK = event id).
 * Signature verification: uses STRIPE_WEBHOOK_SECRET.
 */
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", (err as Error).message);
    return new Response("Invalid signature", { status: 400 });
  }

  // Idempotency: if we've seen this event id, ACK and skip
  const { data: existing } = await admin
    .from("stripe_webhook_events")
    .select("id")
    .eq("id", event.id)
    .maybeSingle();
  if (existing) {
    return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
  }

  await admin.from("stripe_webhook_events").insert({
    id: event.id,
    event_type: event.type,
    payload: event as any,
  });

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await handleSubscriptionUpsert(event.data.object as Stripe.Subscription);
        break;
      }
      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed":
      case "invoice.finalized": {
        await handleInvoice(event.data.object as Stripe.Invoice);
        break;
      }
      default: {
        console.log("[stripe-webhook] Ignoring event type:", event.type);
      }
    }
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    console.error("[stripe-webhook] Handler error:", (err as Error).message);
    // Return 500 so Stripe retries; idempotency check above prevents double-apply
    return new Response("Handler error", { status: 500 });
  }
});

async function handleSubscriptionUpsert(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  // Find the tenant via stripe_customer_id on tenant_subscriptions or workspaces.
  const tenantId = await resolveTenantByCustomerId(customerId);
  if (!tenantId) {
    console.warn("[stripe-webhook] Could not resolve tenant for customer", customerId);
    return;
  }

  const priceId = sub.items.data[0]?.price.id ?? null;
  const planId = await resolvePlanIdByPrice(priceId);
  if (!planId) {
    console.warn("[stripe-webhook] No matching plan for price", priceId);
    return;
  }

  const payload: Record<string, unknown> = {
    tenant_id: tenantId,
    plan_id: planId,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    status: sub.status,
    current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    cancel_at_period_end: sub.cancel_at_period_end,
    seats: sub.items.data[0]?.quantity ?? 1,
    trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
  };

  await admin.from("tenant_subscriptions").upsert(payload as any, { onConflict: "tenant_id" });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  await admin
    .from("tenant_subscriptions")
    .update({ status: "canceled" })
    .eq("stripe_subscription_id", sub.id);
}

async function handleInvoice(inv: Stripe.Invoice) {
  const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
  if (!customerId) return;
  const tenantId = await resolveTenantByCustomerId(customerId);
  if (!tenantId) return;

  await admin.from("billing_invoices").upsert(
    {
      tenant_id: tenantId,
      stripe_invoice_id: inv.id,
      stripe_customer_id: customerId,
      amount_due_cents: inv.amount_due ?? 0,
      amount_paid_cents: inv.amount_paid ?? 0,
      currency: inv.currency ?? "usd",
      status: inv.status ?? "open",
      period_start: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
      period_end: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
      hosted_invoice_url: inv.hosted_invoice_url,
      pdf_url: inv.invoice_pdf,
    } as any,
    { onConflict: "stripe_invoice_id" },
  );
}

async function resolveTenantByCustomerId(customerId: string): Promise<string | null> {
  const { data } = await admin
    .from("tenant_subscriptions")
    .select("tenant_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (data?.tenant_id) return data.tenant_id;

  // Fallback: workspaces.stripe_customer_id (existing column)
  const { data: ws } = await admin
    .from("workspaces")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return ws?.id ?? null;
}

async function resolvePlanIdByPrice(priceId: string | null): Promise<string | null> {
  if (!priceId) return null;
  const { data } = await admin
    .from("plans")
    .select("id")
    .eq("stripe_price_id", priceId)
    .maybeSingle();
  return data?.id ?? null;
}
