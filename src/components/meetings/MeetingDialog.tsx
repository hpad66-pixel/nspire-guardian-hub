/**
 * C5 · MeetingDialog — create or edit a project meeting. Captures the base
 * fields needed to spin up a meeting run (date/time, type, location, title,
 * attendees). Agenda items are edited on the RunPage once the meeting exists.
 */
import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import {
  useProjectMeetings, type ProjectMeeting, type MeetingAttendee,
} from "@/hooks/useProjectMeetings";
import { toast } from "sonner";

const MEETING_TYPES = [
  "owner-architect-contractor",
  "subcontractor-coordination",
  "foreman",
  "safety",
  "preinstall",
  "closeout",
  "custom",
];

export function MeetingDialog({
  open, onOpenChange, projectId, meeting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  /** If passed, the dialog is in edit mode. */
  meeting?: ProjectMeeting | null;
}) {
  const { createMeeting, updateMeeting } = useProjectMeetings(projectId);
  const isEdit = Boolean(meeting);

  const [title, setTitle] = useState("");
  const [type, setType] = useState("owner-architect-contractor");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("09:00");
  const [location, setLocation] = useState("");
  const [attendees, setAttendees] = useState<MeetingAttendee[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (meeting) {
      setTitle(meeting.title);
      setType(meeting.meeting_type);
      setDate(meeting.meeting_date);
      setTime(meeting.meeting_time ?? "09:00");
      setLocation(meeting.location ?? "");
      setAttendees(meeting.attendees ?? []);
      setNotes(meeting.raw_notes ?? "");
    } else {
      setTitle("");
      setType("owner-architect-contractor");
      setDate(new Date().toISOString().split("T")[0]);
      setTime("09:00");
      setLocation("");
      setAttendees([]);
      setNotes("");
    }
  }, [open, meeting]);

  function addAttendee() {
    setAttendees((a) => [...a, { name: "", role: "", company: "" }]);
  }
  function updateAttendee(i: number, patch: Partial<MeetingAttendee>) {
    setAttendees((a) => a.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function removeAttendee(i: number) {
    setAttendees((a) => a.filter((_, idx) => idx !== i));
  }

  const busy = createMeeting.isPending || updateMeeting.isPending;

  async function handleSubmit() {
    if (!title.trim()) { toast.error("Title required"); return; }
    const cleanAttendees = attendees.filter((a) => a.name.trim());
    const payload = {
      project_id: projectId,
      title: title.trim(),
      meeting_type: type,
      meeting_date: date,
      meeting_time: time,
      location: location.trim() || undefined,
      attendees: cleanAttendees,
      raw_notes: notes.trim() || undefined,
      status: "draft" as const,
    };
    try {
      if (isEdit && meeting) {
        await updateMeeting.mutateAsync({ id: meeting.id, ...payload });
      } else {
        await createMeeting.mutateAsync(payload as any);
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit meeting" : "New meeting"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)}
                   placeholder="e.g. Weekly OAC meeting" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MEETING_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Time</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Location (optional)</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Attendees</Label>
              <Button size="sm" variant="ghost" type="button" onClick={addAttendee}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add row
              </Button>
            </div>
            {attendees.length === 0 ? (
              <p className="text-xs text-muted-foreground">Add attendees now or during the run.</p>
            ) : (
              <div className="rounded-md border divide-y">
                {attendees.map((a, i) => (
                  <div key={i} className="flex gap-2 p-2">
                    <Input
                      className="h-8" placeholder="Name"
                      value={a.name} onChange={(e) => updateAttendee(i, { name: e.target.value })}
                    />
                    <Input
                      className="h-8" placeholder="Role"
                      value={a.role ?? ""} onChange={(e) => updateAttendee(i, { role: e.target.value })}
                    />
                    <Input
                      className="h-8" placeholder="Company"
                      value={a.company ?? ""} onChange={(e) => updateAttendee(i, { company: e.target.value })}
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8"
                            onClick={() => removeAttendee(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label>Notes / agenda seed (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                      rows={4} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={busy || !title.trim()}>
            {busy ? "Saving…" : isEdit ? "Update meeting" : "Create meeting"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
