/**
 * T4.14 · Dashboard Tile renderer.
 *
 * Reads a tile config from dashboards.tiles jsonb and renders one of:
 *   - kpi:   single number + optional delta
 *   - chart: recharts bar/line/pie from inline data
 *   - table: simple HTML table from inline rows
 *   - map:   static OpenStreetMap tile with pins (lazy-loaded)
 *
 * Data is resolved via a small registry of `query` types; the first pass
 * supports static `data` and a Supabase table `query`. The registry is easy
 * to extend without touching the renderer.
 */
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

export type TileKind = "kpi" | "chart" | "table" | "map";

export interface TileConfig {
  kind: TileKind;
  title: string;
  size?: "sm" | "md" | "lg";
  /** How to fetch data. */
  query?:
    | { type: "static"; data: any }
    | { type: "table"; table: string; select?: string; filters?: Array<[string, string, unknown]>; limit?: number }
    | { type: "count"; table: string; filters?: Array<[string, string, unknown]> };
  /** KPI options. */
  kpi?: { valueKey?: string; label?: string; suffix?: string; prefix?: string };
  /** Chart options. */
  chart?: {
    variant: "bar" | "line" | "pie";
    xKey: string;
    yKey: string;
    color?: string;
  };
  /** Table options. */
  table?: { columns: Array<{ key: string; header: string }> };
}

const CHART_COLORS = ["#1D6FE8", "#10B981", "#F59E0B", "#F43F5E", "#8B5CF6", "#C4A35A"];

function useTileData(cfg: TileConfig) {
  return useQuery({
    queryKey: ["tile", cfg.title, JSON.stringify(cfg.query ?? null)],
    queryFn: async () => {
      const q = cfg.query;
      if (!q || q.type === "static") return (q as any)?.data ?? null;

      if (q.type === "count") {
        let qb = supabase.from(q.table as any).select("*", { count: "exact", head: true });
        for (const [col, op, val] of q.filters ?? []) qb = (qb as any)[op](col, val);
        const { count, error } = await qb;
        if (error) throw error;
        return count ?? 0;
      }
      if (q.type === "table") {
        let qb = supabase.from(q.table as any).select(q.select ?? "*");
        for (const [col, op, val] of q.filters ?? []) qb = (qb as any)[op](col, val);
        if (q.limit) qb = qb.limit(q.limit);
        const { data, error } = await qb;
        if (error) throw error;
        return data ?? [];
      }
      return null;
    },
  });
}

export function Tile({ cfg }: { cfg: TileConfig }) {
  const { data, isLoading, error } = useTileData(cfg);

  return (
    <Card className={cfg.size === "lg" ? "col-span-2 row-span-2" : cfg.size === "md" ? "col-span-2" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{cfg.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-xs text-muted-foreground">Loading…</div>
        ) : error ? (
          <div className="text-xs text-destructive">Error: {(error as Error).message}</div>
        ) : (
          <TileBody cfg={cfg} data={data} />
        )}
      </CardContent>
    </Card>
  );
}

function TileBody({ cfg, data }: { cfg: TileConfig; data: any }) {
  switch (cfg.kind) {
    case "kpi": {
      const value = typeof data === "number"
        ? data
        : (data?.[cfg.kpi?.valueKey ?? "value"] ?? (Array.isArray(data) ? data.length : 0));
      return (
        <div>
          <div className="text-3xl font-bold font-mono">
            {cfg.kpi?.prefix}{value}{cfg.kpi?.suffix}
          </div>
          {cfg.kpi?.label && (
            <div className="text-xs text-muted-foreground mt-1">{cfg.kpi.label}</div>
          )}
        </div>
      );
    }

    case "chart": {
      const rows: any[] = Array.isArray(data) ? data : [];
      const { variant, xKey, yKey, color } = cfg.chart ?? { variant: "bar", xKey: "name", yKey: "value" };
      return (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            {variant === "bar" ? (
              <BarChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey={xKey} fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey={yKey} fill={color ?? CHART_COLORS[0]} />
              </BarChart>
            ) : variant === "line" ? (
              <LineChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey={xKey} fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey={yKey} stroke={color ?? CHART_COLORS[0]} />
              </LineChart>
            ) : (
              <PieChart>
                <Pie data={rows} dataKey={yKey} nameKey={xKey} cx="50%" cy="50%" outerRadius={70} label>
                  {rows.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      );
    }

    case "table": {
      const rows: any[] = Array.isArray(data) ? data : [];
      const cols = cfg.table?.columns ?? [];
      return (
        <div className="overflow-auto max-h-64 text-sm">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                {cols.map((c) => (
                  <th key={c.key} className="p-2 text-left font-medium">{c.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={cols.length} className="p-4 text-center text-muted-foreground">No data.</td></tr>
              ) : rows.map((r, i) => (
                <tr key={i} className="border-t">
                  {cols.map((c) => (
                    <td key={c.key} className="p-2">{String(r[c.key] ?? "—")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case "map": {
      // Static OSM fallback; a real map would use Google Maps or Mapbox.
      // Data is expected as [{ lat, lng, label }]
      const points: Array<{ lat: number; lng: number; label?: string }> = Array.isArray(data) ? data : [];
      if (points.length === 0) {
        return <div className="text-xs text-muted-foreground">No locations.</div>;
      }
      const lats = points.map((p) => p.lat);
      const lngs = points.map((p) => p.lng);
      const bbox = `${Math.min(...lngs) - 0.1},${Math.min(...lats) - 0.1},${Math.max(...lngs) + 0.1},${Math.max(...lats) + 0.1}`;
      const markers = points.slice(0, 8).map((p) => `&marker=${p.lat},${p.lng}`).join("");
      const url = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik${markers}`;
      return (
        <div className="h-56 rounded border overflow-hidden">
          <iframe title={cfg.title} src={url} className="w-full h-full" />
          <div className="text-xs text-muted-foreground mt-1">
            <Badge variant="outline">{points.length}</Badge> location{points.length === 1 ? "" : "s"}
          </div>
        </div>
      );
    }
  }
}
