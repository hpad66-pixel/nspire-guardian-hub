/**
 * The shared, client-facing rendering for a published update and the admin's
 * pre-publish preview. Keeping one renderer prevents preview/published drift.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, AlertTriangle, CheckCircle2, CircleDot, Download, FileText,
  GitBranch, ListChecks, Sparkles, type LucideIcon,
} from "lucide-react";
import type { ClientUpdate } from "@/hooks/useClientUpdates";
import { UPDATE_TYPES } from "@/lib/clientUpdates/presentation";

const HEALTH: Record<string, { label: string; dot: string; cls: string }> = {
  on_track: { label: "On track", dot: "bg-emerald-500", cls: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  at_risk: { label: "At risk", dot: "bg-amber-500", cls: "border-amber-200 bg-amber-50 text-amber-800" },
  delayed: { label: "Delayed", dot: "bg-rose-500", cls: "border-rose-200 bg-rose-50 text-rose-800" },
};

const SEV: Record<string, string> = {
  low: "text-slate-500", medium: "text-amber-600", high: "text-rose-600",
};

function Section({ icon: Icon, title, children, emphasized = false }: { icon: LucideIcon; title: string; children: React.ReactNode; emphasized?: boolean }) {
  return (
    <section className={`rounded-2xl border p-4 sm:p-5 ${emphasized ? "border-amber-200 bg-amber-50/70" : "border-slate-200/80 bg-white/80"}`}>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#082b23] text-white"><Icon className="h-4 w-4" /></span>
        {title}
      </div>
      {children}
    </section>
  );
}

export function ClientUpdateView({ update }: { update: ClientUpdate }) {
  const h = HEALTH[update.health] ?? HEALTH.on_track;
  const type = UPDATE_TYPES[update.update_type ?? "general"] ?? UPDATE_TYPES.general;
  const TypeIcon = type.icon;

  return (
    <article className="overflow-hidden rounded-[22px] border border-slate-200/90 bg-[#fffdf8] text-slate-900 shadow-[0_18px_50px_rgba(8,43,35,0.07)]">
      <header className={`border-b border-slate-200/80 bg-gradient-to-br ${type.surface} px-5 py-6 sm:px-7 sm:py-7`}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <span className={`inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] ${type.accent}`}>
            <TypeIcon className="h-4 w-4" />{type.eyebrow}
          </span>
          <Badge variant="outline" className={`gap-2 rounded-full px-3 py-1 text-[11px] font-bold ${h.cls}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${h.dot}`} />{h.label}
          </Badge>
        </div>
        <h2 className="max-w-3xl text-2xl font-semibold leading-tight tracking-[-0.025em] text-[#082b23] sm:text-3xl">{update.title}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          {update.period_label && <span>{update.period_label}</span>}
          {update.published_at && <><span aria-hidden="true">•</span><span>Published {new Date(update.published_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span></>}
        </div>
        {update.summary && <p className="mt-5 max-w-3xl whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{update.summary}</p>}
      </header>

      <div className="grid gap-4 p-4 sm:p-6">
        {update.accomplishments?.length > 0 && (
          <Section icon={update.update_type === "milestone" ? Sparkles : CheckCircle2} title={update.update_type === "milestone" ? "What this milestone means" : "Completed & accomplished"} emphasized={update.update_type === "milestone"}>
            <ul className="grid gap-2.5 text-sm leading-6 text-slate-700">
              {update.accomplishments.map((a, i) => <li key={i} className="flex gap-2.5"><CheckCircle2 className="mt-1 h-4 w-4 flex-shrink-0 text-emerald-600" /><span>{a}</span></li>)}
            </ul>
          </Section>
        )}

        {update.decisions?.length > 0 && (
          <Section icon={GitBranch} title="Decisions">
            <ul className="grid gap-3 text-sm leading-6 text-slate-700">
              {update.decisions.map((d, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Badge variant="outline" className={d.status === "made" ? "mt-0.5 border-emerald-200 bg-emerald-50 text-emerald-700" : "mt-0.5 border-amber-200 bg-amber-50 text-amber-800"}>{d.status === "made" ? "Decided" : "Needed"}</Badge>
                  <span>{d.text}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {update.risks?.length > 0 && (
          <Section icon={AlertTriangle} title="Risks & issues">
            <ul className="grid gap-3 text-sm leading-6 text-slate-700">
              {update.risks.map((r, i) => (
                <li key={i} className="flex gap-2.5">
                  <AlertTriangle className={`mt-1 h-4 w-4 flex-shrink-0 ${SEV[r.severity] ?? ""}`} />
                  <span>{r.text} <span className="ml-1 text-xs capitalize text-slate-400">{r.severity}</span></span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {update.action_items?.length > 0 && (
          <Section icon={ListChecks} title="Responsible parties & actions">
            <ul className="grid gap-2.5 text-sm text-slate-700">
              {update.action_items.map((a, i) => (
                <li key={i} className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5">
                  <span className={`grid h-5 w-5 flex-shrink-0 place-items-center rounded-md border text-[11px] ${a.done ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white"}`}>{a.done ? "✓" : ""}</span>
                  <span className={`flex-1 ${a.done ? "text-slate-400 line-through" : ""}`}>{a.text}</span>
                  {a.owner && <Badge variant="outline" className="bg-white text-[10px] text-slate-600">{a.owner}</Badge>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {update.next_steps?.length > 0 && (
          <Section icon={ArrowRight} title="Coming next">
            <ul className="grid gap-2.5 text-sm leading-6 text-slate-700">
              {update.next_steps.map((s, i) => <li key={i} className="flex gap-2.5"><CircleDot className="mt-1 h-4 w-4 flex-shrink-0 text-blue-600" /><span>{s}</span></li>)}
            </ul>
          </Section>
        )}

        {update.statement_pdf_path && (
          <Section icon={FileText} title="Supporting document">
            <Button asChild size="sm" variant="outline" className="rounded-xl bg-white">
              <a href={update.statement_pdf_path} target="_blank" rel="noopener noreferrer" download><Download className="mr-2 h-4 w-4" />Download financial statement</a>
            </Button>
          </Section>
        )}
      </div>
    </article>
  );
}
