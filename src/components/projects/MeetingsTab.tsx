import { useState, useCallback, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import {
  CalendarDays, List, Plus, ChevronLeft, ChevronRight,
  Sparkles, Loader2, CheckCircle, FileText, Download,
  Users, MapPin, Clock, Trash2, Lock, Pencil, Undo2,
  Mail, Printer, Building2, Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectMeetings, type ProjectMeeting, type MeetingAttendee } from '@/hooks/useProjectMeetings';
import { useTextPolish } from '@/hooks/useTextPolish';
import { useSendEmail } from '@/hooks/useSendEmail';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// ---------- helpers ----------
const MEETING_TYPES = [
  { value: 'progress', label: 'Progress Meeting' },
  { value: 'kickoff', label: 'Kickoff Meeting' },
  { value: 'safety', label: 'Safety Briefing' },
  { value: 'design', label: 'Design Review' },
  { value: 'budget', label: 'Budget Review' },
  { value: 'closeout', label: 'Closeout Meeting' },
  { value: 'other', label: 'Other' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground border-border', variant: 'secondary' },
  reviewed: { label: 'Reviewed', color: 'bg-primary/10 text-primary border-primary/20', variant: 'default' },
  finalized: { label: 'Finalized', color: 'bg-accent text-accent-foreground border-accent', variant: 'outline' },
};

// ---- APAS branded minutes HTML renderer ----
function buildMinutesHtml(meeting: ProjectMeeting, polishedHtml: string): string {
  const attendeeRows = (meeting.attendees || []).map(a =>
    `<tr><td style="padding:4px 8px;border:1px solid #e2e8f0;">${a.name}</td><td style="padding:4px 8px;border:1px solid #e2e8f0;">${a.role || '—'}</td><td style="padding:4px 8px;border:1px solid #e2e8f0;">${a.company || '—'}</td></tr>`
  ).join('');

  const meetingTypLabel = MEETING_TYPES.find(t => t.value === meeting.meeting_type)?.label || meeting.meeting_type;

  return `
    <div style="font-family:'Segoe UI',system-ui,sans-serif;max-width:800px;margin:0 auto;color:#1a202c;">
      <!-- APAS Header -->
      <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2d5a9e 100%);color:white;padding:32px;border-radius:12px 12px 0 0;text-align:center;margin-bottom:0;">
        <div style="font-size:28px;font-weight:800;letter-spacing:2px;margin-bottom:4px;">APAS</div>
        <div style="font-size:13px;opacity:0.8;letter-spacing:1px;text-transform:uppercase;">Asset & Property Administration System</div>
        <div style="margin-top:20px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.2);">
          <div style="font-size:22px;font-weight:700;">${meeting.title}</div>
          <div style="font-size:13px;opacity:0.85;margin-top:6px;">${meetingTypLabel}</div>
        </div>
      </div>
      <!-- Meta strip -->
      <div style="background:#f7fafc;border:1px solid #e2e8f0;border-top:none;padding:16px 32px;display:flex;gap:32px;flex-wrap:wrap;">
        <div><span style="font-size:11px;text-transform:uppercase;color:#718096;font-weight:600;">Date</span><br/><span style="font-weight:600;color:#2d3748;">${format(parseISO(meeting.meeting_date), 'MMMM d, yyyy')}</span></div>
        ${meeting.meeting_time ? `<div><span style="font-size:11px;text-transform:uppercase;color:#718096;font-weight:600;">Time</span><br/><span style="font-weight:600;color:#2d3748;">${meeting.meeting_time}</span></div>` : ''}
        ${meeting.location ? `<div><span style="font-size:11px;text-transform:uppercase;color:#718096;font-weight:600;">Location</span><br/><span style="font-weight:600;color:#2d3748;">${meeting.location}</span></div>` : ''}
        <div><span style="font-size:11px;text-transform:uppercase;color:#718096;font-weight:600;">Status</span><br/><span style="font-weight:600;color:#2d3748;text-transform:capitalize;">${meeting.status}</span></div>
      </div>
      <!-- Attendees -->
      ${attendeeRows ? `
      <div style="border:1px solid #e2e8f0;border-top:none;padding:24px 32px;">
        <div style="font-size:13px;font-weight:700;text-transform:uppercase;color:#718096;letter-spacing:1px;margin-bottom:12px;">Attendees</div>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead><tr style="background:#f7fafc;">
            <th style="padding:6px 8px;border:1px solid #e2e8f0;text-align:left;font-weight:600;color:#4a5568;">Name</th>
            <th style="padding:6px 8px;border:1px solid #e2e8f0;text-align:left;font-weight:600;color:#4a5568;">Role / Title</th>
            <th style="padding:6px 8px;border:1px solid #e2e8f0;text-align:left;font-weight:600;color:#4a5568;">Company</th>
          </tr></thead>
          <tbody>${attendeeRows}</tbody>
        </table>
      </div>` : ''}
      <!-- Minutes body -->
      <div style="border:1px solid #e2e8f0;border-top:none;padding:24px 32px;border-radius:0 0 12px 12px;">
        <div style="font-size:13px;font-weight:700;text-transform:uppercase;color:#718096;letter-spacing:1px;margin-bottom:16px;">Meeting Minutes</div>
        <div style="font-size:14px;line-height:1.7;color:#2d3748;">${polishedHtml}</div>
      </div>
      <!-- Footer -->
      <div style="text-align:center;margin-top:24px;padding:16px;font-size:11px;color:#a0aec0;">
        Generated by APAS · ${format(new Date(), 'MMMM d, yyyy')} · Confidential
      </div>
    </div>
  `;
}

// ---- Word export ----
async function exportToWord(meeting: ProjectMeeting, htmlContent: string) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = await import('docx');
  const meetingTypLabel = MEETING_TYPES.find(t => t.value === meeting.meeting_type)?.label || meeting.meeting_type;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children: any[] = [
    // APAS header
    new Paragraph({
      children: [new TextRun({ text: 'APAS', bold: true, size: 48, color: '1e3a5f' })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Asset & Property Administration System', size: 18, color: '718096' })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ text: '' }),
    new Paragraph({
      children: [new TextRun({ text: meeting.title, bold: true, size: 36, color: '2d3748' })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: meetingTypLabel, italics: true, size: 22, color: '718096' })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ text: '' }),
    // Meta
    new Paragraph({
      children: [
        new TextRun({ text: `Date: `, bold: true }),
        new TextRun({ text: format(parseISO(meeting.meeting_date), 'MMMM d, yyyy') }),
        ...(meeting.meeting_time ? [new TextRun({ text: `  |  Time: `, bold: true }), new TextRun({ text: meeting.meeting_time })] : []),
        ...(meeting.location ? [new TextRun({ text: `  |  Location: `, bold: true }), new TextRun({ text: meeting.location })] : []),
      ],
    }),
    new Paragraph({ text: '' }),
  ];

  // Attendees table
  if (meeting.attendees?.length) {
    children.push(new Paragraph({ text: 'ATTENDEES', heading: HeadingLevel.HEADING_2 }));
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: ['Name', 'Role / Title', 'Company'].map(h =>
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
              })
            ),
          }),
          ...meeting.attendees.map(a =>
            new TableRow({
              children: [a.name, a.role || '—', a.company || '—'].map(cell =>
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: cell })] })] })
              ),
            })
          ),
        ],
      })
    );
    children.push(new Paragraph({ text: '' }));
  }

  // Strip HTML and add notes
  children.push(new Paragraph({ text: 'MEETING MINUTES', heading: HeadingLevel.HEADING_2 }));
  const stripped = htmlContent.replace(/<[^>]+>/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  stripped.split('\n').forEach(line => {
    if (line.trim()) children.push(new Paragraph({ children: [new TextRun({ text: line.trim() })] }));
  });

  children.push(
    new Paragraph({ text: '' }),
    new Paragraph({
      children: [new TextRun({ text: `Generated by APAS · ${format(new Date(), 'MMMM d, yyyy')} · Confidential`, color: 'a0aec0', italics: true, size: 18 })],
      alignment: AlignmentType.CENTER,
    })
  );

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${meeting.title.replace(/\s+/g, '_')}_Minutes.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- PDF export with branding ----
async function exportToPDF(meeting: ProjectMeeting, htmlContent: string) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 16;
  const contentW = pageW - margin * 2;
  let y = 0;

  // Header background band
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageW, 38, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('APAS', pageW / 2, 14, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Asset & Property Administration System', pageW / 2, 20, { align: 'center' });
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(meeting.title, pageW / 2, 30, { align: 'center' });
  y = 44;

  // Meta row
  doc.setTextColor(70, 70, 70);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const meta = [
    `Date: ${format(parseISO(meeting.meeting_date), 'MMMM d, yyyy')}`,
    meeting.meeting_time ? `Time: ${meeting.meeting_time}` : '',
    meeting.location ? `Location: ${meeting.location}` : '',
  ].filter(Boolean).join('   |   ');
  doc.text(meta, pageW / 2, y, { align: 'center' });
  y += 6;

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // Attendees
  if (meeting.attendees?.length) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 95);
    doc.text('ATTENDEES', margin, y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    meeting.attendees.forEach(a => {
      const line = `${a.name}${a.role ? ` · ${a.role}` : ''}${a.company ? ` (${a.company})` : ''}`;
      doc.text(`• ${line}`, margin + 2, y);
      y += 5;
    });
    y += 4;
    doc.line(margin, y, pageW - margin, y);
    y += 6;
  }

  // Minutes body
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('MEETING MINUTES', margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);

  const stripped = htmlContent.replace(/<\/?(h[1-6]|p|li|br|div)[^>]*>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim();
  const lines = doc.splitTextToSize(stripped, contentW);
  lines.forEach((line: string) => {
    if (y > 275) { doc.addPage(); y = 16; }
    doc.text(line, margin, y);
    y += 4.5;
  });

  // Footer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(160, 174, 192);
  doc.text(`Generated by APAS · ${format(new Date(), 'MMMM d, yyyy')} · Confidential`, pageW / 2, 290, { align: 'center' });

  doc.save(`${meeting.title.replace(/\s+/g, '_')}_Minutes.pdf`);
}

// ---- Email Minutes Dialog ----
function EmailMinutesDialog({
  open,
  onClose,
  meeting,
  minutesHtml,
}: {
  open: boolean;
  onClose: () => void;
  meeting: ProjectMeeting;
  minutesHtml: string;
}) {
  const { user } = useAuth();
  const sendEmail = useSendEmail();
  const suggestedRecipients = (meeting.attendees || []).filter(a => (a as { email?: string }).email).map(a => (a as { email?: string }).email as string);
  const [toField, setToField] = useState(suggestedRecipients.join(', '));
  const [subject, setSubject] = useState(`Meeting Minutes – ${meeting.title} – ${format(parseISO(meeting.meeting_date), 'MMMM d, yyyy')}`);
  const [message, setMessage] = useState('Please find the meeting minutes attached below.');

  const handleSend = async () => {
    const recipients = toField.split(',').map(e => e.trim()).filter(Boolean);
    if (!recipients.length) { toast.error('Enter at least one recipient email'); return; }

    const fullHtml = `
      <p>${message}</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
      ${buildMinutesHtml(meeting, minutesHtml)}
    `;

    await sendEmail.mutateAsync({
      recipients,
      subject,
      bodyHtml: fullHtml,
      bodyText: message,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" /> Email Meeting Minutes
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>To (comma-separated emails)</Label>
            <Input className="mt-1" value={toField} onChange={e => setToField(e.target.value)} placeholder="john@example.com, jane@example.com" />
          </div>
          <div>
            <Label>Subject</Label>
            <Input className="mt-1" value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea className="mt-1" rows={3} value={message} onChange={e => setMessage(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">The full formatted meeting minutes will be included in the email body.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} disabled={sendEmail.isPending}>
            {sendEmail.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
            Send Minutes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Branded Minutes Viewer ----
function MinutesViewer({ meeting, polishedHtml }: { meeting: ProjectMeeting; polishedHtml: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-border shadow-sm">
      {/* APAS Header */}
      <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2d5a9e] text-white px-8 py-7 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Building2 className="h-5 w-5 opacity-80" />
          <span className="text-2xl font-black tracking-widest">APAS</span>
        </div>
        <p className="text-xs opacity-70 tracking-widest uppercase mb-5">Asset & Property Administration System</p>
        <h2 className="text-xl font-bold">{meeting.title}</h2>
        <p className="text-sm opacity-75 mt-1">{MEETING_TYPES.find(t => t.value === meeting.meeting_type)?.label}</p>
      </div>

      {/* Meta strip */}
      <div className="bg-muted/40 border-b flex flex-wrap gap-6 px-8 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Date</p>
          <p className="font-semibold text-sm">{format(parseISO(meeting.meeting_date), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        {meeting.meeting_time && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Time</p>
            <p className="font-semibold text-sm">{meeting.meeting_time}</p>
          </div>
        )}
        {meeting.location && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Location</p>
            <p className="font-semibold text-sm">{meeting.location}</p>
          </div>
        )}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</p>
          <p className="font-semibold text-sm capitalize">{meeting.status}</p>
        </div>
      </div>

      {/* Attendees */}
      {meeting.attendees?.length > 0 && (
        <div className="px-8 py-5 border-b">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Attendees</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-left px-3 py-2 border border-border/50 font-semibold text-muted-foreground text-xs">Name</th>
                  <th className="text-left px-3 py-2 border border-border/50 font-semibold text-muted-foreground text-xs">Role / Title</th>
                  <th className="text-left px-3 py-2 border border-border/50 font-semibold text-muted-foreground text-xs">Company</th>
                </tr>
              </thead>
              <tbody>
                {meeting.attendees.map((a, i) => (
                  <tr key={i} className="even:bg-muted/10">
                    <td className="px-3 py-2 border border-border/30 font-medium">{a.name}</td>
                    <td className="px-3 py-2 border border-border/30 text-muted-foreground">{a.role || '—'}</td>
                    <td className="px-3 py-2 border border-border/30 text-muted-foreground">{a.company || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Minutes body */}
      <div className="px-8 py-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Meeting Minutes</p>
        <div
          className="prose prose-sm max-w-none text-foreground
            prose-headings:text-foreground prose-headings:font-bold
            prose-h2:text-base prose-h2:mt-6 prose-h2:mb-2 prose-h2:border-b prose-h2:pb-1
            prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-1
            prose-p:text-sm prose-p:leading-relaxed prose-p:my-1
            prose-ul:my-1 prose-li:my-0.5 prose-li:text-sm
            prose-strong:font-semibold
            prose-table:text-sm prose-th:bg-muted/30 prose-th:font-semibold prose-td:border prose-td:border-border/40 prose-th:border prose-th:border-border/40
          "
          dangerouslySetInnerHTML={{ __html: polishedHtml }}
        />
      </div>

      {/* APAS footer */}
      <div className="border-t bg-muted/20 px-8 py-4 text-center">
        <p className="text-[10px] text-muted-foreground">Generated by APAS · {format(new Date(), 'MMMM d, yyyy')} · Confidential</p>
      </div>
    </div>
  );
}

// ---------- Meeting editor sheet ----------
function MeetingEditorSheet({
  meeting,
  projectId,
  open,
  onClose,
  onSave,
  onFinalize,
}: {
  meeting: ProjectMeeting | null;
  projectId: string;
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<ProjectMeeting>) => void;
  onFinalize: (id: string) => void;
}) {
  const { polish, isPolishing } = useTextPolish();
  const [title, setTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingType, setMeetingType] = useState('progress');
  const [location, setLocation] = useState('');
  const [attendees, setAttendees] = useState<MeetingAttendee[]>([]);
  const [rawNotes, setRawNotes] = useState('');
  const [polishedHtml, setPolishedHtml] = useState('');
  const [previousHtml, setPreviousHtml] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('notes');
  const [newAttendee, setNewAttendee] = useState({ name: '', role: '', company: '' });
  const [emailOpen, setEmailOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(meeting?.title || '');
    setMeetingDate(meeting?.meeting_date || format(new Date(), 'yyyy-MM-dd'));
    setMeetingTime(meeting?.meeting_time || '');
    setMeetingType(meeting?.meeting_type || 'progress');
    setLocation(meeting?.location || '');
    setAttendees(meeting?.attendees || []);
    setRawNotes(meeting?.raw_notes || '');
    setPolishedHtml(meeting?.polished_notes_html || meeting?.polished_notes || '');
    setPreviousHtml(null);
    setActiveTab('notes');
    setNewAttendee({ name: '', role: '', company: '' });
    setIsEditing(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, meeting?.id]);

  const handlePolish = useCallback(async () => {
    if (!rawNotes.trim()) { toast.error('Enter some notes first'); return; }
    setPreviousHtml(polishedHtml);
    const result = await polish(rawNotes, {
      context: 'meeting_minutes',
      model: 'google/gemini-2.5-flash',
    });
    if (result) {
      // Convert markdown-style output to HTML if needed
      const html = result
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h2>$1</h2>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(?!<[hHuUpP])/gm, '<p>')
        .replace(/(?<![>])$/gm, '</p>')
        .replace(/<p><\/p>/g, '')
        .replace(/<p>(<[hHuU])/g, '$1')
        .replace(/(<\/[hHuU][^>]*>)<\/p>/g, '$1');
      setPolishedHtml(html);
      setActiveTab('minutes');
      setIsEditing(false);
    }
  }, [rawNotes, polishedHtml, polish]);

  const addAttendee = () => {
    if (!newAttendee.name.trim()) return;
    setAttendees(prev => [...prev, { ...newAttendee }]);
    setNewAttendee({ name: '', role: '', company: '' });
  };

  const removeAttendee = (i: number) => setAttendees(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = () => {
    if (!title.trim()) { toast.error('Meeting title is required'); return; }
    onSave({
      title, meeting_date: meetingDate, meeting_time: meetingTime,
      meeting_type: meetingType, location, attendees,
      raw_notes: rawNotes,
      polished_notes: polishedHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      polished_notes_html: polishedHtml,
    });
    onClose();
  };

  const handleFinalize = () => {
    if (!meeting) return;
    // Save first, then finalize
    onSave({
      title, meeting_date: meetingDate, meeting_time: meetingTime,
      meeting_type: meetingType, location, attendees,
      raw_notes: rawNotes,
      polished_notes: polishedHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      polished_notes_html: polishedHtml,
    });
    onFinalize(meeting.id);
  };

  const isFinalized = meeting?.status === 'finalized';
  const hasMinutes = polishedHtml && polishedHtml.trim().length > 0;

  const liveMeeting: ProjectMeeting = {
    ...(meeting || {} as ProjectMeeting),
    title: title || 'Untitled Meeting',
    meeting_date: meetingDate,
    meeting_time: meetingTime,
    meeting_type: meetingType,
    location,
    attendees,
    status: meeting?.status || 'draft',
    polished_notes_html: polishedHtml,
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full max-w-5xl overflow-y-auto p-0">
          {/* Sheet header */}
          <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <SheetTitle className="text-base font-semibold">
                {meeting ? 'Meeting Minutes' : 'New Meeting'}
              </SheetTitle>
              {meeting && (
                <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', STATUS_CONFIG[meeting.status]?.color)}>
                  {isFinalized && <Lock className="h-2.5 w-2.5" />}
                  {STATUS_CONFIG[meeting.status]?.label}
                </span>
              )}
            </div>
            {/* Top-level action bar */}
            <div className="flex items-center gap-2">
              {hasMinutes && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setEmailOpen(true)}>
                    <Mail className="h-4 w-4 mr-1" /> Email
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportToWord(liveMeeting, polishedHtml)}>
                    <Download className="h-4 w-4 mr-1" /> Word
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportToPDF(liveMeeting, polishedHtml)}>
                    <FileText className="h-4 w-4 mr-1" /> PDF
                  </Button>
                </>
              )}
              {!isFinalized && (
                <Button size="sm" onClick={handleSave}>
                  <CheckCircle className="h-4 w-4 mr-1" /> Save
                </Button>
              )}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Meta fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Meeting Title *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} disabled={isFinalized} placeholder="e.g. Week 12 Progress Meeting" className="mt-1" />
              </div>
              <div>
                <Label>Date *</Label>
                <Input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} disabled={isFinalized} className="mt-1" />
              </div>
              <div>
                <Label>Time</Label>
                <Input type="time" value={meetingTime} onChange={e => setMeetingTime(e.target.value)} disabled={isFinalized} className="mt-1" />
              </div>
              <div>
                <Label>Meeting Type</Label>
                <Select value={meetingType} onValueChange={setMeetingType} disabled={isFinalized}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MEETING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Location</Label>
                <Input value={location} onChange={e => setLocation(e.target.value)} disabled={isFinalized} placeholder="e.g. Site office, Zoom" className="mt-1" />
              </div>
            </div>

            <Separator />

            {/* Attendees */}
            <div>
              <Label className="text-sm font-semibold flex items-center gap-1 mb-3">
                <Users className="h-4 w-4" /> Attendees
              </Label>
              <div className="space-y-2">
                {attendees.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-muted/40 rounded-lg px-3 py-2">
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <span className="font-medium">{a.name}</span>
                      <span className="text-muted-foreground">{a.role || '—'}</span>
                      <span className="text-muted-foreground text-xs">{a.company || ''}</span>
                    </div>
                    {!isFinalized && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeAttendee(i)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                {!isFinalized && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <Input placeholder="Name *" value={newAttendee.name} onChange={e => setNewAttendee(p => ({ ...p, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addAttendee()} />
                    <Input placeholder="Role / Title" value={newAttendee.role} onChange={e => setNewAttendee(p => ({ ...p, role: e.target.value }))} />
                    <div className="flex gap-2">
                      <Input placeholder="Company" value={newAttendee.company} onChange={e => setNewAttendee(p => ({ ...p, company: e.target.value }))} />
                      <Button variant="outline" size="icon" onClick={addAttendee}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Notes / Minutes tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between mb-3">
                <TabsList className="h-9">
                  <TabsTrigger value="notes" className="text-xs">Raw Notes</TabsTrigger>
                  <TabsTrigger value="minutes" className="text-xs" disabled={!hasMinutes}>
                    {hasMinutes ? (
                      <span className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" /> Formatted Minutes</span>
                    ) : 'Formatted Minutes (run AI first)'}
                  </TabsTrigger>
                </TabsList>

                {!isFinalized && (
                  <div className="flex items-center gap-2">
                    {previousHtml !== null && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setPolishedHtml(previousHtml); setPreviousHtml(null); }}>
                              <Undo2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Undo AI Polish</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {activeTab === 'minutes' && hasMinutes && !isEditing && (
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                        <Pencil className="h-4 w-4 mr-1" /> Edit Minutes
                      </Button>
                    )}
                    {activeTab === 'minutes' && isEditing && (
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Done Editing
                      </Button>
                    )}
                    <Button size="sm" onClick={handlePolish} disabled={isPolishing || !rawNotes.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90">
                      {isPolishing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                      {hasMinutes ? 'Re-Polish' : 'AI Polish → Minutes'}
                    </Button>
                  </div>
                )}
              </div>

              <TabsContent value="notes">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground mb-2">Enter raw meeting notes — bullet points, shorthand, stream of consciousness. The AI will structure them into formal branded minutes.</p>
                  <textarea
                    className="flex min-h-[380px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y font-mono"
                    placeholder="e.g. Discussed roofing delay — weather related, 2 weeks. John to revise schedule by Friday. Budget concern on MEP — Sarah to get revised quote. Next meeting Feb 25 at 9am..."
                    value={rawNotes}
                    onChange={e => setRawNotes(e.target.value)}
                    disabled={isFinalized}
                  />
                </div>
              </TabsContent>

              <TabsContent value="minutes">
                {isEditing ? (
                  <div className="border rounded-lg overflow-hidden">
                    <RichTextEditor
                      content={polishedHtml}
                      onChange={setPolishedHtml}
                      placeholder="Meeting minutes will appear here after AI Polish..."
                    />
                  </div>
                ) : (
                  <MinutesViewer meeting={liveMeeting} polishedHtml={polishedHtml} />
                )}
              </TabsContent>
            </Tabs>

            {/* Finalize action */}
            {!isFinalized && hasMinutes && meeting && (
              <div className="flex items-center justify-between p-4 rounded-lg bg-accent/30 border border-accent">
                <div>
                  <p className="text-sm font-semibold text-foreground">Ready to finalize?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Finalizing locks the minutes and marks them as official. You can still download and email them.</p>
                </div>
                <Button size="sm" onClick={handleFinalize}>
                  <Lock className="h-4 w-4 mr-1" /> Finalize Minutes
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Email dialog */}
      {hasMinutes && (
        <EmailMinutesDialog
          open={emailOpen}
          onClose={() => setEmailOpen(false)}
          meeting={liveMeeting}
          minutesHtml={polishedHtml}
        />
      )}
    </>
  );
}

// ---------- Calendar cell ----------
function CalendarCell({ day, isCurrentMonth, meetings, today, onSelect }: {
  day: Date;
  isCurrentMonth: boolean;
  meetings: ProjectMeeting[];
  today: Date;
  onSelect: (m: ProjectMeeting) => void;
}) {
  const isToday = isSameDay(day, today);
  return (
    <div className={cn('border-b border-r min-h-[90px] p-1.5', !isCurrentMonth && 'bg-muted/20')}>
      <span className={cn(
        'text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full mb-1',
        isToday && 'bg-primary text-primary-foreground',
        !isCurrentMonth && 'text-muted-foreground',
      )}>
        {format(day, 'd')}
      </span>
      <div className="space-y-0.5">
        {meetings.slice(0, 3).map(m => (
          <button
            key={m.id}
            onClick={() => onSelect(m)}
            className="w-full text-left text-xs truncate rounded px-1 py-0.5 bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors"
          >
            {m.title}
          </button>
        ))}
        {meetings.length > 3 && <span className="text-xs text-muted-foreground">+{meetings.length - 3} more</span>}
      </div>
    </div>
  );
}

// ---------- Main MeetingsTab ----------
interface MeetingsTabProps {
  projectId: string;
}

export function MeetingsTab({ projectId }: MeetingsTabProps) {
  const { meetings, isLoading, createMeeting, updateMeeting, deleteMeeting, finalizeMeeting } = useProjectMeetings(projectId);
  const [view, setView] = useState<'calendar' | 'list'>('list');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedMeeting, setSelectedMeeting] = useState<ProjectMeeting | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const meetingsByDate = meetings.reduce<Record<string, ProjectMeeting[]>>((acc, m) => {
    if (!acc[m.meeting_date]) acc[m.meeting_date] = [];
    acc[m.meeting_date].push(m);
    return acc;
  }, {});

  const groupedList = Object.entries(meetingsByDate).sort(([a], [b]) => b.localeCompare(a));

  const openCreate = () => { setSelectedMeeting(null); setIsCreating(true); setEditorOpen(true); };
  const openEdit = (m: ProjectMeeting) => { setSelectedMeeting(m); setIsCreating(false); setEditorOpen(true); };

  const handleSave = async (data: Partial<ProjectMeeting>) => {
    if (isCreating) {
      await createMeeting.mutateAsync({
        project_id: projectId,
        title: data.title || 'Untitled Meeting',
        meeting_date: data.meeting_date || format(new Date(), 'yyyy-MM-dd'),
        meeting_time: data.meeting_time,
        meeting_type: data.meeting_type || 'progress',
        location: data.location,
        attendees: data.attendees || [],
        raw_notes: data.raw_notes,
        polished_notes: data.polished_notes,
        polished_notes_html: data.polished_notes_html,
        status: 'draft',
      });
    } else if (selectedMeeting) {
      await updateMeeting.mutateAsync({ id: selectedMeeting.id, ...data });
    }
  };

  const handleFinalize = async (id: string) => {
    await finalizeMeeting.mutateAsync(id);
    setEditorOpen(false);
  };

  const today = new Date();
  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = monthStart.getDay();
  const paddedDays: (Date | null)[] = [...Array(startPadding).fill(null), ...calendarDays];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">Meeting Portfolio</h3>
            <Badge variant="secondary">{meetings.length} meetings</Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border overflow-hidden">
              <Button variant={view === 'list' ? 'default' : 'ghost'} size="sm" className="rounded-none" onClick={() => setView('list')}>
                <List className="h-4 w-4" />
              </Button>
              <Button variant={view === 'calendar' ? 'default' : 'ghost'} size="sm" className="rounded-none" onClick={() => setView('calendar')}>
                <CalendarDays className="h-4 w-4" />
              </Button>
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> New Meeting
            </Button>
          </div>
        </div>

        {/* CALENDAR VIEW */}
        {view === 'calendar' && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{format(calendarMonth, 'MMMM yyyy')}</CardTitle>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setCalendarMonth(new Date())}>Today</Button>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-7 border-l border-t text-xs font-semibold text-muted-foreground">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="border-b border-r p-2 text-center">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 border-l">
                {paddedDays.map((day, i) =>
                  day ? (
                    <CalendarCell
                      key={i} day={day}
                      isCurrentMonth={isSameMonth(day, calendarMonth)}
                      meetings={meetingsByDate[format(day, 'yyyy-MM-dd')] || []}
                      today={today} onSelect={openEdit}
                    />
                  ) : (
                    <div key={i} className="border-b border-r min-h-[90px] bg-muted/10" />
                  )
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* LIST VIEW */}
        {view === 'list' && (
          <div className="space-y-6">
            {groupedList.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <CalendarDays className="h-8 w-8 text-primary/50" />
                  </div>
                  <p className="font-semibold text-foreground">No meetings yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Create your first meeting to start building a portfolio</p>
                  <Button className="mt-4" onClick={openCreate}>
                    <Plus className="h-4 w-4 mr-1" /> New Meeting
                  </Button>
                </CardContent>
              </Card>
            ) : (
              groupedList.map(([dateKey, dayMeetings]) => (
                <div key={dateKey}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-sm font-semibold text-muted-foreground">
                      {format(parseISO(dateKey), 'EEEE, MMMM d, yyyy')}
                    </div>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <div className="space-y-3">
                    {dayMeetings.map(m => (
                      <Card key={m.id} className="hover:shadow-md transition-all duration-200 cursor-pointer group" onClick={() => openEdit(m)}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              {/* Color dot */}
                              <div className={cn(
                                'mt-1 w-2.5 h-2.5 rounded-full shrink-0',
                                m.status === 'finalized' ? 'bg-primary' :
                                m.status === 'reviewed' ? 'bg-primary/60' : 'bg-muted-foreground/40'
                              )} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold text-sm">{m.title}</h4>
                                  <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', STATUS_CONFIG[m.status]?.color)}>
                                    {m.status === 'finalized' && <Lock className="h-2.5 w-2.5" />}
                                    {STATUS_CONFIG[m.status]?.label}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {MEETING_TYPES.find(t => t.value === m.meeting_type)?.label || m.meeting_type}
                                  </Badge>
                                  {m.polished_notes_html || m.polished_notes ? (
                                    <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                                      <Sparkles className="h-3 w-3" /> Minutes ready
                                    </span>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                                  {m.meeting_time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {m.meeting_time}</span>}
                                  {m.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {m.location}</span>}
                                  {m.attendees?.length > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {m.attendees.length} attendee{m.attendees.length !== 1 ? 's' : ''}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              {(m.polished_notes_html || m.polished_notes) && (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); exportToWord(m, m.polished_notes_html || m.polished_notes || ''); }}>
                                        <Download className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Download Word</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); exportToPDF(m, m.polished_notes_html || m.polished_notes || ''); }}>
                                        <FileText className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Download PDF</TooltipContent>
                                  </Tooltip>
                                </>
                              )}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openEdit(m); }}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Open</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Editor sheet */}
        <MeetingEditorSheet
          meeting={isCreating ? null : selectedMeeting}
          projectId={projectId}
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          onSave={handleSave}
          onFinalize={handleFinalize}
        />
      </div>
    </TooltipProvider>
  );
}
