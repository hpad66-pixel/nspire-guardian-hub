import { useParams } from "react-router-dom";
import { usePhotos } from "@/hooks/usePhotos";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

export default function PhotosPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: photos = [], isLoading } = usePhotos(projectId ?? null);

  const byDay = photos.reduce<Record<string, typeof photos>>((acc, p) => {
    const d = p.taken_at ?? p.created_at;
    const key = format(new Date(d), "yyyy-MM-dd");
    (acc[key] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-1">Photos</h1>
      <p className="text-muted-foreground mb-6">Geo+date-stamped photo library.</p>
      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : photos.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No photos yet.</CardContent></Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(byDay).map(([day, items]) => (
            <div key={day}>
              <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-2">
                {format(new Date(day), "MMMM d, yyyy")} · {items.length}
              </h2>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {items.map((p) => (
                  <div key={p.id} className="aspect-square bg-muted rounded overflow-hidden">
                    {p.thumb_path && <img src={p.thumb_path} alt={p.caption ?? ""} className="w-full h-full object-cover" />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
