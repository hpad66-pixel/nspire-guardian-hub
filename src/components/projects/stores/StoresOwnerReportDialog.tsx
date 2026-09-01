import { FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { PredictiveFlag } from '@/lib/stores/storesAnalytics';

export function StoresOwnerReportDialog({
  open,
  onOpenChange,
  report,
  flags,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: string;
  flags: PredictiveFlag[];
}) {
  const handlePrint = () => {
    const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1100');
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>Owner Materials Report</title>
      <style>
        body { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; padding: 32px; color: #1A1714; background: #FDFCF9; }
        pre { white-space: pre-wrap; font-size: 12px; line-height: 1.45; }
        h1 { font-family: Georgia, serif; color: #0D3B30; }
      </style></head><body>
      <h1>Owner Materials &amp; Maintenance Report</h1>
      <pre>${report.replace(/</g, '&lt;')}</pre>
      </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0" data-testid="stores-owner-report-dialog">
        <DialogHeader className="border-b bg-[#0D3B30] px-6 py-4 text-white">
          <DialogTitle className="flex items-center gap-2 text-white">
            <FileText className="h-5 w-5" /> Simulated owner report
          </DialogTitle>
          <p className="text-sm text-emerald-100/90">
            Live numbers from the stock room — trends, red flags, and recommended actions for the owner conversation.
          </p>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto px-6 py-4">
          {flags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {flags.map((f) => (
                <Badge
                  key={f.id}
                  className={
                    f.severity === 'critical'
                      ? 'bg-rose-600'
                      : f.severity === 'watch'
                        ? 'bg-amber-500'
                        : 'bg-emerald-700'
                  }
                >
                  {f.severity}: {f.title}
                </Badge>
              ))}
            </div>
          )}
          <pre className="whitespace-pre-wrap rounded-xl border bg-muted/30 p-4 text-xs leading-relaxed text-[#1A1714]">
            {report}
          </pre>
        </div>
        <DialogFooter className="border-t px-6 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button className="bg-[#0D3B30] hover:bg-[#0D3B30]/90" onClick={handlePrint}>
            <Printer className="mr-1.5 h-4 w-4" /> Print / PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
