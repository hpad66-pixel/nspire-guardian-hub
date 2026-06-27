import { Link } from "react-router-dom";
import { useMyCourt, type MyCourtRow } from "@/hooks/useWorkflow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNowStrict } from "date-fns";

// Map a workflow record type to the project tab that shows it. The project page
// reads ?tab= to open the right tab. There is no /workflow/* route, so this routes
// the item to where it actually lives instead of a dead end.
const TAB_FOR: Record<string, string> = {
  rfi: "rfis", submittal: "submittals",
  punch: "punch-list", punch_item: "punch-list", punch_list: "punch-list",
  change_order: "financials", commitment: "financials", pay_app: "financials",
  pco: "financials", oco: "financials", co: "financials",
  meeting: "meetings", daily_report: "daily-logs", daily_log: "daily-logs",
  proposal: "proposals",
};
function destFor(it: MyCourtRow): string | null {
  if (!it.project_id) return null;
  const tab = TAB_FOR[it.record_type] ?? "overview";
  return `/projects/${it.project_id}?tab=${tab}`;
}

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
                  {items.map((it) => {
                    const dest = destFor(it);
                    const inner = (
                      <>
                        <div>
                          <div className="font-medium">{it.workflow_name}</div>
                          <div className="text-xs text-muted-foreground">
                            Step {it.current_step} · {it.current_state_name ?? "open"}
                          </div>
                        </div>
                        {it.due_at && (
                          <Badge variant={new Date(it.due_at) < new Date() ? "destructive" : "secondary"}>
                            {new Date(it.due_at) < new Date() ? "overdue by " : "due in "}
                            {formatDistanceToNowStrict(new Date(it.due_at))}
                          </Badge>
                        )}
                      </>
                    );
                    return dest ? (
                      <Link key={it.id} to={dest} className="flex items-center justify-between px-4 py-3 hover:bg-muted">
                        {inner}
                      </Link>
                    ) : (
                      <div key={it.id} className="flex items-center justify-between px-4 py-3">
                        {inner}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
