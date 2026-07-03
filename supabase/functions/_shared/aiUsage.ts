// Shared AI usage + cost logger for edge functions.
//
// Every function that calls Claude should, right after it parses a successful
// response, call:
//
//   await logAiUsage({ req, skill: "meeting_agenda", model, anthropicJson: data, projectId });
//
// It derives tenant_id + user_id from the caller's JWT (no DB round-trip),
// computes cost from the model price table, and inserts one row into
// public.ai_usage_events using the service role. It NEVER throws — logging must
// never break the AI call.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// USD per 1,000,000 tokens. Keep in sync with src/lib/ai/pricing.ts (frontend
// reference table). Adjust here when Anthropic pricing changes.
export const MODEL_PRICING: Record<string, { in: number; out: number; cacheRead: number; cacheWrite: number }> = {
  "claude-opus-4-8":   { in: 15, out: 75, cacheRead: 1.5,  cacheWrite: 18.75 },
  "claude-opus-4-6":   { in: 15, out: 75, cacheRead: 1.5,  cacheWrite: 18.75 },
  "claude-sonnet-5":   { in: 3,  out: 15, cacheRead: 0.3,  cacheWrite: 3.75 },
  "claude-sonnet-4-6": { in: 3,  out: 15, cacheRead: 0.3,  cacheWrite: 3.75 },
  "claude-haiku-4-5":  { in: 1,  out: 5,  cacheRead: 0.1,  cacheWrite: 1.25 },
};

function priceFor(model: string) {
  if (MODEL_PRICING[model]) return MODEL_PRICING[model];
  const m = (model || "").toLowerCase();
  if (m.includes("opus"))  return { in: 15, out: 75, cacheRead: 1.5, cacheWrite: 18.75 };
  if (m.includes("haiku")) return { in: 1,  out: 5,  cacheRead: 0.1, cacheWrite: 1.25 };
  return { in: 3, out: 15, cacheRead: 0.3, cacheWrite: 3.75 }; // default to sonnet tier
}

export interface TokenUsage { input: number; output: number; cacheRead: number; cacheWrite: number }

export function usageFrom(anthropicJson: unknown): TokenUsage {
  const u = (anthropicJson as any)?.usage ?? {};
  return {
    input: Number(u.input_tokens ?? 0) || 0,
    output: Number(u.output_tokens ?? 0) || 0,
    cacheRead: Number(u.cache_read_input_tokens ?? 0) || 0,
    cacheWrite: Number(u.cache_creation_input_tokens ?? 0) || 0,
  };
}

export function computeCost(model: string, u: TokenUsage): number {
  const p = priceFor(model);
  const M = 1_000_000;
  return (u.input * p.in + u.output * p.out + u.cacheRead * p.cacheRead + u.cacheWrite * p.cacheWrite) / M;
}

function claimsFromJwt(req?: Request): { userId: string | null; tenantId: string | null } {
  try {
    const auth = req?.headers.get("Authorization") ?? "";
    const jwt = auth.replace(/^Bearer\s+/i, "");
    const seg = jwt.split(".")[1];
    if (!seg) return { userId: null, tenantId: null };
    const json = atob(seg.replace(/-/g, "+").replace(/_/g, "/"));
    const p = JSON.parse(json);
    return { userId: p.sub ?? null, tenantId: p.tenant_id ?? p.app_metadata?.tenant_id ?? null };
  } catch {
    return { userId: null, tenantId: null };
  }
}

export interface LogAiUsageOpts {
  skill: string;
  model: string;
  req?: Request;
  anthropicJson?: unknown;   // pass the parsed Claude response — usage is read from it
  usage?: TokenUsage;        // …or pass usage directly
  projectId?: string | null;
  tenantId?: string | null;  // override (else derived from JWT)
  userId?: string | null;
  ok?: boolean;
  latencyMs?: number | null;
}

export async function logAiUsage(opts: LogAiUsageOpts): Promise<void> {
  try {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!url || !key) return;
    const usage = opts.usage ?? usageFrom(opts.anthropicJson);
    // Skip empty no-op rows (e.g. an errored call with no tokens).
    if (!usage.input && !usage.output && !usage.cacheRead && !usage.cacheWrite) return;
    const claims = claimsFromJwt(opts.req);
    const admin = createClient(url, key);
    await admin.from("ai_usage_events").insert({
      skill: opts.skill,
      model: opts.model,
      input_tokens: usage.input,
      output_tokens: usage.output,
      cache_read_tokens: usage.cacheRead,
      cache_write_tokens: usage.cacheWrite,
      cost_usd: computeCost(opts.model, usage),
      project_id: opts.projectId ?? null,
      tenant_id: opts.tenantId ?? claims.tenantId,
      user_id: opts.userId ?? claims.userId,
      ok: opts.ok ?? true,
      latency_ms: opts.latencyMs ?? null,
    });
  } catch (_) {
    // never break the AI call because logging failed
  }
}
