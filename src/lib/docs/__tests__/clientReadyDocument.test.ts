import { describe, expect, it } from "vitest";
import { clientReadyDocumentHtml } from "../clientReadyDocument";

describe("clientReadyDocumentHtml", () => {
  it("wraps native documents in readable APAS client letter formatting", () => {
    const html = clientReadyDocumentHtml(
      { title: "Weekly Project Update", source: "blank" },
      "<h2>Decisions needed</h2><p>Approve the meter replacement.</p>",
      "Glorieta Gardens",
    );

    expect(html).toContain("APAS");
    expect(html).toContain("Client document");
    expect(html).toContain("Weekly Project Update");
    expect(html).toContain("Glorieta Gardens");
    expect(html).toContain("Decisions needed");
    expect(html).toContain("font-size:15.5px");
  });

  it("preserves uploaded Word document HTML without adding a second letterhead", () => {
    const source = '<section class="docx">Original letterhead</section>';
    expect(clientReadyDocumentHtml({ title: "Letter", source: "upload_docx" }, source, "R4")).toBe(source);
  });
});
