/**
 * F0 · intake-ingest
 *
 * Three actions (JSON body { action }):
 *  - "provision": mint a per-project intake email + upload token. The plaintext
 *    token is returned ONCE; only its hash is stored (rule 10).
 *  - "revoke": set project_intake.revoked_at.
 *  - "ingest": accept an inbound document (email webhook / folder drop / portal),
 *    verify the project token, store the PDF as a project_artifacts row, create a
 *    vendor_submissions row, classify/parse, and on a confident parse auto-create
 *    a DRAFT commitment_invoice and/or lien_release (never approved, never paid).
 *
 * Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, INTAKE_DOMAIN (optional).
 */
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const INTAKE_DOMAIN = Deno.env.get("INTAKE_DOMAIN") ?? "intake.buildos.app";
const BUCKET = "project-artifacts";

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: cors });

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function randomToken(): string {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── inline classify/parse (mirror of src/lib/financial/intake.ts) ──
function classifyDoc(t: string): "invoice" | "lien_release" | "co_request" | "unknown" {
  const s = t.toLowerCase();
  if (/(lien\s+(waiver|release)|waiver\s+of\s+lien|conditional\s+(waiver|release)|unconditional\s+(waiver|release))/.test(s)) return "lien_release";
  if (/(change\s+order|co\s+request|change\s+proposal|pco)/.test(s)) return "co_request";
  if (/(invoice|pay\s*app|application\s+for\s+payment|amount\s+due|remit)/.test(s)) return "invoice";
  return "unknown";
}
function parseAmount(t: string): number | undefined {
  const labeled = t.match(/\b(?:total|amount\s*due|balance\s*due)\b[^\d$]{0,12}\$?\s*([\d,]+\.\d{2})/i);
  if (labeled) return Number(labeled[1].replace(/,/g, ""));
  const all = [...t.matchAll(/\$\s*([\d,]+\.\d{2})/g)].map((x) => Number(x[1].replace(/,/g, "")));
  return all.length ? Math.max(...all) : undefined;
}
function releaseType(t: string): string | undefined {
  const s = t.toLowerCase();
  const cond = s.includes("unconditional") ? "unconditional" : s.includes("conditional") ? "conditional" : undefined;
  if (!cond) return undefined;
  return `${cond}_${/(final|retainage|retention)/.test(s) ? "final" : "progress"}`;
}

async function getUserTenant(req: Request): Promise<{ userId: string; tenantId: string } | null> {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  const { data: u } = await admin.auth.getUser(auth.replace("Bearer ", ""));
  if (!u?.user) return null;
  const { data: prof } = await admin.from("profiles").select("workspace_id").eq("id", u.user.id).maybeSingle();
  const tenantId = (prof as any)?.workspace_id;
  if (!tenantId) return null;
  return { userId: u.user.id, tenantId };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const action = body?.action;

  // ── provision ──────────────────────────────────────────────
  if (action === "provision") {
    const ctx = await getUserTenant(req);
    if (!ctx) return json({ error: "unauthorized" }, 401);
    const projectId = body.project_id;
    if (!projectId) return json({ error: "missing_project_id" }, 400);

    const token = randomToken();
    const intake_email = `proj-${String(projectId).slice(0, 8)}@${INTAKE_DOMAIN}`;
    const storage_prefix = `${ctx.tenantId}/${projectId}/intake`;
    const intake_token_hash = await sha256Hex(token);

    const { data, error } = await admin.from("project_intake").upsert({
      tenant_id: ctx.tenantId, project_id: projectId, intake_email,
      intake_token_hash, storage_prefix, revoked_at: null, created_by: ctx.userId,
    }, { onConflict: "project_id" }).select("id, tenant_id, project_id, intake_email, storage_prefix, revoked_at, created_at").single();
    if (error) return json({ error: error.message }, 400);
    return json({ intake: data, token }); // token shown once
  }

  // ── revoke ─────────────────────────────────────────────────
  if (action === "revoke") {
    const ctx = await getUserTenant(req);
    if (!ctx) return json({ error: "unauthorized" }, 401);
    const { error } = await admin.from("project_intake")
      .update({ revoked_at: new Date().toISOString() })
      .eq("project_id", body.project_id).eq("tenant_id", ctx.tenantId);
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  // ── ingest (token-authenticated) ───────────────────────────
  if (action === "ingest") {
    const { project_id, token, filename, content_base64, from_email, subject, text } = body;
    if (!project_id || !token) return json({ error: "missing_token" }, 400);

    const { data: intake } = await admin.from("project_intake")
      .select("*").eq("project_id", project_id).maybeSingle();
    if (!intake) return json({ error: "no_intake" }, 404);
    if ((intake as any).revoked_at) return json({ error: "revoked" }, 403);
    if (await sha256Hex(token) !== (intake as any).intake_token_hash)
      return json({ error: "invalid_token" }, 403);

    const tenant_id = (intake as any).tenant_id;

    // Store the PDF if provided.
    let artifact_id: string | null = null;
    if (content_base64 && filename) {
      const bytes = Uint8Array.from(atob(content_base64), (c) => c.charCodeAt(0));
      const path = `${tenant_id}/${project_id}/intake/${Date.now()}-${filename}`;
      const up = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: "application/pdf", upsert: false });
      if (!up.error) {
        const { data: art } = await admin.from("project_artifacts").insert({
          tenant_id, project_id, artifact_type: "invoice", source_system: "manual",
          title: filename.replace(/\.[^.]+$/, ""), file_path: path, file_name: filename,
          mime_type: "application/pdf", extracted_text: text ?? null, tags: ["intake"],
        }).select("id").single();
        artifact_id = (art as any)?.id ?? null;
      }
    }

    const docText = text ?? subject ?? filename ?? "";
    const doc_type = classifyDoc(docText);
    const amount = parseAmount(docText);
    const rtype = releaseType(docText);
    const confident = (doc_type === "invoice" && amount != null) ||
                      (doc_type === "lien_release" && rtype != null);

    const { data: sub, error: subErr } = await admin.from("vendor_submissions").insert({
      tenant_id, project_id, source: "email", from_email: from_email ?? null,
      subject: subject ?? filename ?? null, doc_type,
      status: confident ? "parsed" : "needs_review",
      parsed: { amount, release_type: rtype } as any, artifact_id,
    }).select("id").single();
    if (subErr) return json({ error: subErr.message }, 400);
    const submissionId = (sub as any).id;

    // Auto-create DRAFT records only on a confident parse and a single matchable commitment.
    let created_commitment_invoice_id: string | null = null;
    let created_lien_release_id: string | null = null;
    if (confident) {
      const { data: cmts } = await admin.from("commitments").select("id").eq("project_id", project_id);
      const onlyCommitment = (cmts ?? []).length === 1 ? (cmts as any)[0].id : null;
      if (doc_type === "invoice" && onlyCommitment) {
        const { data: inv } = await admin.from("commitment_invoices").insert({
          tenant_id, commitment_id: onlyCommitment,
          invoice_no: `INTAKE-${submissionId.slice(0, 8)}`,
          period_end: new Date().toISOString().slice(0, 10),
          status: "draft", submitted_amount: amount ?? 0,
          artifact_id, vendor_submission_id: submissionId,
        }).select("id").single();
        created_commitment_invoice_id = (inv as any)?.id ?? null;
      } else if (doc_type === "lien_release") {
        const { data: lr } = await admin.from("lien_releases").insert({
          tenant_id, project_id, direction: "inbound",
          release_type: rtype ?? "conditional_progress",
          commitment_invoice_id: null, status: "pending", amount: amount ?? null, artifact_id,
        }).select("id").single();
        created_lien_release_id = (lr as any)?.id ?? null;
      }
      await admin.from("vendor_submissions").update({
        status: "processed", commitment_id: onlyCommitment,
        created_commitment_invoice_id, created_lien_release_id,
      }).eq("id", submissionId);
    }

    // Best-effort A3 notification (non-fatal).
    try {
      await admin.rpc("resolve_distribution", { p_list_ids: [], p_user_ids: [], p_extra_emails: [] });
    } catch (_) { /* noop */ }

    return json({ submission_id: submissionId, doc_type, confident, created_commitment_invoice_id, created_lien_release_id });
  }

  return json({ error: "unknown_action" }, 400);
});
