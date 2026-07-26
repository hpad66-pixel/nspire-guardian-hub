// Branded task-status update email — same letterhead language as the
// correspondence letter (gold rule, Playfair-style brand mark, DM Sans body),
// with a status badge so a client sees at a glance that something is done.

export interface TaskUpdateEmailInput {
  brand?: string;
  projectName?: string | null;
  taskTitle: string;
  status: "done" | "in_progress" | "todo";
  note?: string | null;
  date?: string | null;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmtDate = (s?: string | null) =>
  (s ? new Date(s) : new Date()).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

const STATUS_META: Record<TaskUpdateEmailInput["status"], { label: string; color: string; bg: string }> = {
  done: { label: "Completed", color: "#065F46", bg: "#D1FAE5" },
  in_progress: { label: "In Progress", color: "#1D6FE8", bg: "#DCEAFE" },
  todo: { label: "Update", color: "#5f5c57", bg: "#F1EFEA" },
};

export function buildTaskUpdateHtml(input: TaskUpdateEmailInput): string {
  const brand = input.brand || "APAS";
  const meta = STATUS_META[input.status];
  const note = (input.note || "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p style="margin:0 0 12px;">${esc(p).replace(/\n/g, "<br>")}</p>`).join("");

  return `<div style="max-width:640px;margin:0 auto;font-family:'DM Sans',Georgia,serif;color:#1A1714;font-size:14px;line-height:1.6;background:#fff;padding:8px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #C4A35A;padding-bottom:10px;">
      <div style="font-family:Georgia,'Playfair Display',serif;font-size:22px;font-weight:700;">${esc(brand)}</div>
      <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8a877f;">Project update</div>
    </div>

    <div style="margin-top:24px;font-size:13.5px;color:#5f5c57;">${fmtDate(input.date)}${input.projectName ? ` · ${esc(input.projectName)}` : ""}</div>

    <div style="margin-top:16px;display:flex;align-items:center;gap:10px;">
      <span style="display:inline-block;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:600;color:${meta.color};background:${meta.bg};">${esc(meta.label)}</span>
      <span style="font-size:16px;font-weight:700;">${esc(input.taskTitle)}</span>
    </div>

    ${note ? `<div style="margin-top:18px;">${note}</div>` : ""}

    <div style="margin-top:28px;border-top:1px solid #cfccc6;padding-top:10px;font-size:12px;color:#8a877f;">
      Sent from ${esc(brand)}${input.projectName ? ` · ${esc(input.projectName)}` : ""}
    </div>
  </div>`;
}
