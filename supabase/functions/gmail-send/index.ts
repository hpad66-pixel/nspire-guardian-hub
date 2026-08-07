// gmail-send — send a correspondence email through the signed-in user's own
// connected Gmail account (uses the gmail.send scope already granted at connect,
// see _shared/gmailOAuth.ts GMAIL_SCOPES). Authenticated.
//
// POST {
//   to: string[], cc?: string[], bcc?: string[],
//   subject: string, html: string, text?: string,
//   attachments?: [{ filename, contentBase64, contentType }]
// } → { success: true, id, threadId }
//
// The refresh token never leaves this function; we mint a short-lived access
// token per send. The message lands in the user's real Gmail "Sent" and threads
// naturally with the recipient's replies (which gmail-sync already imports).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { refreshAccessToken } from "../_shared/gmailOAuth.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

interface Attachment { filename: string; contentBase64: string; contentType?: string }

// base64url without padding, working over raw bytes (handles the large binary
// PDF payloads btoa-on-a-string would choke on for non-ASCII input).
function bytesToB64Url(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const b64 = (s: string) => btoa(unescape(encodeURIComponent(s))); // utf-8 safe base64
// RFC 2047 encoded-word for any header value containing non-ASCII (e.g. subject).
const encHeader = (s: string) => (/[^\x00-\x7F]/.test(s) ? `=?UTF-8?B?${b64(s)}?=` : s);
const boundary = (p: string) => `${p}_${crypto.randomUUID().replace(/-/g, "")}`;

// Build an RFC 2822 MIME message: multipart/mixed [ multipart/alternative
// (text + html) , ...attachments ]. Returns UTF-8 bytes ready for base64url.
function buildMime(p: {
  to: string[]; cc?: string[]; bcc?: string[];
  subject: string; html: string; text?: string; attachments?: Attachment[];
}): Uint8Array {
  const mixed = boundary("mixed");
  const alt = boundary("alt");
  const CRLF = "\r\n";
  const text = p.text ?? p.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  const headers = [
    `To: ${p.to.join(", ")}`,
    p.cc?.length ? `Cc: ${p.cc.join(", ")}` : "",
    p.bcc?.length ? `Bcc: ${p.bcc.join(", ")}` : "",
    `Subject: ${encHeader(p.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${mixed}"`,
  ].filter(Boolean).join(CRLF);

  const parts: string[] = [];
  parts.push(`--${mixed}`);
  parts.push(`Content-Type: multipart/alternative; boundary="${alt}"`, "");

  parts.push(`--${alt}`);
  parts.push('Content-Type: text/plain; charset="UTF-8"', "Content-Transfer-Encoding: base64", "", b64(text), "");
  parts.push(`--${alt}`);
  parts.push('Content-Type: text/html; charset="UTF-8"', "Content-Transfer-Encoding: base64", "", b64(p.html), "");
  parts.push(`--${alt}--`, "");

  for (const a of p.attachments ?? []) {
    const ct = a.contentType || "application/octet-stream";
    parts.push(`--${mixed}`);
    parts.push(
      `Content-Type: ${ct}; name="${a.filename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${a.filename}"`,
      "",
      a.contentBase64.replace(/\s+/g, ""),
      "",
    );
  }
  parts.push(`--${mixed}--`, "");

  return new TextEncoder().encode(headers + CRLF + CRLF + parts.join(CRLF));
}

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
    const to: string[] = Array.isArray(body.to) ? body.to.filter(Boolean) : [];
    const cc: string[] = Array.isArray(body.cc) ? body.cc.filter(Boolean) : [];
    const bcc: string[] = Array.isArray(body.bcc) ? body.bcc.filter(Boolean) : [];
    const subject = String(body.subject ?? "").trim();
    const html = String(body.html ?? "");
    const text = typeof body.text === "string" ? body.text : undefined;
    const attachments: Attachment[] = Array.isArray(body.attachments) ? body.attachments : [];

    if (!to.length) return json({ error: "At least one recipient is required." }, 400);
    if (!subject) return json({ error: "A subject is required." }, 400);
    if (!html.trim()) return json({ error: "The message body is empty." }, 400);

    // Load the caller's own Gmail connection for this workspace.
    const { data: conn } = await admin
      .from("gmail_connections")
      .select("refresh_token,status,email")
      .eq("tenant_id", tenantId).eq("user_id", user.id).maybeSingle();
    const refreshToken = (conn as any)?.refresh_token as string | undefined;
    if (!refreshToken || (conn as any)?.status !== "active") {
      return json({ error: "Gmail is not connected. Connect Gmail first, then send.", code: "not_connected" }, 409);
    }

    let accessToken: string;
    try {
      ({ access_token: accessToken } = await refreshAccessToken(refreshToken));
    } catch (e) {
      // A revoked/expired refresh token surfaces here — mark the row so the UI
      // can prompt a reconnect rather than silently failing every send.
      await admin.from("gmail_connections").update({ status: "error", last_error: "token_refresh_failed" })
        .eq("tenant_id", tenantId).eq("user_id", user.id);
      return json({ error: "Your Gmail connection expired. Please reconnect Gmail.", code: "reconnect" }, 409);
    }

    const raw = bytesToB64Url(buildMime({ to, cc, bcc, subject, html, text, attachments }));

    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("gmail send failed:", res.status, detail);
      return json({ error: `Gmail rejected the send (${res.status}).`, detail: detail.slice(0, 500) }, 502);
    }
    const sent = await res.json();
    return json({ success: true, id: sent.id ?? null, threadId: sent.threadId ?? null, from: (conn as any)?.email ?? null });
  } catch (e) {
    console.error("gmail-send error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
