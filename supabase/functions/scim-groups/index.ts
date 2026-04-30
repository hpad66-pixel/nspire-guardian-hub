/**
 * A7 · SCIM 2.0 /Groups endpoint (RFC 7644).
 * Supports group CRUD + membership add/remove via PATCH.
 */
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import {
  admin, authenticateScim, scimError, scimHeaders, scimJson,
} from "../_shared/scim.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: scimHeaders });

  const tenantId = await authenticateScim(req);
  if (!tenantId) return scimError(401, "Invalid or missing SCIM bearer token");

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  const isCollection = last === "Groups" || last === "scim-groups";
  const groupId = isCollection ? null : last;

  const sb = admin();

  try {
    switch (req.method) {
      case "GET":
        return groupId
          ? await handleGetOne(sb, tenantId, groupId)
          : await handleList(sb, tenantId, url.searchParams);
      case "POST":
        return await handleCreate(sb, tenantId, await req.json());
      case "PATCH":
      case "PUT":
        if (!groupId) return scimError(400, "Missing group id");
        return await handleUpdate(sb, tenantId, groupId, await req.json());
      case "DELETE":
        if (!groupId) return scimError(400, "Missing group id");
        return await handleDelete(sb, tenantId, groupId);
      default:
        return scimError(405, `Method ${req.method} not allowed`);
    }
  } catch (err) {
    console.error("[scim-groups]", (err as Error).message);
    return scimError(500, (err as Error).message);
  }
});

function toScimGroupResource(row: any, members: any[] = []) {
  return {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:Group"],
    id: row.id,
    externalId: row.external_id,
    displayName: row.display_name,
    members: members.map((m) => ({ value: m.user_id, type: "User" })),
    meta: {
      resourceType: "Group",
      created: row.created_at,
      lastModified: row.updated_at,
    },
  };
}

async function handleList(sb: any, tenantId: string, params: URLSearchParams) {
  const startIndex = Math.max(1, parseInt(params.get("startIndex") ?? "1", 10));
  const count = Math.min(200, parseInt(params.get("count") ?? "50", 10));

  const { data, count: total, error } = await sb
    .from("scim_external_groups")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .range(startIndex - 1, startIndex - 1 + count - 1);
  if (error) throw error;

  return scimJson({
    schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
    totalResults: total ?? 0,
    startIndex,
    itemsPerPage: (data ?? []).length,
    Resources: (data ?? []).map((g: any) => toScimGroupResource(g)),
  });
}

async function handleGetOne(sb: any, tenantId: string, id: string) {
  const { data: group, error } = await sb
    .from("scim_external_groups")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) throw error;
  if (!group) return scimError(404, "Group not found");

  const { data: members } = await sb
    .from("scim_group_members")
    .select("user_id")
    .eq("group_id", id);

  return scimJson(toScimGroupResource(group, members ?? []));
}

async function handleCreate(sb: any, tenantId: string, payload: any) {
  const row = {
    tenant_id: tenantId,
    external_id: payload.externalId ?? crypto.randomUUID(),
    display_name: payload.displayName ?? "Untitled group",
    raw: payload,
  };
  const { data, error } = await sb
    .from("scim_external_groups")
    .upsert(row, { onConflict: "tenant_id,external_id" })
    .select()
    .single();
  if (error) throw error;

  if (Array.isArray(payload.members) && payload.members.length > 0) {
    await sb.from("scim_group_members").insert(
      payload.members.map((m: any) => ({ group_id: data.id, user_id: m.value })),
    );
  }

  return scimJson(toScimGroupResource(data, payload.members ?? []), 201);
}

async function handleUpdate(sb: any, tenantId: string, id: string, payload: any) {
  const { data: group } = await sb
    .from("scim_external_groups")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!group) return scimError(404, "Group not found");

  if (Array.isArray(payload?.Operations)) {
    for (const op of payload.Operations) {
      if (op.path === "displayName") {
        await sb.from("scim_external_groups").update({ display_name: op.value }).eq("id", id);
      }
      if (op.path === "members") {
        if (op.op === "replace") {
          await sb.from("scim_group_members").delete().eq("group_id", id);
        }
        const values = Array.isArray(op.value) ? op.value : [];
        if (op.op === "remove") {
          for (const v of values) {
            await sb.from("scim_group_members").delete().eq("group_id", id).eq("user_id", v.value);
          }
        } else {
          for (const v of values) {
            await sb
              .from("scim_group_members")
              .upsert({ group_id: id, user_id: v.value }, { onConflict: "group_id,user_id" });
          }
        }
      }
    }
  }

  return handleGetOne(sb, tenantId, id);
}

async function handleDelete(sb: any, tenantId: string, id: string) {
  const { error } = await sb
    .from("scim_external_groups")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);
  if (error) throw error;
  return new Response(null, { status: 204, headers: scimHeaders });
}
