// Trello integration for project instructions.
//
// Authenticated actions:
//   status, lists, connect, disconnect, set-auto-push, push
//
// The Trello key/token are outbound secrets stored in trello_connections. They
// are never returned to the browser. A project can override the workspace's
// default list through trello_project_lists.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const API = "https://api.trello.com/1";

type Credentials = { api_key: string; token: string };

function authHeader(creds: Credentials): string {
  const key = creds.api_key.replace(/["\\]/g, "");
  const token = creds.token.replace(/["\\]/g, "");
  return `OAuth oauth_consumer_key="${key}", oauth_token="${token}"`;
}

async function trelloRequest<T>(creds: Credentials, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(creds),
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new Error(`Trello request failed (${response.status})${detail ? `: ${detail}` : ""}`);
  }
  return await response.json() as T;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const authHeaderValue = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeaderValue } },
    });
    const { data: authData } = await userClient.auth.getUser();
    const user = authData?.user;
    if (!user) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await admin.from("profiles").select("workspace_id").eq("user_id", user.id).maybeSingle();
    const tenantId = profile?.workspace_id as string | undefined;
    if (!tenantId) return json({ error: "No workspace for user" }, 400);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const loadConnection = async () =>
      (await admin.from("trello_connections").select("*").eq("tenant_id", tenantId).maybeSingle()).data;

    if (action === "status") {
      const connection = await loadConnection();
      return json({
        connected: Boolean(connection),
        memberName: connection?.member_name ?? null,
        boardId: connection?.default_board_id ?? null,
        boardName: connection?.default_board_name ?? null,
        listId: connection?.default_list_id ?? null,
        listName: connection?.default_list_name ?? null,
        autoPush: Boolean(connection?.auto_push),
      });
    }

    if (action === "lists") {
      let creds: Credentials;
      const apiKey = String(body.apiKey ?? "").trim();
      const token = String(body.token ?? "").trim();
      if (apiKey && token) creds = { api_key: apiKey, token };
      else {
        const stored = await loadConnection();
        if (!stored) return json({ error: "Connect Trello first." }, 400);
        creds = stored as Credentials;
      }

      const boards = await trelloRequest<Array<{ id: string; name: string; closed?: boolean }>>(
        creds,
        "/members/me/boards?fields=name,closed&filter=open",
      );
      const lists: Array<{ id: string; name: string; boardId: string; boardName: string; path: string }> = [];
      for (const board of boards.slice(0, 100)) {
        const boardLists = await trelloRequest<Array<{ id: string; name: string; closed?: boolean }>>(
          creds,
          `/boards/${encodeURIComponent(board.id)}/lists?fields=name,closed&filter=open`,
        );
        for (const list of boardLists) {
          if (!list.closed) lists.push({ id: list.id, name: list.name, boardId: board.id, boardName: board.name, path: `${board.name} / ${list.name}` });
        }
      }
      return json({ lists });
    }

    if (action === "connect") {
      const creds = { api_key: String(body.apiKey ?? "").trim(), token: String(body.token ?? "").trim() };
      const listId = String(body.listId ?? "").trim();
      if (!creds.api_key || !creds.token) return json({ error: "Enter both the Trello API key and token." }, 400);
      if (!listId) return json({ error: "Choose a Trello list." }, 400);

      const member = await trelloRequest<{ id: string; fullName?: string; username?: string }>(creds, "/members/me?fields=fullName,username");
      const list = await trelloRequest<{ id: string; name: string; idBoard: string }>(creds, `/lists/${encodeURIComponent(listId)}?fields=name,idBoard`);
      const board = await trelloRequest<{ id: string; name: string }>(creds, `/boards/${encodeURIComponent(list.idBoard)}?fields=name`);

      const { error } = await admin.from("trello_connections").upsert({
        tenant_id: tenantId,
        api_key: creds.api_key,
        token: creds.token,
        member_id: member.id,
        member_name: member.fullName || member.username || null,
        default_board_id: board.id,
        default_board_name: board.name,
        default_list_id: list.id,
        default_list_name: list.name,
        connected_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "tenant_id" });
      if (error) return json({ error: error.message }, 500);
      return json({ connected: true, memberName: member.fullName || member.username || null, boardName: board.name, listName: list.name });
    }

    if (action === "disconnect") {
      await admin.from("trello_connections").delete().eq("tenant_id", tenantId);
      return json({ connected: false });
    }

    if (action === "set-auto-push") {
      await admin.from("trello_connections").update({ auto_push: Boolean(body.value), updated_at: new Date().toISOString() }).eq("tenant_id", tenantId);
      return json({ autoPush: Boolean(body.value) });
    }

    if (action === "push") {
      const connection = await loadConnection();
      if (!connection) return json({ error: "Connect Trello first." }, 400);
      const creds = connection as Credentials;

      // RLS authorizes access to the instruction.
      const { data: item, error: itemError } = await userClient
        .from("project_action_items")
        .select("*")
        .eq("id", body.actionItemId)
        .maybeSingle();
      if (itemError || !item) return json({ error: "Project instruction not found." }, 404);

      const { data: project } = await admin.from("projects").select("id,name").eq("id", item.project_id).maybeSingle();
      const { data: projectList } = await admin.from("trello_project_lists").select("*").eq("project_id", item.project_id).maybeSingle();
      const listId = projectList?.list_id || connection.default_list_id;
      const boardId = projectList?.board_id || connection.default_board_id;
      if (!listId || !boardId) return json({ error: "Choose a Trello list for this project." }, 400);

      const { data: watcherRows } = await admin.from("project_action_item_watchers").select("user_id").eq("action_item_id", item.id);
      const peopleIds = [...new Set([item.assigned_to, ...(watcherRows ?? []).map((w: any) => w.user_id)].filter(Boolean))] as string[];
      const { data: people } = peopleIds.length
        ? await admin.from("profiles").select("user_id,full_name,email").in("user_id", peopleIds)
        : { data: [] as any[] };
      const owner = (people ?? []).find((p: any) => p.user_id === item.assigned_to);
      const followers = (people ?? []).filter((p: any) => p.user_id !== item.assigned_to);
      const appOrigin = (Deno.env.get("APP_ORIGIN") ?? "https://projos.ai").trim().replace(/\/$/, "");
      const description = [
        item.description || "",
        "",
        `Project: ${project?.name ?? "Project"}`,
        owner ? `Owner: ${owner.full_name || owner.email}` : "Owner: Unassigned",
        followers.length ? `CC / followers: ${followers.map((p: any) => p.full_name || p.email).join(", ")}` : "",
        `Priority: ${item.priority}`,
        `Open in projOS: ${appOrigin}/projects/${item.project_id}?tab=action-items`,
      ].filter(Boolean).join("\n");

      const cardBody: Record<string, unknown> = {
        name: item.title,
        desc: description,
        due: item.due_date ? `${item.due_date}T17:00:00.000Z` : null,
        dueComplete: item.status === "done",
      };
      let card: { id: string; url?: string; shortUrl?: string };
      if (item.trello_card_id) {
        card = await trelloRequest(creds, `/cards/${encodeURIComponent(item.trello_card_id)}`, { method: "PUT", body: JSON.stringify(cardBody) });
      } else {
        card = await trelloRequest(creds, "/cards", { method: "POST", body: JSON.stringify({ ...cardBody, idList: listId, pos: "top" }) });
      }

      const cardId = item.trello_card_id || card.id;
      const cardUrl = card.url || card.shortUrl || (cardId ? `https://trello.com/c/${cardId}` : null);
      await admin.from("project_action_items").update({ trello_card_id: cardId, trello_card_url: cardUrl }).eq("id", item.id);

      // Best-effort Trello member assignment. Trello exposes board-member email
      // only when account scope permits it; fall back to matching username to
      // the APAS email prefix/full name. Assigned/following Trello members receive
      // normal Trello mobile notifications according to their Trello settings.
      if (peopleIds.length) {
        const boardMembers = await trelloRequest<Array<{ id: string; fullName?: string; username?: string; email?: string }>>(
          creds,
          `/boards/${encodeURIComponent(boardId)}/members?fields=fullName,username,email`,
        ).catch(() => []);
        for (const person of people ?? []) {
          const email = String((person as any).email ?? "").toLowerCase();
          const name = String((person as any).full_name ?? "").toLowerCase();
          const prefix = email.split("@")[0];
          const member = boardMembers.find((m) =>
            String(m.email ?? "").toLowerCase() === email ||
            String(m.fullName ?? "").toLowerCase() === name ||
            String(m.username ?? "").toLowerCase() === prefix
          );
          if (member) {
            await trelloRequest(creds, `/cards/${encodeURIComponent(cardId)}/idMembers`, {
              method: "POST",
              body: JSON.stringify({ value: member.id }),
            }).catch(() => null);
          }
        }
      }

      // Mirror new project discussion comments once. Team members can keep the
      // canonical conversation in projOS while Trello users see the same update.
      const { data: comments } = await admin.from("action_item_comments")
        .select("id,content,created_by,trello_action_id")
        .eq("action_item_id", item.id)
        .order("created_at", { ascending: true });
      for (const comment of comments ?? []) {
        if (comment.trello_action_id) continue;
        const { data: author } = await admin.from("profiles").select("full_name,email").eq("user_id", comment.created_by).maybeSingle();
        const text = `${author?.full_name || author?.email || "projOS"}: ${comment.content}`;
        const actionResult = await trelloRequest<{ id?: string }>(creds, `/cards/${encodeURIComponent(cardId)}/actions/comments`, {
          method: "POST",
          body: JSON.stringify({ text }),
        }).catch(() => null);
        if (actionResult?.id) await admin.from("action_item_comments").update({ trello_action_id: actionResult.id }).eq("id", comment.id);
      }

      return json({ ok: true, cardId, url: cardUrl });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("trello error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown Trello error" }, 500);
  }
});
