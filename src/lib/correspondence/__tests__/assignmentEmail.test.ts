import { describe, expect, it } from "vitest";
import { buildAssignmentEmailHtml, buildAssignmentEmailText } from "../assignmentEmail";
import { DOC_WORKFLOW_META, resolveDocWorkflow } from "../docWorkflow";

describe("buildAssignmentEmailHtml", () => {
  it("renders branded card with due date, assigned date, and CTA", () => {
    const html = buildAssignmentEmailHtml({
      brand: "APAS",
      projectName: "Conveyance & Close-Out",
      taskTitle: "Chase Public Works signoff",
      description: "Follow up on PW 24040057",
      assigneeName: "James",
      assignedByName: "Hardeep Anand",
      assignedAt: "2026-08-31T12:00:00Z",
      dueDate: "2026-09-05",
      priority: "high",
      actionUrl: "https://projos.ai/action/abc",
      hasPortalAccess: false,
    });
    expect(html).toContain("Action item assigned");
    expect(html).toContain("Chase Public Works signoff");
    expect(html).toContain("Conveyance &amp; Close-Out");
    expect(html).toContain("James");
    expect(html).toContain("Hardeep Anand");
    expect(html).toContain("Open action card");
    expect(html).toContain("https://projos.ai/action/abc");
    expect(html).toContain("High");
  });

  it("uses portal CTA when hasPortalAccess", () => {
    const html = buildAssignmentEmailHtml({
      taskTitle: "Review invoice",
      actionUrl: "https://projos.ai/portal/r4?item=1",
      hasPortalAccess: true,
    });
    expect(html).toContain("Open in portal");
  });
});

describe("buildAssignmentEmailText", () => {
  it("includes title, due date, and URL", () => {
    const text = buildAssignmentEmailText({
      taskTitle: "Send as-builts",
      dueDate: "2026-09-01",
      actionUrl: "https://projos.ai/action/xyz",
      projectName: "Sewer Extension",
    });
    expect(text).toContain("Send as-builts");
    expect(text).toContain("Sewer Extension");
    expect(text).toContain("https://projos.ai/action/xyz");
  });
});

describe("resolveDocWorkflow", () => {
  it("prefers executed / sent / signed over stored status", () => {
    expect(resolveDocWorkflow({ client_signed_at: "2026-08-01" })).toBe("executed");
    expect(resolveDocWorkflow({ sent_to_client_at: "2026-08-01" })).toBe("sent");
    expect(resolveDocWorkflow({ contractor_signed_at: "2026-08-01" })).toBe("signed");
    expect(resolveDocWorkflow({ workflow_status: "uploaded", has_original: true })).toBe("uploaded");
    expect(resolveDocWorkflow({ status: "final" })).toBe("drafting");
  });

  it("exposes labels for every workflow status", () => {
    for (const key of Object.keys(DOC_WORKFLOW_META)) {
      expect(DOC_WORKFLOW_META[key as keyof typeof DOC_WORKFLOW_META].label).toBeTruthy();
    }
  });
});
