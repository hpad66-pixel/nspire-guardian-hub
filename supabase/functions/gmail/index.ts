// Gmail connection control (authenticated). Actions:
//   start      → returns a Google authorize URL (with a signed state) to redirect to
//   status     → { connected, email, last_synced_at, status } (never the token)
//   disconnect → revoke at Google + delete the row
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { signState, authorizeUrl, safeReturnPath, refreshAccessToken, GOOGLE_DRIVE_SCOPE } from "../_shared/gmailOAuth.ts";
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
      (await admin.from("gmail_connections").select("email,last_synced_at,status,scopes").eq("tenant_id", tenantId).eq("user_id", user.id).maybeSingle()).data;

    const loadFullConn = async () =>
      (await admin.from("gmail_connections").select("*").eq("tenant_id", tenantId).eq("user_id", user.id).maybeSingle()).data;

    if (action === "status") {
      const conn = await loadConn();
      return json({ connected: !!conn && conn.status === "active", driveConnected: !!conn && conn.status === "active" && String(conn.scopes ?? "").includes(GOOGLE_DRIVE_SCOPE), email: conn?.email ?? null, last_synced_at: conn?.last_synced_at ?? null, status: conn?.status ?? null });
    }

    if (action === "start") {
      if (!Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")) return json({ error: "Gmail is not configured (missing GOOGLE_OAUTH_CLIENT_ID)." }, 500);
      const state = await signState(serviceKey, { t: tenantId, u: user.id, r: safeReturnPath(body.returnTo), o: typeof body.origin === "string" ? body.origin : undefined });
      return json({ url: authorizeUrl(state, user.email ?? undefined, body.service === "drive") });
    }

    const accessTokenFor = async (requiredScope?: string) => {
      const conn = await loadFullConn();
      if (!conn || conn.status !== "active") throw new Error("Connect Google before continuing.");
      if (requiredScope && !String(conn.scopes ?? "").includes(requiredScope)) {
        throw new Error("Reconnect Google Drive to grant read-only file access.");
      }
      let accessToken = String(conn.access_token ?? "");
      const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
      if (!accessToken || expiresAt < Date.now() + 60_000) {
        const refreshed = await refreshAccessToken(String(conn.refresh_token));
        accessToken = refreshed.access_token;
        await admin.from("gmail_connections").update({
          access_token: accessToken,
          token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
          status: "active",
          last_error: null,
          updated_at: new Date().toISOString(),
        }).eq("id", conn.id);
      }
      return { accessToken, conn };
    };

    if (action === "drive-list") {
      const raw = String(body.folderUrl ?? body.folderId ?? "").trim();
      const match = raw.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      const folderId = match?.[1] ?? (/^[a-zA-Z0-9_-]+$/.test(raw) ? raw : "");
      if (!folderId) return json({ error: "Paste a valid Google Drive folder link." }, 400);
      const { accessToken } = await accessTokenFor(GOOGLE_DRIVE_SCOPE);
      const params = new URLSearchParams({
        q: `'${folderId}' in parents and trashed = false`,
        pageSize: "200",
        orderBy: "folder,name",
        fields: "files(id,name,mimeType,size,modifiedTime,webViewLink,thumbnailLink,iconLink)",
        supportsAllDrives: "true",
        includeItemsFromAllDrives: "true",
      });
      const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!response.ok) return json({ error: `Google Drive could not open that folder (${response.status}). Check sharing access.` }, response.status === 404 ? 404 : 502);
      const data = await response.json();
      return json({ folderId, files: Array.isArray(data.files) ? data.files : [] });
    }

    if (action === "drive-import") {
      const projectId = String(body.projectId ?? "");
      const reportId = String(body.reportId ?? "");
      const fileIds = Array.isArray(body.fileIds) ? [...new Set(body.fileIds.map((id: unknown) => String(id)).filter(Boolean))].slice(0, 100) : [];
      if (!projectId || !reportId || !fileIds.length) return json({ error: "Select one or more Drive files to import." }, 400);
      const [{ data: project }, { data: report }] = await Promise.all([
        userClient.from("projects").select("id").eq("id", projectId).maybeSingle(),
        userClient.from("consulting_reports").select("id,project_id").eq("id", reportId).eq("project_id", projectId).maybeSingle(),
      ]);
      if (!project || !report) return json({ error: "Report not found or not accessible." }, 404);
      const { accessToken } = await accessTokenFor(GOOGLE_DRIVE_SCOPE);
      const imported: Array<{ id: string; name: string }> = [];
      let totalBytes = 0;
      for (const fileId of fileIds) {
        const metaResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size,webViewLink&supportsAllDrives=true`, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!metaResponse.ok) continue;
        const meta = await metaResponse.json();
        const sourceMime = String(meta.mimeType ?? "application/octet-stream");
        let targetMime = sourceMime;
        let targetName = String(meta.name ?? "Drive source");
        let extractedText: string | null = null;
        let downloadUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`;
        if (sourceMime.startsWith("application/vnd.google-apps.")) {
          if (sourceMime.endsWith("folder")) continue;
          const extractMime = sourceMime.endsWith("document") ? "text/plain" : sourceMime.endsWith("spreadsheet") ? "text/csv" : null;
          if (extractMime) {
            const textResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(extractMime)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
            if (textResponse.ok) extractedText = (await textResponse.text()).slice(0, 120_000);
          }
          targetMime = "application/pdf";
          targetName = `${targetName}.pdf`;
          downloadUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(targetMime)}`;
        }
        const fileResponse = await fetch(downloadUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!fileResponse.ok) continue;
        const bytes = new Uint8Array(await fileResponse.arrayBuffer());
        if (bytes.byteLength > 15_000_000 || totalBytes + bytes.byteLength > 100_000_000) continue;
        totalBytes += bytes.byteLength;
        if (!extractedText && (targetMime.startsWith("text/") || targetMime.includes("csv"))) {
          extractedText = new TextDecoder().decode(bytes).slice(0, 120_000);
        }
        const sourceId = crypto.randomUUID();
        const safeName = targetName.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 140) || "drive-source";
        const path = `${tenantId}/${projectId}/reports/${reportId}/${sourceId}-${safeName}`;
        const { error: uploadError } = await admin.storage.from("project-documents").upload(path, bytes, { contentType: targetMime, upsert: false });
        if (uploadError) continue;
        const { error: insertError } = await admin.from("consulting_report_sources").insert({
          id: sourceId,
          tenant_id: tenantId,
          project_id: projectId,
          report_id: reportId,
          source_type: "google_drive",
          source_name: targetName,
          mime_type: targetMime,
          size_bytes: bytes.byteLength,
          storage_path: path,
          drive_file_id: fileId,
          drive_web_url: meta.webViewLink ?? null,
          extracted_text: extractedText,
          caption: targetMime.startsWith("image/") ? String(meta.name ?? "").replace(/[-_]+/g, " ").replace(/\.[^.]+$/, "") : null,
          created_by: user.id,
          sort_order: imported.length,
        });
        if (insertError) {
          await admin.storage.from("project-documents").remove([path]);
          continue;
        }
        imported.push({ id: sourceId, name: targetName });
      }
      return json({ imported, skipped: fileIds.length - imported.length });
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
