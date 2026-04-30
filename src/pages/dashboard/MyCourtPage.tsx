import { Link } from "react-router-dom";
import { useMyCourt } from "@/hooks/useWorkflow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNowStrict } from "date-fns";

export default function MyCourtPage() {
  const { data: rows = [], isLoading } = useMyCourt();

  const byModule = rows.reduce<Record<string, typeof rows>>((acc, r) => {
    (acc[r.module] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-1">My Court</h1>
      <p className="text-muted-foreground mb-6">
        Every open item waiting on your response, across modules.
      </p>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Nothing is in your court. Nice.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(byModule).map(([module, items]) => (
            <div key={module}>
              <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-2">
                {module} · {items.length}
              </h2>
              <Card>
                <CardContent className="p-0 divide-y">
                  {items.map((it) => (
                    <Link
                      key={it.id}
                      to={`/workflow/${it.record_type}/${it.record_id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-muted"
                    >
                      <div>
                        <div className="font-medium">{it.workflow_name}</div>
                        <div className="text-xs text-muted-foreground">
                          Step {it.current_step} · {it.current_state_name ?? "open"}
                        </div>
                      </div>
                      {it.due_at && (
                        <Badge
                          variant={new Date(it.due_at) < new Date() ? "destructive" : "secondary"}
                        >
                          {new Date(it.due_at) < new Date() ? "overdue by " : "due in "}
                          {formatDistanceToNowStrict(new Date(it.due_at))}
                        </Badge>
                      )}
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
