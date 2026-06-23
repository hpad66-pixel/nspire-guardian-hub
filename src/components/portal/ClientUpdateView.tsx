/**
 * ClientUpdateView — renders one client update (the briefing the GC publishes to
 * the owner): health, summary, accomplishments, risks, decisions, action items,
 * next steps, and the optional weekly financial statement download.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, AlertTriangle, GitBranch, ListChecks, ArrowRight, Download, FileText,
} from "lucide-react";
import type { ClientUpdate } from "@/hooks/useClientUpdates";

const HEALTH: Record<string, { label: string; cls: string }> = {
  on_track: { label: "On track", cls: "bg-[var(--apas-emerald)] text-white" },
  at_risk: { label: "At risk", cls: "bg-[var(--apas-amber)] text-white" },
  delayed: { label: "Delayed", cls: "bg-[var(--apas-rose)] text-white" },
};
const SEV: Record<string, string> = {
  low: "text-muted-foreground", medium: "text-[var(--apas-amber)]", high: "text-[var(--apas-rose)]",
};

function Section({ icon: Icon, title, children }: { icon: typeof CheckCircle2; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-[var(--apas-sapphire)]" /> {title}
      </div>
      {children}
    </div>
  );
}

export function ClientUpdateView({ update }: { update: ClientUpdate }) {
  const h = HEALTH[update.health] ?? HEALTH.on_track;
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{update.title}</h2>
          {update.period_label && <p className="text-sm text-muted-foreground">{update.period_label}</p>}
        </div>
        <Badge className={h.cls}>{h.label}</Badge>
      </div>

      {update.summary && <p className="text-sm leading-relaxed whitespace-pre-wrap">{update.summary}</p>}

      {update.accomplishments?.length > 0 && (
        <Section icon={CheckCircle2} title="Accomplishments">
          <ul className="space-y-1 text-sm">
            {update.accomplishments.map((a, i) => (
              <li key={i} className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-[var(--apas-emerald)] mt-0.5 flex-shrink-0" />{a}</li>
            ))}
          </ul>
        </Section>
      )}

      {update.risks?.length > 0 && (
        <Section icon={AlertTriangle} title="Risks & issues">
          <ul className="space-y-1 text-sm">
            {update.risks.map((r, i) => (
              <li key={i} className="flex gap-2">
                <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${SEV[r.severity] ?? ""}`} />
                <span>{r.text} <span className="text-xs text-muted-foreground capitalize">({r.severity})</span></span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {update.decisions?.length > 0 && (
        <Section icon={GitBranch} title="Decisions">
          <ul className="space-y-1 text-sm">
            {update.decisions.map((d, i) => (
              <li key={i} className="flex items-center gap-2">
                <Badge variant="outline" className={d.status === "made" ? "text-[var(--apas-emerald)]" : "text-[var(--apas-amber)]"}>
                  {d.status === "made" ? "Made" : "Needed"}
                </Badge>
                {d.text}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {update.action_items?.length > 0 && (
        <Section icon={ListChecks} title="Action items">
          <ul className="space-y-1 text-sm">
            {update.action_items.map((a, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className={`h-4 w-4 rounded border flex items-center justify-center text-[10px] ${a.done ? "bg-[var(--apas-emerald)] text-white border-transparent" : "border-muted-foreground/40"}`}>
                  {a.done ? "✓" : ""}
                </span>
                <span className={a.done ? "line-through text-muted-foreground" : ""}>{a.text}</span>
                {a.owner && <Badge variant="outline" className="text-[10px]">{a.owner}</Badge>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {update.next_steps?.length > 0 && (
        <Section icon={ArrowRight} title="Next steps">
          <ul className="space-y-1 text-sm">
            {update.next_steps.map((s, i) => (
              <li key={i} className="flex gap-2"><ArrowRight className="h-4 w-4 text-[var(--apas-sapphire)] mt-0.5 flex-shrink-0" />{s}</li>
            ))}
          </ul>
        </Section>
      )}

      {update.statement_pdf_path && (
        <Section icon={FileText} title="Financial statement">
          <Button asChild size="sm" variant="outline">
            <a href={update.statement_pdf_path} target="_blank" rel="noopener noreferrer" download>
              <Download className="h-4 w-4 mr-1" /> Download statement
            </a>
          </Button>
        </Section>
      )}
    </div>
  );
}
