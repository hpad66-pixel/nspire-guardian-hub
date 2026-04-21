import { useParams } from "react-router-dom";
import { useChangeEvents } from "@/hooks/useChangeEvents";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function fmt(n: number | null) {
  return `$${(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ChangeEventsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: events = [], isLoading } = useChangeEvents(projectId ?? null);

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-1">Change Events</h1>
      <p className="text-muted-foreground mb-6">Early-warning exposure ledger — feeds Budget forecast.</p>
      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : events.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No change events.</CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {events.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <div className="font-medium">
                    <span className="font-mono text-muted-foreground mr-2">CE-{e.event_no}</span>
                    {e.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {e.reason_code ?? "other"} · {e.event_date}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="font-mono">{fmt(e.rom_value)}</span>
                  <Badge variant="outline" className="capitalize">{e.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
