import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, Paperclip, X, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useSendEmail } from '@/hooks/useSendEmail';
import { generatePDFBase64 } from '@/lib/generatePDF';
import type { Database } from '@/integrations/supabase/types';

type DailyReportRow = Database['public']['Tables']['daily_reports']['Row'];

interface ProjectReportEmailSheetProps {
  open: boolean;
  onClose: () => void;
  report: DailyReportRow;
  projectName: string;
  inspectorName?: string;
  reportFilename: string;
}

export function ProjectReportEmailSheet({ open, onClose, report, projectName, inspectorName, reportFilename }: ProjectReportEmailSheetProps) {
  const reportDate = format(new Date(report.report_date), 'MMM d, yyyy');
  const defaultSubject = `Daily Field Report — ${projectName} — ${reportDate}`;
  const defaultMessage = `Please find attached the Daily Field Report for ${projectName}, dated ${reportDate}.

Summary: ${report.workers_count || 0} workers on site · ${report.weather || 'Weather not recorded'}
Work performed: ${(report.work_performed || '').slice(0, 120)}${(report.work_performed || '').length > 120 ? '...' : ''}

${inspectorName || 'Site Supervisor'}`;

  const [to, setTo] = useState<string[]>([]);
  const [cc, setCc] = useState<string[]>([]);
  const [toInput, setToInput] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);
  const [sending, setSending] = useState(false);

  const sendEmail = useSendEmail();

  const addEmail = (list: string[], setList: (v: string[]) => void, input: string, setInput: (v: string) => void) => {
    const email = input.trim();
    if (email && !list.includes(email)) setList([...list, email]);
    setInput('');
  };

  const handleSend = useCallback(async () => {
    if (to.length === 0) { toast.error('Add at least one recipient'); return; }
    setSending(true);
    try {
      const pdfBase64 = await generatePDFBase64({ elementId: 'printable-project-daily-report', scale: 2 });
      await sendEmail.mutateAsync({
        recipients: to,
        ccRecipients: cc,
        subject,
        bodyHtml: `<pre style="font-family:sans-serif;white-space:pre-wrap">${message}</pre>`,
        bodyText: message,
        attachments: [{
          filename: reportFilename,
          contentBase64: pdfBase64,
          contentType: 'application/pdf',
          size: Math.round(pdfBase64.length * 0.75),
        }],
      });
      toast.success(`Report emailed to ${to.length} recipient(s) ✓`);
      onClose();
    } catch (err: any) {
      toast.error(`Failed to send: ${err?.message || 'Unknown error'}`);
    } finally {
      setSending(false);
    }
  }, [to, cc, subject, message, reportFilename, sendEmail, onClose]);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] p-0 flex flex-col rounded-t-2xl">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white rounded-t-2xl flex-shrink-0">
          <button type="button" onClick={onClose} className="p-1"><ArrowLeft className="h-5 w-5" /></button>
          <span className="font-semibold flex items-center gap-2"><Mail className="h-4 w-4" /> Email Field Report</span>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-8" onClick={handleSend} disabled={sending || to.length === 0}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* To */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">To</label>
            <div className="flex flex-wrap gap-2 p-2 border rounded-lg min-h-[44px] bg-background">
              {to.map(email => (
                <Badge key={email} variant="secondary" className="gap-1">
                  {email}
                  <button type="button" onClick={() => setTo(to.filter(e => e !== email))}><X className="h-3 w-3" /></button>
                </Badge>
              ))}
              <input
                value={toInput}
                onChange={e => setToInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addEmail(to, setTo, toInput, setToInput); } }}
                onBlur={() => addEmail(to, setTo, toInput, setToInput)}
                placeholder={to.length === 0 ? 'recipient@email.com — press Enter' : ''}
                className="flex-1 outline-none text-sm bg-transparent min-w-[160px]"
              />
            </div>
          </div>

          {/* CC */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">CC (optional)</label>
            <div className="flex flex-wrap gap-2 p-2 border rounded-lg min-h-[44px] bg-background">
              {cc.map(email => (
                <Badge key={email} variant="outline" className="gap-1">
                  {email}
                  <button type="button" onClick={() => setCc(cc.filter(e => e !== email))}><X className="h-3 w-3" /></button>
                </Badge>
              ))}
              <input
                value={ccInput}
                onChange={e => setCcInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addEmail(cc, setCc, ccInput, setCcInput); } }}
                onBlur={() => addEmail(cc, setCc, ccInput, setCcInput)}
                placeholder={cc.length === 0 ? 'cc@email.com — press Enter' : ''}
                className="flex-1 outline-none text-sm bg-transparent min-w-[160px]"
              />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Subject</label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} />
          </div>

          {/* Message */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Message</label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} className="min-h-[160px] font-mono text-sm" />
          </div>

          {/* Attachment pill */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-xl">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{reportFilename}</span>
            <span className="text-xs text-muted-foreground ml-auto">PDF · Generated on send</span>
          </div>

          {/* Send button (bottom duplicate for mobile) */}
          <Button className="w-full gap-2" onClick={handleSend} disabled={sending || to.length === 0}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            {sending ? 'Sending...' : `Send to ${to.length > 0 ? `${to.length} recipient(s)` : 'recipients'}`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
