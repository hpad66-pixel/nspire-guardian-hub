import { useParams } from "react-router-dom";
import { usePunchList } from "@/hooks/usePunchList";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PunchListPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: items = [], isLoading } = usePunchList(projectId ?? null);

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-1">Punch List</h1>
      <p className="text-muted-foreground mb-6">Defects with pin-drop and evidence requirements.</p>
      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No punch items.</CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {items.map((it: any) => (
            <Card key={it.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <div className="font-medium">{it.title ?? "Punch item"}</div>
                  <div className="text-xs text-muted-foreground">
                    {it.priority} · due {it.due_date ?? "—"}
                  </div>
                </div>
                {it.closed_at ? <Badge>Closed</Badge> : <Badge variant="outline">Open</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
