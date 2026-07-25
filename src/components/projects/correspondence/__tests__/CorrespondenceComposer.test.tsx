/**
 * Render smoke test for the correspondence composer — mounts it open with all
 * data hooks + the PDF path mocked, so a regression fails CI instead of the page.
 */
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@/hooks/useSendEmail", () => ({ useSendEmail: () => ({ mutateAsync: vi.fn(), isPending: false }) }));
vi.mock("@/hooks/useProjectEmails", () => ({ useProjectEmails: () => ({ create: { mutateAsync: vi.fn() }, update: { mutateAsync: vi.fn() } }) }));
vi.mock("@/hooks/useCorrespondenceTemplates", () => ({ useCorrespondenceTemplates: () => ({ data: [], create: { mutateAsync: vi.fn() } }) }));
vi.mock("@/lib/reports/reportPdf", () => ({ downloadReportPdf: vi.fn(), reportPdfBase64: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: vi.fn() }, auth: { getUser: vi.fn() } } }));

import { CorrespondenceComposer } from "../CorrespondenceComposer";

describe("CorrespondenceComposer", () => {
  it("renders the composer with the three outbound actions", () => {
    render(<CorrespondenceComposer open onOpenChange={() => {}} projectId="p1" projectName="Loreato Water Meters" />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("Compose correspondence");
    expect(text).toContain("AI draft");
    expect(text).toContain("Download PDF");
    expect(text).toContain("Send via Gmail");
    expect(text).toContain("Send email");
  });
});
