import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const esc = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function hasExpectedSignature(bytes: Uint8Array, type: string): boolean {
  if (type === "application/pdf") return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  if (type === "image/webp") {
    return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF"
      && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

function requestEmail(input: { recipient: string; vendor: string; project: string; link: string; dueDate?: string | null; message?: string | null }) {
  const due = input.dueDate
    ? `<div style="margin-top:12px;font-weight:700">Requested by ${esc(input.dueDate)}</div>`
    : "";
  const note = input.message
    ? `<div style="margin-top:16px;padding:14px;border-radius:12px;background:#f7f6f2;color:#4c5e58">${esc(input.message)}</div>`
    : "";
  return `<div style="margin:0;background:#f4f2ec;padding:28px 14px;font-family:Inter,Arial,sans-serif;color:#132c25">
    <div style="max-width:620px;margin:auto;overflow:hidden;border:1px solid #e1ded5;border-radius:20px;background:white;box-shadow:0 12px 36px rgba(19,44,37,.08)">
      <div style="padding:24px 28px;background:linear-gradient(135deg,#092d25,#174d40);color:#fff">
        <div style="font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#d7b86a">APAS Project Controls</div>
        <div style="margin-top:8px;font-size:26px;font-weight:800">Invoice requested</div>
        <div style="margin-top:5px;color:#d8e8e2">${esc(input.project)}</div>
      </div>
      <div style="padding:28px">
        <p style="margin:0 0 12px">Hello ${esc(input.recipient)},</p>
        <p style="margin:0;line-height:1.6;color:#4c5e58">Please submit the invoice for <strong>${esc(input.vendor)}</strong> through the secure project link below. It takes only a few minutes and does not require a password.</p>
        ${due}${note}
        <a href="${esc(input.link)}" style="display:inline-block;margin-top:20px;border-radius:12px;background:#16775f;color:white;text-decoration:none;padding:13px 20px;font-weight:800">Upload invoice securely</a>
        <div style="margin-top:20px;padding:14px;border-radius:12px;background:#f7f6f2;color:#66736f;font-size:12px;line-height:1.5">This private, one-time link expires in 14 days. Do not forward it except to an authorized representative of ${esc(input.vendor)}.</div>
      </div>
    </div>
    <p style="text-align:center;color:#7b8581;font-size:11px">Payment is reviewed and authorized separately · Powered by projOS</p>
  </div>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!url || !anon || !service) return json({ error: "Service is not configured" }, 500);
    const admin = createClient(url, service, { auth: { persistSession: false } });
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const formAction = String(form.get("action") ?? "submit");
      let tenantId = "";
      let projectId = "";
      let organizationId = "";
      let vendorName = "Vendor";
      let requestId = "portal";
      let tokenDigest: string | null = null;
      let portalDb: ReturnType<typeof createClient> | null = null;
      let portalUserId: string | null = null;
      if (formAction === "portal-submit") {
        const authorization = req.headers.get("Authorization") ?? "";
        portalDb = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
        const { data: auth } = await portalDb.auth.getUser();
        if (!auth.user) return json({ error: "Subcontractor portal authentication required" }, 401);
        portalUserId = auth.user.id;
        projectId = String(form.get("projectId") ?? "");
        organizationId = String(form.get("organizationId") ?? "");
        const { data: assignment } = await portalDb.from("consulting_vendor_assignments")
          .select("id,tenant_id,project_id,organization_id")
          .eq("project_id", projectId).eq("organization_id", organizationId).eq("is_active", true).maybeSingle();
        if (!assignment) return json({ error: "This company is not assigned to that consulting project" }, 403);
        tenantId = assignment.tenant_id;
        requestId = `portal-${auth.user.id}`;
        const { data: vendor } = await admin.from("organizations").select("name").eq("id", organizationId).single();
        vendorName = vendor?.name ?? "Vendor";
      } else {
        const token = String(form.get("token") ?? "");
        if (token.length < 32 || token.length > 256) return json({ error: "Invalid secure link" }, 400);
        tokenDigest = await sha256(token);
        const request = await loadRequest(admin, tokenDigest);
        if (!request.ok) return json({ error: request.error }, request.status);
        tenantId = request.row.tenant_id;
        projectId = request.row.project_id;
        organizationId = request.row.organization_id;
        vendorName = request.vendorName;
        requestId = request.row.id;
      }

      const file = form.get("file");
      if (!(file instanceof File)) return json({ error: "Choose an invoice PDF or image" }, 400);
      const allowed = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
      if (!allowed.has(file.type)) return json({ error: "Only PDF, JPG, PNG, or WebP invoices are accepted" }, 415);
      if (file.size <= 0 || file.size > 12 * 1024 * 1024) return json({ error: "Invoice file must be 12 MB or smaller" }, 413);

      const invoiceNo = String(form.get("invoiceNo") ?? "").trim();
      const invoiceDate = String(form.get("invoiceDate") ?? "");
      const dueDate = String(form.get("dueDate") ?? "") || null;
      const amount = Number(form.get("amount"));
      const description = String(form.get("description") ?? "").trim();
      const attestedName = String(form.get("attestedName") ?? "").trim();
      if (!invoiceNo || !/^\d{4}-\d{2}-\d{2}$/.test(invoiceDate) || !(amount > 0) || attestedName.length < 3) {
        return json({ error: "Invoice number, date, amount, and authorized submitter are required" }, 400);
      }

      const ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1].replace("jpeg", "jpg");
      const path = `${tenantId}/${projectId}/consulting-vendor-invoices/${requestId}/${crypto.randomUUID()}.${ext}`;
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!hasExpectedSignature(bytes, file.type)) return json({ error: "The selected file content does not match its file type" }, 415);
      const { error: uploadError } = await admin.storage.from("project-artifacts")
        .upload(path, bytes, { contentType: file.type, cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;

      const safeName = file.name.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 180) || `invoice.${ext}`;
      const { data: artifact, error: artifactError } = await admin.from("project_artifacts").insert({
        tenant_id: tenantId,
        project_id: projectId,
        artifact_type: "invoice",
        source_system: "manual",
        title: `${vendorName} invoice ${invoiceNo}`,
        description: formAction === "portal-submit"
          ? "Submitted by an authenticated consulting vendor portal member"
          : "Submitted through a scoped, one-time consulting vendor invoice request",
        period_date: invoiceDate,
        reference_no: invoiceNo,
        amount: Math.round(amount * 100) / 100,
        file_path: path,
        file_name: safeName,
        file_size: file.size,
        mime_type: file.type,
        tags: ["consulting", "vendor-invoice", "vendor-attested"],
        created_by: portalUserId,
      }).select("id").single();
      if (artifactError || !artifact) {
        await admin.storage.from("project-artifacts").remove([path]);
        throw artifactError ?? new Error("Invoice artifact was not created");
      }

      const common = {
        p_invoice_artifact_id: artifact.id, p_invoice_no: invoiceNo,
        p_invoice_date: invoiceDate, p_due_date: dueDate,
        p_amount: Math.round(amount * 100) / 100,
        p_description: description || null, p_attested_name: attestedName,
      };
      const response = formAction === "portal-submit"
        ? await portalDb!.rpc("submit_consulting_portal_invoice", {
            p_project_id: projectId, p_organization_id: organizationId, ...common,
          })
        : await admin.rpc("submit_consulting_invoice_request", {
            p_token_digest: tokenDigest, ...common,
          });
      const { data: costId, error: submitError } = response;
      if (submitError) {
        await admin.from("project_artifacts").delete().eq("id", artifact.id);
        await admin.storage.from("project-artifacts").remove([path]);
        throw submitError;
      }
      return json({ ok: true, costId });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "load");
    if (action === "request") {
      const authorization = req.headers.get("Authorization") ?? "";
      const userDb = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
      const { data: auth } = await userDb.auth.getUser();
      if (!auth.user) return json({ error: "Authentication required" }, 401);
      const projectId = String(body.projectId ?? "");
      const organizationId = String(body.organizationId ?? "");
      const email = String(body.email ?? "").trim().toLowerCase();
      if (!projectId || !organizationId || !/^\S+@\S+\.\S+$/.test(email)) {
        return json({ error: "Project, vendor, and a valid email are required" }, 400);
      }
      const rawToken = newToken();
      const tokenDigest = await sha256(rawToken);
      const { data: requestId, error: createError } = await userDb.rpc("create_consulting_invoice_request", {
        p_project_id: projectId,
        p_organization_id: organizationId,
        p_recipient_email: email,
        p_token_digest: tokenDigest,
        p_due_date: body.dueDate || null,
        p_message: body.message || null,
      });
      if (createError) return json({ error: createError.message }, 403);
      const [{ data: project }, { data: vendor }] = await Promise.all([
        admin.from("projects").select("name").eq("id", projectId).single(),
        admin.from("organizations").select("name").eq("id", organizationId).single(),
      ]);
      const origin = Deno.env.get("PUBLIC_APP_URL") || Deno.env.get("SITE_URL") || "https://projos.ai";
      const link = `${origin}/vendor/consulting-invoice/${rawToken}`;
      let emailSent = false;
      let deliveryError: string | null = null;
      const resend = Deno.env.get("RESEND_API_KEY");
      if (resend) {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resend}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "APAS Project Controls <hardeep@apas.ai>",
            to: [email],
            subject: `Invoice requested for ${project?.name ?? "your project"}`,
            html: requestEmail({
              recipient: body.recipientName || "there",
              vendor: vendor?.name ?? "your company",
              project: project?.name ?? "Project",
              link,
              dueDate: body.dueDate || null,
              message: body.message || null,
            }),
          }),
        });
        const result = await response.json().catch(() => ({}));
        emailSent = response.ok;
        deliveryError = response.ok ? null : String(result?.message ?? `Email failed (${response.status})`);
      }
      return json({ ok: true, requestId, link, emailSent, deliveryError, expiresInDays: 14 });
    }

    const token = String(body.token ?? "");
    if (token.length < 32 || token.length > 256) return json({ error: "Invalid secure link" }, 400);
    const request = await loadRequest(admin, await sha256(token));
    if (!request.ok) return json({ error: request.error }, request.status);
    return json({
      ok: true,
      projectName: request.projectName,
      vendorName: request.vendorName,
      dueDate: request.row.due_date,
      message: request.row.message,
      expiresAt: request.row.expires_at,
    });
  } catch (error) {
    console.error("consulting-vendor-invoice", error);
    const message = error instanceof Error ? error.message : "Invoice request failed";
    return json({ error: message.replace(/^.*?: /, "") }, 500);
  }
});

async function loadRequest(admin: ReturnType<typeof createClient>, digest: string) {
  const { data: row } = await admin.from("consulting_invoice_requests")
    .select("id,tenant_id,project_id,organization_id,message,due_date,status,expires_at,revoked_at")
    .eq("token_digest", digest).maybeSingle();
  if (!row) return { ok: false as const, status: 404, error: "This secure invoice link is invalid" };
  if (row.revoked_at || row.status === "revoked") return { ok: false as const, status: 410, error: "This secure invoice link was revoked" };
  if (row.status === "submitted") return { ok: false as const, status: 410, error: "This invoice request has already been submitted" };
  if (row.status === "expired" || new Date(row.expires_at) < new Date()) {
    await admin.from("consulting_invoice_requests").update({ status: "expired" }).eq("id", row.id);
    return { ok: false as const, status: 410, error: "This secure invoice link has expired" };
  }
  const [{ data: project }, { data: vendor }] = await Promise.all([
    admin.from("projects").select("name").eq("id", row.project_id).single(),
    admin.from("organizations").select("name").eq("id", row.organization_id).single(),
  ]);
  return { ok: true as const, row, projectName: project?.name ?? "Project", vendorName: vendor?.name ?? "Vendor" };
}
