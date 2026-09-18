import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

function clean(value: unknown, max = 1000): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function splitName(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { first_name: parts[0] || "Unknown", last_name: null };
  return {
    first_name: parts.slice(0, -1).join(" "),
    last_name: parts[parts.length - 1],
  };
}

function validEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

async function marketingWorkspaceId(): Promise<string | null> {
  const { data } = await admin
    .from("workspaces")
    .select("id, slug, name")
    .or("slug.eq.apas,slug.eq.default,name.ilike.%APAS%,name.ilike.%OneWater%")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as { id?: string } | null)?.id ?? "00000000-0000-0000-0000-000000000001";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }

  const name = clean(body.name, 180);
  const email = clean(body.email, 254).toLowerCase();
  const company = clean(body.company, 180) || null;
  const phone = clean(body.phone, 80) || null;
  const interest = clean(body.interest, 160) || "Enterprise deployment";
  const message = clean(body.message, 4000) || null;
  const product = clean(body.product, 80) || "Proj OS";
  const source_path = clean(body.source_path, 240) || null;
  const source_url = clean(body.source_url, 600) || null;

  if (!name || !validEmail(email)) return json({ error: "missing_required_fields" }, 400);

  const workspace_id = await marketingWorkspaceId();
  const noteLines = [
    `Product: ${product}`,
    `Interest: ${interest}`,
    source_url ? `Source: ${source_url}` : null,
    message ? `Message: ${message}` : null,
  ].filter(Boolean);
  const nameParts = splitName(name);

  let crm_contact_id: string | null = null;
  if (workspace_id) {
    const { data: existing } = await admin
      .from("crm_contacts")
      .select("id, notes, tags")
      .eq("workspace_id", workspace_id)
      .ilike("email", email)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      crm_contact_id = existing.id as string;
      const existingTags = Array.isArray(existing.tags) ? existing.tags : [];
      await admin
        .from("crm_contacts")
        .update({
          company_name: company ?? undefined,
          phone: phone ?? undefined,
          notes: [existing.notes, noteLines.join("\n")].filter(Boolean).join("\n\n"),
          tags: Array.from(new Set([...existingTags, "enterprise-lead", "proj-os", "marketing"])),
        })
        .eq("id", crm_contact_id);
    } else {
      const { data: contact, error: contactError } = await admin
        .from("crm_contacts")
        .insert({
          workspace_id,
          first_name: nameParts.first_name,
          last_name: nameParts.last_name,
          company_name: company,
          contact_type: "other",
          email,
          phone,
          notes: noteLines.join("\n"),
          tags: ["enterprise-lead", "proj-os", "marketing", interest.toLowerCase().replace(/[^a-z0-9]+/g, "-")],
          is_active: true,
          is_favorite: false,
        })
        .select("id")
        .single();
      if (!contactError) crm_contact_id = (contact as { id: string }).id;
    }
  }

  const { data, error } = await admin
    .from("marketing_contact_requests")
    .insert({
      workspace_id,
      crm_contact_id,
      product,
      source_path,
      source_url,
      name,
      email,
      company,
      phone,
      interest,
      message,
      status: crm_contact_id ? "contact_created" : "new",
      metadata: {
        userAgent: req.headers.get("user-agent"),
        referer: req.headers.get("referer"),
      },
    })
    .select("id, status, crm_contact_id")
    .single();

  if (error) {
    console.error("[enterprise-contact]", error.message);
    return json({ error: "save_failed" }, 500);
  }

  return json({ ok: true, request: data });
});
