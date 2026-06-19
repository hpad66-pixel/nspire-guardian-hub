#!/usr/bin/env node
/**
 * Import the three extracted invoices into the live Supabase project (Stack A).
 *
 * Idempotent: re-running upserts by natural keys and skips existing rows, so it
 * is safe to run repeatedly. Uploads the original PDFs to the project-artifacts
 * bucket and links each financial record to its source document.
 *
 * Requires (service role bypasses RLS — get the key from the Supabase dashboard
 * → Project Settings → API):
 *     export SUPABASE_URL="https://xlfwzqpixlrnntzqhvcm.supabase.co"
 *     export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
 *
 * Run:
 *     node scripts/invoices/import_to_supabase.mjs
 *
 * Prereq: `python3 scripts/invoices/extract_invoices.py` (produces extracted.json),
 * and `npm i` so @supabase/supabase-js is available.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, "source");
const PROPERTY_NAMES = ["Glorieta Gardens", "Glorieta Gardens Apartments", "Glorieta Garden"];

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("✗ Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars first.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const extracted = JSON.parse(readFileSync(join(__dirname, "extracted.json"), "utf8"));
const byInvNo = (n) => extracted.invoices.find((i) => i.invoice_number === n);

function fail(msg, e) { console.error(`✗ ${msg}`, e?.message ?? e ?? ""); process.exit(1); }

async function resolveProject() {
  for (const name of PROPERTY_NAMES) {
    const { data: prop } = await db.from("properties")
      .select("id, workspace_id, name").ilike("name", name).maybeSingle();
    if (prop) {
      const { data: proj } = await db.from("projects")
        .select("id, name, property_id").eq("property_id", prop.id)
        .order("created_at", { ascending: true }).limit(1).maybeSingle();
      if (proj) return { projectId: proj.id, tenantId: prop.workspace_id, propName: prop.name };
    }
  }
  fail(`No Glorieta project found (looked for properties: ${PROPERTY_NAMES.join(", ")}).`);
}

async function upsertContract(tenantId, projectId, c) {
  const { data: existing } = await db.from("project_contracts")
    .select("id").eq("project_id", projectId).eq("contract_number", c.contract_number).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await db.from("project_contracts")
    .insert({ ...c, tenant_id: tenantId, project_id: projectId }).select("id").single();
  if (error) fail(`contract ${c.contract_number}`, error);
  console.log(`  + contract ${c.contract_number} (${c.contract_title})`);
  return data.id;
}

async function uploadArtifact(tenantId, projectId, fileName, meta) {
  const path = `${tenantId}/${projectId}/${Date.now()}-${fileName}`;
  const bytes = readFileSync(join(SRC, fileName));
  // dedupe by reference_no + title
  const { data: existing } = await db.from("project_artifacts")
    .select("id").eq("project_id", projectId).eq("reference_no", meta.reference_no)
    .eq("title", meta.title).maybeSingle();
  if (existing) return existing.id;
  const up = await db.storage.from("project-artifacts")
    .upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (up.error) fail(`upload ${fileName}`, up.error);
  const { data, error } = await db.from("project_artifacts").insert({
    tenant_id: tenantId, project_id: projectId,
    artifact_type: meta.artifact_type, source_system: "manual",
    title: meta.title, reference_no: meta.reference_no, amount: meta.amount,
    period_date: meta.period_date, file_path: path, file_name: fileName,
    mime_type: "application/pdf", extracted_text: meta.extracted_text,
    tags: ["glorieta", "imported-invoice"],
  }).select("id").single();
  if (error) fail(`artifact ${fileName}`, error);
  console.log(`  + artifact ${fileName}`);
  return data.id;
}

async function upsertInvoice(tenantId, contractId, inv) {
  const { data: existing } = await db.from("contract_invoices")
    .select("id").eq("contract_id", contractId).eq("invoice_number", inv.invoice_number).maybeSingle();
  if (existing) {
    await db.from("contract_invoices").update(inv).eq("id", existing.id);
    return existing.id;
  }
  const { data, error } = await db.from("contract_invoices")
    .insert({ ...inv, tenant_id: tenantId, contract_id: contractId }).select("id").single();
  if (error) fail(`invoice ${inv.invoice_number}`, error);
  console.log(`  + invoice ${inv.invoice_number} (${inv.amount})`);
  return data.id;
}

async function upsertChangeOrder(tenantId, contractId, co) {
  const { data: existing } = await db.from("contract_change_orders")
    .select("id").eq("contract_id", contractId).eq("co_number", co.co_number).maybeSingle();
  if (existing) { await db.from("contract_change_orders").update(co).eq("id", existing.id); return existing.id; }
  const { data, error } = await db.from("contract_change_orders")
    .insert({ ...co, tenant_id: tenantId, contract_id: contractId }).select("id").single();
  if (error) fail(`CO ${co.co_number}`, error);
  console.log(`  + change order ${co.co_number} (${co.amount})`);
  return data.id;
}

async function main() {
  const { projectId, tenantId, propName } = await resolveProject();
  console.log(`Project: ${propName} (project ${projectId}, tenant ${tenantId})\n`);

  // ── Contracts ──────────────────────────────────────────────
  // Owner/prime contract: APAS bills R4 (A/R). Counterparty in subcontractor_*.
  const ownerContractId = await upsertContract(tenantId, projectId, {
    contract_number: "OWN-R4", contract_title: "Glorieta Gardens — Owner Agreement (R4 Capital)",
    contract_type: "prime", status: "executed",
    prime_contractor_name: "APAS Consulting LLC",
    prime_contractor_address: "3256 NW 83 Way, Pembroke Pines, FL 33024",
    prime_contractor_email: "admin@apas.ai",
    subcontractor_name: "R4 Capital C/o R4 GGOL GP LLC",
    subcontractor_address: "780 Third Avenue, New York, NY 11017",
    subcontractor_email: "csullivan@r4cap.com",
    project_address: "13210 Alexandria Dr, Opa-locka, FL 33054",
    retainage_percent: 5.0,
  });
  // Vendor subcontract: ECOTech bills APAS (A/P).
  const ecotechContractId = await upsertContract(tenantId, projectId, {
    contract_number: "SUB-ECOTECH", contract_title: "Eco Tech Consulting — Field Services",
    contract_type: "subcontract", status: "executed",
    prime_contractor_name: "APAS Consulting LLC",
    subcontractor_name: "Eco Tech Consulting, LLC",
    subcontractor_address: "556 NW 53rd Street, Boca Raton, FL 33487",
    project_address: "13210 Alexandria Dr, Opa-locka, FL 33054",
    retainage_percent: 0,
  });

  // ── Source documents (artifacts) ───────────────────────────
  const inv33 = byInvNo("INV-26-33");
  const inv34 = byInvNo("INV-26-34");
  const inv594 = byInvNo("594");

  const art33 = await uploadArtifact(tenantId, projectId, "INV-26-33.pdf", {
    artifact_type: "invoice", title: "INV-26-33 — Turbidity Meter Rental (to R4)",
    reference_no: "INV-26-33", amount: inv33.total, period_date: inv33.issue_date,
    extracted_text: inv33.raw_text,
  });
  const art34 = await uploadArtifact(tenantId, projectId, "INV-26-34.pdf", {
    artifact_type: "invoice", title: "INV-26-34 — Pay App #5 (to R4)",
    reference_no: "INV-26-34", amount: inv34.total, period_date: inv34.issue_date,
    extracted_text: inv34.raw_text,
  });
  const art594 = await uploadArtifact(tenantId, projectId, "ECOTech-594.pdf", {
    artifact_type: "invoice", title: "ECOTech Invoice #594 — Turbidity logistics (from vendor)",
    reference_no: "594", amount: inv594.total, period_date: inv594.issue_date,
    extracted_text: inv594.raw_text,
  });

  // ── Change order (the $2,075 turbidity is extra work billed to the owner) ──
  const coId = await upsertChangeOrder(tenantId, ownerContractId, {
    co_number: "CO-001", description: "Turbidity meter rental & logistics (pass-through, Eco Tech backup)",
    amount: inv33.total, status: "approved", co_date: inv33.issue_date,
    reason: "Owner-requested water-quality monitoring", artifact_id: art33,
  });

  // ── Invoices / pay apps ────────────────────────────────────
  // A/R — Pay App #5 to R4
  await upsertInvoice(tenantId, ownerContractId, {
    invoice_number: "INV-26-34", invoice_date: inv34.issue_date, period_end: inv34.due_date,
    amount: inv34.total, retainage: 0, status: "submitted",
    invoice_kind: "pay_app", pay_app_no: 5,
    notes: "Interim Invoice for Pay App #5", artifact_id: art34,
  });
  // A/R — turbidity invoice to R4, tied to CO-001
  await upsertInvoice(tenantId, ownerContractId, {
    invoice_number: "INV-26-33", invoice_date: inv33.issue_date, period_end: inv33.due_date,
    amount: inv33.total, retainage: 0, status: "submitted",
    invoice_kind: "invoice", notes: "Turbidity Meter Rental",
    change_order_id: coId, artifact_id: art33,
  });
  // A/P — ECOTech vendor bill to APAS
  await upsertInvoice(tenantId, ecotechContractId, {
    invoice_number: "594", invoice_date: inv594.issue_date, period_end: inv594.issue_date,
    amount: inv594.total, retainage: 0, status: "approved",
    invoice_kind: "invoice", notes: inv594.line_items?.[0]?.description ?? "Turbidity meter logistics",
    artifact_id: art594,
  });

  console.log("\n✓ Import complete. Open the project → Financials → Ledger.");
}

main().catch((e) => fail("unexpected", e));
