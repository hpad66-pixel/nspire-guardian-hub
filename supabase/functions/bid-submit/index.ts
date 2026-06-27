import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const admin = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const token: string | undefined = body?.token;
    if (!token || typeof token !== "string") return json({ error: "Missing token" }, 400);

    const db = admin();
    const { data: pkg } = await db.from("bid_packages")
      .select("id, tenant_id, project_id, title, trade, scope, due_date, status")
      .eq("token", token).maybeSingle();
    if (!pkg) return json({ error: "This bid link is invalid." }, 404);

    let projectName = "the project";
    const { data: pr } = await db.from("projects").select("name").eq("id", pkg.project_id).maybeSingle();
    if (pr?.name) projectName = pr.name;

    // INFO request (no bid amount): return the package so the page can render.
    if (body?.bid_amount == null && !body?.vendor_name) {
      return json({ ok: true, title: pkg.title, trade: pkg.trade, scope: pkg.scope, due_date: pkg.due_date, projectName, open: pkg.status === "open" });
    }

    if (pkg.status !== "open") return json({ error: "This package is no longer accepting bids." }, 409);

    const vendor_name = String(body.vendor_name ?? "").trim();
    if (!vendor_name) return json({ error: "Please enter your name." }, 400);
    const amount = Number(body.bid_amount);
    if (!Number.isFinite(amount) || amount <= 0) return json({ error: "Please enter a valid bid amount." }, 400);

    const { error } = await db.from("bid_invitees").insert({
      tenant_id: pkg.tenant_id,
      bid_package_id: pkg.id,
      vendor_name,
      vendor_company: body.vendor_company ? String(body.vendor_company).slice(0, 200) : null,
      vendor_email: body.vendor_email ? String(body.vendor_email).slice(0, 200) : null,
      bid_amount: amount,
      notes: body.notes ? String(body.notes).slice(0, 2000) : null,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    });
    if (error) return json({ error: "Could not record your bid. Please try again." }, 500);

    return json({ ok: true, projectName, title: pkg.title });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
