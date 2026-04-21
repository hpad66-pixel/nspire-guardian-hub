/**
 * A7 · SCIM 2.0 /Users endpoint (RFC 7644).
 * Supported methods: GET (list + by id), POST (create), PATCH (update), PUT (replace), DELETE.
 * Auth: Bearer <scim token> → hashed_token lookup in tenant_scim_tokens.
 */
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import {
  admin, authenticateScim, scimError, scimHeaders, scimJson,
  toScimUserResource, type ScimUserPayload,
} from "../_shared/scim.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: scimHeaders });

  const tenantId = await authenticateScim(req);
  if (!tenantId) return scimError(401, "Invalid or missing SCIM bearer token");

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // /scim-users/Users/{id} → last segment may be an id or "Users"
  const idCandidate = pathParts[pathParts.length - 1];
  const isCollection = idCandidate === "Users" || idCandidate === "scim-users";
  const userId = isCollection ? null : idCandidate;

  const sb = admin();

  try {
    switch (req.method) {
      case "GET":
        return userId
          ? await handleGetOne(sb, tenantId, userId)
          : await handleList(sb, tenantId, url.searchParams);

      case "POST":
        return await handleCreate(sb, tenantId, await req.json());

      case "PATCH":
      case "PUT":
        if (!userId) return scimError(400, "Missing user id");
        return await handleUpdate(sb, tenantId, userId, await req.json(), req.method === "PATCH");

      case "DELETE":
        if (!userId) return scimError(400, "Missing user id");
        return await handleDelete(sb, tenantId, userId);

      default:
        return scimError(405, `Method ${req.method} not allowed`);
    }
  } catch (err) {
    console.error("[scim-users]", (err as Error).message);
    return scimError(500, (err as Error).message);
  }
});

async function handleList(sb: any, tenantId: string, params: URLSearchParams) {
  const startIndex = Math.max(1, parseInt(params.get("startIndex") ?? "1", 10));
  const count = Math.min(200, parseInt(params.get("count") ?? "50", 10));
  const filter = params.get("filter") ?? "";

  let query = sb
    .from("scim_external_users")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId);

  // Minimal filter support: userName eq "foo@bar"
  const m = filter.match(/userName\s+eq\s+"([^"]+)"/i);
  if (m) query = query.ilike("email", m[1]);

  const { data, count: total, error } = await query
    .order("created_at", { ascending: false })
    .range(startIndex - 1, startIndex - 1 + count - 1);

  if (error) throw error;

  return scimJson({
    schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
    totalResults: total ?? 0,
    startIndex,
    itemsPerPage: (data ?? []).length,
    Resources: (data ?? []).map(toScimUserResource),
  });
}

async function handleGetOne(sb: any, tenantId: string, id: string) {
  const { data, error } = await sb
    .from("scim_external_users")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return scimError(404, "User not found");
  return scimJson(toScimUserResource(data));
}

async function handleCreate(sb: any, tenantId: string, payload: ScimUserPayload) {
  const email =
    payload.emails?.find((e) => e.primary)?.value ??
    payload.emails?.[0]?.value ??
    payload.userName;
  if (!email) return scimError(400, "No email/userName on payload", "invalidValue");

  const row = {
    tenant_id: tenantId,
    external_id: payload.externalId ?? crypto.randomUUID(),
    email,
    given_name: payload.name?.givenName ?? null,
    family_name: payload.name?.familyName ?? null,
    display_name: payload.displayName ?? null,
    active: payload.active ?? true,
    raw: payload as unknown as Record<string, unknown>,
  };

  const { data, error } = await sb
    .from("scim_external_users")
    .upsert(row, { onConflict: "tenant_id,external_id" })
    .select()
    .single();
  if (error) throw error;

  return scimJson(toScimUserResource(data), 201);
}

interface ScimPatchOp {
  op: "replace" | "add" | "remove";
  path?: string;
  value?: unknown;
}

async function handleUpdate(
  sb: any,
  tenantId: string,
  id: string,
  payload: any,
  isPatch: boolean,
) {
  const { data: existing, error: exErr } = await sb
    .from("scim_external_users")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
  if (exErr) throw exErr;
  if (!existing) return scimError(404, "User not found");

  let updates: Record<string, unknown> = {};

  if (isPatch && Array.isArray(payload?.Operations)) {
    for (const op of payload.Operations as ScimPatchOp[]) {
      if (op.path === "active") updates.active = Boolean(op.value);
      if (op.path === "userName" || op.path === 'emails[primary eq true].value')
        updates.email = String(op.value);
      if (op.path === "name.givenName") updates.given_name = String(op.value);
      if (op.path === "name.familyName") updates.family_name = String(op.value);
      if (op.path === "displayName") updates.display_name = String(op.value);
      if (!op.path && op.op === "replace" && typeof op.value === "object") {
        Object.assign(updates, mapScimFields(op.value as ScimUserPayload));
      }
    }
  } else {
    // PUT: full replacement
    updates = mapScimFields(payload as ScimUserPayload);
  }
  updates.raw = payload;

  const { data, error } = await sb
    .from("scim_external_users")
    .update(updates)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();
  if (error) throw error;

  return scimJson(toScimUserResource(data));
}

function mapScimFields(p: ScimUserPayload): Record<string, unknown> {
  return {
    email:
      p.emails?.find((e) => e.primary)?.value ?? p.emails?.[0]?.value ?? p.userName,
    given_name: p.name?.givenName ?? null,
    family_name: p.name?.familyName ?? null,
    display_name: p.displayName ?? null,
    active: p.active ?? true,
  };
}

async function handleDelete(sb: any, tenantId: string, id: string) {
  // Soft-disable per SCIM convention (don't hard delete — audit trail).
  const { error } = await sb
    .from("scim_external_users")
    .update({ active: false })
    .eq("id", id)
    .eq("tenant_id", tenantId);
  if (error) throw error;
  return new Response(null, { status: 204, headers: scimHeaders });
}
