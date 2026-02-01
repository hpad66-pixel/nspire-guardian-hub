import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface PDFOptions {
  filename: string;
  elementId: string;
  scale?: number;
  margin?: number;
}

export async function generatePDF(options: PDFOptions): Promise<void> {
  const { filename, elementId, scale = 2, margin = 10 } = options;

  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  // Render the element to a canvas with high quality
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

  // Create PDF with appropriate dimensions
  // A4: 210mm x 297mm = 595.28pt x 841.89pt
  const pdfWidth = 210; // mm
  const pdfHeight = 297; // mm
  const contentWidth = pdfWidth - margin * 2;

  // Calculate the scale factor to fit content width
  const scaleFactor = (contentWidth * scale) / imgWidth;
  const scaledHeight = (imgHeight * scaleFactor) / scale;

  // Create PDF - portrait orientation
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Calculate number of pages needed
  const pageHeight = pdfHeight - margin * 2;
  const totalPages = Math.ceil(scaledHeight / pageHeight);

  // Add content, splitting across pages if needed
  for (let page = 0; page < totalPages; page++) {
    if (page > 0) {
      pdf.addPage();
    }

    // Calculate the portion of the image to show on this page
    const sourceY = (page * pageHeight * scale) / scaleFactor;
    const sourceHeight = Math.min(
      (pageHeight * scale) / scaleFactor,
      imgHeight - sourceY
    );

    // Create a temporary canvas for this page section
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

  // Download the PDF
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

  // Render the element to a canvas with high quality
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // Create PDF with appropriate dimensions
  const pdfWidth = 210; // mm
  const pdfHeight = 297; // mm
  const contentWidth = pdfWidth - margin * 2;

  // Calculate the scale factor to fit content width
  const scaleFactor = (contentWidth * scale) / imgWidth;
  const scaledHeight = (imgHeight * scaleFactor) / scale;

  // Create PDF - portrait orientation
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Calculate number of pages needed
  const pageHeight = pdfHeight - margin * 2;
  const totalPages = Math.ceil(scaledHeight / pageHeight);

  // Add content, splitting across pages if needed
  for (let page = 0; page < totalPages; page++) {
    if (page > 0) {
      pdf.addPage();
    }

    // Calculate the portion of the image to show on this page
    const sourceY = (page * pageHeight * scale) / scaleFactor;
    const sourceHeight = Math.min(
      (pageHeight * scale) / scaleFactor,
      imgHeight - sourceY
    );

    // Create a temporary canvas for this page section
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

  // Return as base64 string (without the data URL prefix)
  const base64 = pdf.output('datauristring').split(',')[1];
  return base64;
}

export async function printReport(elementId: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  // Clone the element for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Could not open print window');
  }

  const styles = Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join('\n');
      } catch {
        return '';
      }
    })
    .join('\n');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Report</title>
        <style>${styles}</style>
        <style>
          @media print {
            body { margin: 0; padding: 0; }
            @page { margin: 0.5in; }
          }
        </style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();

  // Wait for content to load then print
  printWindow.onload = () => {
    printWindow.print();
    printWindow.close();
  };
}
