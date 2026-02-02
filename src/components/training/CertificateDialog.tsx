import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import { CompletionCertificate } from './CompletionCertificate';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/useProfiles';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

interface CertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceTitle: string;
  category?: string;
  completedAt: Date;
}

export function CertificateDialog({
  open,
  onOpenChange,
  resourceTitle,
  category,
  completedAt,
}: CertificateDialogProps) {
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { user } = useAuth();
  const { data: profiles } = useProfiles();

  const currentProfile = profiles?.find(p => p.user_id === user?.id);
  const userName = currentProfile?.full_name || user?.email || 'Participant';

  const handleDownloadPDF = async () => {
    if (!certificateRef.current) return;
    
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [800, 600],
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, 800, 600);
      pdf.save(`Certificate-${resourceTitle.replace(/\s+/g, '-')}.pdf`);
      
      toast.success('Certificate downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate certificate');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    const printContent = certificateRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print the certificate');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Certificate - ${resourceTitle}</title>
          <style>
            @page { size: landscape; margin: 0; }
            body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
            .certificate { font-family: Georgia, serif; }
          </style>
        </head>
        <body>
          ${printContent.outerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Certificate of Completion</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {/* Certificate Preview */}
          <div className="overflow-auto border rounded-lg shadow-lg">
            <div className="scale-[0.6] origin-top-left" style={{ width: '480px', height: '360px' }}>
              <CompletionCertificate
                ref={certificateRef}
                userName={userName}
                resourceTitle={resourceTitle}
                category={category}
                completedAt={completedAt}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
            >
              <Download className="h-4 w-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Download PDF'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
