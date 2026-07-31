// Branded project-correspondence letter — letterhead + address block + a
// single rich-text body. The body is the ONE source of truth: whatever the
// user sees in the editor (including their own greeting/salutation, bold,
// bullets, sub-bullets, headings…) is exactly what renders here — nothing is
// auto-composited on top of it. Inline styles only (no <style> block, no
// Tailwind classes), so this renders identically on screen, in the rasterized
// PDF (html2canvas), and in the sent email (most clients strip <style>).

export interface CorrespondenceLetterInput {
  brand?: string;
  subtitle?: string;         // e.g. "Project correspondence"
  date?: string | null;
  recipient?: string | null;       // name / title
  recipientOrg?: string | null;    // company / agency (e.g. R4 Capital, City of Opa-Locka)
  recipientAddress?: string | null;
  referenceNo?: string | null;
  subject: string;
  /** Rich HTML from the letter editor (paragraphs, greeting, sign-off, bold,
   *  lists, headings…) — rendered as-is, not escaped or reformatted. There is
   *  no separate auto-generated "Sincerely," block: if you want a closing and
   *  signature, type it as the last part of the body, same as the greeting. */
  body?: string | null;
  projectName?: string | null;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmtDate = (s?: string | null) =>
  (s ? new Date(s.length <= 10 ? s + 'T00:00:00' : s) : new Date()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

// Rich-text editors (TipTap) emit a bounded, predictable tag set. Email clients
// largely strip <style> blocks, so every one of those tags gets its look
// applied as an inline `style` attribute here — a one-time inlining pass over
// the parsed fragment — rather than relying on a stylesheet nobody will load.
const TAG_STYLES: Record<string, string> = {
  p: 'margin:0 0 14px;',
  h1: "font-family:Georgia,'Playfair Display',serif;font-size:21px;font-weight:700;margin:26px 0 12px;line-height:1.3;",
  h2: "font-family:Georgia,'Playfair Display',serif;font-size:18px;font-weight:700;margin:22px 0 10px;line-height:1.3;",
  h3: 'font-size:15.5px;font-weight:700;margin:18px 0 8px;line-height:1.3;',
  ul: 'margin:0 0 14px;padding-left:24px;',
  ol: 'margin:0 0 14px;padding-left:24px;',
  li: 'margin:0 0 7px;',
  strong: 'font-weight:700;',
  b: 'font-weight:700;',
  em: 'font-style:italic;',
  i: 'font-style:italic;',
  u: 'text-decoration:underline;',
  s: 'text-decoration:line-through;',
  blockquote: 'margin:0 0 14px;padding:2px 0 2px 14px;border-left:3px solid #C4A35A;color:#5f5c57;font-style:italic;',
  hr: 'border:none;border-top:1px solid #cfccc6;margin:20px 0;',
  a: 'color:#1D6FE8;',
  table: 'border-collapse:collapse;width:100%;margin:0 0 14px;',
  td: 'border:1px solid #cfccc6;padding:6px 10px;vertical-align:top;',
  th: 'border:1px solid #cfccc6;padding:6px 10px;text-align:left;background:#f5f3ee;',
};

function inlineBodyStyles(html: string): string {
  const raw = (html || '').trim();
  if (!raw || typeof DOMParser === 'undefined') return raw;
  const root = new DOMParser().parseFromString(`<div>${raw}</div>`, 'text/html').body.firstElementChild;
  if (!root) return raw;
  root.querySelectorAll('*').forEach((el) => {
    const rule = TAG_STYLES[el.tagName.toLowerCase()];
    if (rule) el.setAttribute('style', `${el.getAttribute('style') || ''};${rule}`);
  });
  return root.innerHTML;
}

export function buildCorrespondenceHtml(input: CorrespondenceLetterInput): string {
  const brand = input.brand || 'APAS';
  const subtitle = input.subtitle || 'Project correspondence';
  const toBlock = [input.recipient, input.recipientOrg, input.recipientAddress].filter(Boolean).map((l) => esc(String(l))).join('<br>');
  const bodyHtml = inlineBodyStyles(input.body || '');

  return `<div style="max-width:700px;margin:0 auto;font-family:'DM Sans',Georgia,serif;color:#1A1714;font-size:15.5px;line-height:1.75;background:#fff;padding:36px 40px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #C4A35A;padding-bottom:14px;">
      <div style="font-family:Georgia,'Playfair Display',serif;font-size:25px;font-weight:700;">${esc(brand)}</div>
      <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8a877f;">${esc(subtitle)}</div>
    </div>

    <div style="margin-top:32px;font-size:14px;">${fmtDate(input.date)}</div>
    ${input.referenceNo ? `<div style="margin-top:4px;font-size:13.5px;color:#5f5c57;">Re: ${esc(input.referenceNo)}</div>` : ''}

    ${toBlock ? `<div style="margin-top:20px;font-size:14px;">${toBlock}</div>` : ''}

    <div style="margin-top:18px;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#8a877f;">Subject: ${esc(input.subject)}</div>

    <div style="margin-top:20px;">
      ${bodyHtml || '<p style="color:#8a877f;">[Letter body]</p>'}
    </div>

    <div style="margin-top:36px;border-top:1px solid #e8e5df;padding-top:10px;font-size:11.5px;color:#a8a49c;">
      ${esc(brand)}${input.projectName ? ` · ${esc(input.projectName)}` : ''}
    </div>
  </div>`;
}

export interface CoverNoteInput {
  brand?: string;
  message: string;            // plain text, paragraphs split on blank lines
  attachmentName?: string | null;
  projectName?: string | null;
}

// A short email wrapper for when the actual document goes out as a PDF
// attachment — the email body is just your note, not the whole letter
// rendered twice. Falls back to buildCorrespondenceHtml's full inline
// rendering when there's no separate message (see CorrespondenceComposer).
export function buildCoverNoteHtml(input: CoverNoteInput): string {
  const brand = input.brand || 'APAS';
  const paras = (input.message || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p style="margin:0 0 14px;">${esc(p).replace(/\n/g, '<br>')}</p>`).join('');

  return `<div style="max-width:600px;margin:0 auto;font-family:'DM Sans',Georgia,serif;color:#1A1714;font-size:15px;line-height:1.7;background:#fff;padding:28px 32px;">
    <div style="font-family:Georgia,'Playfair Display',serif;font-size:19px;font-weight:700;border-bottom:2px solid #C4A35A;padding-bottom:10px;">${esc(brand)}</div>
    <div style="margin-top:20px;">${paras}</div>
    ${input.attachmentName ? `<div style="margin-top:8px;font-size:13px;color:#5f5c57;">📎 Attached: ${esc(input.attachmentName)}</div>` : ''}
    <div style="margin-top:28px;border-top:1px solid #e8e5df;padding-top:10px;font-size:11.5px;color:#a8a49c;">
      ${esc(brand)}${input.projectName ? ` · ${esc(input.projectName)}` : ''}
    </div>
  </div>`;
}
