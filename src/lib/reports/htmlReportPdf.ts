/**
 * Render a complete, self-contained report document to a compact multi-page PDF.
 * The report is mounted in a same-origin off-screen iframe so its print CSS and
 * private, already-signed images are identical to the print/PDF view.
 */
export async function htmlReportPdfBase64(html: string): Promise<{ base64: string; size: number }> {
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

    const report = doc.querySelector<HTMLElement>('main.report') || doc.body;
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);
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
