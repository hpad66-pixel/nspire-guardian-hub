import { newDoc, drawHeader, drawFooter, drawTable, money, downloadPdf } from './index';
import type { FinancialProposal, FinancialProposalLine } from '@/hooks/useFinancialProposals';

async function toDataUrl(src?: string | null): Promise<string | null> {
  if (!src) return null;
  if (src.startsWith('data:')) return src;
  try {
    const blob = await (await fetch(src)).blob();
    return await new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

export async function buildProposalPdf(
  proposal: FinancialProposal,
  lines: FinancialProposalLine[],
  projectName: string,
  companyName?: string,
  signatures?: { submitted?: string | null; accepted?: string | null },
) {
  const doc = newDoc({ orientation: 'portrait' });
  const pageW = doc.internal.pageSize.getWidth();
  const now = new Date();

  drawHeader(doc, {
    title: `Proposal ${proposal.proposal_no}`,
    subtitle: proposal.title,
    tenantName: companyName,
  });

  let y = 108;

  // ── Proposal metadata ─────────────────────────────────────────────
  doc.setFontSize(9);
  const meta: [string, string][] = [
    ['Project:', projectName],
    ['Prepared For:', proposal.client_name ?? '—'],
    ['Email:', proposal.client_email ?? '—'],
    ['Valid Until:', proposal.valid_until ? new Date(proposal.valid_until + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'],
    ['Status:', proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)],
  ];
  for (const [k, v] of meta) {
    doc.setFont('helvetica', 'bold'); doc.text(k, 40, y);
    doc.setFont('helvetica', 'normal'); doc.text(v, 160, y);
    y += 13;
  }
  y += 10;

  // ── Line Items ────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Scope of Work & Pricing', 40, y);
  y += 8;

  const enrichedLines = lines.map(l => ({
    ...l,
    ext_cost: l.quantity * l.unit_cost,
    marked_up: l.quantity * l.unit_cost * (1 + l.markup_pct / 100),
  }));

  y = drawTable(doc, {
    x: 40, y,
    columns: [
      { key: 'line_no', header: '#', width: 30 },
      { key: 'category', header: 'Category', width: 80, fmt: v => String(v).charAt(0).toUpperCase() + String(v).slice(1) },
      { key: 'description', header: 'Description', width: 200 },
      { key: 'quantity', header: 'Qty', width: 40, align: 'right', fmt: v => String(v) },
      { key: 'unit', header: 'Unit', width: 40 },
      { key: 'unit_cost', header: 'Unit Cost', width: 80, align: 'right', fmt: v => money(v) },
      { key: 'markup_pct', header: 'Markup', width: 55, align: 'right', fmt: v => `${v}%` },
      { key: 'marked_up', header: 'Total', width: 85, align: 'right', fmt: v => money(v) },
    ],
    rows: enrichedLines,
    onNewPage: (d) => { drawHeader(d, { title: `Proposal ${proposal.proposal_no}`, subtitle: proposal.title, tenantName: companyName }); return 108; },
  });

  // Totals block
  const subtotal = enrichedLines.reduce((s, l) => s + l.ext_cost, 0);
  const totalMarkup = enrichedLines.reduce((s, l) => s + (l.marked_up - l.ext_cost), 0);
  const grandTotal = enrichedLines.reduce((s, l) => s + l.marked_up, 0);

  y += 6;
  const totRows: [string, string][] = [
    ['Subtotal (before markup):', money(subtotal)],
    ['Markup:', money(totalMarkup)],
    ['PROPOSAL TOTAL:', money(grandTotal)],
  ];
  const rx = pageW - 40;
  for (const [label, val] of totRows) {
    const isBold = label.startsWith('PROPOSAL');
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(isBold ? 11 : 9);
    doc.text(label, rx - 120, y, { align: 'right' });
    doc.text(val, rx, y, { align: 'right' });
    y += isBold ? 0 : 14;
    if (isBold) { y += 4; doc.setLineWidth(0.5); doc.setDrawColor(0); doc.line(rx - 160, y, rx, y); y += 8; }
  }

  y += 14;

  // ── Notes ─────────────────────────────────────────────────────────
  if (proposal.notes) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('Notes', 40, y); y += 12;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    const noteLines = doc.splitTextToSize(proposal.notes, pageW - 80);
    doc.text(noteLines, 40, y);
    y += noteLines.length * 12 + 12;
  }

  // ── Terms ─────────────────────────────────────────────────────────
  const terms = proposal.terms ?? 'Net 30. All work per applicable codes and standards.';
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('Terms & Conditions', 40, y); y += 12;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  const termLines = doc.splitTextToSize(terms, pageW - 80);
  doc.text(termLines, 40, y);
  y += termLines.length * 12 + 20;

  // Signature block
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('Acceptance', 40, y); y += 14;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  const submitted = await toDataUrl(signatures?.submitted ?? proposal.submitted_signature_path);
  const accepted = await toDataUrl(signatures?.accepted ?? proposal.accepted_signature_path);
  doc.text('Submitted By: _________________________________', 40, y);
  doc.text('Accepted By: _________________________________', pageW / 2 + 10, y);
  if (submitted) { try { doc.addImage(submitted, 'PNG', 80, y - 28, 130, 28); } catch { /* best effort */ } }
  if (accepted) { try { doc.addImage(accepted, 'PNG', pageW / 2 + 55, y - 28, 130, 28); } catch { /* best effort */ } }
  y += 18;
  doc.text(`Date: ${proposal.submitted_signed_at ? new Date(proposal.submitted_signed_at).toLocaleDateString() : '_____________'}`, 40, y);
  doc.text(`Date: ${proposal.accepted_signed_at ? new Date(proposal.accepted_signed_at).toLocaleDateString() : '_____________'}`, pageW / 2 + 10, y);

  drawFooter(doc, { generatedAt: now, pageLabel: proposal.proposal_no });
  return doc;
}

export async function buildProposalPdfBlob(
  proposal: FinancialProposal,
  lines: FinancialProposalLine[],
  projectName: string,
  companyName?: string,
  signatures?: { submitted?: string | null; accepted?: string | null },
) {
  return (await buildProposalPdf(proposal, lines, projectName, companyName, signatures)).output('blob');
}

export async function generateProposalPdf(proposal: FinancialProposal, lines: FinancialProposalLine[], projectName: string, companyName?: string) {
  const doc = await buildProposalPdf(proposal, lines, projectName, companyName);
  const now = new Date();
  downloadPdf(doc, `proposal-${proposal.proposal_no.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${now.toISOString().split('T')[0]}.pdf`);
}
