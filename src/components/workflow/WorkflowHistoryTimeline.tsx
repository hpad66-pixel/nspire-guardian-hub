import { useWorkflowEvents } from "@/hooks/useWorkflow";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export function WorkflowHistoryTimeline({ instanceId }: { instanceId: string }) {
  const { data: events = [], isLoading } = useWorkflowEvents(instanceId);
  if (isLoading) return <div className="text-sm text-muted-foreground">Loading history…</div>;

  return (
    <div className="space-y-2">
      {events.map((e: any) => (
        <div key={e.id} className="flex items-start gap-3 text-sm">
          <div className="flex flex-col items-center">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <div className="w-px flex-1 bg-border mt-1" />
          </div>
          <div className="flex-1 pb-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="uppercase text-xs">{e.action}</Badge>
              <span className="text-muted-foreground text-xs">
                {format(new Date(e.occurred_at), "MMM d, yyyy HH:mm")}
              </span>
            </div>
            {e.comment && <div className="mt-1 text-foreground">{e.comment}</div>}
            {e.from_step != null && (
              <div className="text-xs text-muted-foreground">
                Step {e.from_step} → Step {e.to_step}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
