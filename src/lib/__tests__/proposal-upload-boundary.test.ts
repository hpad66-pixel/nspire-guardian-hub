import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const generatorPage = readFileSync("src/pages/projects/financial/ProposalGeneratorPage.tsx", "utf8");
const builderPage = readFileSync("src/pages/projects/financial/ProposalBuilderPage.tsx", "utf8");
const invoiceBuilder = readFileSync("src/components/projects/invoicing/ConsultingInvoiceBuilder.tsx", "utf8");
const edgeFunction = readFileSync("supabase/functions/draft-financial-proposal/index.ts", "utf8");

describe("proposal upload boundary", () => {
  it("keeps uploaded signed proposals as source records with manual value entry", () => {
    expect(generatorPage).not.toContain("signed_upload_extract");
    expect(generatorPage).toContain("No AI will read it, rewrite it, or extract from it");
    expect(generatorPage).toContain("Your team types the approved value lines below");
    expect(generatorPage).toContain("mode: \"scratch_draft\"");
  });

  it("tells staff that AI writing is for scratch proposals only", () => {
    expect(generatorPage).toContain("Use AI only when writing from scratch");
    expect(generatorPage).toContain("AI is allowed here because this path creates a new proposal from scratch");
    expect(builderPage).toContain("Uploads are source records, not AI writing prompts");
    expect(invoiceBuilder).toContain("Choose one path: write from scratch with AI, or upload the already signed proposal as the permanent source record");
    expect(invoiceBuilder).toContain("type the approved value lines by hand and select contractors or consultants from the project directory");
  });

  it("blocks signed-upload extraction at the edge function", () => {
    expect(edgeFunction).not.toContain("signed_upload_extract");
    expect(edgeFunction).toContain("AI drafting is only available for proposals written from scratch");
    expect(edgeFunction).toContain("signed or executed client proposals are not processed here");
  });
});
