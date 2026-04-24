/**
 * C5 · Meeting minutes PDF smoke test.
 */
import { describe, it, expect } from "vitest";
import { generateMeetingMinutesPdf } from "@/lib/pdf/meetingMinutes";

describe("generateMeetingMinutesPdf", () => {
  const base = {
    id: "m1",
    title: "Weekly OAC",
    meeting_type: "owner-architect-contractor",
    meeting_date: "2026-04-23",
    meeting_time: "09:00",
    location: "Site trailer",
    project_name: "Acme Tower",
    status: "finalized",
    attendees: [
      { name: "J. Owner", role: "Owner", company: "Acme" },
      { name: "K. Architect", role: "Architect", company: "K&A" },
      { name: "L. Contractor", role: "PM", company: "BigBuild" },
    ],
    polished_notes: "1. Schedule: on track\n2. RFIs: 3 open\n3. Budget: within 2%",
  };

  it("builds a minutes PDF", () => {
    const doc = generateMeetingMinutesPdf(base);
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(400);
  });

  it("falls back to raw_notes when polished is absent", () => {
    const doc = generateMeetingMinutesPdf({
      ...base, polished_notes: null, raw_notes: "quick notes",
    });
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(400);
  });

  it("handles a meeting with zero attendees", () => {
    const doc = generateMeetingMinutesPdf({ ...base, attendees: [] });
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(400);
  });
});
