// Gmail connection control (authenticated). Actions:
//   start      → returns a Google authorize URL (with a signed state) to redirect to
//   status     → { connected, email, last_synced_at, status } (never the token)
//   disconnect → revoke at Google + delete the row
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { signState, authorizeUrl, safeReturnPath, refreshAccessToken } from "../_shared/gmailOAuth.ts";
import { sendMessage, type GmailSendAttachment } from "../_shared/gmailApi.ts";

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

    const loadFullConn = async () =>
      (await admin.from("gmail_connections").select("*").eq("tenant_id", tenantId).eq("user_id", user.id).maybeSingle()).data;

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

    if (action === "send") {
      const projectId = String(body.projectId ?? "");
      if (!projectId) return json({ error: "A project is required." }, 400);

      // Read through the user's client so project RLS remains the authorization
      // boundary. The Gmail connection alone never grants access to a project.
      const { data: project, error: projectError } = await userClient
        .from("projects")
        .select("id,name")
        .eq("id", projectId)
        .maybeSingle();
      if (projectError || !project) return json({ error: "Project not found or not accessible." }, 404);

      const conn = await loadFullConn();
      if (!conn || conn.status !== "active") return json({ error: "Connect Gmail before sending." }, 400);

      const cleanEmails = (value: unknown): string[] => Array.isArray(value)
        ? value.map((x) => String(x).trim().toLowerCase()).filter(Boolean)
        : [];
      const to = cleanEmails(body.to);
      const cc = cleanEmails(body.cc);
      const bcc = cleanEmails(body.bcc);
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalid = [...to, ...cc, ...bcc].filter((x) => !emailPattern.test(x));
      if (!to.length) return json({ error: "Add at least one recipient." }, 400);
      if (invalid.length) return json({ error: `Invalid email address: ${invalid[0]}` }, 400);

      const attachments: GmailSendAttachment[] = Array.isArray(body.attachments)
        ? body.attachments.slice(0, 10).map((a: any) => ({
            filename: String(a?.filename ?? "attachment").slice(0, 180),
            contentBase64: String(a?.contentBase64 ?? ""),
            contentType: String(a?.contentType ?? "application/octet-stream").slice(0, 120),
          })).filter((a: GmailSendAttachment) => a.contentBase64.length > 0)
        : [];
      const encodedBytes = attachments.reduce((sum, a) => sum + a.contentBase64.length, 0);
      if (encodedBytes > 28_000_000) return json({ error: "Attachments are too large for Gmail (20 MB maximum)." }, 413);

      let accessToken = String(conn.access_token ?? "");
      const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
      if (!accessToken || expiresAt < Date.now() + 60_000) {
        try {
          const refreshed = await refreshAccessToken(String(conn.refresh_token));
          accessToken = refreshed.access_token;
          await admin.from("gmail_connections").update({
            access_token: accessToken,
            token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
            status: "active",
            last_error: null,
            updated_at: new Date().toISOString(),
          }).eq("id", conn.id);
        } catch (refreshError) {
          await admin.from("gmail_connections").update({
            status: "error",
            last_error: refreshError instanceof Error ? refreshError.message : "Token refresh failed",
          }).eq("id", conn.id);
          return json({ error: "Gmail authorization expired. Reconnect Gmail and try again." }, 401);
        }
      }

      const sent = await sendMessage(accessToken, {
        from: String(conn.email),
        to,
        cc,
        bcc,
        subject: String(body.subject ?? "(no subject)").slice(0, 998),
        bodyText: String(body.bodyText ?? ""),
        bodyHtml: String(body.bodyHtml ?? body.bodyText ?? ""),
        attachments,
        threadId: body.threadId ? String(body.threadId) : null,
        inReplyTo: body.inReplyTo ? String(body.inReplyTo) : null,
      });

      return json({
        ok: true,
        from: conn.email,
        gmailMessageId: sent.id,
        gmailThreadId: sent.threadId,
        rfcMessageId: sent.rfcMessageId,
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("gmail error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
