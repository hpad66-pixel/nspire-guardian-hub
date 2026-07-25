// Gmail connection control (authenticated). Actions:
//   start      → returns a Google authorize URL (with a signed state) to redirect to
//   status     → { connected, email, last_synced_at, status } (never the token)
//   disconnect → revoke at Google + delete the row
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { signState, authorizeUrl, safeReturnPath } from "../_shared/gmailOAuth.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await userClient.auth.getUser();
    const user = u?.user;
    if (!user) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(url, serviceKey);
    const { data: prof } = await admin.from("profiles").select("workspace_id").eq("user_id", user.id).maybeSingle();
    const tenantId = prof?.workspace_id as string | undefined;
    if (!tenantId) return json({ error: "No workspace for user" }, 400);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    const loadConn = async () =>
      (await admin.from("gmail_connections").select("email,last_synced_at,status").eq("tenant_id", tenantId).eq("user_id", user.id).maybeSingle()).data;

    if (action === "status") {
      const conn = await loadConn();
      return json({ connected: !!conn && conn.status === "active", email: conn?.email ?? null, last_synced_at: conn?.last_synced_at ?? null, status: conn?.status ?? null });
    }

    if (action === "start") {
      if (!Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")) return json({ error: "Gmail is not configured (missing GOOGLE_OAUTH_CLIENT_ID)." }, 500);
      const state = await signState(serviceKey, { t: tenantId, u: user.id, r: safeReturnPath(body.returnTo), o: typeof body.origin === "string" ? body.origin : undefined });
      return json({ url: authorizeUrl(state, user.email ?? undefined) });
    }

    if (action === "disconnect") {
      // best-effort revoke at Google, then delete the row
      const { data: full } = await admin.from("gmail_connections").select("refresh_token").eq("tenant_id", tenantId).eq("user_id", user.id).maybeSingle();
      const token = (full as any)?.refresh_token;
      if (token) {
        try { await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST" }); } catch { /* best effort */ }
      }
      await admin.from("gmail_connections").delete().eq("tenant_id", tenantId).eq("user_id", user.id);
      return json({ connected: false });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("gmail error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
