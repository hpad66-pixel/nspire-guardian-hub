import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tile, type TileConfig } from "@/components/dashboards/Tile";

export default function DashboardViewPage() {
  const { dashboardId } = useParams<{ dashboardId: string }>();

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["dashboard", dashboardId],
    enabled: Boolean(dashboardId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dashboards" as any)
        .select("*")
        .eq("id", dashboardId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!dashboard) return <div className="p-6">Dashboard not found.</div>;

  const tiles: TileConfig[] = (dashboard as any).tiles ?? [];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <h1 className="text-3xl font-bold mb-1">{(dashboard as any).name}</h1>
      <p className="text-muted-foreground mb-6 capitalize">
        {(dashboard as any).role_preset ?? "Custom"} dashboard · {tiles.length} tile{tiles.length === 1 ? "" : "s"}
      </p>

      {tiles.length === 0 ? (
        <div className="text-muted-foreground">No tiles yet. Configure via the dashboards.tiles jsonb column.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-min">
          {tiles.map((t, i) => <Tile key={i} cfg={t} />)}
        </div>
      )}
    </div>
  );
}
