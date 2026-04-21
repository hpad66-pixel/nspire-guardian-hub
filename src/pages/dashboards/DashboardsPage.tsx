import { Link } from "react-router-dom";
import { useDashboards } from "@/hooks/useProcoreReports";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DashboardsPage() {
  const { data: dashboards = [], isLoading } = useDashboards();

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-1">Dashboards</h1>
      <p className="text-muted-foreground mb-6">Role-based tile grids. Exec / PM / Super / Accountant.</p>
      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : dashboards.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          No dashboards yet. (Presets will seed on first tenant bootstrap.)
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {dashboards.map((d) => (
            <Link key={d.id} to={`/dashboards/${d.id}`}>
              <Card className="hover:border-primary transition">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium">{d.name}</div>
                    {d.role_preset && <Badge variant="outline">{d.role_preset}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">{d.tiles?.length ?? 0} tiles</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
