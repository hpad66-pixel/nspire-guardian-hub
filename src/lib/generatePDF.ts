// jsPDF and html2canvas are loaded dynamically so they never land in the main
// bundle — they're only fetched when the user actually triggers a PDF action.

export interface PDFOptions {
  filename: string;
  elementId: string;
  scale?: number;
  margin?: number;
  /** Clickable links appended as a final page (html2canvas flattens inline links). */
  appendLinks?: { label: string; url: string }[];
}

export async function generatePDF(options: PDFOptions): Promise<void> {
  const { filename, elementId, scale = 2, margin = 10, appendLinks } = options;

  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  const pdfWidth = 210;
  const pdfHeight = 297;
  const contentWidth = pdfWidth - margin * 2;

  const scaleFactor = (contentWidth * scale) / imgWidth;
  const scaledHeight = (imgHeight * scaleFactor) / scale;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageHeight = pdfHeight - margin * 2;
  const totalPages = Math.ceil(scaledHeight / pageHeight);

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) {
      pdf.addPage();
    }

    const sourceY = (page * pageHeight * scale) / scaleFactor;
    const sourceHeight = Math.min(
      (pageHeight * scale) / scaleFactor,
      imgHeight - sourceY
    );

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = imgWidth;
    pageCanvas.height = sourceHeight;
    const ctx = pageCanvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(
        canvas,
        0, sourceY,
        imgWidth, sourceHeight,
        0, 0,
        imgWidth, sourceHeight
      );

      const pageImgData = pageCanvas.toDataURL('image/png');
      const destHeight = (sourceHeight * scaleFactor) / scale;

      pdf.addImage(
        pageImgData,
        'PNG',
        margin,
        margin,
        contentWidth,
        destHeight
      );
    }
  }

  // Clickable photo links — a final page of native PDF text links (the inline
  // photos above are flattened images, so these are what make them click-through).
  if (appendLinks && appendLinks.length > 0) {
    pdf.addPage();
    let y = margin + 6;
    pdf.setFontSize(14);
    pdf.setTextColor(26, 23, 20);
    pdf.text('Site Photos — links', margin, y);
    y += 8;
    pdf.setFontSize(11);
    appendLinks.forEach((l, i) => {
      if (y > pdfHeight - margin) { pdf.addPage(); y = margin + 6; }
      pdf.setTextColor(26, 23, 20);
      pdf.text(`${i + 1}. ${l.label}`.slice(0, 90), margin, y);
      y += 5.5;
      pdf.setTextColor(29, 111, 232);
      pdf.textWithLink('View photo ↗', margin + 4, y, { url: l.url });
      y += 8;
    });
  }

  pdf.save(filename);
}

export interface PDFBase64Options {
  elementId: string;
  scale?: number;
  margin?: number;
}

export async function generatePDFBase64(options: PDFBase64Options): Promise<string> {
  const { elementId, scale = 2, margin = 10 } = options;

  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  const pdfWidth = 210;
  const pdfHeight = 297;
  const contentWidth = pdfWidth - margin * 2;

  const scaleFactor = (contentWidth * scale) / imgWidth;
  const scaledHeight = (imgHeight * scaleFactor) / scale;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageHeight = pdfHeight - margin * 2;
  const totalPages = Math.ceil(scaledHeight / pageHeight);

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) {
      pdf.addPage();
    }

    const sourceY = (page * pageHeight * scale) / scaleFactor;
    const sourceHeight = Math.min(
      (pageHeight * scale) / scaleFactor,
      imgHeight - sourceY
    );

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = imgWidth;
    pageCanvas.height = sourceHeight;
    const ctx = pageCanvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(
        canvas,
        0, sourceY,
        imgWidth, sourceHeight,
        0, 0,
        imgWidth, sourceHeight
      );

      const pageImgData = pageCanvas.toDataURL('image/png');
      const destHeight = (sourceHeight * scaleFactor) / scale;

      pdf.addImage(
        pageImgData,
        'PNG',
        margin,
        margin,
        contentWidth,
        destHeight
      );
    }
  }

  const base64 = pdf.output('datauristring').split(',')[1];
  return base64;
}

export async function printReport(elementId: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  const styles = Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((rule) => rule.cssText).join('\n');
      } catch {
        return '';
      }
    })
    .join('\n');

  // Print via a hidden same-origin iframe rather than window.open — iframes aren't
  // blocked by popup blockers (window.open is, especially after an async await),
  // and we use innerHTML so the off-screen wrapper's positioning isn't carried in.
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed; right:0; bottom:0; width:0; height:0; border:0; visibility:hidden;';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) { iframe.remove(); throw new Error('Could not create print frame'); }

  doc.open();
  doc.write(`<!DOCTYPE html><html><head><title>Print Report</title><style>${styles}</style>` +
    `<style>@media print { body { margin: 0; padding: 0; } @page { margin: 0.5in; } }</style></head>` +
    `<body>${element.innerHTML}</body></html>`);
  doc.close();

  // Wait for the report's images to load inside the frame before printing.
  await new Promise<void>((resolve) => {
    const imgs = Array.from(doc.images || []);
    if (imgs.length === 0) { resolve(); return; }
    let pending = imgs.length;
    const done = () => { if (--pending <= 0) resolve(); };
    imgs.forEach((img) => (img.complete ? done() : (img.onload = img.onerror = done)));
    setTimeout(resolve, 3000); // safety net
  });

  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();
  setTimeout(() => iframe.remove(), 1000);
}
