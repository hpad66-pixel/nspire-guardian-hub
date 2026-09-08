import type { ConsultingReport, ConsultingReportSource } from '@/hooks/useConsultingReports';
import { htmlReportPdfBase64 } from '@/lib/reports/htmlReportPdf';

export const removeLongDashes = (value: string) => value.replace(/[\u2013\u2014]/g, '-');

const escapeHtml = (value: string) => removeLongDashes(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const fileSize = (bytes: number | null) => {
  if (!bytes) return 'Size not recorded';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const plainText = (html: string) => removeLongDashes(html)
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/p>|<\/h[1-6]>|<\/li>/gi, '\n')
  .replace(/<[^>]*>/g, '')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&#039;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

function safeReportBody(html: string) {
  return removeLongDashes(html)
    .replace(/<(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(script|style|iframe|object|embed)[^>]*\/?>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, '');
}

export interface ConsultingReportTemplateInput {
  projectName: string;
  report: ConsultingReport;
  sources: ConsultingReportSource[];
  imageUrls?: Record<string, string>;
  personalMessage?: string;
  documentPages?: Record<string, string[]>;
}

export function reportHeadings(bodyHtml: string) {
  const matches = [...safeReportBody(bodyHtml).matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)];
  return matches.map((match, index) => ({ number: index + 1, title: plainText(match[1]) || `Section ${index + 1}` }));
}

function numberedBody(bodyHtml: string) {
  let section = 0;
  return safeReportBody(bodyHtml).replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, (_full, attrs, title) => {
    section += 1;
    return `<h2${attrs}><span class="section-number">${String(section).padStart(2, '0')}</span>${title}</h2>`;
  });
}

export function isPlacedEvidence(source: ConsultingReportSource) {
  return source.placement_mode === 'mandatory' || (source.included && source.selected_for_report !== false);
}

export function evidenceCaption(source: ConsultingReportSource) {
  const filenameCaption = source.source_name.replace(/[-_]+/g, ' ').replace(/\.[^.]+$/, '');
  return (!source.caption || source.caption === filenameCaption) ? (source.visual_analysis?.summary || source.caption || source.source_name) : source.caption;
}

export function buildConsultingReportHtml({ projectName, report, sources, imageUrls = {}, documentPages = {} }: ConsultingReportTemplateInput) {
  const included = sources.filter((source) => source.included || source.placement_mode === 'mandatory');
  const images = included.filter((source) => source.mime_type?.startsWith('image/') && isPlacedEvidence(source));
  const receipts = included.filter(source => source.placement_mode === 'mandatory' && source.mime_type === 'application/pdf');
  const receiptPages = receipts.map(source => `<section class="receipt-record page-break"><div class="eyebrow">Required supporting evidence</div><h2>${escapeHtml(source.source_name)}</h2>${(documentPages[source.id] || []).map((url, index) => `<figure class="receipt-page"><img src="${escapeHtml(url)}" alt="${escapeHtml(source.source_name)} page ${index + 1}"><figcaption>${escapeHtml(source.source_name)} | Page ${index + 1}</figcaption></figure>`).join('') || '<p>Receipt preview is loading. All pages must be available before delivery.</p>'}</section>`).join('');
  const headings = reportHeadings(report.body_html);
  const reportDate = new Date(`${report.report_date}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const toc = headings.map((heading) => `<li><span>${String(heading.number).padStart(2, '0')}</span><b>${escapeHtml(heading.title)}</b></li>`).join('');
  const photoPages = images.length ? `<section class="photo-record page-break"><div class="eyebrow">Selected evidence</div><h2>Photographic Record</h2><p class="lead">Selected photographs and required evidence supporting the report findings.</p><div class="photo-grid">${images.map((source, index) => `<figure>${imageUrls[source.id] ? `<img src="${escapeHtml(imageUrls[source.id])}" alt="${escapeHtml(evidenceCaption(source))}">` : '<div class="image-placeholder">Image preview unavailable</div>'}<figcaption><b>Photo ${String(index + 1).padStart(2, '0')}</b><span>${escapeHtml(evidenceCaption(source))}</span><small>${escapeHtml(source.source_type === 'google_drive' ? 'Imported from Google Drive' : 'Project upload')}</small></figcaption></figure>`).join('')}</div></section>` : '';
  const manifestRows = included.map((source, index) => `<tr><td>S${index + 1}</td><td>${escapeHtml(source.source_name)}</td><td>${escapeHtml(source.source_type === 'google_drive' ? 'Google Drive' : 'Project upload')}</td><td>${escapeHtml(source.mime_type || 'Unknown')}</td><td>${escapeHtml(fileSize(source.size_bytes))}</td></tr>`).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(report.title)} | ${escapeHtml(projectName)}</title><style>
  @page{size:letter;margin:.55in}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#edf2ef;color:#173a32;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.62}.report{width:100%;max-width:1050px;margin:0 auto;background:#fff}.cover{min-height:930px;position:relative;overflow:hidden;background:linear-gradient(145deg,#061f19 0%,#082b23 52%,#0d6b57 100%);color:#fff;padding:72px 68px;display:flex;flex-direction:column;justify-content:space-between}.cover:before{content:"";position:absolute;right:-160px;top:-170px;width:520px;height:520px;border:1px solid #edce7950;border-radius:50%}.cover:after{content:"";position:absolute;right:-80px;top:-90px;width:360px;height:360px;background:#edce7914;border-radius:50%}.cover>*{position:relative;z-index:1}.brand{display:flex;align-items:center;gap:13px;color:#edce79;font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase}.brand-mark{width:45px;height:45px;border:1px solid #edce79;border-radius:50%;display:grid;place-items:center;font-family:Georgia,serif;font-size:13px}.cover-label{margin-top:145px;color:#edce79;font-size:11px;font-weight:800;letter-spacing:.2em;text-transform:uppercase}.cover h1{max-width:790px;margin:18px 0 15px;font:700 52px/1.07 Georgia,'Times New Roman',serif;letter-spacing:-.02em}.cover .subtitle{max-width:720px;margin:0;color:#d4e5df;font-size:19px;line-height:1.5}.cover-meta{border-top:1px solid #ffffff2c;padding-top:22px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px}.cover-meta b{display:block;color:#edce79;font-size:9px;letter-spacing:.13em;text-transform:uppercase}.cover-meta span{display:block;margin-top:4px;color:#fff;font-size:13px}.page{padding:55px 64px}.contents{min-height:860px;background:#fbfcfb}.eyebrow{color:#0d6b57;font-size:10px;font-weight:800;letter-spacing:.17em;text-transform:uppercase}.contents h2,.photo-record>h2,.manifest>h2{margin:8px 0 26px;color:#082b23;font:700 35px Georgia,serif}.contents ol{list-style:none;margin:0;padding:0;border-top:2px solid #082b23}.contents li{display:grid;grid-template-columns:55px 1fr;align-items:center;border-bottom:1px solid #dce4e0;padding:17px 8px}.contents li span{color:#0d6b57;font-weight:800}.contents li b{font:700 17px Georgia,serif}.contents .basis{margin-top:42px;border-left:4px solid #dfbd67;background:#fff9e8;padding:18px 20px;color:#5e573e}.report-body{padding:54px 64px}.report-body h2{display:flex;align-items:baseline;gap:14px;margin:44px 0 17px;padding-bottom:10px;border-bottom:2px solid #d9e7e1;color:#082b23;font:700 29px Georgia,serif;break-after:avoid}.report-body h2:first-child{margin-top:0}.section-number{color:#0d6b57;font:800 10px Arial,sans-serif;letter-spacing:.1em}.report-body h3{margin:27px 0 8px;color:#0d6b57;font-size:17px}.report-body p{margin:0 0 15px}.report-body ul,.report-body ol{margin:0 0 19px;padding-left:24px}.report-body li{margin:0 0 7px}.report-body blockquote{margin:22px 0;border-left:4px solid #dfbd67;background:#fff9e8;padding:15px 18px;color:#504a35}.report-body table{width:100%;margin:22px 0;border-collapse:collapse;font-size:12px;break-inside:avoid}.report-body th,.report-body td{border:1px solid #d4ded9;padding:9px 10px;vertical-align:top}.report-body th{background:#082b23;color:#fff;text-align:left}.lead{color:#596a64}.photo-record,.manifest{padding:54px 50px}.photo-grid{display:grid;grid-template-columns:1fr 1fr;gap:17px}.photo-grid figure{margin:0;border:1px solid #d6e1dc;border-radius:12px;overflow:hidden;break-inside:avoid;background:#fff}.photo-grid img,.image-placeholder{display:block;width:100%;height:245px;object-fit:contain;background:#edf2ef}.image-placeholder{display:grid;place-items:center;color:#71817b}.photo-grid figcaption{display:grid;gap:3px;padding:12px 14px}.photo-grid figcaption b{color:#0d6b57;font-size:9px;letter-spacing:.12em;text-transform:uppercase}.photo-grid figcaption span{font-weight:700}.photo-grid figcaption small{color:#71817b}.manifest table{width:100%;border-collapse:collapse;font-size:10px}.manifest th,.manifest td{border:1px solid #d6e0dc;padding:7px;vertical-align:top}.manifest th{background:#082b23;color:#fff;text-align:left}.report-footer{border-top:1px solid #d8e1dd;margin:30px 50px 0;padding:18px 0 32px;color:#6a7974;font-size:10px}.page-break{break-before:page}@media print{html,body{background:#fff}.report{max-width:none}.cover{-webkit-print-color-adjust:exact;print-color-adjust:exact;break-after:page}.contents{break-after:page}.page-break{break-before:page}.report-body h2,.photo-grid figure,.manifest tr{break-inside:avoid}}
  .receipt-record{padding:40px}.receipt-page{margin:0;break-inside:avoid;break-after:page}.receipt-page img{width:100%;max-height:760px;object-fit:contain}.receipt-page figcaption{font-size:12px;color:#52665d}.receipt-record h2{font:700 24px Georgia,serif}</style><style>@media print{.photo-record{padding-top:42px}.photo-record>h2{margin-bottom:14px}.photo-record .lead{margin:0 0 14px}.photo-grid{gap:10px}.photo-grid img,.photo-grid .image-placeholder{height:175px}.photo-grid figcaption{padding:8px 10px;font-size:11px;line-height:1.35}.photo-grid figcaption small{font-size:9px}}</style></head><body><main class="report"><header class="cover"><div><div class="brand"><span class="brand-mark">APAS</span>APAS Consulting</div><div class="cover-label">Professional consulting report</div><h1>${escapeHtml(report.title)}</h1><p class="subtitle">${escapeHtml(report.subtitle || `${projectName} | Client-ready project report`)}</p></div><div class="cover-meta"><div><b>Project</b><span>${escapeHtml(projectName)}</span></div><div><b>Report date</b><span>${escapeHtml(reportDate)}</span></div><div><b>Prepared by</b><span>APAS Consulting</span></div></div></header><section class="page contents"><div class="eyebrow">Report navigation</div><h2>Table of Contents</h2><ol>${toc || '<li><span>01</span><b>Report narrative</b></li>'}${images.length ? `<li><span>${String(headings.length + 1).padStart(2, '0')}</span><b>Photographic Record</b></li>` : ''}<li><span>${String(headings.length + (images.length ? 2 : 1)).padStart(2, '0')}</span><b>Source Manifest${receipts.length ? " and Required Receipts" : ""}</b></li></ol><div class="basis"><strong>Evidence standard</strong><br>This report was prepared from the narrative and selected source records listed in the manifest. Recommendations and interpretations remain subject to client review and appropriate professional verification.</div></section><section class="report-body">${numberedBody(report.body_html)}</section>${photoPages}${receiptPages}<section class="manifest page-break"><div class="eyebrow">Document control</div><h2>Source Manifest</h2><p class="lead">This register identifies the records selected by the report author. Original files remain in the private project repository.</p><table><thead><tr><th>Ref.</th><th>Source</th><th>Origin</th><th>File type</th><th>Size</th></tr></thead><tbody>${manifestRows || '<tr><td colspan="5">No source files were selected.</td></tr>'}</tbody></table></section><footer class="report-footer">Prepared by APAS Consulting through Proj OS. Draft content must be reviewed before issue. This report does not create authorization to proceed, a code determination, or a professional certification unless expressly signed and sealed by the responsible professional.</footer></main></body></html>`;
}

export function buildConsultingReportEmail(input: ConsultingReportTemplateInput) {
  const included = input.sources.filter((source) => source.included || source.placement_mode === 'mandatory');
  const message = input.personalMessage ? `<div style="margin-bottom:20px;border-left:4px solid #dfbd67;background:#fff9e8;padding:14px 16px;color:#4b452f;line-height:1.6;">${escapeHtml(input.personalMessage).replace(/\n/g, '<br>')}</div>` : '';
  const imageCount = included.filter((source) => source.mime_type?.startsWith('image/') && isPlacedEvidence(source)).length;
  return `<div style="margin:0;background:#edf2ef;padding:24px 8px;font-family:Arial,sans-serif;color:#173a32;"><div style="max-width:760px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;"><div style="height:6px;background:#dfbd67;"></div><div style="background:#082b23;color:#ffffff;padding:32px 30px;"><div style="color:#edce79;font-size:10px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;">APAS Consulting</div><h1 style="margin:16px 0 8px;font:700 30px/1.15 Georgia,serif;">${escapeHtml(input.report.title)}</h1><div style="color:#c9ddd6;font-size:14px;">${escapeHtml(input.projectName)}</div></div><div style="padding:26px 30px;">${message}<p style="font-size:14px;line-height:1.65;color:#485b54;">Please find the client-ready report below and attached as a matching PDF. The PDF includes the cover page, table of contents, full narrative, selected photographs, and source manifest.</p><table role="presentation" width="100%" cellspacing="8" cellpadding="0" style="margin:18px -8px;"><tr><td style="background:#eff7f3;border-radius:10px;padding:13px;"><b style="font-size:23px;color:#082b23;">${reportHeadings(input.report.body_html).length}</b><br><span style="font-size:9px;color:#66756f;text-transform:uppercase;">Narrative sections</span></td><td style="background:#eff7f3;border-radius:10px;padding:13px;"><b style="font-size:23px;color:#082b23;">${imageCount}</b><br><span style="font-size:9px;color:#66756f;text-transform:uppercase;">Photographs</span></td><td style="background:#eff7f3;border-radius:10px;padding:13px;"><b style="font-size:23px;color:#082b23;">${included.length}</b><br><span style="font-size:9px;color:#66756f;text-transform:uppercase;">Manifest records</span></td></tr></table><div style="border-top:1px solid #d8e2de;padding-top:18px;font-size:14px;line-height:1.65;color:#334b43;">${safeReportBody(input.report.body_html)}</div><div style="margin-top:22px;border-top:2px solid #082b23;padding-top:12px;color:#72817c;font-size:10px;line-height:1.5;">Prepared by APAS Consulting through Proj OS. Please review the attached PDF for the controlled photographic record and source manifest.</div></div></div></div>`;
}

export function buildConsultingReportText(input: ConsultingReportTemplateInput) {
  return removeLongDashes([input.personalMessage, input.report.title, input.projectName, plainText(input.report.body_html), `${input.sources.filter((source) => source.included).length} source records are listed in the attached PDF.`].filter(Boolean).join('\n\n'));
}

export async function secureConsultingReportImages(sources: ConsultingReportSource[]) {
  const { supabase } = await import('@/integrations/supabase/client');
  const images = sources.filter((source) => isPlacedEvidence(source) && source.mime_type?.startsWith('image/'));
  const pairs = await Promise.all(images.map(async (source) => {
    if (!source.storage_path) throw new Error(`Missing image file: ${source.source_name}`);
    const { data, error } = await supabase.storage.from('project-documents').createSignedUrl(source.storage_path!, 30 * 60);
    if (error || !data?.signedUrl) throw new Error(`Could not open required photo: ${source.source_name}`);
    return [source.id, data.signedUrl] as const;
  }));
  return Object.fromEntries(pairs.filter(([, url]) => Boolean(url)));
}

export async function secureMandatoryDocumentPages(sources: ConsultingReportSource[]) {
  const documents = sources.filter(s => s.placement_mode === 'mandatory' && s.mime_type === 'application/pdf');
  if (!documents.length) return {};
  const { supabase } = await import('@/integrations/supabase/client');
  const { renderEvidencePdf } = await import('./reportEvidencePdf');
  const result: Record<string, string[]> = {};
  for (const source of documents) {
    if (!source.storage_path) throw new Error('Missing mandatory receipt: ' + source.source_name);
    const { data, error } = await supabase.storage.from('project-documents').download(source.storage_path);
    if (error || !data) throw new Error('Could not open mandatory receipt: ' + source.source_name);
    result[source.id] = await renderEvidencePdf(await data.arrayBuffer());
  }
  return result;
}

export async function prepareConsultingReportDelivery(input: ConsultingReportTemplateInput) {
  const imageUrls = await secureConsultingReportImages(input.sources);
  const documentPages = await secureMandatoryDocumentPages(input.sources);
  const printableHtml = buildConsultingReportHtml({ ...input, imageUrls, documentPages });
  const pdf = await htmlReportPdfBase64(printableHtml, { pageAware: true, requireImages: true });
  return {
    bodyHtml: buildConsultingReportEmail(input),
    bodyText: buildConsultingReportText(input),
    pdfBase64: pdf.base64,
    pdfSize: pdf.size,
  };
}

export async function openConsultingReport(input: ConsultingReportTemplateInput) {
  const popup = window.open('', '_blank');
  if (!popup) throw new Error('Allow pop-ups to open the report.');
  popup.opener = null;
  popup.document.write('<!doctype html><title>Preparing report</title><body style="font:16px Arial;padding:40px;color:#082b23">Preparing the APAS Consulting report and secure images...</body>');
  popup.document.close();
  const imageUrls = await secureConsultingReportImages(input.sources);
  popup.document.open();
  const documentPages = await secureMandatoryDocumentPages(input.sources);
  popup.document.write(buildConsultingReportHtml({ ...input, imageUrls, documentPages }));
  popup.document.close();
}

export async function downloadConsultingReport(input: ConsultingReportTemplateInput) {
  const delivery = await prepareConsultingReportDelivery(input);
  const bytes = Uint8Array.from(atob(delivery.pdfBase64), char => char.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = input.report.title.replace(/[^a-zA-Z0-9 -]/g, '').trim().slice(0, 100) + '.pdf';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
