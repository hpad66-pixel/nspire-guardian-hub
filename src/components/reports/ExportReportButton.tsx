import { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface ExportReportButtonProps {
  reportName: string;
  targetRef: React.RefObject<HTMLDivElement>;
}

export function ExportReportButton({ reportName, targetRef }: ExportReportButtonProps) {
  const styleRef = useRef<HTMLStyleElement | null>(null);

  const handleExport = useCallback(() => {
    const el = targetRef.current;
    if (!el) return;

    el.classList.add('printing-target');

    const style = document.createElement('style');
    style.textContent = `
      @media print {
        body * { visibility: hidden !important; }
        .printing-target, .printing-target * { visibility: visible !important; }
        .printing-target {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          padding: 24px !important;
        }
        .no-print { display: none !important; }
        @page { margin: 0.5in; size: letter; }
      }
    `;
    document.head.appendChild(style);
    styleRef.current = style;

    const cleanup = () => {
      el.classList.remove('printing-target');
      if (styleRef.current) {
        document.head.removeChild(styleRef.current);
        styleRef.current = null;
      }
    };

    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();
  }, [targetRef]);

  return (
    <Button variant="outline" size="sm" onClick={handleExport} className="no-print gap-1.5">
      <Download className="h-3.5 w-3.5" />
      Export PDF
    </Button>
  );
}
