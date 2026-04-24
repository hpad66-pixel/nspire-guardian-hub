/**
 * B2 · DrawingsPage — sheet index grid with bulk-upload button and
 * per-card links into the DrawingViewerPage.
 */
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDrawings } from "@/hooks/useDrawings";
import { DrawingUploadDialog } from "@/components/drawings/DrawingUploadDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export default function DrawingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: drawings = [], isLoading } = useDrawings(projectId ?? null);
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Drawings</h1>
          <p className="text-muted-foreground">Sheet index, versioned with pin-drop markups.</p>
        </div>
        <Button onClick={() => setUploadOpen(true)} disabled={!projectId}>
          <Upload className="h-4 w-4 mr-2" />
          Upload drawings
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : drawings.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No drawings uploaded yet. Click <strong>Upload drawings</strong> to add a PDF set.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {drawings.map((d) => (
            <Link
              key={d.id}
              to={`/projects/${projectId}/drawings/${d.id}`}
              className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
            >
              <Card className="transition-shadow group-hover:shadow-md cursor-pointer h-full">
                <CardContent className="p-3">
                  <div className="aspect-[1/1.3] bg-muted rounded flex items-center justify-center mb-2 group-hover:bg-muted/80">
                    <span className="font-mono text-lg">{d.sheet_number}</span>
                  </div>
                  <div className="text-sm font-medium truncate">{d.title ?? d.sheet_number}</div>
                  {d.discipline && <Badge variant="outline" className="mt-1">{d.discipline}</Badge>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {projectId && (
        <DrawingUploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          projectId={projectId}
        />
      )}
    </div>
  );
}
