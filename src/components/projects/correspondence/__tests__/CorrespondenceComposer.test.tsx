/**
 * Render smoke test for the correspondence composer — mounts it open with all
 * data hooks + the PDF path mocked, so a regression fails CI instead of the page.
 */
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@/hooks/useSendEmail", () => ({ useSendEmail: () => ({ mutateAsync: vi.fn(), isPending: false }) }));
vi.mock("@/hooks/useSendViaGmail", () => ({ useSendViaGmail: () => ({ mutateAsync: vi.fn(), isPending: false }) }));
vi.mock("@/hooks/useGmailConnection", () => ({
  useGmailConnection: () => ({ status: { data: { connected: false, email: null } }, connect: { mutate: vi.fn() } }),
}));
vi.mock("@/hooks/useProjectEmails", () => ({ useProjectEmails: () => ({ create: { mutateAsync: vi.fn() }, update: { mutateAsync: vi.fn() } }) }));
vi.mock("@/hooks/useCorrespondenceTemplates", () => ({ useCorrespondenceTemplates: () => ({ data: [], create: { mutateAsync: vi.fn() } }) }));
vi.mock("@/hooks/useSavedRecipients", () => ({
  useSavedRecipients: () => ({ data: [], remember: { mutateAsync: vi.fn() }, rememberAll: vi.fn(), remove: { mutateAsync: vi.fn() } }),
}));
vi.mock("@/lib/correspondence/letterPdf", () => ({ downloadLetterPdf: vi.fn(), letterPdfBase64: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: vi.fn() }, auth: { getUser: vi.fn() } } }));
// The real rich-text editor mounts a TipTap instance — heavier than a render
// smoke test needs and not the thing under test here, so stub it.
vi.mock("@/components/ui/rich-text-editor", () => ({
  ProRichTextEditor: ({ content, onChange }: { content: string; onChange: (v: string) => void }) => (
    <textarea data-testid="letter-body" value={content} onChange={(e) => onChange(e.target.value)} />
  ),
}));

import { CorrespondenceComposer } from "../CorrespondenceComposer";

describe("CorrespondenceComposer", () => {
  it("renders the composer with the three outbound actions", () => {
    render(<CorrespondenceComposer open onOpenChange={() => {}} projectId="p1" projectName="Glorieta Sewer Extension" />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("Compose correspondence");
    expect(text).toContain("AI draft");
    expect(text).toContain("Download PDF");
    expect(text).toContain("Send via Gmail");
    expect(text).toContain("Send email");
  });
});
