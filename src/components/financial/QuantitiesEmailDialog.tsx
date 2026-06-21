import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Mail, Loader2 } from "lucide-react";
import { useSendEmail } from "@/hooks/useSendEmail";
import { buildQuantitiesPdf } from "@/lib/financial/quantitiesPdf";
import type { SovProgressRow } from "@/hooks/useSovProgress";

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n || 0);
const qfmt = (n: number) => {
  const v = Number(n || 0);
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, "");
};
const pfmt = (n: number) => `${Number(n || 0).toFixed(1)}%`;
const parseEmails = (s: string) =>
  s.split(/[,;\s]+/).map((e) => e.trim()).filter(Boolean);
const valid = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

function buildHtml(
  lines: SovProgressRow[],
  showMoney: boolean,
  projectName: string,
  payAppNo: number | null,
  intro: string,
) {
  const th = (t: string, align = "left") =>
    `<th style="padding:6px 8px;text-align:${align};border-bottom:2px solid #1A1714;font-size:12px;text-transform:uppercase;letter-spacing:.03em;color:#555;">${t}</th>`;
  const td = (t: string, align = "left", strong = false) =>
    `<td style="padding:6px 8px;text-align:${align};border-bottom:1px solid #eee;${strong ? "font-weight:600;" : ""}">${t}</td>`;

  const header =
    `<tr>${th("#")}${th("Description")}${th("Unit", "center")}${th("Sched Qty", "right")}${th("Built to Date", "right")}${th("Remaining", "right")}${th("% Complete", "right")}` +
    (showMoney ? `${th("Sched Value", "right")}${th("Earned", "right")}${th("To Complete", "right")}` : "") +
    `</tr>`;

  const rowsHtml = (list: SovProgressRow[]) =>
    list
      .map(
        (r) =>
          `<tr>${td(r.item_no)}${td(r.description)}${td(r.unit ?? "—", "center")}${td(qfmt(r.scheduled_qty), "right")}${td(qfmt(r.qty_to_date), "right")}${td(qfmt(r.qty_remaining), "right")}${td(pfmt(r.pct_complete), "right")}` +
          (showMoney
            ? `${td(money(r.scheduled_value), "right")}${td(money(r.value_to_date), "right")}${td(money(r.value_remaining), "right")}`
            : "") +
          `</tr>`,
      )
      .join("");

  const section = (label: string, list: SovProgressRow[]) => {
    if (!list.length) return "";
    const sv = list.reduce((s, r) => s + r.scheduled_value, 0);
    const vd = list.reduce((s, r) => s + r.value_to_date, 0);
    const pct = sv ? (vd / sv) * 100 : 0;
    const span = showMoney ? 6 : 6;
    const sub =
      `<tr style="background:#f4f1ea;font-weight:600;">${td(label + " subtotal", "left", true)}<td colspan="${span - 1}"></td>${td(pfmt(pct), "right", true)}` +
      (showMoney ? `${td(money(sv), "right", true)}${td(money(vd), "right", true)}${td(money(sv - vd), "right", true)}` : "") +
      `</tr>`;
    return rowsHtml(list) + sub;
  };

  const base = lines.filter((l) => l.kind === "base");
  const co = lines.filter((l) => l.kind === "change_order");

  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#1A1714;max-width:760px;">
    <h2 style="margin:0 0 2px;">${projectName} — Quantities &amp; Progress</h2>
    <p style="margin:0 0 14px;color:#666;font-size:13px;">Through Pay App #${payAppNo ?? "—"} · ${showMoney ? "with dollar values" : "quantities only"}</p>
    ${intro ? `<p style="white-space:pre-wrap;margin:0 0 14px;">${intro.replace(/</g, "&lt;")}</p>` : ""}
    <table style="border-collapse:collapse;width:100%;font-size:13px;">
      <thead>${header}</thead>
      <tbody>${section("Base contract", base)}${section("Change orders", co)}</tbody>
    </table>
    <p style="margin:16px 0 0;color:#999;font-size:11px;">Sent from Proj OS.</p>
  </div>`;
}

export function QuantitiesEmailDialog({
  open,
  onOpenChange,
  rows,
  selectedIds,
  showMoney: initialShowMoney,
  projectName,
  payAppNo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rows: SovProgressRow[];
  selectedIds: Set<string>;
  showMoney: boolean;
  projectName: string;
  payAppNo: number | null;
}) {
  const sendEmail = useSendEmail();
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [intro, setIntro] = useState("");
  const [showMoney, setShowMoney] = useState(initialShowMoney);
  const [attachPdf, setAttachPdf] = useState(true);
  const [subject, setSubject] = useState(`${projectName} — Quantities & Progress`);

  const lines = useMemo(
    () => (selectedIds.size > 0 ? rows.filter((r) => selectedIds.has(r.sov_line_item_id)) : rows),
    [rows, selectedIds],
  );
  const recipients = parseEmails(to);
  const canSend = recipients.length > 0 && recipients.every(valid) && lines.length > 0 && !sendEmail.isPending;

  async function send() {
    const bodyHtml = buildHtml(lines, showMoney, projectName, payAppNo, intro);
    const attachments = attachPdf
      ? (() => {
          const pdf = buildQuantitiesPdf({ lines, showMoney, projectName, payAppNo, intro });
          return [{ filename: pdf.filename, contentBase64: pdf.base64, contentType: "application/pdf", size: pdf.size }];
        })()
      : undefined;
    await sendEmail.mutateAsync({
      recipients,
      ccRecipients: parseEmails(cc).filter(valid),
      subject: subject.trim() || `${projectName} — Quantities & Progress`,
      bodyHtml,
      attachments,
    });
    onOpenChange(false);
    setTo(""); setCc(""); setIntro("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Mail className="h-4 w-4" /> Email quantities</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">To</Label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="sub@example.com, another@example.com" />
            {to && !recipients.every(valid) && <p className="text-xs text-[var(--apas-rose)] mt-0.5">Check the email addresses.</p>}
          </div>
          <div>
            <Label className="text-xs">CC (optional)</Label>
            <Input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="pm@example.com" />
          </div>
          <div>
            <Label className="text-xs">Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Message (optional)</Label>
            <Textarea rows={3} value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="Here are the remaining quantities for Line 1 — please quote…" />
          </div>
          <div className="rounded-md border px-3 py-2 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-medium">{lines.length}</span> line{lines.length === 1 ? "" : "s"}
                <span className="text-muted-foreground"> · {selectedIds.size > 0 ? "selected" : "all"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="em-money" className="text-xs cursor-pointer">Include dollars</Label>
                <Switch id="em-money" checked={showMoney} onCheckedChange={setShowMoney} />
              </div>
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <span className="text-xs text-muted-foreground">Attach a PDF copy</span>
              <Switch id="em-pdf" checked={attachPdf} onCheckedChange={setAttachPdf} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sendEmail.isPending}>Cancel</Button>
          <Button onClick={send} disabled={!canSend}>
            {sendEmail.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Mail className="h-4 w-4 mr-1.5" />}
            {sendEmail.isPending ? "Sending…" : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
