import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const safeName = (value: string) => value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "document";
const allowedTypes = new Set([
  "application/pdf", "image/jpeg", "image/png", "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body.token ?? "");
    const action = String(body.action ?? "view");
    if (!token) return json({ error: "Secure link is required" }, 400);

    const db = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const tokenHash = await sha256(token);
    const { data: access } = await db.from("contractor_portal_links")
      .select("id,tenant_id,case_id,email,role,expires_at,revoked_at,use_count")
      .eq("token_hash", tokenHash).maybeSingle();
    if (!access || access.revoked_at || new Date(access.expires_at).getTime() <= Date.now()) {
      return json({ error: "This secure link is invalid or has expired. Ask APAS for a new link." }, 401);
    }

    const { data: qualification } = await db.from("contractor_qualification_cases")
      .select("id,tenant_id,organization_id,client_id,project_id,scope_type,status,score,work_ready,contract_ready,payment_ready,submitted_at")
      .eq("id", access.case_id).eq("tenant_id", access.tenant_id).maybeSingle();
    if (!qualification) return json({ error: "Qualification request was not found" }, 404);

    if (access.role === "broker" && !["view", "upload_intent", "complete_upload", "save_response", "acknowledge", "comment"].includes(action)) {
      return json({ error: "Broker links may upload insurance evidence and answer checklist questions only." }, 403);
    }
    if (qualification.status === "under_review" && !["view", "comment"].includes(action)) {
      return json({ error: "This package is under review. APAS will reopen an item if a correction is needed." }, 409);
    }

    const touch = () => db.from("contractor_portal_links").update({
      last_used_at: new Date().toISOString(),
      use_count: (access as any).use_count ? Number((access as any).use_count) + 1 : 1,
    }).eq("id", access.id);

    if (action === "view") {
      const [{ data: org }, { data: profile }, { data: project }, { data: client }, { data: requirements }, { data: comments }, { data: contacts }, { data: portfolio }] = await Promise.all([
        db.from("organizations").select("id,name,legal_name,email,phone,website,address_line1,address_line2,city,state,postal_code,country").eq("id", qualification.organization_id).maybeSingle(),
        db.from("contractor_profiles").select("dba_name,description,trade_categories,service_areas,year_established,employee_count,annual_capacity_cents,largest_project_cents,portfolio_url,emergency_phone,profile_status").eq("organization_id", qualification.organization_id).maybeSingle(),
        qualification.project_id ? db.from("projects").select("id,name").eq("id", qualification.project_id).maybeSingle() : Promise.resolve({ data: null }),
        qualification.client_id ? db.from("clients").select("id,name").eq("id", qualification.client_id).maybeSingle() : Promise.resolve({ data: null }),
        db.from("contractor_case_requirements")
          .select("id,requirement_code,title,description,category,gate_type,required,legally_required,verification_required,expiration_required,response_type,response_text,response_submitted_at,response_submitted_by_name,response_submitted_by_email,instructions,sort_order,status,current_document_id,due_date,waiver_reason")
          .eq("case_id", qualification.id).order("sort_order"),
        db.from("contractor_requirement_comments")
          .select("id,requirement_id,author_type,author_name,body,created_at")
          .eq("tenant_id", qualification.tenant_id).order("created_at"),
        db.from("contractor_contacts").select("id,name,email,phone,role,is_primary,can_manage_documents").eq("organization_id", qualification.organization_id).order("is_primary", { ascending: false }),
        db.from("contractor_portfolio_items").select("id,project_name,client_name,trade_scope,location,completed_on,contract_value_cents,reference_name,reference_email,reference_phone,notes").eq("organization_id", qualification.organization_id).order("completed_on", { ascending: false }),
      ]);
      const documentIds = (requirements ?? []).map((r: any) => r.current_document_id).filter(Boolean);
      const { data: documents } = documentIds.length
        ? await db.from("contractor_documents")
          .select("id,document_type,title,file_name,mime_type,file_size,issue_date,expiration_date,identifier,issuing_authority,coverage_amount_cents,verification_status,rejection_reason,created_at")
          .in("id", documentIds)
        : { data: [] };
      await touch();
      return json({
        ok: true,
        access: { email: access.email, role: access.role, expires_at: access.expires_at },
        qualification,
        organization: org,
        profile,
        project,
        client,
        requirements,
        documents,
        comments: (comments ?? []).filter((c: any) => (requirements ?? []).some((r: any) => r.id === c.requirement_id)),
        contacts,
        portfolio,
      });
    }

    if (action === "update_company") {
      const orgPatch: Record<string, unknown> = {};
      for (const field of ["legal_name","email","phone","website","address_line1","address_line2","city","state","postal_code","country"]) {
        if (field in (body.organization ?? {})) orgPatch[field] = String(body.organization[field] ?? "").trim() || null;
      }
      if (Object.keys(orgPatch).length) await db.from("organizations").update(orgPatch).eq("id", qualification.organization_id).eq("tenant_id", qualification.tenant_id);

      // Keep the invitation recipient as the durable primary contact in the
      // tenant's contractor portfolio instead of leaving contact data inside
      // a one-time onboarding link.
      const contactName = String(body.actorName ?? "").trim() || access.email;
      const contactEmail = String((body.organization ?? {}).email ?? access.email).trim().toLowerCase();
      const contactPhone = String((body.organization ?? {}).phone ?? "").trim() || null;
      const { data: primaryContact } = await db.from("contractor_contacts")
        .select("id").eq("organization_id", qualification.organization_id)
        .eq("is_primary", true).maybeSingle();
      if (primaryContact?.id) {
        await db.from("contractor_contacts").update({
          name: contactName, email: contactEmail, phone: contactPhone,
          can_manage_documents: true, updated_at: new Date().toISOString(),
        }).eq("id", primaryContact.id);
      } else {
        await db.from("contractor_contacts").insert({
          tenant_id: qualification.tenant_id,
          organization_id: qualification.organization_id,
          name: contactName, email: contactEmail, phone: contactPhone,
          role: "primary", is_primary: true, can_manage_documents: true,
        });
      }

      const profilePatch: Record<string, unknown> = {};
      for (const field of ["dba_name","description","portfolio_url","emergency_phone"]) {
        if (field in (body.profile ?? {})) profilePatch[field] = String(body.profile[field] ?? "").trim() || null;
      }
      for (const field of ["year_established","employee_count","annual_capacity_cents","largest_project_cents"]) {
        if (field in (body.profile ?? {})) profilePatch[field] = body.profile[field] === null || body.profile[field] === "" ? null : Number(body.profile[field]);
      }
      for (const field of ["trade_categories","service_areas"]) {
        if (field in (body.profile ?? {})) profilePatch[field] = Array.isArray(body.profile[field]) ? body.profile[field].map(String).filter(Boolean).slice(0, 30) : [];
      }
      if (Object.keys(profilePatch).length) {
        await db.from("contractor_profiles").upsert({
          tenant_id: qualification.tenant_id,
          organization_id: qualification.organization_id,
          profile_status: "active",
          ...profilePatch,
        }, { onConflict: "tenant_id,organization_id" });
      }
      await db.from("contractor_qualification_cases").update({ status: "in_progress" }).eq("id", qualification.id).in("status", ["draft","invited"]);
      await db.from("contractor_activity_log").insert({
        tenant_id: qualification.tenant_id, case_id: qualification.id,
        organization_id: qualification.organization_id, actor_type: access.role,
        actor_name: body.actorName || null, action: "company_profile_updated",
        entity_type: "contractor_profile",
      });
      return json({ ok: true });
    }

    if (action === "upload_intent") {
      const requirementId = String(body.requirementId ?? "");
      const fileName = safeName(String(body.fileName ?? "document"));
      const mimeType = String(body.mimeType ?? "application/octet-stream");
      const fileSize = Number(body.fileSize ?? 0);
      if (!allowedTypes.has(mimeType)) return json({ error: "Use a PDF, Word document, JPG, PNG, or WebP file." }, 400);
      if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > 15 * 1024 * 1024) return json({ error: "File must be 15 MB or smaller." }, 400);
      const { data: requirement } = await db.from("contractor_case_requirements")
        .select("id,requirement_code,title,current_document_id,response_type")
        .eq("id", requirementId).eq("case_id", qualification.id).maybeSingle();
      if (!requirement) return json({ error: "Checklist item not found" }, 404);
      if (!["document", "either"].includes(requirement.response_type ?? "document")) {
        return json({ error: "This checklist item asks for a written response rather than a document upload." }, 409);
      }
      const path = `${qualification.tenant_id}/${qualification.organization_id}/${qualification.id}/${requirement.requirement_code}/${crypto.randomUUID()}-${fileName}`;
      const { data: signed, error } = await db.storage.from("contractor-readiness").createSignedUploadUrl(path, { upsert: false });
      if (error || !signed) throw error || new Error("Could not prepare upload");
      return json({ ok: true, path, token: signed.token, requirement, bucket: "contractor-readiness" });
    }

    if (action === "complete_upload") {
      const requirementId = String(body.requirementId ?? "");
      const storagePath = String(body.storagePath ?? "");
      const expectedPrefix = `${qualification.tenant_id}/${qualification.organization_id}/${qualification.id}/`;
      if (!storagePath.startsWith(expectedPrefix)) return json({ error: "Invalid upload path" }, 400);
      const { data: requirement } = await db.from("contractor_case_requirements")
        .select("id,requirement_code,title,current_document_id,expiration_required,response_type,verification_required")
        .eq("id", requirementId).eq("case_id", qualification.id).maybeSingle();
      if (!requirement) return json({ error: "Checklist item not found" }, 404);
      if (!["document", "either"].includes(requirement.response_type ?? "document")) {
        return json({ error: "This checklist item does not accept document uploads." }, 409);
      }
      const expirationDate = body.expirationDate ? String(body.expirationDate) : null;
      if (requirement.expiration_required && !expirationDate) return json({ error: "Expiration date is required for this document." }, 400);
      if (expirationDate && expirationDate < new Date().toISOString().slice(0, 10)) return json({ error: "This document is already expired." }, 400);

      const { data: fileList } = await db.storage.from("contractor-readiness").list(
        storagePath.split("/").slice(0, -1).join("/"),
        { search: storagePath.split("/").at(-1) },
      );
      if (!fileList?.length) return json({ error: "Uploaded file could not be confirmed." }, 409);

      if (requirement.current_document_id) {
        await db.from("contractor_documents").update({ verification_status: "superseded" }).eq("id", requirement.current_document_id);
      }
      const completionStatus = requirement.verification_required ? "submitted" : "verified";
      const { data: document, error } = await db.from("contractor_documents").insert({
        tenant_id: qualification.tenant_id,
        organization_id: qualification.organization_id,
        case_id: qualification.id,
        document_type: requirement.requirement_code,
        title: requirement.title,
        storage_path: storagePath,
        file_name: String(body.fileName ?? storagePath.split("/").at(-1)),
        mime_type: body.mimeType || null,
        file_size: Number(body.fileSize ?? 0) || null,
        issue_date: body.issueDate || null,
        expiration_date: expirationDate,
        identifier: String(body.identifier ?? "").trim() || null,
        issuing_authority: String(body.issuingAuthority ?? "").trim() || null,
        source: access.role === "broker" ? "broker" : "contractor",
        uploaded_by_email: access.email,
        verification_status: completionStatus,
        verification_source: requirement.verification_required ? null : "automatic_portal_rule",
        verified_at: requirement.verification_required ? null : new Date().toISOString(),
        supersedes_document_id: requirement.current_document_id,
      }).select("id").single();
      if (error || !document) throw error || new Error("Could not record upload");
      await db.from("contractor_case_requirements").update({
        current_document_id: document.id,
        status: completionStatus,
      }).eq("id", requirement.id);
      await db.from("contractor_qualification_cases").update({ status: "in_progress" }).eq("id", qualification.id).in("status", ["draft","invited"]);
      await db.from("contractor_activity_log").insert({
        tenant_id: qualification.tenant_id, case_id: qualification.id,
        organization_id: qualification.organization_id, actor_type: access.role,
        actor_name: body.actorName || null, action: "document_uploaded",
        entity_type: "contractor_document", entity_id: document.id,
        details: { requirement_id: requirement.id, document_type: requirement.requirement_code },
      });
      return json({ ok: true, documentId: document.id });
    }

    if (action === "save_response") {
      const requirementId = String(body.requirementId ?? "");
      const responseText = String(body.responseText ?? "").trim();
      if (!responseText || responseText.length > 5000) {
        return json({ error: "Enter a response under 5,000 characters." }, 400);
      }
      const { data: requirement } = await db.from("contractor_case_requirements")
        .select("id,response_type,verification_required")
        .eq("id", requirementId).eq("case_id", qualification.id).maybeSingle();
      if (!requirement) return json({ error: "Checklist item not found" }, 404);
      if (!["questionnaire", "either"].includes(requirement.response_type ?? "document")) {
        return json({ error: "This checklist item requires a document upload." }, 409);
      }
      await db.from("contractor_case_requirements").update({
        response_text: responseText,
        response_submitted_at: new Date().toISOString(),
        response_submitted_by_name: String(body.actorName ?? "").trim() || null,
        response_submitted_by_email: access.email,
        status: requirement.verification_required ? "submitted" : "verified",
        updated_at: new Date().toISOString(),
      }).eq("id", requirement.id);
      await db.from("contractor_qualification_cases").update({ status: "in_progress" })
        .eq("id", qualification.id).in("status", ["draft", "invited"]);
      await db.from("contractor_activity_log").insert({
        tenant_id: qualification.tenant_id, case_id: qualification.id,
        organization_id: qualification.organization_id, actor_type: access.role,
        actor_name: body.actorName || null, action: "written_response_submitted",
        entity_type: "contractor_requirement", entity_id: requirement.id,
      });
      return json({ ok: true });
    }

    if (action === "acknowledge") {
      const requirementId = String(body.requirementId ?? "");
      const { data: requirement } = await db.from("contractor_case_requirements")
        .select("id,response_type,verification_required")
        .eq("id", requirementId).eq("case_id", qualification.id).maybeSingle();
      if (!requirement) return json({ error: "Checklist item not found" }, 404);
      if (requirement.response_type !== "acknowledgement") {
        return json({ error: "This checklist item is not an acknowledgement." }, 409);
      }
      const actorName = String(body.actorName ?? "").trim() || access.email;
      const submittedAt = new Date().toISOString();
      await db.from("contractor_case_requirements").update({
        response_text: `Acknowledged by ${actorName}`,
        response_submitted_at: submittedAt,
        response_submitted_by_name: actorName,
        response_submitted_by_email: access.email,
        status: requirement.verification_required ? "submitted" : "verified",
        updated_at: submittedAt,
      }).eq("id", requirement.id);
      await db.from("contractor_qualification_cases").update({ status: "in_progress" })
        .eq("id", qualification.id).in("status", ["draft", "invited"]);
      await db.from("contractor_activity_log").insert({
        tenant_id: qualification.tenant_id, case_id: qualification.id,
        organization_id: qualification.organization_id, actor_type: access.role,
        actor_name: actorName, action: "requirement_acknowledged",
        entity_type: "contractor_requirement", entity_id: requirement.id,
      });
      return json({ ok: true });
    }

    if (action === "comment") {
      const requirementId = String(body.requirementId ?? "");
      const comment = String(body.comment ?? "").trim();
      if (!comment || comment.length > 5000) return json({ error: "Enter a comment under 5,000 characters." }, 400);
      const { data: requirement } = await db.from("contractor_case_requirements").select("id").eq("id", requirementId).eq("case_id", qualification.id).maybeSingle();
      if (!requirement) return json({ error: "Checklist item not found" }, 404);
      await db.from("contractor_requirement_comments").insert({
        tenant_id: qualification.tenant_id, requirement_id: requirement.id,
        author_type: access.role, author_name: body.actorName || null,
        author_email: access.email, body: comment,
      });
      return json({ ok: true });
    }

    if (action === "add_portfolio") {
      const projectName = String(body.projectName ?? "").trim();
      if (!projectName) return json({ error: "Project name is required" }, 400);
      await db.from("contractor_portfolio_items").insert({
        tenant_id: qualification.tenant_id,
        organization_id: qualification.organization_id,
        project_name: projectName,
        client_name: String(body.clientName ?? "").trim() || null,
        trade_scope: String(body.tradeScope ?? "").trim() || null,
        location: String(body.location ?? "").trim() || null,
        completed_on: body.completedOn || null,
        reference_name: String(body.referenceName ?? "").trim() || null,
        reference_email: String(body.referenceEmail ?? "").trim() || null,
        reference_phone: String(body.referencePhone ?? "").trim() || null,
        notes: String(body.notes ?? "").trim() || null,
      });
      return json({ ok: true });
    }

    if (action === "submit") {
      const { data: incomplete } = await db.from("contractor_case_requirements")
        .select("title,status").eq("case_id", qualification.id).eq("required", true)
        .in("status", ["missing","requested","needs_correction","expired"]);
      if (incomplete?.length) return json({
        error: "Complete every required checklist item before submitting.",
        incomplete: incomplete.map((r: any) => r.title),
      }, 409);
      await db.from("contractor_qualification_cases").update({
        status: "under_review", submitted_at: new Date().toISOString(),
      }).eq("id", qualification.id);
      await db.from("contractor_case_requirements").update({ status: "under_review" })
        .eq("case_id", qualification.id).eq("status", "submitted");
      await db.from("contractor_activity_log").insert({
        tenant_id: qualification.tenant_id, case_id: qualification.id,
        organization_id: qualification.organization_id, actor_type: access.role,
        actor_name: body.actorName || null, action: "qualification_submitted",
        entity_type: "qualification_case", entity_id: qualification.id,
      });
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Request failed" }, 500);
  }
});
