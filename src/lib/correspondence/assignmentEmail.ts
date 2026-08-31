/**
 * Branded action-item assignment email card.
 * Used when a project instruction is assigned to an internal teammate or a CRM contact.
 */

export interface AssignmentEmailInput {
  brand?: string;
  projectName?: string | null;
  taskTitle: string;
  description?: string | null;
  assigneeName?: string | null;
  assignedByName?: string | null;
  assignedAt?: string | null;
  dueDate?: string | null;
  priority?: string | null;
  actionUrl: string;
  hasPortalAccess?: boolean;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const fmtDate = (s?: string | null) => {
  if (!s) return null;
  const d = new Date(s.includes("T") ? s : `${s}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
};

const PRIORITY_META: Record<string, { label: string; color: string; bg: string }> = {
  urgent: { label: "Urgent", color: "#9F1239", bg: "#FFE4E6" },
  high: { label: "High", color: "#9A3412", bg: "#FFEDD5" },
  medium: { label: "Medium", color: "#1D6FE8", bg: "#DCEAFE" },
  low: { label: "Low", color: "#5f5c57", bg: "#F1EFEA" },
};

export function buildAssignmentEmailHtml(input: AssignmentEmailInput): string {
  const brand = input.brand || "APAS";
  const assignedAt = fmtDate(input.assignedAt) || fmtDate(new Date().toISOString());
  const due = fmtDate(input.dueDate);
  const priority = PRIORITY_META[input.priority || "medium"] || PRIORITY_META.medium;
  const description = (input.description || "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 10px;color:#3f3c38;line-height:1.55;">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const ctaLabel = input.hasPortalAccess ? "Open in portal" : "Open action card";

  return `<div style="max-width:640px;margin:0 auto;font-family:'DM Sans',Georgia,serif;color:#1A1714;font-size:14px;line-height:1.55;background:#FDFCF9;padding:24px 16px;">
  <div style="background:#fff;border:1px solid #E8E4DC;border-radius:16px;overflow:hidden;box-shadow:0 8px 28px rgba(26,23,20,0.06);">
    <div style="background:linear-gradient(135deg,#0D3B30 0%,#1A1714 70%);padding:22px 24px;color:#FAF8F4;">
      <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#C4A35A;font-weight:700;">Action item assigned</div>
      <div style="font-family:Georgia,'Playfair Display',serif;font-size:24px;font-weight:700;margin-top:6px;">${esc(brand)}</div>
      ${input.projectName ? `<div style="margin-top:4px;font-size:13px;color:#D9D4CB;">${esc(input.projectName)}</div>` : ""}
    </div>

    <div style="padding:24px;">
      <div style="display:inline-block;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${priority.color};background:${priority.bg};">${esc(priority.label)} priority</div>
      <h1 style="margin:14px 0 0;font-size:20px;line-height:1.35;font-weight:800;">${esc(input.taskTitle)}</h1>
      ${description ? `<div style="margin-top:14px;">${description}</div>` : ""}

      <table style="width:100%;border-collapse:collapse;margin-top:18px;background:#FAF8F4;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="padding:12px 14px;border-bottom:1px solid #E8E4DC;width:40%;font-size:12px;color:#878581;text-transform:uppercase;letter-spacing:.06em;">Assigned to</td>
          <td style="padding:12px 14px;border-bottom:1px solid #E8E4DC;font-weight:600;">${esc(input.assigneeName || "You")}</td>
        </tr>
        <tr>
          <td style="padding:12px 14px;border-bottom:1px solid #E8E4DC;font-size:12px;color:#878581;text-transform:uppercase;letter-spacing:.06em;">Assigned on</td>
          <td style="padding:12px 14px;border-bottom:1px solid #E8E4DC;">${esc(assignedAt || "—")}</td>
        </tr>
        <tr>
          <td style="padding:12px 14px;border-bottom:1px solid #E8E4DC;font-size:12px;color:#878581;text-transform:uppercase;letter-spacing:.06em;">Due date</td>
          <td style="padding:12px 14px;border-bottom:1px solid #E8E4DC;font-weight:700;color:${due ? "#1A1714" : "#878581"};">${esc(due || "No due date")}</td>
        </tr>
        ${input.assignedByName ? `<tr>
          <td style="padding:12px 14px;font-size:12px;color:#878581;text-transform:uppercase;letter-spacing:.06em;">From</td>
          <td style="padding:12px 14px;">${esc(input.assignedByName)}</td>
        </tr>` : ""}
      </table>

      <div style="margin-top:22px;text-align:center;">
        <a href="${esc(input.actionUrl)}" style="display:inline-block;background:#1D6FE8;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">${esc(ctaLabel)}</a>
      </div>
      <p style="margin:14px 0 0;text-align:center;font-size:12px;color:#878581;">
        ${input.hasPortalAccess
          ? "Opens your project portal on this action card."
          : "Opens a secure action card — no app login required. You can update status right from the card."}
      </p>
    </div>
  </div>
  <div style="text-align:center;margin-top:14px;font-size:11px;color:#A8A49C;">Sent from ${esc(brand)} Project Controls · Powered by projOS</div>
</div>`;
}

export function buildAssignmentEmailText(input: AssignmentEmailInput): string {
  const due = fmtDate(input.dueDate) || "No due date";
  const assignedAt = fmtDate(input.assignedAt) || "today";
  return [
    `Action item assigned${input.projectName ? ` — ${input.projectName}` : ""}`,
    "",
    input.taskTitle,
    input.description ? `\n${input.description}` : "",
    "",
    `Assigned to: ${input.assigneeName || "You"}`,
    `Assigned on: ${assignedAt}`,
    `Due date: ${due}`,
    input.assignedByName ? `From: ${input.assignedByName}` : "",
    "",
    `Open: ${input.actionUrl}`,
  ].filter(Boolean).join("\n");
}
