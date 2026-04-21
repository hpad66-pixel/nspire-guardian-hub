import { useParams } from "react-router-dom";
import { useProjectDirectory } from "@/hooks/useProjectDirectory";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ProjectDirectoryPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: entries = [], isLoading } = useProjectDirectory(projectId ?? null);

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-1">Project Directory</h1>
      <p className="text-muted-foreground mb-6">People and companies assigned to this project.</p>
      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : entries.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No entries yet.</CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {entries.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <div className="font-medium">{e.role_label ?? "Team member"}</div>
                  <div className="text-xs text-muted-foreground">
                    {e.user_id ? "User" : e.contact_id ? "Contact" : "External"}
                  </div>
                </div>
                {e.is_key_contact && <Badge>Key contact</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
