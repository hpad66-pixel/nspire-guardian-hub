import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { useChangeEvents } from "@/hooks/useChangeEvents";
import { ChangeEventLineGrid } from "@/components/financial/ChangeEventLineGrid";
import { PromoteToPcoDialog } from "@/components/financial/PromoteToPcoDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, LayoutDashboard } from "lucide-react";
import { useProject } from "@/hooks/useProjects";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";

export default function ChangeEventDetailPage() {
  const { projectId, eventId } = useParams<{ projectId: string; eventId: string }>();
  const { data: project } = useProject(projectId ?? null);
  const { data: events = [] } = useChangeEvents(projectId ?? null);
  const event = events.find((e) => e.id === eventId);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [promoteOpen, setPromoteOpen] = useState(false);

  function toggle(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  if (!event) return <div className="p-6 text-muted-foreground">Loading…</div>;

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <FinancialSubNav projectId={projectId ?? ""} />
      <div>
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap mb-4">
          <Link to="/dashboard" className="hover:text-foreground flex items-center gap-1">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dashboard
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to={`/projects/${projectId}`} className="hover:text-foreground">
            {project?.name ?? 'Project'}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to={`/projects/${projectId}/financials/prime-contract`} className="hover:text-foreground">
            Financials
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to={`/projects/${projectId}/financials/change-events`} className="hover:text-foreground">
            Change Events
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium truncate">{event.title}</span>
        </nav>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-3xl font-bold">
              <span className="font-mono text-muted-foreground mr-2">CE-{event.event_no}</span>
              {event.title}
            </h1>
            {event.description && (
              <div className="text-muted-foreground mt-1 max-w-3xl">{event.description}</div>
            )}
            <div className="text-xs text-muted-foreground mt-1">
              {event.reason_code ?? "other"} · {event.event_date}
            </div>
          </div>
          <Badge variant="outline" className="capitalize">{event.status}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Lines</CardTitle>
          <Button
            onClick={() => setPromoteOpen(true)}
            disabled={selected.size === 0}
          >
            Promote {selected.size > 0 && `(${selected.size})`} to PCO
          </Button>
        </CardHeader>
        <CardContent>
          <ChangeEventLineGrid
            eventId={event.id}
            selected={selected}
            onToggleSelect={toggle}
            readOnly={event.status === "closed" || event.status === "void"}
          />
        </CardContent>
      </Card>

      {projectId && (
        <PromoteToPcoDialog
          open={promoteOpen}
          onOpenChange={setPromoteOpen}
          eventId={event.id}
          projectId={projectId}
          selectedLineIds={[...selected]}
          onPromoted={() => setSelected(new Set())}
        />
      )}
    </div>
  );
}
