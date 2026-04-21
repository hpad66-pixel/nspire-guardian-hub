import { useParams } from "react-router-dom";
import { useTransmittals } from "@/hooks/useProjectDocuments";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function TransmittalsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: transmittals = [], isLoading } = useTransmittals(projectId ?? null);

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-1">Transmittals</h1>
      <p className="text-muted-foreground mb-6">Documents sent to distribution lists.</p>
      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : transmittals.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No transmittals yet.</CardContent></Card>
      ) : (
        <div className="divide-y rounded-md border">
          {transmittals.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-3">
              <div>
                <div className="font-mono text-muted-foreground text-sm">{t.number}</div>
                <div className="font-medium">{t.subject}</div>
                <div className="text-xs text-muted-foreground">
                  {t.sent_at ? `Sent ${format(new Date(t.sent_at), "MMM d, yyyy")}` : "Draft"}
                </div>
              </div>
              {t.sent_at ? <Badge>Sent</Badge> : <Badge variant="outline">Draft</Badge>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
