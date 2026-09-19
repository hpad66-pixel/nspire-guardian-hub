import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const generatorPage = readFileSync("src/pages/projects/financial/ProposalGeneratorPage.tsx", "utf8");
const builderPage = readFileSync("src/pages/projects/financial/ProposalBuilderPage.tsx", "utf8");
const invoiceBuilder = readFileSync("src/components/projects/invoicing/ConsultingInvoiceBuilder.tsx", "utf8");
const edgeFunction = readFileSync("supabase/functions/draft-financial-proposal/index.ts", "utf8");

describe("proposal upload boundary", () => {
  it("keeps uploaded signed proposals as source records and extracts only billing values", () => {
    expect(generatorPage).toContain("mode: intakeMode === \"upload\" ? \"signed_upload_extract\" : \"scratch_draft\"");
    expect(generatorPage).toContain("The original PDF stays permanent. We extract only the Schedule of Values");
    expect(generatorPage).toContain("We do not rewrite the proposal content");
    expect(generatorPage).toContain("overview: intakeMode === \"scratch\" ? (d.overview ?? current.overview) : current.overview");
    expect(generatorPage).toContain("scope_bullets: intakeMode === \"scratch\"");
    expect(generatorPage).toContain("deliverables: intakeMode === \"scratch\"");
    expect(generatorPage).toContain("terms: intakeMode === \"scratch\" ? (d.terms || current.terms) : current.terms");
  });

  it("tells staff that AI writing is for scratch proposals only", () => {
    expect(generatorPage).toContain("Use AI only when writing from scratch");
    expect(generatorPage).toContain("AI is allowed here because this path creates a new proposal from scratch");
    expect(builderPage).toContain("Uploads are source records, not AI writing prompts");
    expect(invoiceBuilder).toContain("Choose one path: write from scratch with AI, or upload the already signed proposal as the permanent source record");
    expect(invoiceBuilder).toContain("build the Schedule of Values only: scope, contractor, source cost, APAS markup, subtotal, and grand total");
  });

  it("instructs the edge function not to rewrite signed uploads", () => {
    expect(edgeFunction).toContain("signed_upload_extract treats the uploaded proposal as the permanent executed");
    expect(edgeFunction).toContain("Do NOT rewrite, improve, summarize, polish, or replace the proposal language");
    expect(edgeFunction).toContain("Extract only the approved Schedule of Values needed for invoicing");
    expect(edgeFunction).toContain("Return empty strings for overview and terms");
  });
});
