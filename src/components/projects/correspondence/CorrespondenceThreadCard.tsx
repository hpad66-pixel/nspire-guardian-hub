/**
 * CorrespondenceThreadCard — one email thread with its AI intelligence header
 * (summary · status · ball-in-court · entities · action items) and an expandable
 * list of the underlying messages. The intelligence comes from correspondence-intel
 * (PR3d); the "Add to Action Items" hooks land in PR3e.
 */
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, ArrowDownLeft, ArrowUpRight, Paperclip, Sparkles, CircleUser, ListChecks, Plus, Check } from "lucide-react";
import type { ProjectEmail } from "@/hooks/useProjectEmails";
import type { CorrespondenceThread } from "@/hooks/useCorrespondenceThreads";

const fmtDate = (d: string) =>
  new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

const TOPIC_META: Record<string, { label: string; cls: string }> = {
  water_billing:   { label: "Water billing", cls: "bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)] border-[var(--apas-sapphire)]/20" },
  water_meters:    { label: "Water meters",  cls: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  sewer_extension: { label: "Sewer",         cls: "bg-amber-100 text-amber-700 border-amber-200" },
  stormwater:      { label: "Storm water",   cls: "bg-slate-100 text-slate-600 border-slate-200" },
  other:           { label: "Other",         cls: "bg-muted text-muted-foreground" },
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  awaiting_us:   { label: "Awaiting you",  cls: "bg-rose-100 text-rose-700 border-rose-200" },
  awaiting_them: { label: "Awaiting them", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  in_progress:   { label: "In progress",   cls: "bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)] border-[var(--apas-sapphire)]/20" },
  resolved:      { label: "Resolved",      cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  fyi:           { label: "FYI",           cls: "bg-muted text-muted-foreground" },
};

function party(e: ProjectEmail): string {
  if (e.direction === "inbound") return e.from_name || e.from_email || "Unknown sender";
  const to = e.to_emails?.[0];
  return to ? `To ${to}${e.to_emails.length > 1 ? ` +${e.to_emails.length - 1}` : ""}` : "Outbound";
}

export interface AddActionItemArgs { title: string; owner: string; due_hint: string; threadId: string | null; intelId: string | null }

export function CorrespondenceThreadCard({
  messages, intel, onAddActionItem, pushingActionItem, addedTitles,
}: {
  messages: ProjectEmail[];
  intel?: CorrespondenceThread;
  onAddActionItem?: (a: AddActionItemArgs) => void;
  pushingActionItem?: string | null;   // title currently being pushed
  addedTitles?: Set<string>;           // action-item titles already in Action Items for this thread
}) {
  const [open, setOpen] = useState(false);
  const ordered = [...messages].sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
  const latest = ordered[0];
  const subject = intel?.subject || latest?.subject || "(no subject)";
  const topic = intel?.topic || latest?.topic || null;
  const tmeta = topic ? TOPIC_META[topic] : null;
  const smeta = intel?.status ? STATUS_META[intel.status] : null;
  const ent = intel?.entities;
  const chips = [...(ent?.amounts ?? []), ...(ent?.dates ?? []), ...(ent?.refs ?? [])].slice(0, 6);
  const hasAttach = messages.some((m) => m.has_attachments);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header (click to expand messages) */}
        <button className="w-full text-left p-3.5 hover:bg-accent/30 transition-colors" onClick={() => setOpen((o) => !o)}>
          <div className="flex items-start gap-2.5">
            <ChevronRight className={`h-4 w-4 mt-1 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {intel?.urgency === "high" && <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" title="High urgency" />}
                <span className="font-semibold truncate">{subject}</span>
                {tmeta && <Badge variant="outline" className={`text-[10px] ${tmeta.cls}`}>{tmeta.label}</Badge>}
                {smeta && <Badge variant="outline" className={`text-[10px] ${smeta.cls}`}>{smeta.label}</Badge>}
                {hasAttach && <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className="text-xs text-muted-foreground ml-auto shrink-0">{messages.length} msg{messages.length === 1 ? "" : "s"} · {latest ? fmtDate(latest.occurred_at) : ""}</span>
              </div>

              {/* AI summary */}
              {intel?.summary ? (
                <div className="mt-1.5 flex items-start gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[var(--apas-sapphire)]" />
                  <p className="text-sm text-foreground/90">{intel.summary}</p>
                </div>
              ) : (
                latest?.snippet && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{latest.snippet}</p>
              )}

              {/* Ball in court */}
              {intel?.ball_in_court && (
                <div className="mt-1.5 text-xs flex items-center gap-1.5 text-muted-foreground">
                  <CircleUser className="h-3.5 w-3.5" /> Ball in court: <span className="font-medium text-foreground">{intel.ball_in_court}</span>
                </div>
              )}

              {/* Entity chips */}
              {chips.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {chips.map((c, i) => (
                    <span key={i} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{c}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </button>

        {/* Action items (extracted) */}
        {intel && intel.action_items.length > 0 && (
          <div className="border-t bg-accent/20 px-3.5 py-2.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
              <ListChecks className="h-3.5 w-3.5" /> Action items
            </div>
            <ul className="space-y-1">
              {intel.action_items.map((a, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="flex-1">
                    {a.title}
                    {a.owner && <span className="text-muted-foreground"> · {a.owner}</span>}
                    {a.due_hint && <span className="text-muted-foreground"> · {a.due_hint}</span>}
                  </span>
                  {onAddActionItem && (addedTitles?.has(a.title) ? (
                    <span className="text-xs text-emerald-600 flex items-center gap-0.5 shrink-0"><Check className="h-3.5 w-3.5" /> Added</span>
                  ) : (
                    <Button
                      size="sm" variant="ghost" className="h-6 px-2 text-xs shrink-0"
                      disabled={pushingActionItem === a.title}
                      onClick={() => onAddActionItem({ title: a.title, owner: a.owner, due_hint: a.due_hint, threadId: intel.gmail_thread_id, intelId: intel.id })}
                      title="Add to this project's Action Items"
                    >
                      <Plus className="h-3.5 w-3.5 mr-0.5" /> Add
                    </Button>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Expanded messages */}
        {open && (
          <div className="border-t divide-y">
            {ordered.map((e) => {
              const inbound = e.direction === "inbound";
              return (
                <div key={e.id} className="flex items-start gap-3 p-3.5">
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${inbound ? "bg-emerald-100 text-emerald-700" : "bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)]"}`}>
                    {inbound ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="font-medium text-foreground">{party(e)}</span> · {fmtDate(e.occurred_at)}
                      {e.has_attachments && <Paperclip className="h-3 w-3" />}
                    </div>
                    {e.snippet && <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-4">{e.snippet}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
