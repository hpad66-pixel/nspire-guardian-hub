import { useState, useCallback } from 'react';
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
import {
  CalendarDays, List, Plus, ChevronLeft, ChevronRight,
  Sparkles, Loader2, CheckCircle, FileText, Download,
  Users, MapPin, Clock, Trash2, Lock, Pencil, Undo2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectMeetings, type ProjectMeeting, type MeetingAttendee } from '@/hooks/useProjectMeetings';
import { useTextPolish } from '@/hooks/useTextPolish';
import { RichTextViewer } from '@/components/ui/rich-text-editor';
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

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  reviewed: { label: 'Reviewed', variant: 'default' },
  finalized: { label: 'Finalized', variant: 'outline' },
};

// ---- Word export ----
async function exportToWord(meeting: ProjectMeeting) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx');

  const lines = (meeting.polished_notes || meeting.raw_notes || '').split('\n');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children: any[] = [
    new Paragraph({
      text: meeting.title,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Date: ${format(parseISO(meeting.meeting_date), 'MMMM d, yyyy')}`, bold: true }),
        ...(meeting.meeting_time ? [new TextRun({ text: `  |  Time: ${meeting.meeting_time}`, bold: true })] : []),
        ...(meeting.location ? [new TextRun({ text: `  |  Location: ${meeting.location}`, bold: true })] : []),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ text: '' }),
  ];

  if (meeting.attendees?.length) {
    children.push(new Paragraph({ text: 'ATTENDEES', heading: HeadingLevel.HEADING_2 }));
    meeting.attendees.forEach((a) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `• ${a.name}` }),
            ...(a.role ? [new TextRun({ text: ` – ${a.role}`, italics: true })] : []),
            ...(a.company ? [new TextRun({ text: ` (${a.company})` })] : []),
          ],
        })
      );
    });
    children.push(new Paragraph({ text: '' }));
  }

  children.push(new Paragraph({ text: 'MEETING NOTES', heading: HeadingLevel.HEADING_2 }));
  lines.forEach((line) => {
    children.push(new Paragraph({ text: line || '' }));
  });

  children.push(
    new Paragraph({ text: '' }),
    new Paragraph({
      children: [new TextRun({ text: `Status: ${meeting.status.toUpperCase()}`, bold: true, color: '666666' })],
    })
  );

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${meeting.title.replace(/\s+/g, '_')}_Meeting_Minutes.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportToPDF(meeting: ProjectMeeting) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(meeting.title, 105, y, { align: 'center' });
  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const meta = [
    `Date: ${format(parseISO(meeting.meeting_date), 'MMMM d, yyyy')}`,
    meeting.meeting_time ? `Time: ${meeting.meeting_time}` : '',
    meeting.location ? `Location: ${meeting.location}` : '',
  ].filter(Boolean).join('   |   ');
  doc.text(meta, 105, y, { align: 'center' });
  y += 8;

  doc.setDrawColor(200, 200, 200);
  doc.line(14, y, 196, y);
  y += 8;

  if (meeting.attendees?.length) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ATTENDEES', 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    meeting.attendees.forEach((a) => {
      doc.text(`• ${a.name}${a.role ? ` – ${a.role}` : ''}${a.company ? ` (${a.company})` : ''}`, 18, y);
      y += 5;
    });
    y += 4;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('MEETING NOTES', 14, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const notes = meeting.polished_notes || meeting.raw_notes || '';
  const lines = doc.splitTextToSize(notes, 180);
  lines.forEach((line: string) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(line, 14, y);
    y += 5;
  });

  doc.save(`${meeting.title.replace(/\s+/g, '_')}_Meeting_Minutes.pdf`);
}

// ---------- Meeting editor sheet ----------
function MeetingEditorSheet({
  meeting,
  projectId,
  open,
  onClose,
  onSave,
}: {
  meeting: ProjectMeeting | null;
  projectId: string;
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<ProjectMeeting>) => void;
}) {
  const { polish, isPolishing } = useTextPolish();
  const [title, setTitle] = useState(meeting?.title || '');
  const [meetingDate, setMeetingDate] = useState(meeting?.meeting_date || format(new Date(), 'yyyy-MM-dd'));
  const [meetingTime, setMeetingTime] = useState(meeting?.meeting_time || '');
  const [meetingType, setMeetingType] = useState(meeting?.meeting_type || 'progress');
  const [location, setLocation] = useState(meeting?.location || '');
  const [attendees, setAttendees] = useState<MeetingAttendee[]>(meeting?.attendees || []);
  const [rawNotes, setRawNotes] = useState(meeting?.raw_notes || '');
  const [polishedNotes, setPolishedNotes] = useState(meeting?.polished_notes || '');
  const [previousNotes, setPreviousNotes] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('notes');
  const [newAttendee, setNewAttendee] = useState({ name: '', role: '', company: '' });

  const handlePolish = useCallback(async () => {
    if (!rawNotes.trim()) { toast.error('Enter some notes first'); return; }
    setPreviousNotes(polishedNotes);
    const result = await polish(rawNotes, 'meeting_minutes');
    if (result) setPolishedNotes(result);
  }, [rawNotes, polishedNotes, polish]);

  const addAttendee = () => {
    if (!newAttendee.name.trim()) return;
    setAttendees((prev) => [...prev, { ...newAttendee }]);
    setNewAttendee({ name: '', role: '', company: '' });
  };

  const removeAttendee = (i: number) => setAttendees((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = () => {
    if (!title.trim()) { toast.error('Meeting title is required'); return; }
    onSave({
      title, meeting_date: meetingDate, meeting_time: meetingTime,
      meeting_type: meetingType, location, attendees, raw_notes: rawNotes,
      polished_notes: polishedNotes,
    });
    onClose();
  };

  const isFinalized = meeting?.status === 'finalized';

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {meeting ? 'Edit Meeting' : 'New Meeting'}
            {meeting && (
              <Badge variant={STATUS_CONFIG[meeting.status]?.variant || 'secondary'}>
                {STATUS_CONFIG[meeting.status]?.label}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Meta fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Meeting Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={isFinalized} placeholder="e.g. Week 12 Progress Meeting" className="mt-1" />
            </div>
            <div>
              <Label>Date *</Label>
              <Input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} disabled={isFinalized} className="mt-1" />
            </div>
            <div>
              <Label>Time</Label>
              <Input type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} disabled={isFinalized} className="mt-1" />
            </div>
            <div>
              <Label>Meeting Type</Label>
              <Select value={meetingType} onValueChange={setMeetingType} disabled={isFinalized}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEETING_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} disabled={isFinalized} placeholder="e.g. Site office, Zoom" className="mt-1" />
            </div>
          </div>

          <Separator />

          {/* Attendees */}
          <div>
            <Label className="text-sm font-semibold flex items-center gap-1 mb-2">
              <Users className="h-4 w-4" /> Attendees
            </Label>
            <div className="space-y-2">
              {attendees.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-sm bg-muted/40 rounded-md px-3 py-1.5">
                  <span className="font-medium flex-1">{a.name}</span>
                  {a.role && <span className="text-muted-foreground">{a.role}</span>}
                  {a.company && <span className="text-muted-foreground text-xs">({a.company})</span>}
                  {!isFinalized && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeAttendee(i)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              {!isFinalized && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Input placeholder="Name *" value={newAttendee.name} onChange={(e) => setNewAttendee((p) => ({ ...p, name: e.target.value }))} />
                  <Input placeholder="Role" value={newAttendee.role} onChange={(e) => setNewAttendee((p) => ({ ...p, role: e.target.value }))} />
                  <div className="flex gap-2">
                    <Input placeholder="Company" value={newAttendee.company} onChange={(e) => setNewAttendee((p) => ({ ...p, company: e.target.value }))} />
                    <Button variant="outline" size="icon" onClick={addAttendee}><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Notes tabs: raw / polished side-by-side workflow */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-3">
              <TabsList>
                <TabsTrigger value="notes">Raw Notes</TabsTrigger>
                <TabsTrigger value="polished" disabled={!polishedNotes}>
                  {polishedNotes ? 'Polished Minutes' : 'Polished Minutes (run AI first)'}
                </TabsTrigger>
              </TabsList>
              {!isFinalized && (
                <div className="flex items-center gap-2">
                  {previousNotes !== null && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setPolishedNotes(previousNotes); setPreviousNotes(null); }}>
                            <Undo2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Undo AI polish</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <Button size="sm" variant="outline" onClick={handlePolish} disabled={isPolishing || !rawNotes.trim()}>
                    {isPolishing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                    AI Polish → Minutes
                  </Button>
                </div>
              )}
            </div>

            <TabsContent value="notes">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Enter your raw meeting notes — bullet points, shorthand, stream of consciousness. The AI will structure them into formal minutes.</p>
                <textarea
                  className="flex min-h-[280px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="e.g. Discussed roofing delay — weather related, 2 weeks. John to revise schedule by Friday. Budget concern on MEP — Sarah to get revised quote. Next meeting Feb 25 at 9am..."
                  value={rawNotes}
                  onChange={(e) => setRawNotes(e.target.value)}
                  disabled={isFinalized}
                />
              </div>
            </TabsContent>

            <TabsContent value="polished">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">AI-formatted meeting minutes. You can edit before finalizing.</p>
                {isFinalized ? (
                  <div className="border rounded-md p-4 min-h-[280px] bg-muted/20">
                    <RichTextViewer content={polishedNotes.replace(/\n/g, '<br/>')} />
                  </div>
                ) : (
                  <textarea
                    className="flex min-h-[280px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={polishedNotes}
                    onChange={(e) => setPolishedNotes(e.target.value)}
                  />
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              {meeting && (
                <>
                  <Button variant="outline" size="sm" onClick={() => exportToWord(meeting)} disabled={!meeting.polished_notes && !meeting.raw_notes}>
                    <Download className="h-4 w-4 mr-1" /> Word
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportToPDF(meeting)} disabled={!meeting.polished_notes && !meeting.raw_notes}>
                    <Download className="h-4 w-4 mr-1" /> PDF
                  </Button>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              {!isFinalized && (
                <Button onClick={handleSave}>
                  <CheckCircle className="h-4 w-4 mr-1" /> Save
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
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
    <div className={cn('border-b border-r min-h-[90px] p-1', !isCurrentMonth && 'bg-muted/20')}>
      <span className={cn(
        'text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full mb-1',
        isToday && 'bg-primary text-primary-foreground',
        !isCurrentMonth && 'text-muted-foreground',
      )}>
        {format(day, 'd')}
      </span>
      <div className="space-y-0.5">
        {meetings.slice(0, 3).map((m) => (
          <button
            key={m.id}
            onClick={() => onSelect(m)}
            className="w-full text-left text-xs truncate rounded px-1 py-0.5 bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors"
          >
            {m.title}
          </button>
        ))}
        {meetings.length > 3 && (
          <span className="text-xs text-muted-foreground">+{meetings.length - 3} more</span>
        )}
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

  // Group meetings by date for easy lookup
  const meetingsByDate = meetings.reduce<Record<string, ProjectMeeting[]>>((acc, m) => {
    const key = m.meeting_date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  // Grouped for list view
  const groupedList = Object.entries(meetingsByDate).sort(([a], [b]) => b.localeCompare(a));

  const openCreate = () => {
    setSelectedMeeting(null);
    setIsCreating(true);
    setEditorOpen(true);
  };

  const openEdit = (m: ProjectMeeting) => {
    setSelectedMeeting(m);
    setIsCreating(false);
    setEditorOpen(true);
  };

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

  // Pad days to start on Sunday
  const startPadding = monthStart.getDay();
  const paddedDays: (Date | null)[] = [
    ...Array(startPadding).fill(null),
    ...calendarDays,
  ];

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
              <Button
                variant={view === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none"
                onClick={() => setView('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={view === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none"
                onClick={() => setView('calendar')}
              >
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
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setCalendarMonth(new Date())}>
                    Today
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-7 border-l border-t text-xs font-semibold text-muted-foreground">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="border-b border-r p-2 text-center">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 border-l">
                {paddedDays.map((day, i) =>
                  day ? (
                    <CalendarCell
                      key={i}
                      day={day}
                      isCurrentMonth={isSameMonth(day, calendarMonth)}
                      meetings={meetingsByDate[format(day, 'yyyy-MM-dd')] || []}
                      today={today}
                      onSelect={openEdit}
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
                  <CalendarDays className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <p className="text-muted-foreground font-medium">No meetings yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Create your first meeting to start building a meeting portfolio</p>
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
                    {dayMeetings.map((m) => (
                      <Card key={m.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openEdit(m)}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold text-sm">{m.title}</h4>
                                <Badge variant={STATUS_CONFIG[m.status]?.variant || 'secondary'} className="text-xs">
                                  {m.status === 'finalized' && <Lock className="h-2.5 w-2.5 mr-1" />}
                                  {STATUS_CONFIG[m.status]?.label}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {MEETING_TYPES.find((t) => t.value === m.meeting_type)?.label || m.meeting_type}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                                {m.meeting_time && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> {m.meeting_time}
                                  </span>
                                )}
                                {m.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> {m.location}
                                  </span>
                                )}
                                {m.attendees?.length > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" /> {m.attendees.length} attendee{m.attendees.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                              {m.raw_notes && (
                                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{m.raw_notes}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {m.polished_notes && (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); exportToWord(m); }}>
                                        <Download className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Download Word</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); exportToPDF(m); }}>
                                        <FileText className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Download PDF</TooltipContent>
                                  </Tooltip>
                                </>
                              )}
                              {m.status !== 'finalized' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleFinalize(m.id); }}>
                                      <Lock className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Finalize & Lock</TooltipContent>
                                </Tooltip>
                              )}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(m); }}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
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
        />
      </div>
    </TooltipProvider>
  );
}
