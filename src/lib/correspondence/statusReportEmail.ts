// Branded weekly status report email — same letterhead language as the single
// task update (gold rule, Playfair-style header), wrapping an AI-drafted (and
// user-edited) rollup of a project's open tasks.

export interface StatusReportEmailInput {
  brand?: string;
  projectName?: string | null;
  body: string;         // plain text, paragraphs split on blank lines (user-edited draft)
  date?: string | null;
  openCount?: number;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmtDate = (s?: string | null) =>
  (s ? new Date(s) : new Date()).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
// The AI's "list" format bolds each task title with **markdown** — render it as
// real emphasis (escape first, so this only ever touches text we just escaped).
const mdBold = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

export function buildStatusReportHtml(input: StatusReportEmailInput): string {
  const brand = input.brand || "APAS";
  const paras = (input.body || "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p style="margin:0 0 12px;">${mdBold(esc(p)).replace(/\n/g, "<br>")}</p>`).join("");

  return `<div style="max-width:640px;margin:0 auto;font-family:'DM Sans',Georgia,serif;color:#1A1714;font-size:14px;line-height:1.6;background:#fff;padding:8px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #C4A35A;padding-bottom:10px;">
      <div style="font-family:Georgia,'Playfair Display',serif;font-size:22px;font-weight:700;">${esc(brand)}</div>
      <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8a877f;">Weekly status</div>
    </div>

    <div style="margin-top:24px;font-size:13.5px;color:#5f5c57;">
      ${fmtDate(input.date)}${input.projectName ? ` · ${esc(input.projectName)}` : ""}${typeof input.openCount === "number" ? ` · ${input.openCount} open item${input.openCount === 1 ? "" : "s"}` : ""}
    </div>

    <div style="margin-top:18px;">${paras || '<p style="color:#8a877f;">[Update body]</p>'}</div>

    <div style="margin-top:28px;border-top:1px solid #cfccc6;padding-top:10px;font-size:12px;color:#8a877f;">
      Sent from ${esc(brand)}${input.projectName ? ` · ${esc(input.projectName)}` : ""}
    </div>
  </div>`;
}
