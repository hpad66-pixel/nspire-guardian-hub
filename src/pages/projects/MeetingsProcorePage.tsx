/**
 * C5 · MeetingsProcorePage — project-scoped meeting list with create/edit
 * dialog and links into the live run page.
 */
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useProjectMeetings } from "@/hooks/useProjectMeetings";
import type { ProjectMeeting } from "@/hooks/useProjectMeetings";
import { MeetingDialog } from "@/components/meetings/MeetingDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Layers } from "lucide-react";
import { format } from "date-fns";

export default function MeetingsProcorePage() {
  const { projectId = "" } = useParams();
  const { meetings, isLoading } = useProjectMeetings(projectId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectMeeting | null>(null);

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Meetings</h1>
          <p className="text-muted-foreground">
            Template-driven meetings with agendas and action items.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/projects/${projectId}/meetings/templates`}>
              <Layers className="h-4 w-4 mr-2" /> Templates
            </Link>
          </Button>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> New meeting
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : meetings.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No meetings scheduled. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {meetings.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex items-center justify-between gap-3 p-3">
                <Link
                  to={`/projects/${projectId}/meetings/${m.id}`}
                  className="flex-1 min-w-0 group"
                >
                  <div className="font-medium truncate group-hover:underline">
                    {m.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(m.meeting_date), "MMM d")}
                    {m.meeting_time && ` · ${m.meeting_time}`}
                    {m.meeting_type && ` · ${m.meeting_type}`}
                    {m.location && ` · ${m.location}`}
                  </div>
                </Link>
                <div className="flex items-center gap-2">
                  <Badge variant={m.status === "finalized" ? "default" : "outline"} className="capitalize">
                    {m.status ?? "draft"}
                  </Badge>
                  <Button
                    size="sm" variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      setEditing(m);
                      setDialogOpen(true);
                    }}
                    disabled={m.status === "finalized"}
                  >
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <MeetingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={projectId}
        meeting={editing}
      />
    </div>
  );
}
