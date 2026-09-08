/**
 * Render a complete, self-contained report document to a compact multi-page PDF.
 * The report is mounted in a same-origin off-screen iframe so its print CSS and
 * private, already-signed images are identical to the print/PDF view.
 */
export async function htmlReportPdfBase64(html: string, options: { pageAware?: boolean; requireImages?: boolean } = {}): Promise<{ base64: string; size: number }> {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;left:-12000px;top:0;width:1050px;height:800px;border:0;background:white;';
  document.body.appendChild(frame);

  try {
    const doc = frame.contentDocument;
    if (!doc) throw new Error('Could not prepare the report document.');
    doc.open();
    doc.write(html);
    doc.close();

    if (options.pageAware) {
      frame.style.width = '780px';
      const style = doc.createElement('style');
      style.textContent = '.report{max-width:780px!important}html,body{font-size:17px!important}.report-body table{font-size:14px!important}.manifest table{font-size:12px!important}.photo-grid img{height:210px!important}.photo-grid figcaption{font-size:14px!important}.receipt-page img{max-height:740px!important}.receipt-page figcaption{padding:8px 0 16px!important}';
      doc.head.appendChild(style);
    }

    await Promise.race([
      Promise.all([
        doc.fonts?.ready ?? Promise.resolve(),
        Promise.all(Array.from(doc.images).map((image) => image.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              image.onload = () => resolve();
              image.onerror = () => resolve();
            }))),
      ]),
      new Promise<void>((resolve) => window.setTimeout(resolve, 6000)),
    ]);

    if (options.requireImages && Array.from(doc.images).some(image => !image.complete || !image.naturalWidth)) {
      throw new Error('A report image could not load. Please retry before sending; no incomplete PDF was created.');
    }

    const report = doc.querySelector<HTMLElement>('main.report') || doc.body;
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);
    if (options.pageAware) {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter', compress: true });
      const width = report.offsetWidth;
      const margin = 10;
      const contentWidth = pdf.internal.pageSize.getWidth() - margin * 2;
      const maxHeight = Math.floor((pdf.internal.pageSize.getHeight() - margin * 2) * width / contentWidth);
      const origin = report.getBoundingClientRect().top;
      const blocks = Array.from(report.querySelectorAll('p,li,tr,figure,h2,h3')).map(el => {
        const rect = el.getBoundingClientRect();
        return { top: rect.top - origin, bottom: rect.bottom - origin };
      });
      const forced = Array.from(report.querySelectorAll('.contents,.report-body,.page-break,.receipt-page + .receipt-page')).map(el => Math.floor(el.getBoundingClientRect().top - origin)).filter(y => y > 0).sort((a,b) => a-b);
      let start = 0;
      let page = 0;
      while (start < report.scrollHeight) {
        let end = Math.min(start + maxHeight, report.scrollHeight);
        const nextBreak = forced.find(y => y > start + 2 && y <= end);
        if (nextBreak) end = nextBreak;
        else {
          const crossing = blocks.filter(b => b.top > start + 2 && b.top < end && b.bottom > end && b.bottom - b.top <= maxHeight);
          if (crossing.length) end = Math.floor(Math.min(...crossing.map(b => b.top)));
        }
        if (end <= start) end = Math.min(start + maxHeight, report.scrollHeight);
        const canvas = await html2canvas(report, { scale: 1.5, y: start, height: end - start, width, windowWidth: width, backgroundColor: '#ffffff', useCORS: true, allowTaint: false, logging: false });
        if (page > 0) pdf.addPage('letter', 'portrait');
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', margin, margin, contentWidth, (end - start) * contentWidth / width, undefined, 'FAST');
        pdf.setFontSize(8);
        pdf.setTextColor(105);
        pdf.text('APAS Consulting | ' + (page + 1), margin, pdf.internal.pageSize.getHeight() - 4);
        canvas.width = 0;
        canvas.height = 0;
        start = end;
        page++;
      }
      const base64 = pdf.output('datauristring').split(',')[1];
      return { base64, size: Math.floor(base64.length * 3 / 4) };
    }
    const canvas = await html2canvas(report, {
      scale: 1,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: false,
      logging: false,
      windowWidth: 1050,
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter', compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 7;
    const contentWidth = pageWidth - margin * 2;
    const pxPerPage = Math.floor(((pageHeight - margin * 2) * canvas.width) / contentWidth);
    let sourceY = 0;
    let page = 0;

    while (sourceY < canvas.height) {
      const sliceHeight = Math.min(pxPerPage, canvas.height - sourceY);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;
      const context = pageCanvas.getContext('2d');
      if (!context) throw new Error('Could not render the report PDF.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      context.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
      if (page > 0) pdf.addPage('letter', 'portrait');
      const renderedHeight = (sliceHeight * contentWidth) / canvas.width;
      pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.78), 'JPEG', margin, margin, contentWidth, renderedHeight, undefined, 'FAST');
      sourceY += sliceHeight;
      page += 1;
    }

    const base64 = pdf.output('datauristring').split(',')[1];
    return { base64, size: Math.floor((base64.length * 3) / 4) };
  } finally {
    frame.remove();
  }
}
