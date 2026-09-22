// Proj OS Notion integration control API. Authenticated users can start OAuth,
// inspect safe connection status, search only shared Notion pages/databases,
// map selected sources to clients/projects, and disconnect their own connection.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  authorizeUrl,
  NOTION_VERSION,
  refreshAccessToken,
  safeReturnPath,
  signState,
  titleFromNotionObject,
} from "../_shared/notionOAuth.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

function cleanId(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return /^[0-9a-fA-F-]{32,36}$/.test(text) ? text : null;
}

function normalizeNotionResult(item: Record<string, any>) {
  const objectType = item.object === "database" ? "database" : "page";
  return {
    id: String(item.id ?? ""),
    object: objectType,
    title: titleFromNotionObject(item),
    url: typeof item.url === "string" ? item.url : null,
    last_edited_time: typeof item.last_edited_time === "string" ? item.last_edited_time : null,
  };
}

function plainText(parts: any[] | undefined): string {
  if (!Array.isArray(parts)) return "";
  return parts.map((part) => part?.plain_text ?? "").join("").trim();
}

function blockText(block: Record<string, any>): string {
  const type = String(block.type ?? "");
  const value = block[type] ?? {};
  const text = plainText(value.rich_text);
  if (!text) return "";
  if (type === "heading_1") return `# ${text}`;
  if (type === "heading_2") return `## ${text}`;
  if (type === "heading_3") return `### ${text}`;
  if (type === "bulleted_list_item") return `- ${text}`;
  if (type === "numbered_list_item") return `1. ${text}`;
  if (type === "to_do") return `${value.checked ? "[x]" : "[ ]"} ${text}`;
  return text;
}

function sectionsFromText(text: string) {
  const clean = text.replace(/\r/g, "").trim();
  if (!clean) {
    return [{
      heading: "Imported Notion record",
      text: "No readable text was found in the selected Notion source. Review the original Notion record before release.",
      basis: "needs_review",
    }];
  }
  const chunks = clean.split(/\n(?=#{1,3}\s+)/g).map((chunk) => chunk.trim()).filter(Boolean);
  const sections = chunks.map((chunk, index) => {
    const lines = chunk.split("\n").map((line) => line.trim()).filter(Boolean);
    const first = lines[0] ?? `Imported section ${index + 1}`;
    const headingMatch = first.match(/^#{1,3}\s+(.+)$/);
    return {
      heading: (headingMatch?.[1] ?? (index === 0 ? "Imported Notion record" : first)).slice(0, 140),
      text: (headingMatch ? lines.slice(1).join("\n") : lines.join("\n")).trim() || "Review this imported section before release.",
      basis: "needs_review",
    };
  });
  return sections.length ? sections.slice(0, 12) : [{
    heading: "Imported Notion record",
    text: clean.slice(0, 8000),
    basis: "needs_review",
  }];
}

async function fetchPageText(accessToken: string, pageId: string): Promise<{ title: string; url: string | null; lastEdited: string | null; text: string }> {
  const pageResponse = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    headers: { Authorization: `Bearer ${accessToken}`, "Notion-Version": NOTION_VERSION },
  });
  if (!pageResponse.ok) throw new Error(`Notion page read failed (${pageResponse.status}).`);
  const page = await pageResponse.json();
  let cursor = "";
  const lines: string[] = [];
  do {
    const blocksUrl = new URL(`https://api.notion.com/v1/blocks/${pageId}/children`);
    blocksUrl.searchParams.set("page_size", "100");
    if (cursor) blocksUrl.searchParams.set("start_cursor", cursor);
    const blocksResponse = await fetch(blocksUrl, {
      headers: { Authorization: `Bearer ${accessToken}`, "Notion-Version": NOTION_VERSION },
    });
    if (!blocksResponse.ok) throw new Error(`Notion block read failed (${blocksResponse.status}).`);
    const blocks = await blocksResponse.json();
    for (const block of blocks.results ?? []) {
      const line = blockText(block);
      if (line) lines.push(line);
    }
    cursor = blocks.has_more ? String(blocks.next_cursor ?? "") : "";
  } while (cursor);
  return {
    title: titleFromNotionObject(page),
    url: typeof page.url === "string" ? page.url : null,
    lastEdited: typeof page.last_edited_time === "string" ? page.last_edited_time : null,
    text: lines.join("\n"),
  };
}

async function latestDatabasePage(accessToken: string, databaseId: string): Promise<string | null> {
  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      page_size: 1,
      sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
    }),
  });
  if (!response.ok) throw new Error(`Notion database query failed (${response.status}).`);
  const data = await response.json();
  return data?.results?.[0]?.id ? String(data.results[0].id) : null;
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
    const { data: auth } = await userClient.auth.getUser();
    const user = auth?.user;
    if (!user) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: profile } = await admin
      .from("profiles")
      .select("workspace_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const tenantId = profile?.workspace_id as string | undefined;
    if (!tenantId) return json({ error: "No workspace for user" }, 400);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    const loadConn = async () =>
      (await admin
        .from("notion_connections")
        .select("id,notion_workspace_id,workspace_name,workspace_icon,bot_id,status,last_error,token_expires_at,created_at,updated_at")
        .eq("tenant_id", tenantId)
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()).data as any;

    const loadFullConn = async () =>
      (await admin
        .from("notion_connections")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()).data as any;

    if (action === "status") {
      const conn = await loadConn();
      const { data: mappings } = await admin
        .from("notion_project_mappings")
        .select("id,client_id,project_id,notion_object_id,notion_object_type,notion_title,notion_url,mapping_purpose,status,last_synced_at,last_error,created_at,updated_at")
        .eq("tenant_id", tenantId)
        .eq("user_id", user.id)
        .neq("status", "archived")
        .order("updated_at", { ascending: false })
        .limit(25);
      return json({
        connected: !!conn && conn.status === "active",
        connection: conn ?? null,
        mappings: mappings ?? [],
      });
    }

    if (action === "start") {
      if (!Deno.env.get("NOTION_OAUTH_CLIENT_ID") || !Deno.env.get("NOTION_OAUTH_CLIENT_SECRET")) {
        return json({ error: "Notion OAuth is not configured. Add NOTION_OAUTH_CLIENT_ID and NOTION_OAUTH_CLIENT_SECRET." }, 500);
      }
      const state = await signState(serviceKey, {
        t: tenantId,
        u: user.id,
        r: safeReturnPath(body.returnTo),
        o: typeof body.origin === "string" ? body.origin : undefined,
      });
      return json({ url: authorizeUrl(state) });
    }

    const accessTokenFor = async () => {
      const conn = await loadFullConn();
      if (!conn) throw new Error("Connect Notion before continuing.");
      let accessToken = String(conn.access_token ?? "");
      const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
      if (conn.refresh_token && expiresAt && expiresAt < Date.now() + 60_000) {
        const refreshed = await refreshAccessToken(String(conn.refresh_token));
        accessToken = refreshed.access_token;
        await admin.from("notion_connections").update({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token ?? conn.refresh_token,
          token_expires_at: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString() : null,
          workspace_name: refreshed.workspace_name ?? conn.workspace_name,
          workspace_icon: refreshed.workspace_icon ?? conn.workspace_icon,
          status: "active",
          last_error: null,
          updated_at: new Date().toISOString(),
        }).eq("id", conn.id);
      }
      return { accessToken, conn };
    };

    if (action === "search") {
      const { accessToken } = await accessTokenFor();
      const query = String(body.query ?? "").trim().slice(0, 120);
      const kind = body.kind === "database" ? "database" : body.kind === "page" ? "page" : "";
      const payload: Record<string, unknown> = {
        page_size: Math.min(Math.max(Number(body.pageSize ?? 20), 1), 50),
      };
      if (query) payload.query = query;
      if (kind) payload.filter = { property: "object", value: kind };
      const response = await fetch("https://api.notion.com/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Notion-Version": NOTION_VERSION,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) return json({ error: `Notion search failed (${response.status}). Reconnect Notion or share the page with Proj OS.` }, response.status === 401 ? 401 : 502);
      const data = await response.json();
      return json({ results: Array.isArray(data.results) ? data.results.map(normalizeNotionResult) : [] });
    }

    if (action === "map") {
      const { conn } = await accessTokenFor();
      const notionObjectId = String(body.notionObjectId ?? "").trim();
      const notionObjectType = body.notionObjectType === "database" ? "database" : "page";
      const notionTitle = String(body.notionTitle ?? "Untitled Notion source").trim().slice(0, 240) || "Untitled Notion source";
      const notionUrl = String(body.notionUrl ?? "").trim() || null;
      const projectId = cleanId(body.projectId);
      const clientId = cleanId(body.clientId);
      const mappingPurpose = ["meetings", "documents", "tasks", "knowledge", "other"].includes(String(body.mappingPurpose))
        ? String(body.mappingPurpose)
        : "meetings";
      if (!notionObjectId) return json({ error: "Choose a Notion page or database first." }, 400);
      if (!projectId && !clientId) return json({ error: "Choose a Proj OS client or project before mapping Notion." }, 400);

      if (projectId) {
        const { data: project } = await userClient.from("projects").select("id").eq("id", projectId).maybeSingle();
        if (!project) return json({ error: "Project not found or not accessible." }, 404);
      }
      if (clientId) {
        const { data: client } = await userClient.from("clients").select("id").eq("id", clientId).maybeSingle();
        if (!client) return json({ error: "Client not found or not accessible." }, 404);
      }

      let existingQuery = admin.from("notion_project_mappings")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("connection_id", conn.id)
        .eq("notion_object_id", notionObjectId)
        .eq("mapping_purpose", mappingPurpose)
        .neq("status", "archived");
      existingQuery = projectId ? existingQuery.eq("project_id", projectId) : existingQuery.is("project_id", null);
      const { data: existing, error: existingError } = await existingQuery.maybeSingle();
      if (existingError) return json({ error: existingError.message }, 400);

      const row = {
        tenant_id: tenantId,
        connection_id: conn.id,
        user_id: user.id,
        client_id: clientId,
        project_id: projectId,
        notion_object_id: notionObjectId,
        notion_object_type: notionObjectType,
        notion_title: notionTitle,
        notion_url: notionUrl,
        mapping_purpose: mappingPurpose,
        sync_direction: "notion_to_proj_os",
        status: "active",
        last_error: null,
        mapped_by: user.id,
        updated_at: new Date().toISOString(),
      };

      const { data: mapping, error } = existing?.id
        ? await admin.from("notion_project_mappings").update(row).eq("id", existing.id).select("id").maybeSingle()
        : await admin.from("notion_project_mappings").insert(row).select("id").maybeSingle();
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, mappingId: mapping?.id ?? null });
    }

    if (action === "sync") {
      const mappingId = cleanId(body.mappingId);
      if (!mappingId) return json({ error: "Choose a mapped Notion source to sync." }, 400);
      const { accessToken, conn } = await accessTokenFor();
      const { data: mapping, error: mappingError } = await admin
        .from("notion_project_mappings")
        .select("id,tenant_id,connection_id,user_id,client_id,project_id,notion_object_id,notion_object_type,notion_title,notion_url,mapping_purpose,status")
        .eq("id", mappingId)
        .eq("tenant_id", tenantId)
        .eq("user_id", user.id)
        .neq("status", "archived")
        .maybeSingle();
      if (mappingError) return json({ error: mappingError.message }, 400);
      if (!mapping) return json({ error: "Mapped Notion source not found." }, 404);
      if (mapping.connection_id !== conn.id) return json({ error: "Notion mapping does not belong to the active connection." }, 403);
      if (!mapping.client_id) return json({ error: "Map this Notion source to a client before syncing meetings." }, 400);

      const { data: client } = await userClient.from("clients").select("id").eq("id", mapping.client_id).maybeSingle();
      if (!client) return json({ error: "Client not found or not accessible." }, 404);
      if (mapping.project_id) {
        const { data: project } = await userClient.from("projects").select("id").eq("id", mapping.project_id).maybeSingle();
        if (!project) return json({ error: "Project not found or not accessible." }, 404);
      }

      const { data: run } = await admin.from("notion_sync_runs").insert({
        tenant_id: tenantId,
        mapping_id: mapping.id,
        connection_id: conn.id,
        user_id: user.id,
        status: "running",
        started_at: new Date().toISOString(),
      }).select("id").maybeSingle();

      try {
        const pageId = mapping.notion_object_type === "database"
          ? await latestDatabasePage(accessToken, mapping.notion_object_id)
          : mapping.notion_object_id;
        if (!pageId) throw new Error("The mapped Notion database does not contain any pages yet.");
        const page = await fetchPageText(accessToken, pageId);
        const meetingId = crypto.randomUUID();
        const title = (page.title || mapping.notion_title || "Imported Notion meeting record").slice(0, 180);
        const { error: insertError } = await admin.from("client_meetings").insert({
          id: meetingId,
          tenant_id: tenantId,
          client_id: mapping.client_id,
          title,
          meeting_date: new Date().toISOString().slice(0, 10),
          attendees: "",
          transcript: "",
          project_ids: mapping.project_id ? [mapping.project_id] : [],
          sections: sectionsFromText(page.text),
          created_by: user.id,
        });
        if (insertError) throw new Error(insertError.message);

        await admin.from("notion_project_mappings").update({
          last_synced_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        }).eq("id", mapping.id);
        if (run?.id) {
          await admin.from("notion_sync_runs").update({
            status: "needs_review",
            source_last_edited_at: page.lastEdited,
            imported_record_type: "client_meeting",
            imported_record_id: meetingId,
            summary: `Imported "${title}" as a reviewed draft. Human approval is required before client release.`,
            finished_at: new Date().toISOString(),
          }).eq("id", run.id);
        }
        return json({ ok: true, meetingId, title, sourceUrl: page.url ?? mapping.notion_url, status: "needs_review" });
      } catch (syncError) {
        const message = syncError instanceof Error ? syncError.message : "Notion sync failed.";
        await admin.from("notion_project_mappings").update({
          last_error: message,
          updated_at: new Date().toISOString(),
        }).eq("id", mapping.id);
        if (run?.id) {
          await admin.from("notion_sync_runs").update({
            status: "failed",
            error: message,
            finished_at: new Date().toISOString(),
          }).eq("id", run.id);
        }
        return json({ error: message }, 502);
      }
    }

    if (action === "disconnect") {
      await admin.from("notion_connections").update({
        status: "revoked",
        access_token: "",
        refresh_token: null,
        token_expires_at: null,
        updated_at: new Date().toISOString(),
      }).eq("tenant_id", tenantId).eq("user_id", user.id);
      await admin.from("notion_project_mappings").update({
        status: "paused",
        updated_at: new Date().toISOString(),
      }).eq("tenant_id", tenantId).eq("user_id", user.id).eq("status", "active");
      return json({ connected: false });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("notion function error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
