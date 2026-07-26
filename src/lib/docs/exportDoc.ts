// Client-side document export — download the edited HTML as a Word (.doc) file or
// a print-to-PDF, with no server round-trip and no extra libraries. Word opens
// HTML-based .doc files natively (bold/headings/lists/tables carry over), so we
// wrap the editor HTML in a minimal Office-namespaced document.

const sanitizeName = (s: string) => (s || "document").replace(/[^\w.-]+/g, "_").slice(0, 80);

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const DOC_CSS = `
  body{font-family:'Calibri','Segoe UI',Arial,sans-serif;font-size:11pt;color:#111;line-height:1.5;}
  h1{font-size:18pt;} h2{font-size:15pt;} h3{font-size:13pt;}
  table{border-collapse:collapse;} td,th{border:1px solid #999;padding:4px 8px;}
  blockquote{border-left:3px solid #ccc;margin-left:0;padding-left:12px;color:#555;}
`;

function wordHtml(html: string, title: string): string {
  const pre =
    `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>` +
    `<head><meta charset='utf-8'><title>${title}</title><style>${DOC_CSS}</style></head><body>`;
  return `${pre}${html}</body></html>`;
}

/** Download the editor HTML as a Word-openable .doc file. */
export function downloadAsWord(html: string, title: string) {
  const blob = new Blob(["﻿", wordHtml(html, title)], { type: "application/msword" });
  download(blob, `${sanitizeName(title)}.doc`);
}

/** Build a Word (.doc) email attachment (base64) from the editor HTML. */
export function wordDocBase64(html: string, title: string): { filename: string; contentBase64: string; contentType: string; size: number } {
  const bytes = new TextEncoder().encode("﻿" + wordHtml(html, title));
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return { filename: `${sanitizeName(title)}.doc`, contentBase64: btoa(bin), contentType: "application/msword", size: bytes.length };
}

/** Open a clean print view of the document so the user can Save as PDF. */
export function printAsPdf(html: string, title: string) {
  const w = window.open("", "_blank", "width=850,height=1100");
  if (!w) return;
  w.document.write(
    `<!doctype html><html><head><meta charset='utf-8'><title>${title}</title>` +
    `<style>${DOC_CSS} @page{margin:1in;} body{max-width:7.5in;margin:0 auto;}</style></head>` +
    `<body>${html}<script>window.onload=function(){window.focus();window.print();}<\/script></body></html>`,
  );
  w.document.close();
}
