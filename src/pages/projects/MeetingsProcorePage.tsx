import { useParams } from "react-router-dom";
import { useMeetings } from "@/hooks/useMeetings";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function MeetingsProcorePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: meetings = [], isLoading } = useMeetings(projectId ?? null);

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-1">Meetings</h1>
      <p className="text-muted-foreground mb-6">Template-driven meetings with agendas and action items.</p>
      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : meetings.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No meetings scheduled.</CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {meetings.map((m: any) => (
            <Card key={m.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <div className="font-medium">{m.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.scheduled_at && format(new Date(m.scheduled_at), "MMM d HH:mm")}
                    {m.meeting_type && ` · ${m.meeting_type}`}
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">{m.status ?? "scheduled"}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
