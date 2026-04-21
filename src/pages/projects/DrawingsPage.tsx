import { useParams } from "react-router-dom";
import { useDrawings } from "@/hooks/useDrawings";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DrawingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: drawings = [], isLoading } = useDrawings(projectId ?? null);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-1">Drawings</h1>
      <p className="text-muted-foreground mb-6">Sheet index, versioned with pin-drop markups.</p>
      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : drawings.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No drawings uploaded yet.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {drawings.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-3">
                <div className="aspect-[1/1.3] bg-muted rounded flex items-center justify-center mb-2">
                  <span className="font-mono text-lg">{d.sheet_number}</span>
                </div>
                <div className="text-sm font-medium truncate">{d.title ?? d.sheet_number}</div>
                {d.discipline && <Badge variant="outline" className="mt-1">{d.discipline}</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
