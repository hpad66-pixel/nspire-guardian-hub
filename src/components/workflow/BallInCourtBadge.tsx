import { useRecordWorkflow } from "@/hooks/useWorkflow";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNowStrict } from "date-fns";

export function BallInCourtBadge({
  recordType,
  recordId,
}: {
  recordType: string;
  recordId: string;
}) {
  const { data: inst } = useRecordWorkflow(recordType, recordId);
  if (!inst) return null;

  if (inst.state !== "open") {
    return <Badge variant="outline" className="capitalize">{inst.state}</Badge>;
  }

  const overdue = inst.due_at ? new Date(inst.due_at) < new Date() : false;
  return (
    <div className="flex items-center gap-2">
      <Badge variant={overdue ? "destructive" : "default"}>
        Step {inst.current_step}
      </Badge>
      {inst.due_at && (
        <span className="text-xs text-muted-foreground">
          {overdue ? "overdue " : "due in "}
          {formatDistanceToNowStrict(new Date(inst.due_at))}
        </span>
      )}
    </div>
  );
}
