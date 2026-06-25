/**
 * Vector PDF for the APAS change-order format — crisp, selectable text with clean
 * pagination, drawn directly with jsPDF (no html2canvas rasterization). Used for
 * the download, the signed copy, and the generator preview.
 */
import { jsPDF } from "jspdf";
import type { CoSpec, CoSection, CoBlock } from "./types";
import { recomputePricing } from "./pricing";

const GOLD: [number, number, number] = [196, 163, 90];
const INK: [number, number, number] = [26, 23, 20];
const MUTE: [number, number, number] = [107, 107, 107];
const LIGHT: [number, number, number] = [243, 239, 230];

async function toDataUrl(src?: string | null): Promise<string | null> {
  if (!src) return null;
  if (src.startsWith("data:")) return src;
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function buildCoPdf(
  specIn: CoSpec,
  signatures?: { submitted?: string | null; accepted?: string | null },
): Promise<jsPDF> {
  const spec: CoSpec = { ...specIn, pricing: recomputePricing(specIn.pricing) };
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48; // margin
  const cw = W - M * 2; // content width
  let y = M;

  const subImg = await toDataUrl(signatures?.submitted);
  const accImg = await toDataUrl(signatures?.accepted);

  const setColor = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const ensure = (h: number) => { if (y + h > H - M) { doc.addPage(); y = M; } };

  function text(s: string, x: number, opts: { size?: number; color?: [number, number, number]; bold?: boolean; italic?: boolean; align?: "left" | "right" | "center"; maxW?: number } = {}) {
    doc.setFont("helvetica", opts.bold ? "bold" : opts.italic ? "italic" : "normal");
    doc.setFontSize(opts.size ?? 10);
    setColor(opts.color ?? INK);
    const lines = doc.splitTextToSize(s || "", opts.maxW ?? cw);
    const lh = (opts.size ?? 10) * 1.35;
    for (const ln of lines) {
      ensure(lh);
      const xx = opts.align === "right" ? x : opts.align === "center" ? x : x;
      doc.text(ln, xx, y, { align: opts.align ?? "left" });
      y += lh;
    }
    return lines.length * lh;
  }

  // ── Brand header ─────────────────────────────────────────────
  doc.setFont("helvetica", "bold"); doc.setFontSize(15); setColor(INK);
  doc.text(spec.doc.wordmark || "APAS CONSULTING", M, y + 4);
  y += 14;
  doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]); doc.setLineWidth(2);
  doc.line(M, y, W - M, y);
  y += 22;

  // ── Title ────────────────────────────────────────────────────
  text(`CHANGE ORDER PROPOSAL · No. ${spec.doc.co_number}`, M, { size: 16, bold: true });
  if (spec.doc.title) { y += 2; text(spec.doc.title, M, { size: 12, italic: true, color: MUTE }); }
  y += 10;

  // ── FROM / TO ────────────────────────────────────────────────
  const colTop = y;
  const half = cw / 2;
  const { from, to } = spec.parties;
  text("FROM", M, { size: 8, bold: true, color: GOLD });
  text(from.name, M, { size: 10, bold: true, maxW: half - 10 });
  [from.address, from.city, [from.contact, from.title].filter(Boolean).join(", "), from.email].filter(Boolean).forEach((l) => text(l!, M, { size: 9, color: MUTE, maxW: half - 10 }));
  const leftBottom = y;
  y = colTop;
  const rx = M + half;
  text("TO", rx, { size: 8, bold: true, color: GOLD });
  text(to.name, rx, { size: 10, bold: true, maxW: half - 10 });
  [to.attn, to.address, to.city, to.contact].filter(Boolean).forEach((l) => text(l!, rx, { size: 9, color: MUTE, maxW: half - 10 }));
  y = Math.max(leftBottom, y) + 8;

  // ── Meta rows ────────────────────────────────────────────────
  const meta: [string, string][] = [
    ["Project", spec.parties.project], ["Date", spec.doc.date],
    ["CO No.", spec.doc.co_label || spec.doc.co_number], ["Contract", spec.parties.contract],
  ];
  if (spec.parties.subject) meta.push(["Subject", spec.parties.subject]);
  if (spec.parties.basis) meta.push(["Basis", spec.parties.basis]);
  doc.setDrawColor(221, 221, 221); doc.setLineWidth(0.5);
  ensure(8); doc.line(M, y, W - M, y); y += 8;
  for (const [k, v] of meta) {
    ensure(14);
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); setColor(MUTE);
    doc.text(k, M, y);
    doc.setFont("helvetica", "normal"); setColor(INK);
    const vl = doc.splitTextToSize(v || "", cw - 110);
    doc.text(vl, M + 110, y);
    y += Math.max(14, vl.length * 12);
  }
  y += 4; doc.setDrawColor(221, 221, 221); doc.line(M, y, W - M, y); y += 16;

  // ── Sections (pre-pricing) ───────────────────────────────────
  const renderBlocks = (blocks: CoBlock[]) => {
    for (const b of blocks) {
      if ("p" in b && b.p) { text(b.p, M, { size: 10 }); y += 3; }
      else if ("p_bold" in b && b.p_bold) { text(b.p_bold, M, { size: 10, bold: true }); y += 3; }
      else if ("sub" in b && b.sub) { text(b.sub, M, { size: 10.5, bold: true, italic: true, color: GOLD }); }
      else if ("bullets" in b) for (const t of b.bullets.filter(Boolean)) {
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); setColor(GOLD);
        ensure(13); doc.text("•", M + 4, y);
        setColor(INK);
        const lines = doc.splitTextToSize(t, cw - 20);
        doc.text(lines, M + 16, y); y += Math.max(13, lines.length * 13);
      }
      else if ("numbered" in b) b.numbered.filter(Boolean).forEach((t, i) => text(`${i + 1}. ${t}`, M, { size: 10 }));
    }
  };
  const renderSection = (s: CoSection) => {
    ensure(24);
    text(s.heading, M, { size: 11.5, bold: true, color: GOLD }); y += 2;
    renderBlocks(s.blocks); y += 8;
  };
  spec.sections.forEach(renderSection);

  // ── Pricing table ────────────────────────────────────────────
  if (spec.pricing) {
    ensure(30);
    text(spec.pricing.heading || "PRICING", M, { size: 11.5, bold: true, color: GOLD }); y += 2;
    if (spec.pricing.intro) { text(spec.pricing.intro, M, { size: 10 }); y += 4; }

    const descW = cw - 22 - 40 - 40 - 64 - 74 - 66;
    const C = {
      n: M, desc: M + 22, unit: M + 22 + descW, qty: M + 22 + descW + 40,
      cost: M + 22 + descW + 40 + 40, ext: M + 22 + descW + 40 + 40 + 64, basis: M + 22 + descW + 40 + 40 + 64 + 74,
    } as any;
    C.unit = M + 22 + descW;
    C.qty = C.unit + 40;
    C.cost = C.qty + 40;
    C.ext = C.cost + 64;
    C.basis = C.ext + 74;

    const headerRow = () => {
      ensure(18);
      doc.setFillColor(LIGHT[0], LIGHT[1], LIGHT[2]);
      doc.rect(M, y - 2, cw, 16, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); setColor(INK);
      doc.text("#", C.n + 2, y + 9);
      doc.text("Description", C.desc, y + 9);
      doc.text("Unit", C.unit, y + 9);
      doc.text("Qty", C.qty + 34, y + 9, { align: "right" });
      doc.text("Unit $", C.cost + 58, y + 9, { align: "right" });
      doc.text("Extended", C.ext + 68, y + 9, { align: "right" });
      doc.text("Basis", C.basis, y + 9);
      y += 18;
    };
    headerRow();

    for (const g of spec.pricing.groups) {
      ensure(16);
      doc.setFillColor(250, 248, 244); doc.rect(M, y - 2, cw, 14, "F");
      text(g.label, C.n + 2, { size: 9, bold: true }); y += 2;
      for (const r of g.rows) {
        doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); setColor(INK);
        const dl = doc.splitTextToSize(r.desc || "", descW - 6);
        const rh = Math.max(13, dl.length * 11);
        ensure(rh);
        doc.text(r.n, C.n + 2, y + 8);
        doc.text(dl, C.desc, y + 8);
        doc.text(r.unit || "", C.unit, y + 8);
        doc.text(String(r.qty ?? ""), C.qty + 34, y + 8, { align: "right" });
        doc.text(r.unit_cost || "", C.cost + 58, y + 8, { align: "right" });
        doc.text(r.extended || "", C.ext + 68, y + 8, { align: "right" });
        setColor(MUTE); doc.text(doc.splitTextToSize(r.basis || "", cw - (C.basis - M)), C.basis, y + 8);
        y += rh;
        doc.setDrawColor(238, 238, 238); doc.setLineWidth(0.4); doc.line(M, y, W - M, y);
      }
      if (g.subtotal) {
        ensure(14);
        doc.setFont("helvetica", "bold"); doc.setFontSize(9); setColor(INK);
        doc.text(g.subtotal.label, C.ext + 68, y + 9, { align: "right" });
        doc.text(g.subtotal.amount, C.basis + 60, y + 9, { align: "right" });
        y += 14;
      }
    }
    for (const m of spec.pricing.markups) {
      ensure(13);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); setColor(MUTE);
      doc.text(m.label, C.ext + 68, y + 9, { align: "right" });
      setColor(INK); doc.text(m.amount, C.basis + 60, y + 9, { align: "right" });
      y += 13;
    }
    // Grand total bar
    ensure(22); y += 4;
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]); doc.rect(M, y, cw, 22, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
    doc.text(spec.pricing.grand_total.label, C.ext + 68, y + 15, { align: "right" });
    doc.setFontSize(12); doc.text(spec.pricing.grand_total.amount, W - M - 4, y + 15, { align: "right" });
    y += 30;
    if (spec.pricing.footnote) text(spec.pricing.footnote, M, { size: 8, color: MUTE });
    y += 6;
  }

  // ── After-pricing sections ───────────────────────────────────
  spec.sections_after_pricing.forEach(renderSection);

  // ── Signatures ───────────────────────────────────────────────
  ensure(120); y += 16;
  const sigBlock = (label: string, s: { company?: string; name?: string; title?: string; date?: string }, img: string | null, x: number) => {
    let yy = y;
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); setColor(GOLD); doc.text(label, x, yy); yy += 14;
    doc.setFontSize(10); setColor(INK);
    (s.company || "").split("\n").forEach((ln) => { doc.text(ln, x, yy); yy += 12; });
    yy += 26;
    if (img) { try { doc.addImage(img, "PNG", x, yy - 34, 150, 34); } catch { /* ignore */ } }
    doc.setDrawColor(INK[0], INK[1], INK[2]); doc.setLineWidth(0.7); doc.line(x, yy, x + half - 24, yy); yy += 12;
    doc.setFontSize(9); setColor(INK); doc.text(s.name || "", x, yy); yy += 11;
    setColor(MUTE); doc.text(s.title || "", x, yy); yy += 11;
    doc.text(`Date: ${s.date || "____________"}`, x, yy);
  };
  sigBlock("SUBMITTED BY", spec.signatures.submitted, subImg, M);
  sigBlock("ACCEPTED & AUTHORIZED", spec.signatures.accepted, accImg, M + half);
  y += 84;

  // ── Footer on every page ─────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]); doc.setLineWidth(1);
    doc.line(M, H - 30, W - M, H - 30);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); setColor(MUTE);
    doc.text(spec.doc.footer || "", M, H - 20);
    doc.text(`Page ${p} of ${pages}`, W - M, H - 20, { align: "right" });
  }

  return doc;
}

export async function buildCoPdfBlob(spec: CoSpec, signatures?: { submitted?: string | null; accepted?: string | null }): Promise<Blob> {
  return (await buildCoPdf(spec, signatures)).output("blob");
}
