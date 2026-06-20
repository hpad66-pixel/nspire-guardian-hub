/**
 * In-app .docx generator for the APAS change-order format — the TypeScript port
 * of the skill's generate_change_order.py, using the `docx` library so the
 * editable Word document is produced entirely client-side.
 */
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, HeadingLevel, ShadingType,
} from "docx";
import type { CoSpec, CoSection, CoBlock } from "./types";
import { recomputePricing } from "./pricing";

const GOLD = "C4A35A";
const INK = "1A1714";
const MUTE = "6B6B6B";
const NOBORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } as const;
const thin = (color = "DDDDDD") => ({ style: BorderStyle.SINGLE, size: 4, color });

function p(text: string, opts: { bold?: boolean; italics?: boolean; color?: string; size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; spacingAfter?: number } = {}) {
  return new Paragraph({
    alignment: opts.align,
    spacing: { after: opts.spacingAfter ?? 80 },
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, color: opts.color ?? INK, size: opts.size ?? 20 })],
  });
}

function renderBlocks(blocks: CoBlock[]): Paragraph[] {
  const out: Paragraph[] = [];
  for (const b of blocks) {
    if ("p" in b && b.p) out.push(p(b.p));
    else if ("p_bold" in b && b.p_bold) out.push(p(b.p_bold, { bold: true }));
    else if ("sub" in b && b.sub) out.push(p(b.sub, { italics: true, color: GOLD, bold: true, size: 21 }));
    else if ("bullets" in b) b.bullets.filter(Boolean).forEach((t) => out.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text: t, size: 20, color: INK })] })));
    else if ("numbered" in b) b.numbered.filter(Boolean).forEach((t, i) => out.push(p(`${i + 1}. ${t}`)));
  }
  return out;
}

function sectionParas(s: CoSection): Paragraph[] {
  return [p(s.heading, { bold: true, color: GOLD, size: 24, spacingAfter: 100 }), ...renderBlocks(s.blocks)];
}

function cell(text: string, opts: { bold?: boolean; align?: any; shading?: string; color?: string; width?: number } = {}) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.shading ? { type: ShadingType.CLEAR, fill: opts.shading, color: "auto" } : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph({ alignment: opts.align, children: [new TextRun({ text, bold: opts.bold, size: 18, color: opts.color ?? INK })] })],
  });
}

export async function generateCoDocx(specIn: CoSpec): Promise<Blob> {
  const spec: CoSpec = { ...specIn, pricing: recomputePricing(specIn.pricing) };
  const children: (Paragraph | Table)[] = [];

  // Brand header
  children.push(p(spec.doc.wordmark || "APAS CONSULTING", { bold: true, color: INK, size: 28, spacingAfter: 20 }));
  children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD } }, spacing: { after: 160 } }));

  // Title
  children.push(p(`CHANGE ORDER PROPOSAL · No. ${spec.doc.co_number}`, { bold: true, size: 30, spacingAfter: 40 }));
  if (spec.doc.title) children.push(p(spec.doc.title, { italics: true, color: MUTE, size: 24, spacingAfter: 160 }));

  // Meta table — FROM / TO
  const { from, to } = spec.parties;
  const metaRow = new TableRow({
    children: [
      new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: { top: NOBORDER, bottom: NOBORDER, left: NOBORDER, right: NOBORDER }, children: [
        p("FROM", { bold: true, color: GOLD, size: 18 }),
        p(from.name, { bold: true }), p(from.address ?? ""), p(from.city ?? ""),
        p([from.contact, from.title].filter(Boolean).join(", ")), p(from.email ?? "", { color: MUTE }),
      ]}),
      new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: { top: NOBORDER, bottom: NOBORDER, left: NOBORDER, right: NOBORDER }, children: [
        p("TO", { bold: true, color: GOLD, size: 18 }),
        p(to.name, { bold: true }), p(to.attn ?? ""), p(to.address ?? ""), p(to.city ?? ""), p(to.contact ?? ""),
      ]}),
    ],
  });
  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: NOBORDER, bottom: NOBORDER, left: NOBORDER, right: NOBORDER, insideHorizontal: NOBORDER, insideVertical: NOBORDER }, rows: [metaRow] }));

  const metaPairs: [string, string][] = [
    ["Project", spec.parties.project], ["Date", spec.doc.date], ["CO No.", spec.doc.co_label || spec.doc.co_number],
    ["Contract", spec.parties.contract],
  ];
  if (spec.parties.subject) metaPairs.push(["Subject", spec.parties.subject]);
  if (spec.parties.basis) metaPairs.push(["Basis", spec.parties.basis]);
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: thin(), bottom: thin(), left: NOBORDER, right: NOBORDER, insideHorizontal: thin("EEEEEE"), insideVertical: NOBORDER },
    rows: metaPairs.map(([k, v]) => new TableRow({ children: [cell(k, { bold: true, width: 25, color: MUTE }), cell(v, { width: 75 })] })),
  }));
  children.push(p("", { spacingAfter: 160 }));

  // Pre-pricing sections
  spec.sections.forEach((s) => children.push(...sectionParas(s)));

  // Pricing
  if (spec.pricing) {
    children.push(p(spec.pricing.heading || "PRICING", { bold: true, color: GOLD, size: 24, spacingAfter: 100 }));
    if (spec.pricing.intro) children.push(p(spec.pricing.intro));
    const header = new TableRow({ tableHeader: true, children: [
      cell("#", { bold: true, shading: "F3EFE6", width: 5 }), cell("Description", { bold: true, shading: "F3EFE6", width: 38 }),
      cell("Unit", { bold: true, shading: "F3EFE6", width: 8 }), cell("Qty", { bold: true, shading: "F3EFE6", width: 8, align: AlignmentType.RIGHT }),
      cell("Unit $", { bold: true, shading: "F3EFE6", width: 13, align: AlignmentType.RIGHT }), cell("Extended", { bold: true, shading: "F3EFE6", width: 14, align: AlignmentType.RIGHT }),
      cell("Basis", { bold: true, shading: "F3EFE6", width: 14 }),
    ]});
    const rows: TableRow[] = [header];
    spec.pricing.groups.forEach((g) => {
      rows.push(new TableRow({ children: [new TableCell({ columnSpan: 7, shading: { type: ShadingType.CLEAR, fill: "FAF8F4", color: "auto" }, margins: { top: 50, bottom: 50, left: 80 }, children: [p(g.label, { bold: true, size: 18 })] })] }));
      g.rows.forEach((r) => rows.push(new TableRow({ children: [
        cell(r.n), cell(r.desc), cell(r.unit), cell(r.qty, { align: AlignmentType.RIGHT }),
        cell(r.unit_cost, { align: AlignmentType.RIGHT }), cell(r.extended, { align: AlignmentType.RIGHT }), cell(r.basis),
      ]})));
      if (g.subtotal) rows.push(new TableRow({ children: [
        new TableCell({ columnSpan: 5, borders: { top: NOBORDER, bottom: NOBORDER, left: NOBORDER, right: NOBORDER }, children: [p(g.subtotal.label, { bold: true, align: AlignmentType.RIGHT })] }),
        cell(g.subtotal.amount, { bold: true, align: AlignmentType.RIGHT }), cell(""),
      ]}));
    });
    spec.pricing.markups.forEach((m) => rows.push(new TableRow({ children: [
      new TableCell({ columnSpan: 5, borders: { top: NOBORDER, bottom: NOBORDER, left: NOBORDER, right: NOBORDER }, children: [p(m.label, { align: AlignmentType.RIGHT, color: MUTE })] }),
      cell(m.amount, { align: AlignmentType.RIGHT }), cell(m.basis ?? ""),
    ]})));
    rows.push(new TableRow({ children: [
      new TableCell({ columnSpan: 5, shading: { type: ShadingType.CLEAR, fill: GOLD, color: "auto" }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: spec.pricing.grand_total.label, bold: true, color: "FFFFFF", size: 20 })] })] }),
      new TableCell({ columnSpan: 2, shading: { type: ShadingType.CLEAR, fill: GOLD, color: "auto" }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: spec.pricing.grand_total.amount, bold: true, color: "FFFFFF", size: 22 })] })] }),
    ]}));
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
    if (spec.pricing.footnote) children.push(p(spec.pricing.footnote, { color: MUTE, size: 16 }));
    children.push(p("", { spacingAfter: 160 }));
  }

  // After-pricing sections
  spec.sections_after_pricing.forEach((s) => children.push(...sectionParas(s)));

  // Signatures
  children.push(p("", { spacingAfter: 120 }));
  const sig = (label: string, s: { company?: string; name?: string; title?: string; date?: string }) =>
    new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: { top: NOBORDER, bottom: NOBORDER, left: NOBORDER, right: NOBORDER }, children: [
      p(label, { bold: true, color: GOLD, size: 18 }), p(s.company ?? "", { bold: true }),
      new Paragraph({ spacing: { before: 240, after: 20 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: INK } }, children: [] }),
      p(s.name ?? ""), p(s.title ?? "", { color: MUTE }), p(s.date ? `Date: ${s.date}` : "Date: ____________", { color: MUTE }),
    ]});
  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: NOBORDER, bottom: NOBORDER, left: NOBORDER, right: NOBORDER, insideHorizontal: NOBORDER, insideVertical: NOBORDER }, rows: [
    new TableRow({ children: [sig("SUBMITTED BY", spec.signatures.submitted), sig("ACCEPTED & AUTHORIZED", spec.signatures.accepted)] }),
  ]}));

  children.push(new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 6, color: GOLD } }, spacing: { before: 240 }, children: [new TextRun({ text: spec.doc.footer || "", color: MUTE, size: 14 })] }));

  const doc = new Document({ sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } }, children }] });
  return Packer.toBlob(doc);
}
