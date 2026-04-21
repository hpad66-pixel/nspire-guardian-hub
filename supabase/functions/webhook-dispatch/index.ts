/**
 * F3 · Webhook dispatcher — drains pending deliveries with HMAC signing + retry backoff.
 * Invoke via Supabase cron every minute.
 */
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const MAX_ATTEMPTS = 6;
const BACKOFF_MINUTES = [1, 5, 30, 120, 720, 1440]; // 1m, 5m, 30m, 2h, 12h, 24h

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

serve(async () => {
  const now = new Date();

  const { data: pending } = await admin
    .from("webhook_deliveries")
    .select("*, webhook_subscriptions(url, secret, is_active)")
    .is("delivered_at", null)
    .lte("next_retry_at", now.toISOString())
    .lt("attempt_no", MAX_ATTEMPTS)
    .limit(100);

  let delivered = 0;
  let failed = 0;

  for (const d of (pending ?? []) as any[]) {
    const sub = d.webhook_subscriptions;
    if (!sub?.is_active) continue;
    const result = await deliverOne(d, sub);
    if (result.ok) delivered += 1;
    else failed += 1;
  }

  return new Response(
    JSON.stringify({ delivered, failed, pending_remaining: (pending?.length ?? 0) - delivered - failed }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});

async function deliverOne(d: any, sub: { url: string; secret: string }): Promise<{ ok: boolean }> {
  const bodyStr = JSON.stringify({
    id: d.id,
    event_type: d.event_type,
    payload: d.payload,
    delivered_at: new Date().toISOString(),
    attempt: d.attempt_no,
  });

  const sigHex = await hmacSha256Hex(sub.secret, bodyStr);

  try {
    const res = await fetch(sub.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Event-Type": d.event_type,
        "X-Delivery-Id": d.id,
        "X-Signature": `sha256=${sigHex}`,
      },
      body: bodyStr,
    });
    const text = await res.text().catch(() => "");

    if (res.status >= 200 && res.status < 300) {
      await admin.from("webhook_deliveries").update({
        response_status: res.status,
        response_body: text.slice(0, 4000),
        delivered_at: new Date().toISOString(),
      }).eq("id", d.id);
      return { ok: true };
    }

    // 4xx = permanent failure; don't retry
    if (res.status >= 400 && res.status < 500) {
      await admin.from("webhook_deliveries").update({
        response_status: res.status,
        response_body: text.slice(0, 4000),
        attempt_no: MAX_ATTEMPTS,
        next_retry_at: null,
      }).eq("id", d.id);
      return { ok: false };
    }

    return scheduleRetry(d, res.status, text);
  } catch (err) {
    return scheduleRetry(d, 0, (err as Error).message);
  }
}

async function scheduleRetry(d: any, status: number, body: string) {
  const nextAttempt = d.attempt_no + 1;
  if (nextAttempt > MAX_ATTEMPTS) {
    await admin.from("webhook_deliveries").update({
      response_status: status,
      response_body: body.slice(0, 4000),
      attempt_no: nextAttempt,
      next_retry_at: null,
    }).eq("id", d.id);
    return { ok: false };
  }
  const minutes = BACKOFF_MINUTES[nextAttempt - 1] ?? 60;
  const jitter = Math.floor(Math.random() * 30); // 0-30s jitter
  const next = new Date(Date.now() + minutes * 60_000 + jitter * 1000).toISOString();
  await admin.from("webhook_deliveries").update({
    response_status: status,
    response_body: body.slice(0, 4000),
    attempt_no: nextAttempt,
    next_retry_at: next,
  }).eq("id", d.id);
  return { ok: false };
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
