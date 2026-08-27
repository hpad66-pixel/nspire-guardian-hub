/**
 * Vector PDF for the APAS proposal format — crisp, selectable text with clean
 * pagination and correct table row wrapping, drawn directly with jsPDF (no
 * html2canvas rasterization). Mirrors the on-screen FinancialProposalDocument and
 * the change-order PDF (coPdf.ts) so the printed proposal is beautifully branded.
 */
import { jsPDF } from 'jspdf';
import type { FinancialProposal, FinancialProposalLine } from '@/hooks/useFinancialProposals';
import type { ProposalClient } from '@/components/financial/FinancialProposalDocument';
import { proposalTotals } from '@/lib/financial/proposalPricing';

const GOLD: [number, number, number] = [196, 163, 90];
const INK: [number, number, number] = [26, 23, 20];
const MUTE: [number, number, number] = [107, 107, 107];
const LIGHT: [number, number, number] = [243, 239, 230];

const usd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);

const longDate = (iso?: string | null) =>
  iso ? new Date(iso.includes('T') ? iso : `${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';

async function toDataUrl(src?: string | null): Promise<string | null> {
  if (!src) return null;
  if (src.startsWith('data:')) return src;
  try {
    const blob = await (await fetch(src)).blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}

export async function buildProposalPdf(
  proposal: FinancialProposal,
  lines: FinancialProposalLine[],
  projectName: string,
  companyName?: string,
  signatures?: { submitted?: string | null; accepted?: string | null },
  client?: ProposalClient | null,
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  const cw = W - M * 2;
  let y = M;

  const subImg = await toDataUrl(signatures?.submitted ?? proposal.submitted_signature_path);
  const accImg = await toDataUrl(signatures?.accepted ?? proposal.accepted_signature_path);

  const setColor = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const ensure = (h: number) => { if (y + h > H - M) { doc.addPage(); y = M; } };

  function text(
    s: string,
    x: number,
    opts: { size?: number; color?: [number, number, number]; bold?: boolean; italic?: boolean; align?: 'left' | 'right' | 'center'; maxW?: number } = {},
  ) {
    doc.setFont('helvetica', opts.bold ? 'bold' : opts.italic ? 'italic' : 'normal');
    doc.setFontSize(opts.size ?? 10);
    setColor(opts.color ?? INK);
    const lines2 = doc.splitTextToSize(s || '', opts.maxW ?? cw);
    const lh = (opts.size ?? 10) * 1.4;
    for (const ln of lines2) {
      ensure(lh);
      doc.text(ln, x, y, { align: opts.align ?? 'left' });
      y += lh;
    }
    return lines2.length * lh;
  }

  const sectionHeading = (label: string) => { ensure(24); text(label, M, { size: 11.5, bold: true, color: GOLD }); y += 2; };
  const bullets = (items: string[]) => {
    for (const item of items.filter(Boolean)) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); setColor(GOLD);
      const lines2 = doc.splitTextToSize(item, cw - 20);
      ensure(Math.max(13, lines2.length * 13));
      doc.text('•', M + 4, y);
      setColor(INK); doc.text(lines2, M + 16, y);
      y += Math.max(13, lines2.length * 13);
    }
    y += 6;
  };

  // ── Brand header ─────────────────────────────────────────────
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); setColor(INK);
  doc.text((companyName || 'APAS CONSULTING').toUpperCase(), M, y + 4);
  y += 14;
  doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]); doc.setLineWidth(2);
  doc.line(M, y, W - M, y);
  y += 22;

  // ── Title ────────────────────────────────────────────────────
  text(`PROPOSAL · ${proposal.proposal_no}`, M, { size: 16, bold: true });
  if (proposal.title) { y += 2; text(proposal.title, M, { size: 12, italic: true, color: MUTE }); }
  y += 10;

  // ── Meta rows ────────────────────────────────────────────────
  const meta: [string, string][] = [
    ['Project', projectName],
    ['Prepared for', proposal.client_name ?? '—'],
    ['Client email', proposal.client_email ?? '—'],
    ['Proposal date', longDate(proposal.created_at)],
    ['Valid until', longDate(proposal.valid_until)],
  ];
  doc.setDrawColor(221, 221, 221); doc.setLineWidth(0.5);
  ensure(8); doc.line(M, y, W - M, y); y += 12;
  for (const [k, v] of meta) {
    ensure(15);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); setColor(MUTE);
    doc.text(k, M, y);
    doc.setFont('helvetica', 'normal'); setColor(INK);
    const vl = doc.splitTextToSize(v || '', cw - 120);
    doc.text(vl, M + 120, y);
    y += Math.max(15, vl.length * 12);
  }
  y += 4; doc.setDrawColor(221, 221, 221); doc.line(M, y, W - M, y); y += 16;

  // ── Addressee block + salutation (when we have the client record) ─
  if (client && (client.name || client.contact_name)) {
    const addr = [client.address, [client.city, client.state].filter(Boolean).join(', ')].filter(Boolean).join(', ');
    const salName = client.contact_name?.trim() || client.name?.trim() || '';
    if (client.name) text(client.name, M, { size: 10.5, bold: true });
    if (client.contact_name) text(`Attn: ${client.contact_name}`, M, { size: 9.5, color: MUTE });
    if (addr) text(addr, M, { size: 9.5, color: MUTE });
    if (client.contact_email) text(client.contact_email, M, { size: 9.5, color: MUTE });
    y += 8;
    if (salName) { text(`Dear ${salName},`, M, { size: 10.5 }); y += 6; }
  }

  // ── Overview ─────────────────────────────────────────────────
  if (proposal.notes) {
    sectionHeading('OVERVIEW');
    for (const para of proposal.notes.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)) {
      text(para, M, { size: 10.5 }); y += 5;
    }
    y += 4;
  }

  // ── Scope of services ────────────────────────────────────────
  if (Array.isArray(proposal.scope_bullets) && proposal.scope_bullets.length) {
    sectionHeading('SCOPE OF SERVICES');
    bullets(proposal.scope_bullets);
  }

  // ── Deliverables ─────────────────────────────────────────────
  if (Array.isArray(proposal.deliverables) && proposal.deliverables.length) {
    sectionHeading('DELIVERABLES');
    bullets(proposal.deliverables);
  }

  // ── Pricing table ────────────────────────────────────────────
  const enriched = lines.map((l) => ({
    ...l,
    ext: Number(l.quantity) * Number(l.unit_cost),
  }));

  sectionHeading('PRICING');

  // Column widths (sum === cw so nothing overflows the page).
  const wNo = 20, wCat = 62, wQty = 32, wUnit = 30, wCost = 64, wExt = 76;
  const wDesc = cw - (wNo + wCat + wQty + wUnit + wCost + wExt);
  const xNo = M;
  const xCat = xNo + wNo;
  const xDesc = xCat + wCat;
  const xUnit = xDesc + wDesc + wQty;          // left for Unit
  const xQtyR = xUnit - 6;                      // right edge for Qty (6pt gap before Unit)
  const xCostR = xUnit + wUnit + wCost;        // right edge for Unit cost
  const xExtR = xCostR + wExt;                  // right edge for Extended (= W - M)

  const tableHeader = () => {
    ensure(20);
    doc.setFillColor(LIGHT[0], LIGHT[1], LIGHT[2]);
    doc.rect(M, y - 2, cw, 16, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); setColor(INK);
    doc.text('#', xNo + 1, y + 9);
    doc.text('Category', xCat, y + 9);
    doc.text('Description', xDesc, y + 9);
    doc.text('Qty', xQtyR, y + 9, { align: 'right' });
    doc.text('Unit', xUnit, y + 9);
    doc.text('Unit cost', xCostR, y + 9, { align: 'right' });
    doc.text('Extended', xExtR, y + 9, { align: 'right' });
    y += 18;
  };
  tableHeader();

  enriched.forEach((r, i) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); setColor(INK);
    const descLines = doc.splitTextToSize(r.description || '', wDesc - 6);
    const catLines = doc.splitTextToSize(String(r.category).charAt(0).toUpperCase() + String(r.category).slice(1), wCat - 4);
    const rows = Math.max(descLines.length, catLines.length);
    const rh = Math.max(14, rows * 11 + 4);
    ensure(rh + 2);
    if (i % 2 === 1) { doc.setFillColor(250, 248, 244); doc.rect(M, y - 2, cw, rh, 'F'); }
    const ty = y + 8;
    setColor(MUTE); doc.text(String(r.line_no), xNo + 1, ty);
    setColor(INK);
    doc.text(catLines, xCat, ty);
    doc.text(descLines, xDesc, ty);
    doc.text(String(r.quantity), xQtyR, ty, { align: 'right' });
    doc.text(r.unit || '', xUnit, ty);
    doc.text(usd(Number(r.unit_cost)), xCostR, ty, { align: 'right' });
    setColor(INK); doc.setFont('helvetica', 'bold'); doc.text(usd(r.ext), xExtR, ty, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += rh;
    doc.setDrawColor(236, 233, 226); doc.setLineWidth(0.4); doc.line(M, y, W - M, y);
  });
  if (enriched.length === 0) { ensure(16); text('No priced line items', xDesc, { size: 9, color: MUTE }); }

  // ── Totals ───────────────────────────────────────────────────
  const totals = proposalTotals(lines, proposal);
  y += 8;
  const totalRow = (label: string, value: string) => {
    ensure(14);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); setColor(MUTE);
    doc.text(label, xCostR, y + 8, { align: 'right' });
    setColor(INK); doc.text(value, xExtR, y + 8, { align: 'right' });
    y += 14;
  };
  totalRow('Subtotal', usd(totals.subtotal));
  totalRow(`Overhead (${Number(proposal.overhead_pct || 0)}%)`, usd(totals.overhead));
  totalRow(`Profit (${Number(proposal.profit_pct || 0)}%)`, usd(totals.profit));
  ensure(24); y += 2;
  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]); doc.rect(M + cw - 240, y, 240, 22, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
  doc.text('PROPOSAL TOTAL', xCostR, y + 15, { align: 'right' });
  doc.setFontSize(12); doc.text(usd(totals.total), xExtR - 4, y + 15, { align: 'right' });
  y += 34;

  // ── Terms ────────────────────────────────────────────────────
  sectionHeading('TERMS & CONDITIONS');
  text(proposal.terms ?? 'Net 30. All work per applicable codes and standards.', M, { size: 10 });
  y += 16;

  // ── Signatures ───────────────────────────────────────────────
  ensure(120); y += 6;
  const half = cw / 2;
  const sigTop = y;
  const sigBlock = (label: string, name: string, img: string | null, dateStr: string, x: number) => {
    let yy = sigTop;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); setColor(GOLD); doc.text(label, x, yy); yy += 40;
    if (img) { try { doc.addImage(img, 'PNG', x, yy - 34, 150, 34); } catch { /* best effort */ } }
    doc.setDrawColor(INK[0], INK[1], INK[2]); doc.setLineWidth(0.7); doc.line(x, yy, x + half - 24, yy); yy += 12;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); setColor(INK); doc.text(name || '', x, yy); yy += 12;
    setColor(MUTE); doc.text(`Date: ${dateStr}`, x, yy);
  };
  sigBlock(
    'SUBMITTED BY',
    companyName || 'APAS Consulting',
    subImg,
    proposal.submitted_signed_at ? new Date(proposal.submitted_signed_at).toLocaleDateString() : '____________',
    M,
  );
  sigBlock(
    'ACCEPTED & AUTHORIZED',
    proposal.accepted_signed_name || proposal.client_name || '',
    accImg,
    proposal.accepted_signed_at ? new Date(proposal.accepted_signed_at).toLocaleDateString() : '____________',
    M + half,
  );
  y = sigTop + 78;

  // ── Footer on every page ─────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]); doc.setLineWidth(1);
    doc.line(M, H - 30, W - M, H - 30);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); setColor(MUTE);
    doc.text(`${companyName || 'APAS Consulting'} · Commercial proposal · ${proposal.proposal_no}`, M, H - 20);
    doc.text(`Page ${p} of ${pages}`, W - M, H - 20, { align: 'right' });
  }

  return doc;
}

export async function buildProposalPdfBlob(
  proposal: FinancialProposal,
  lines: FinancialProposalLine[],
  projectName: string,
  companyName?: string,
  signatures?: { submitted?: string | null; accepted?: string | null },
  client?: ProposalClient | null,
) {
  return (await buildProposalPdf(proposal, lines, projectName, companyName, signatures, client)).output('blob');
}

export async function generateProposalPdf(
  proposal: FinancialProposal,
  lines: FinancialProposalLine[],
  projectName: string,
  companyName?: string,
  client?: ProposalClient | null,
) {
  const doc = await buildProposalPdf(proposal, lines, projectName, companyName, undefined, client);
  const now = new Date();
  doc.save(`proposal-${proposal.proposal_no.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${now.toISOString().split('T')[0]}.pdf`);
}
