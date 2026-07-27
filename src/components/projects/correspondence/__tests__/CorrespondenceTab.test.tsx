/**
 * Render smoke test for the Correspondence tab — empty state, a thread card with
 * its AI intelligence (summary + status), and topic filter chips — so a regression
 * fails CI instead of the project page.
 */
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ProjectEmail } from "@/hooks/useProjectEmails";
import type { CorrespondenceThread } from "@/hooks/useCorrespondenceThreads";

let mockEmails: ProjectEmail[] = [];
let mockThreads: CorrespondenceThread[] = [];

vi.mock("@/hooks/useProjectEmails", () => ({
  useProjectEmails: () => ({ data: mockEmails, isLoading: false, removeThread: { mutate: () => {}, isPending: false } }),
}));
vi.mock("../CorrespondenceComposer", () => ({ CorrespondenceComposer: () => null }));
// DocumentWorkspace pulls in pdfjs/mammoth (browser-only) — stub it so the tab's
// static import doesn't drag those into jsdom.
vi.mock("../DocumentWorkspace", () => ({ DocumentWorkspace: () => null }));
vi.mock("@/hooks/useGmailConnection", () => ({
  useGmailConnection: () => ({
    status: { data: { connected: false, email: null }, refetch: () => {} },
    connect: { mutate: () => {}, isPending: false },
    disconnect: { mutate: () => {}, isPending: false },
  }),
}));
vi.mock("@/hooks/useGmailSync", () => ({
  useGmailSync: () => ({ settings: { data: null }, sync: { mutate: () => {}, isPending: false } }),
}));
vi.mock("@/hooks/useCorrespondenceThreads", () => ({
  useCorrespondenceThreads: () => ({
    threads: { data: mockThreads, isLoading: false },
    analyze: { mutate: () => {}, isPending: false },
  }),
}));
vi.mock("@/hooks/useActionItems", () => ({
  useActionItemsByProject: () => ({ data: [] }),
  useCreateActionItem: () => ({ mutate: () => {}, isPending: false }),
}));
// The reassign dialog's hooks hit supabase.from() directly — stub them so the
// thread card's static import doesn't fire a real network call in jsdom.
vi.mock("@/hooks/useCorrespondenceReassign", () => ({
  useAllProjectTopics: () => ({ data: [], isLoading: false }),
  useCorrespondenceReassign: () => ({ mutate: () => {}, isPending: false }),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));

import { CorrespondenceTab } from "../CorrespondenceTab";

const email = (o: Partial<ProjectEmail>): ProjectEmail => ({
  id: "e1", project_id: "p1", direction: "inbound", status: "received", channel: "gmail",
  gmail_thread_id: "t1", topic: "water_billing", subject: "Formal Dispute of Water and Sewer Charges", from_email: "csullivan@r4cap.com",
  from_name: "Chris Sullivan", to_emails: ["hardeep@apas.ai"], cc_emails: [], snippet: "Please advise…",
  body_html: null, has_attachments: true, labels: [], contact_id: null,
  occurred_at: "2026-07-24T14:00:00Z", created_at: "2026-07-24T14:00:00Z", ...o,
});

const thread = (o: Partial<CorrespondenceThread>): CorrespondenceThread => ({
  id: "th1", project_id: "p1", gmail_thread_id: "t1", subject: "Formal Dispute of Water and Sewer Charges",
  topic: "water_billing", summary: "R4 forwarded a formal City dispute over water/sewer charges; you owe a drafted response.",
  status: "awaiting_us", ball_in_court: "You", urgency: "high",
  action_items: [{ title: "Draft response to the City", owner: "you", due_hint: "" }],
  entities: { people: ["Chris Sullivan"], orgs: ["City of Opa-Locka"], amounts: ["$95K"], dates: ["Mar 2026"], refs: ["Building 8 meter"] },
  message_count: 2, last_message_at: "2026-07-24T14:00:00Z", analyzed_at: "2026-07-24T15:00:00Z", action_items_pushed_at: null, ...o,
});

describe("CorrespondenceTab", () => {
  it("shows the empty state when there is no correspondence", () => {
    mockEmails = []; mockThreads = [];
    const { container } = render(<CorrespondenceTab projectId="p1" />);
    const text = container.textContent ?? "";
    expect(text).toContain("Correspondence");
    expect(text).toContain("No correspondence yet");
  });

  it("renders a thread card with its AI intelligence", () => {
    mockEmails = [email({ id: "in" }), email({ id: "out", direction: "outbound", status: "sent", from_email: "hardeep@apas.ai", to_emails: ["csullivan@r4cap.com"], snippet: "Yes I will." })];
    mockThreads = [thread({})];
    const { container } = render(<CorrespondenceTab projectId="p1" />);
    const text = container.textContent ?? "";
    expect(text).toContain("Formal Dispute of Water and Sewer Charges");
    expect(text).toContain("you owe a drafted response");   // AI summary
    expect(text).toContain("Awaiting you");                  // status badge
    expect(text).toContain("Ball in court:");
    expect(text).toContain("Draft response to the City");    // extracted action item
    expect(text).toContain("$95K");                          // entity chip
  });

  it("groups distinct threads and shows topic chips", () => {
    mockEmails = [
      email({ id: "a", gmail_thread_id: "t1", topic: "water_billing", subject: "Billing dispute" }),
      email({ id: "b", gmail_thread_id: "t2", topic: "water_meters", subject: "Second meter install" }),
    ];
    mockThreads = [];
    const { container } = render(<CorrespondenceTab projectId="p1" />);
    const text = container.textContent ?? "";
    expect(text).toContain("Billing dispute");
    expect(text).toContain("Second meter install");
    expect(text).toContain("Water meters");
  });
});
