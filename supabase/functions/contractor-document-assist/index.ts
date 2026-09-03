import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { logAiUsage } from "../_shared/aiUsage.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json" },
});

const system = `You are the projOS Contractor Readiness document assistant. Analyze only the supplied document and verified database metadata. Do not use outside information. Return ONLY strict JSON with this shape:
{"document_type":"","company_name":"","identifier":"","issuing_authority":"","issue_date":"YYYY-MM-DD or null","expiration_date":"YYYY-MM-DD or null","coverage_amount":null,"named_insured":"","project_reference":"","observations":[""],"contradictions":[""],"confidence":0,"requires_human_review":true}

Never approve, verify, qualify, reject, or make a legal conclusion. Never invent missing values. Use null or an empty string for anything not visible. Flag name mismatches, unreadable pages, expired dates, missing dates, and document-type mismatches as contradictions. AI output is a draft for human review.`;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function parseJson(value: string): Record<string, unknown> {
  const cleaned = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const parsed = JSON.parse(cleaned);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("AI returned an invalid draft");
  return parsed;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authorization = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anthropic = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
    if (!url || !anon || !service || !anthropic) return json({ error: "Document assistance is not configured" }, 500);

    const userDb = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const { data: auth } = await userDb.auth.getUser();
    if (!auth.user) return json({ error: "Authentication required" }, 401);

    const { documentId } = await req.json().catch(() => ({}));
    if (!documentId) return json({ error: "documentId is required" }, 400);
    const { data: document } = await userDb.from("contractor_documents")
      .select("id,tenant_id,organization_id,case_id,document_type,title,storage_path,file_name,mime_type,issue_date,expiration_date,identifier,issuing_authority,verification_status")
      .eq("id", documentId).maybeSingle();
    if (!document) return json({ error: "Document not found" }, 404);
    const { data: canManage } = await userDb.rpc("can_manage_contractor_case", { p_case_id: document.case_id });
    if (canManage !== true) return json({ error: "Manager access is required" }, 403);

    const admin = createClient(url, service);
    const [{ data: file }, { data: org }] = await Promise.all([
      admin.storage.from("contractor-readiness").download(document.storage_path),
      admin.from("organizations").select("name,legal_name").eq("id", document.organization_id).maybeSingle(),
    ]);
    if (!file) return json({ error: "Document file could not be read" }, 404);
    if (file.size > 15 * 1024 * 1024) return json({ error: "Document exceeds the 15 MB review limit" }, 413);
    const mediaType = document.mime_type || file.type;
    if (!["application/pdf","image/jpeg","image/png","image/webp"].includes(mediaType)) {
      return json({ error: "AI review supports PDF, JPG, PNG, and WebP documents." }, 415);
    }

    const contentBlock = mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: bytesToBase64(new Uint8Array(await file.arrayBuffer())) } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data: bytesToBase64(new Uint8Array(await file.arrayBuffer())) } };
    const model = "claude-sonnet-4-6";
    const started = Date.now();
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": anthropic, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model, max_tokens: 1000, system,
        messages: [{ role: "user", content: [
          contentBlock,
          { type: "text", text: `Verified metadata: ${JSON.stringify({
            expected_company: org?.legal_name || org?.name,
            expected_document_type: document.document_type,
            supplied_title: document.title,
            supplied_issue_date: document.issue_date,
            supplied_expiration_date: document.expiration_date,
            supplied_identifier: document.identifier,
            supplied_issuing_authority: document.issuing_authority,
          })}` },
        ] }],
      }),
    });
    if (!response.ok) return json({ error: `AI document review failed (${response.status})` }, 502);
    const result = await response.json();
    const suggestion = parseJson(result.content?.[0]?.text || "{}");
    await logAiUsage({
      req, skill: "contractor_document_assist", model, anthropicJson: result,
      projectId: null, tenantId: document.tenant_id, userId: auth.user.id,
      latencyMs: Date.now() - started,
    });
    const { error: updateError } = await userDb.from("contractor_documents").update({
      ai_extracted_data: suggestion,
      ai_reviewed_at: new Date().toISOString(),
      verification_status: document.verification_status === "uploaded" ? "under_review" : document.verification_status,
    }).eq("id", document.id);
    if (updateError) throw updateError;
    return json({ ok: true, suggestion });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Document review failed" }, 500);
  }
});
