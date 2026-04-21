import { useParams } from "react-router-dom";
import { useIncidents, useOshaRecordables } from "@/hooks/useIncidents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function IncidentsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const year = new Date().getFullYear();
  const { data: incidents = [], isLoading } = useIncidents(projectId ?? null);
  const { data: recordables = [] } = useOshaRecordables(projectId ?? null, year);

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Incidents</h1>
          <p className="text-muted-foreground mt-1">Safety incidents + OSHA 300/301.</p>
        </div>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">OSHA 300 · {year}</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{recordables.length}</CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : incidents.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No incidents.</CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {incidents.map((i) => (
            <Card key={i.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <div className="font-medium">{i.title ?? i.incident_type ?? "Incident"}</div>
                  <div className="text-xs text-muted-foreground">
                    {i.occurred_at && format(new Date(i.occurred_at), "MMM d, yyyy")}
                    {i.severity && ` · ${i.severity}`}
                  </div>
                </div>
                <div className="flex gap-2">
                  {i.osha_recordable && <Badge variant="destructive">OSHA 300</Badge>}
                  <Badge variant="outline">{i.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
