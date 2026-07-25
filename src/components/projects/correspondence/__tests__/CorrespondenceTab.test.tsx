/**
 * Render smoke test for the Correspondence tab — empty state + a populated
 * timeline — so a regression fails CI instead of the project page.
 */
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ProjectEmail } from "@/hooks/useProjectEmails";

let mockEmails: ProjectEmail[] = [];
vi.mock("@/hooks/useProjectEmails", () => ({
  useProjectEmails: () => ({ data: mockEmails, isLoading: false, remove: { mutate: vi.fn() } }),
}));
// The composer is tested separately; stub it here so its data hooks don't run.
vi.mock("../CorrespondenceComposer", () => ({ CorrespondenceComposer: () => null }));
vi.mock("@/hooks/useGmailConnection", () => ({
  useGmailConnection: () => ({
    status: { data: { connected: false, email: null }, refetch: () => {} },
    connect: { mutate: () => {}, isPending: false },
    disconnect: { mutate: () => {}, isPending: false },
  }),
}));

import { CorrespondenceTab } from "../CorrespondenceTab";

const email = (o: Partial<ProjectEmail>): ProjectEmail => ({
  id: "e1", project_id: "p1", direction: "inbound", status: "received", channel: "gmail",
  gmail_thread_id: "t1", subject: "Glorieta sewer extension — schedule", from_email: "pm@r4capital.com",
  from_name: "R4 Capital", to_emails: ["hardeep@apas.ai"], cc_emails: [], snippet: "Please advise on the meter delivery…",
  body_html: null, has_attachments: true, labels: [], contact_id: null,
  occurred_at: "2026-07-20T14:00:00Z", created_at: "2026-07-20T14:00:00Z", ...o,
});

describe("CorrespondenceTab", () => {
  it("shows the empty state when there is no correspondence", () => {
    mockEmails = [];
    const { container } = render(<CorrespondenceTab projectId="p1" />);
    const text = container.textContent ?? "";
    expect(text).toContain("Correspondence");
    expect(text).toContain("No correspondence yet");
  });

  it("renders inbound + outbound entries in the timeline", () => {
    mockEmails = [
      email({ id: "in", direction: "inbound" }),
      email({ id: "out", direction: "outbound", status: "sent", subject: "RE: schedule", from_email: "hardeep@apas.ai", to_emails: ["pm@r4capital.com"], snippet: "Meters ship Friday." }),
    ];
    const { container } = render(<CorrespondenceTab projectId="p1" />);
    const text = container.textContent ?? "";
    expect(text).toContain("Glorieta sewer extension — schedule");
    expect(text).toContain("RE: schedule");
    expect(text).toContain("1 received");
    expect(text).toContain("1 sent");
  });
});
