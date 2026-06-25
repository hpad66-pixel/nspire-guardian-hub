/**
 * C5 · MeetingsProcorePage — project meeting list. Create/edit opens the rich
 * artifact-style editor (MeetingEditorSheet): a side panel with raw notes, live
 * AI-polished minutes (Claude), full editing, full-screen expand, and PDF / Word /
 * email export.
 */
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useProjectMeetings } from "@/hooks/useProjectMeetings";
import type { ProjectMeeting } from "@/hooks/useProjectMeetings";
import { useProject } from "@/hooks/useProjects";
import { MeetingEditorSheet } from "@/components/projects/MeetingsTab";
import { MeetingExportMenu } from "@/components/projects/MeetingExportMenu";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Layers, Sparkles } from "lucide-react";
import { format } from "date-fns";

export default function MeetingsProcorePage() {
  const { projectId = "" } = useParams();
  const { meetings, isLoading, createMeeting, updateMeeting, finalizeMeeting } = useProjectMeetings(projectId);
  const { data: project } = useProject(projectId || null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selected, setSelected] = useState<ProjectMeeting | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const openCreate = () => { setSelected(null); setIsCreating(true); setEditorOpen(true); };
  const openEdit = (m: ProjectMeeting) => { setSelected(m); setIsCreating(false); setEditorOpen(true); };

  const handleSave = async (data: Partial<ProjectMeeting>) => {
    if (isCreating) {
      await createMeeting.mutateAsync({
        project_id: projectId,
        title: data.title || "Untitled Meeting",
        meeting_date: data.meeting_date || format(new Date(), "yyyy-MM-dd"),
        meeting_time: data.meeting_time,
        meeting_type: data.meeting_type || "progress",
        location: data.location,
        attendees: data.attendees || [],
        raw_notes: data.raw_notes,
        polished_notes: data.polished_notes,
        polished_notes_html: data.polished_notes_html,
        status: "draft",
      });
      setIsCreating(false);
    } else if (selected) {
      await updateMeeting.mutateAsync({ id: selected.id, ...data });
    }
  };

  const handleFinalize = async (id: string) => {
    await finalizeMeeting.mutateAsync(id);
    setEditorOpen(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Meetings</h1>
          <p className="text-muted-foreground">
            Progress meetings with AI-generated, editable minutes — action items, decisions and next steps.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/projects/${projectId}/meetings/templates`}>
              <Layers className="h-4 w-4 mr-2" /> Templates
            </Link>
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> New meeting
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : meetings.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No meetings yet. Create one — jot raw notes, hit <Sparkles className="inline h-3.5 w-3.5 mx-0.5 text-primary" /> AI Polish,
            and get clean minutes you can edit, download and email.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {meetings.map((m) => (
            <Card key={m.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => openEdit(m)}>
              <CardContent className="flex items-center justify-between gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{m.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(m.meeting_date), "MMM d")}
                    {m.meeting_time && ` · ${m.meeting_time}`}
                    {m.meeting_type && ` · ${m.meeting_type}`}
                    {m.location && ` · ${m.location}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {m.polished_notes_html && <Sparkles className="h-3.5 w-3.5 text-primary" />}
                  <Badge variant={m.status === "finalized" ? "default" : "outline"} className="capitalize">
                    {m.status ?? "draft"}
                  </Badge>
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(m); }}>
                    Open
                  </Button>
                  <span onClick={(e) => e.stopPropagation()}>
                    <MeetingExportMenu meeting={m} projectId={projectId} projectName={project?.name ?? "Project"} />
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <MeetingEditorSheet
        meeting={selected}
        projectId={projectId}
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleSave}
        onFinalize={handleFinalize}
      />
    </div>
  );
}
