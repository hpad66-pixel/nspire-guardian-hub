import { useState, useCallback, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ProRichTextEditor } from '@/components/ui/rich-text-editor';
import {
  CalendarDays, List, Plus, ChevronLeft, ChevronRight,
  Sparkles, Loader2, CheckCircle, FileText, Download,
  Users, MapPin, Clock, Trash2, Lock, Pencil, Undo2,
  Mail, Building2, Send, Maximize2, Minimize2, Eye, Edit3,
  UnlockKeyhole, ShieldCheck, ShieldX, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectMeetings, type ProjectMeeting, type MeetingAttendee } from '@/hooks/useProjectMeetings';
import { useMeetingUnlockRequests } from '@/hooks/useMeetingUnlockRequests';
import { useTextPolish } from '@/hooks/useTextPolish';
import { useAuth } from '@/hooks/useAuth';
import { useUserPermissions } from '@/hooks/usePermissions';
import { useProject } from '@/hooks/useProjects';
import { useCompanyBranding } from '@/hooks/useCompanyBranding';
import { PrintableMeetingMinutes } from './PrintableMeetingMinutes';
import { MeetingExportMenu } from './MeetingExportMenu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground border-border' },
  reviewed: { label: 'Reviewed', color: 'bg-primary/10 text-primary border-primary/20' },
  finalized: { label: 'Finalized', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800' },
};

// ─── Branded export: Print / PDF / Email all flow through the single
// PrintableMeetingMinutes document (see MeetingExportMenu), so the on-screen
// report, the print, the PDF and the email are byte-for-byte identical and
// fully branded. The old 'Build' letterhead + stripped-text exporters are gone.

// ─── Branded minutes viewer — the on-screen report IS the printed/PDF/emailed doc ──
function MinutesViewer({ meeting, polishedHtml, projectName }: { meeting: ProjectMeeting; polishedHtml: string; projectName: string }) {
  const { data: branding } = useCompanyBranding();

  if (!polishedHtml || !polishedHtml.trim()) {
    return (
      <div className="bg-white dark:bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="text-center py-12">
          <Sparkles className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No minutes yet — run AI Polish to generate formatted minutes from your raw notes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border shadow-sm overflow-x-auto bg-white p-3 sm:p-5">
      <PrintableMeetingMinutes
        fluid
        id={meeting.id}
        title={meeting.title}
        meetingType={meeting.meeting_type}
        meetingDate={meeting.meeting_date}
        meetingTime={meeting.meeting_time ?? null}
        location={meeting.location ?? null}
        status={meeting.status}
        attendees={meeting.attendees ?? []}
        body={polishedHtml}
        projectName={projectName}
        companyName={branding?.company_name ?? 'APAS Consulting'}
        logoUrl={branding?.logo_url ?? null}
        brandAddress={[branding?.address_line1, branding?.address_line2].filter(Boolean).join(', ') || null}
        brandPhone={branding?.phone ?? null}
        brandEmail={branding?.email ?? null}
        brandWebsite={branding?.website ?? null}
      />
    </div>
  );
}

// ─── Unlock Request Dialog ────────────────────────────────────────────────────
function UnlockRequestDialog({
  open, onClose, onSubmit, isPending,
}: {
  open: boolean; onClose: () => void; onSubmit: (reason: string) => void; isPending: boolean;
}) {
  const [reason, setReason] = useState('');
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UnlockKeyhole className="h-5 w-5 text-primary" /> Request Edit Access
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            These minutes are finalized and locked. To make edits, you must request approval from a supervisor
            (Admin, Owner, or Manager). They will receive a notification to review your request.
          </p>
          <div>
            <Label className="text-xs font-semibold">Reason for requesting edit access *</Label>
            <Textarea
              className="mt-1"
              rows={3}
              placeholder="e.g. Correction needed in section 3 — wrong date listed for concrete pour…"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => { if (reason.trim()) { onSubmit(reason.trim()); onClose(); } }}
            disabled={!reason.trim() || isPending}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Supervisor approval banner ───────────────────────────────────────────────
function UnlockApprovalBanner({
  meetingId, pendingRequestId, requestReason, onReviewed,
}: {
  meetingId: string; pendingRequestId: string; requestReason: string | null; onReviewed: () => void;
}) {
  const { reviewRequest } = useMeetingUnlockRequests(meetingId);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [pendingAction, setPendingAction] = useState<'approved' | 'rejected' | null>(null);

  const handleReview = async (status: 'approved' | 'rejected') => {
    setPendingAction(status);
    await reviewRequest.mutateAsync({ requestId: pendingRequestId, status, reviewer_notes: reviewNotes, meetingId });
    setPendingAction(null);
    onReviewed();
  };

  return (
    <div className="mx-5 mt-4 rounded-xl border border-border bg-muted/60 p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Edit Access Request Pending</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            A team member has requested to edit these finalized minutes.
          </p>
          {requestReason && (
            <p className="text-xs text-muted-foreground mt-1.5 italic border-l-2 border-primary/40 pl-2">
              &ldquo;{requestReason}&rdquo;
            </p>
          )}
          {showNotes && (
            <Textarea
              className="mt-2 text-xs"
              rows={2}
              placeholder="Optional reviewer notes…"
              value={reviewNotes}
              onChange={e => setReviewNotes(e.target.value)}
            />
          )}
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleReview('approved')}
              disabled={reviewRequest.isPending}
            >
              {pendingAction === 'approved' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ShieldCheck className="h-3 w-3 mr-1" />}
              Approve Unlock
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => handleReview('rejected')}
              disabled={reviewRequest.isPending}
            >
              {pendingAction === 'rejected' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ShieldX className="h-3 w-3 mr-1" />}
              Reject
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowNotes(v => !v)}>
              {showNotes ? 'Hide Notes' : 'Add Notes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inner editor content (shared by Sheet & full-screen Dialog) ──────────────
function MeetingEditorInner({
  meeting,
  projectId,
  projectName,
  isFinalized,
  isFullScreen,
  onToggleFullScreen,
  title, setTitle,
  meetingDate, setMeetingDate,
  meetingTime, setMeetingTime,
  meetingType, setMeetingType,
  location, setLocation,
  attendees, setAttendees,
  rawNotes, setRawNotes,
  polishedHtml, setPolishedHtml,
  previousHtml, setPreviousHtml,
  activeTab, setActiveTab,
  isEditing, setIsEditing,
  emailOpen, setEmailOpen,
  isPolishing,
  handlePolish,
  handleSave,
  handleFinalize,
  handleSupervisorUnlock,
  handleAiContinue,
}: {
  meeting: ProjectMeeting | null;
  projectId: string;
  projectName: string;
  isFinalized: boolean;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
  title: string; setTitle: (v: string) => void;
  meetingDate: string; setMeetingDate: (v: string) => void;
  meetingTime: string; setMeetingTime: (v: string) => void;
  meetingType: string; setMeetingType: (v: string) => void;
  location: string; setLocation: (v: string) => void;
  attendees: MeetingAttendee[]; setAttendees: (v: MeetingAttendee[]) => void;
  rawNotes: string; setRawNotes: (v: string) => void;
  polishedHtml: string; setPolishedHtml: (v: string) => void;
  previousHtml: string | null; setPreviousHtml: (v: string | null) => void;
  activeTab: string; setActiveTab: (v: string) => void;
  isEditing: boolean; setIsEditing: (v: boolean) => void;
  emailOpen: boolean; setEmailOpen: (v: boolean) => void;
  isPolishing: boolean;
  handlePolish: () => void;
  handleSave: () => void;
  handleFinalize: () => void;
  handleSupervisorUnlock: () => void;
  handleAiContinue: (context: string) => Promise<string>;
}) {
  const [newAttendee, setNewAttendee] = useState({ name: '', role: '', company: '' });
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const hasMinutes = polishedHtml && polishedHtml.trim().length > 0;

  // Unlock request state — only load when meeting exists and is finalized
  const { pendingRequest, requestUnlock } = useMeetingUnlockRequests(meeting?.id || '');
  const { isAdmin, isOwner, isPropertyManager } = useUserPermissions();
  const isSupervisor = isAdmin || isOwner || isPropertyManager;
  const { data: branding } = useCompanyBranding();
  const companyName = branding?.company_name ?? 'APAS Consulting';

  // Has this user already submitted a pending request?
  const hasPendingRequest = !!pendingRequest;

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

  const addAttendee = () => {
    if (!newAttendee.name.trim()) return;
    setAttendees([...attendees, { ...newAttendee }]);
    setNewAttendee({ name: '', role: '', company: '' });
  };
  const removeAttendee = (i: number) => setAttendees(attendees.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background border-b px-5 py-3.5 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="h-4.5 w-4.5 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground truncate">{companyName} · {projectName}</p>
            <p className="text-sm font-semibold text-foreground truncate">{title || 'New Meeting'}</p>
          </div>
          {meeting && (
            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border shrink-0', STATUS_CONFIG[meeting.status]?.color)}>
              {isFinalized && <Lock className="h-2.5 w-2.5" />}
              {STATUS_CONFIG[meeting.status]?.label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {hasMinutes && (
            <MeetingExportMenu
              meeting={{
                id: liveMeeting.id || 'live',
                title: liveMeeting.title,
                meeting_type: liveMeeting.meeting_type,
                meeting_date: liveMeeting.meeting_date,
                meeting_time: liveMeeting.meeting_time,
                location: liveMeeting.location,
                status: liveMeeting.status,
                attendees: liveMeeting.attendees,
                polished_notes_html: polishedHtml,
              }}
              projectId={projectId}
              projectName={projectName}
              triggerVariant="button"
            />
          )}
          {!isFinalized && (
            <Button size="sm" className="h-8 text-xs" onClick={handleSave}>
              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Save
            </Button>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleFullScreen}>
                {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isFullScreen ? 'Exit full screen' : 'Full screen editor'}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {isFullScreen ? (
          /* ── Full-screen: side-by-side editor + live preview ── */
          <div className="flex h-full min-h-[calc(100vh-60px)]">
            {/* Left — editor 60% */}
            <div className="flex flex-col border-r border-border" style={{ width: '60%' }}>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                <div className="flex items-center justify-between px-4 pt-3 pb-1 border-b border-border shrink-0">
                  <TabsList className="h-8">
                    <TabsTrigger value="notes" className="text-xs h-7">Raw Notes</TabsTrigger>
                    <TabsTrigger value="minutes" className="text-xs h-7" disabled={!hasMinutes}>
                      <Sparkles className="h-3 w-3 mr-1 text-primary" /> Minutes
                    </TabsTrigger>
                  </TabsList>
                  {!isFinalized && (
                    <div className="flex items-center gap-1.5">
                      {previousHtml !== null && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setPolishedHtml(previousHtml); setPreviousHtml(null); }}>
                          <Undo2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="sm" className="h-7 text-xs" onClick={handlePolish} disabled={isPolishing || !rawNotes.trim()}>
                        {isPolishing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                        {hasMinutes ? 'Re-Polish' : 'AI Polish'}
                      </Button>
                    </div>
                  )}
                </div>
                <TabsContent value="notes" className="flex-1 m-0 p-0">
                  <textarea
                    className="w-full h-full resize-none border-0 bg-background px-5 py-4 text-sm font-mono focus:outline-none placeholder:text-muted-foreground/50 leading-relaxed"
                    placeholder="Enter raw meeting notes — bullet points, shorthand, stream of consciousness…&#10;&#10;Example:&#10;- Discussed roofing delay 2 weeks — weather related&#10;- John to revise schedule by Friday&#10;- Budget concern MEP — Sarah to get revised quote&#10;- Next meeting Feb 25 at 9am"
                    value={rawNotes}
                    onChange={e => setRawNotes(e.target.value)}
                    disabled={isFinalized}
                  />
                </TabsContent>
                <TabsContent value="minutes" className="flex-1 m-0 p-0 overflow-auto">
                  <ProRichTextEditor
                    content={polishedHtml}
                    onChange={setPolishedHtml}
                    placeholder="AI-generated minutes will appear here…"
                    editable={!isFinalized}
                    onAiComplete={!isFinalized ? handleAiContinue : undefined}
                    minHeight="100%"
                    className="border-0 rounded-none h-full"
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Right — live branded preview 40% */}
            <div className="overflow-y-auto p-4 bg-muted/10" style={{ width: '40%' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">Live Preview</p>
              <MinutesViewer meeting={liveMeeting} polishedHtml={polishedHtml} projectName={projectName} />
            </div>
          </div>
        ) : (
          /* ── Sidebar: normal stacked layout ── */
          <div className="p-5 space-y-5">
            {/* Meta fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs font-semibold">Meeting Title *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} disabled={isFinalized} placeholder="e.g. Week 12 Progress Meeting" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Date *</Label>
                <Input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} disabled={isFinalized} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Time</Label>
                <Input type="time" value={meetingTime} onChange={e => setMeetingTime(e.target.value)} disabled={isFinalized} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Meeting Type</Label>
                <Select value={meetingType} onValueChange={setMeetingType} disabled={isFinalized}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MEETING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Location</Label>
                <Input value={location} onChange={e => setLocation(e.target.value)} disabled={isFinalized} placeholder="e.g. Site Office, Zoom" className="mt-1" />
              </div>
            </div>

            <Separator />

            {/* Attendees */}
            <div>
              <Label className="text-xs font-semibold flex items-center gap-1.5 mb-3">
                <Users className="h-3.5 w-3.5" /> Attendees
              </Label>
              <div className="space-y-1.5">
                {attendees.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-muted/40 rounded-lg px-3 py-2">
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <span className="font-medium text-xs">{a.name}</span>
                      <span className="text-muted-foreground text-xs">{a.role || '—'}</span>
                      <span className="text-muted-foreground text-xs">{a.company || ''}</span>
                    </div>
                    {!isFinalized && (
                      <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => removeAttendee(i)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                {!isFinalized && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <Input placeholder="Name *" value={newAttendee.name} onChange={e => setNewAttendee(p => ({ ...p, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addAttendee()} className="text-xs h-8" />
                    <Input placeholder="Role" value={newAttendee.role} onChange={e => setNewAttendee(p => ({ ...p, role: e.target.value }))} className="text-xs h-8" />
                    <div className="flex gap-1.5">
                      <Input placeholder="Company" value={newAttendee.company} onChange={e => setNewAttendee(p => ({ ...p, company: e.target.value }))} className="text-xs h-8" />
                      <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={addAttendee}><Plus className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between mb-3">
                <TabsList className="h-8">
                  <TabsTrigger value="notes" className="text-xs">Raw Notes</TabsTrigger>
                  <TabsTrigger value="minutes" className="text-xs" disabled={!hasMinutes}>
                    {hasMinutes ? (
                      <span className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" /> Minutes</span>
                    ) : 'Minutes (AI first)'}
                  </TabsTrigger>
                </TabsList>

                {!isFinalized && (
                  <div className="flex items-center gap-1.5">
                    {previousHtml !== null && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setPolishedHtml(previousHtml); setPreviousHtml(null); }}>
                            <Undo2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Undo AI Polish</TooltipContent>
                      </Tooltip>
                    )}
                    {activeTab === 'minutes' && hasMinutes && (
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setIsEditing(!isEditing)}>
                        {isEditing ? <><Eye className="h-3 w-3 mr-1" /> Preview</> : <><Edit3 className="h-3 w-3 mr-1" /> Edit</>}
                      </Button>
                    )}
                    <Button size="sm" className="h-7 text-xs" onClick={handlePolish} disabled={isPolishing || !rawNotes.trim()}>
                      {isPolishing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                      {hasMinutes ? 'Re-Polish' : 'AI Polish'}
                    </Button>
                  </div>
                )}
              </div>

              <TabsContent value="notes" className="mt-0">
                <textarea
                  className="flex min-h-[320px] w-full rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y font-mono leading-relaxed"
                  placeholder="Enter raw meeting notes — bullet points, shorthand, stream of consciousness…&#10;&#10;Example:&#10;- Discussed roofing delay 2 weeks — weather related&#10;- John to revise schedule by Friday&#10;- Budget concern MEP — Sarah to get revised quote"
                  value={rawNotes}
                  onChange={e => setRawNotes(e.target.value)}
                  disabled={isFinalized}
                />
              </TabsContent>

              <TabsContent value="minutes" className="mt-0">
                {isEditing && !isFinalized ? (
                  <ProRichTextEditor
                    content={polishedHtml}
                    onChange={setPolishedHtml}
                    placeholder="AI-generated minutes will appear here…"
                    editable
                    onAiComplete={handleAiContinue}
                    minHeight="380px"
                  />
                ) : (
                  <MinutesViewer meeting={liveMeeting} polishedHtml={polishedHtml} projectName={projectName} />
                )}
              </TabsContent>
            </Tabs>

            {/* Finalize */}
            {/* Finalize CTA */}
            {!isFinalized && hasMinutes && meeting && (
              <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div>
                  <p className="text-sm font-semibold">Ready to finalize?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Locks the minutes as official. Edits require supervisor approval after locking.</p>
                </div>
                <Button size="sm" onClick={handleFinalize}>
                  <Lock className="h-3.5 w-3.5 mr-1" /> Finalize & Lock
                </Button>
              </div>
            )}

            {/* Finalized — locked banner */}
            {isFinalized && meeting && (
              <>
                {/* Supervisor sees pending approval request */}
                {isSupervisor && pendingRequest && (
                  <UnlockApprovalBanner
                    meetingId={meeting.id}
                    pendingRequestId={pendingRequest.id}
                    requestReason={pendingRequest.reason}
                    onReviewed={() => {}}
                  />
                )}

                {/* Non-supervisor sees locked notice + request-unlock button */}
                {!isSupervisor && (
                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40 border border-border">
                    <div className="flex items-center gap-3">
                      <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Minutes Locked</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {hasPendingRequest
                            ? 'Your edit request is awaiting supervisor approval.'
                            : 'Request supervisor approval to edit these finalized minutes.'}
                        </p>
                      </div>
                    </div>
                    {!hasPendingRequest && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs shrink-0"
                        onClick={() => setUnlockDialogOpen(true)}
                      >
                        <UnlockKeyhole className="h-3.5 w-3.5 mr-1" /> Request Edit
                      </Button>
                    )}
                    {hasPendingRequest && (
                      <Badge variant="secondary" className="text-xs">
                        Pending Approval
                      </Badge>
                    )}
                  </div>
                )}

                {/* Supervisor — no pending request — show info */}
                {isSupervisor && !pendingRequest && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/40 border border-border">
                    <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Minutes Finalized</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        As a supervisor you can re-open these minutes directly from the header Save button if needed.
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="h-8 text-xs ml-auto shrink-0" onClick={handleSupervisorUnlock}>
                      <UnlockKeyhole className="h-3.5 w-3.5 mr-1" /> Unlock Minutes
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Unlock request dialog */}
      {meeting && (
        <UnlockRequestDialog
          open={unlockDialogOpen}
          onClose={() => setUnlockDialogOpen(false)}
          onSubmit={reason => requestUnlock.mutate(reason)}
          isPending={requestUnlock.isPending}
        />
      )}
    </div>
  );
}

// ─── Meeting editor (Sheet / full-screen Dialog wrapper) ─────────────────────
export function MeetingEditorSheet({
  meeting, projectId, open, onClose, onSave, onFinalize,
}: {
  meeting: ProjectMeeting | null;
  projectId: string;
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<ProjectMeeting>) => void;
  onFinalize: (id: string) => void;
}) {
  const { polish, isPolishing } = useTextPolish();
  const { updateMeeting } = useProjectMeetings(projectId);
  const { data: project } = useProject(projectId);
  const projectName = project?.name ?? 'Project';
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [title, setTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingType, setMeetingType] = useState('progress');
  const [location, setLocation] = useState('');
  const [attendees, setAttendees] = useState<MeetingAttendee[]>([]);
  const [rawNotes, setRawNotes] = useState('');
  const [polishedHtml, setPolishedHtml] = useState('');
  const [previousHtml, setPreviousHtml] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('notes');
  const [isEditing, setIsEditing] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

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
    // Open straight to the finalized minutes when they already exist.
    setActiveTab((meeting?.polished_notes_html || meeting?.polished_notes) ? 'minutes' : 'notes');
    setIsEditing(false);
    setIsFullScreen(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, meeting?.id]);

  const handlePolish = useCallback(async () => {
    if (!rawNotes.trim()) { toast.error('Enter some notes first'); return; }
    setPreviousHtml(polishedHtml);
    const result = await polish(rawNotes, { context: 'meeting_minutes', model: 'claude-opus-4-8' });
    if (result && result !== rawNotes) {
      // AI returns clean HTML directly — no regex processing needed
      setPolishedHtml(result);
      setActiveTab('minutes');
      setIsEditing(false);
    }
  }, [rawNotes, polishedHtml, polish]);

  const handleAiContinue = useCallback(async (context: string): Promise<string> => {
    const result = await polish(context, { context: 'ai_continue', model: 'claude-sonnet-4-6' });
    return result !== context ? result : '';
  }, [polish]);

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

  // Supervisor direct unlock — sets status back to 'reviewed' without requiring approval
  const handleSupervisorUnlock = useCallback(async () => {
    if (!meeting) return;
    await updateMeeting.mutateAsync({ id: meeting.id, status: 'reviewed' });
    toast.success('Minutes unlocked — you can now edit them');
  }, [meeting, updateMeeting]);

  const innerProps = {
    meeting, projectId, projectName, isFinalized, isFullScreen, onToggleFullScreen: () => setIsFullScreen(v => !v),
    title, setTitle, meetingDate, setMeetingDate, meetingTime, setMeetingTime,
    meetingType, setMeetingType, location, setLocation, attendees, setAttendees,
    rawNotes, setRawNotes, polishedHtml, setPolishedHtml, previousHtml, setPreviousHtml,
    activeTab, setActiveTab, isEditing, setIsEditing, emailOpen, setEmailOpen,
    isPolishing, handlePolish, handleSave, handleFinalize, handleSupervisorUnlock, handleAiContinue,
  };

  if (isFullScreen) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="w-screen h-screen max-w-full rounded-none p-0 border-0 [&>button]:hidden" style={{ maxHeight: '100vh' }}>
          <MeetingEditorInner {...innerProps} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl overflow-hidden p-0 flex flex-col">
        <MeetingEditorInner {...innerProps} />
      </SheetContent>
    </Sheet>
  );
}

// ─── Calendar cell ────────────────────────────────────────────────────────────
function CalendarCell({ day, isCurrentMonth, meetings, today, onSelect }: {
  day: Date; isCurrentMonth: boolean; meetings: ProjectMeeting[]; today: Date; onSelect: (m: ProjectMeeting) => void;
}) {
  const isToday = isSameDay(day, today);
  return (
    <div className={cn('border-b border-r min-h-[90px] p-1.5', !isCurrentMonth && 'bg-muted/20')}>
      <span className={cn('text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full mb-1', isToday && 'bg-primary text-primary-foreground', !isCurrentMonth && 'text-muted-foreground')}>
        {format(day, 'd')}
      </span>
      <div className="space-y-0.5">
        {meetings.slice(0, 3).map(m => (
          <button key={m.id} onClick={() => onSelect(m)} className="w-full text-left text-xs truncate rounded px-1 py-0.5 bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors">
            {m.title}
          </button>
        ))}
        {meetings.length > 3 && <span className="text-xs text-muted-foreground">+{meetings.length - 3} more</span>}
      </div>
    </div>
  );
}

// ─── Main MeetingsTab ─────────────────────────────────────────────────────────
export function MeetingsTab({ projectId }: { projectId: string }) {
  const { meetings, isLoading, createMeeting, updateMeeting, deleteMeeting, finalizeMeeting } = useProjectMeetings(projectId);
  const { canDelete } = useUserPermissions();
  const { data: project } = useProject(projectId);
  const projectName = project?.name ?? 'Project';
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
              <Button variant={view === 'list' ? 'default' : 'ghost'} size="sm" className="rounded-none" onClick={() => setView('list')}><List className="h-4 w-4" /></Button>
              <Button variant={view === 'calendar' ? 'default' : 'ghost'} size="sm" className="rounded-none" onClick={() => setView('calendar')}><CalendarDays className="h-4 w-4" /></Button>
            </div>
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Meeting</Button>
          </div>
        </div>

        {/* Calendar */}
        {view === 'calendar' && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{format(calendarMonth, 'MMMM yyyy')}</CardTitle>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setCalendarMonth(new Date())}>Today</Button>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
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
                    <CalendarCell key={i} day={day} isCurrentMonth={isSameMonth(day, calendarMonth)} meetings={meetingsByDate[format(day, 'yyyy-MM-dd')] || []} today={today} onSelect={openEdit} />
                  ) : (
                    <div key={i} className="border-b border-r min-h-[90px] bg-muted/10" />
                  )
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* List */}
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
                  <Button className="mt-4" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Meeting</Button>
                </CardContent>
              </Card>
            ) : (
              groupedList.map(([dateKey, dayMeetings]) => (
                <div key={dateKey}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-sm font-semibold text-muted-foreground">{format(parseISO(dateKey), 'EEEE, MMMM d, yyyy')}</div>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <div className="space-y-2">
                    {dayMeetings.map(m => (
                      <Card key={m.id} className="hover:shadow-md transition-all duration-200 cursor-pointer group border-l-4 border-l-transparent hover:border-l-primary/40" onClick={() => openEdit(m)}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className={cn('mt-1.5 w-2 h-2 rounded-full shrink-0', m.status === 'finalized' ? 'bg-primary' : m.status === 'reviewed' ? 'bg-primary/60' : 'bg-muted-foreground/40')} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold text-sm">{m.title}</h4>
                                  <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', STATUS_CONFIG[m.status]?.color)}>
                                    {m.status === 'finalized' && <Lock className="h-2.5 w-2.5" />}
                                    {STATUS_CONFIG[m.status]?.label}
                                  </span>
                                  <Badge variant="outline" className="text-xs">{MEETING_TYPES.find(t => t.value === m.meeting_type)?.label || m.meeting_type}</Badge>
                                  {(m.polished_notes_html || m.polished_notes) && (
                                    <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                                      <Sparkles className="h-3 w-3" /> Minutes ready
                                    </span>
                                  )}
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
                                <span onClick={e => e.stopPropagation()}>
                                  <MeetingExportMenu
                                    meeting={{
                                      id: m.id,
                                      title: m.title,
                                      meeting_type: m.meeting_type,
                                      meeting_date: m.meeting_date,
                                      meeting_time: m.meeting_time,
                                      location: m.location,
                                      status: m.status,
                                      attendees: m.attendees,
                                      polished_notes_html: m.polished_notes_html,
                                      polished_notes: m.polished_notes,
                                    }}
                                    projectId={projectId}
                                    projectName={projectName}
                                  />
                                </span>
                              )}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openEdit(m); }}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Open</TooltipContent>
                              </Tooltip>
                              {canDelete('projects') && (
                                <AlertDialog>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => e.stopPropagation()}>
                                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                        </Button>
                                      </AlertDialogTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>Delete</TooltipContent>
                                  </Tooltip>
                                  <AlertDialogContent onClick={e => e.stopPropagation()}>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Meeting</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This permanently removes “{m.title}” and its minutes. This cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteMeeting.mutate(m.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
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
