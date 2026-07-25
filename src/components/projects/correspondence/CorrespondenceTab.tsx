/**
 * CorrespondenceTab — a project's full correspondence trail: inbound emails
 * synced from Gmail and outbound branded letters drafted/sent from projOS, in one
 * timeline, filterable by topic. Gmail connect (PR3a) + inbound sync (PR3c) feed
 * the inbound side; the composer (PR2) feeds the outbound side.
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, ArrowDownLeft, ArrowUpRight, Paperclip, PenLine, Loader2, Inbox, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useProjectEmails, type ProjectEmail } from "@/hooks/useProjectEmails";
import { useGmailConnection } from "@/hooks/useGmailConnection";
import { useGmailSync } from "@/hooks/useGmailSync";
import { CorrespondenceComposer } from "./CorrespondenceComposer";

const fmtDate = (d: string) =>
  new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

const fmtAgo = (d: string): string => {
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

// Topic display metadata. Keys match the classifier / gmail-sync topics.
const TOPIC_META: Record<string, { label: string; cls: string }> = {
  water_billing:   { label: "Water billing", cls: "bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)] border-[var(--apas-sapphire)]/20" },
  water_meters:    { label: "Water meters",  cls: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  sewer_extension: { label: "Sewer",         cls: "bg-amber-100 text-amber-700 border-amber-200" },
  stormwater:      { label: "Storm water",   cls: "bg-slate-100 text-slate-600 border-slate-200" },
  other:           { label: "Other",         cls: "bg-muted text-muted-foreground" },
};
const topicLabel = (t?: string | null) => (t && TOPIC_META[t]?.label) || null;

function party(e: ProjectEmail): string {
  if (e.direction === "inbound") return e.from_name || e.from_email || "Unknown sender";
  const to = e.to_emails?.[0];
  return to ? `To ${to}${e.to_emails.length > 1 ? ` +${e.to_emails.length - 1}` : ""}` : "Outbound";
}

export function CorrespondenceTab({ projectId, projectName }: { projectId: string; projectName?: string | null }) {
  const { data: emails = [], isLoading } = useProjectEmails(projectId);
  const gmail = useGmailConnection();
  const { settings, sync } = useGmailSync(projectId);
  const [composeOpen, setComposeOpen] = useState(false);
  const [topicFilter, setTopicFilter] = useState<string>("all");

  // Toast the result of the Gmail OAuth round-trip (?gmail=connected|error) and
  // strip the param so a refresh doesn't re-toast.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const g = p.get("gmail");
    if (!g) return;
    if (g === "connected") { toast.success("Gmail connected."); gmail.status.refetch(); }
    else if (g === "error") toast.error("Couldn't connect Gmail — please try again.");
    p.delete("gmail");
    window.history.replaceState({}, "", `${window.location.pathname}${p.toString() ? `?${p}` : ""}`);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const disconnectGmail = () => {
    if (!window.confirm("Disconnect Gmail? Synced threads stay; no new mail will sync.")) return;
    gmail.disconnect.mutate(undefined, {
      onSuccess: () => toast.success("Gmail disconnected."),
      onError: (e: any) => toast.error(e?.message ?? "Couldn't disconnect."),
    });
  };
  const connected = gmail.status.data?.connected;

  const runSync = () => {
    toast.loading("Syncing Gmail…", { id: "gsync" });
    sync.mutate(undefined, {
      onSuccess: (r) => {
        const parts = Object.entries(r.byTopic || {})
          .filter(([t]) => (settings.data?.import_topics ?? ["water_billing", "water_meters"]).includes(t))
          .map(([t, n]) => `${n} ${TOPIC_META[t]?.label ?? t}`);
        const msg = r.imported > 0
          ? `Imported ${r.imported} message${r.imported === 1 ? "" : "s"}${parts.length ? ` · ${parts.join(", ")}` : ""}.`
          : `Scanned ${r.scanned} thread${r.scanned === 1 ? "" : "s"} — nothing new to import.`;
        toast.success(msg, { id: "gsync" });
      },
      onError: (e: any) => toast.error(e?.message ?? "Sync failed.", { id: "gsync" }),
    });
  };

  // Topic counts for the filter chips (only topics actually present).
  const topicCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of emails) { const t = e.topic || "untagged"; m.set(t, (m.get(t) ?? 0) + 1); }
    return m;
  }, [emails]);

  const shown = useMemo(
    () => (topicFilter === "all" ? emails : emails.filter((e) => (e.topic || "untagged") === topicFilter)),
    [emails, topicFilter],
  );
  const counts = useMemo(() => ({
    inbound: emails.filter((e) => e.direction === "inbound").length,
    outbound: emails.filter((e) => e.direction === "outbound").length,
  }), [emails]);

  const lastSynced = settings.data?.last_synced_at;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Mail className="h-5 w-5 text-[var(--apas-sapphire)]" /> Correspondence</h2>
          <p className="text-sm text-muted-foreground">
            Every email and letter with the client and agencies, in one trail — {counts.inbound} received · {counts.outbound} sent
            {lastSynced ? ` · synced ${fmtAgo(lastSynced)}` : ""}.
          </p>
        </div>
        <div className="flex gap-2">
          {connected ? (
            <>
              <Button variant="outline" size="sm" onClick={runSync} disabled={sync.isPending} title="Pull the latest water-billing & meter threads from Gmail">
                <RefreshCw className={`h-4 w-4 mr-1 ${sync.isPending ? "animate-spin" : ""}`} /> {sync.isPending ? "Syncing…" : "Sync now"}
              </Button>
              <Button variant="outline" size="sm" onClick={disconnectGmail} title="Gmail connected — click to disconnect" disabled={gmail.disconnect.isPending}>
                <Check className="h-4 w-4 mr-1 text-emerald-600" /> {gmail.status.data?.email}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => gmail.connect.mutate(undefined)} disabled={gmail.connect.isPending} title="Connect your Gmail to sync R4 & City of Opa-Locka threads">
              {gmail.connect.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Inbox className="h-4 w-4 mr-1" />} Connect Gmail
            </Button>
          )}
          <Button size="sm" onClick={() => setComposeOpen(true)}>
            <PenLine className="h-4 w-4 mr-1" /> Compose
          </Button>
        </div>
      </div>

      <CorrespondenceComposer open={composeOpen} onOpenChange={setComposeOpen} projectId={projectId} projectName={projectName} />

      {/* Topic filter chips (shown once there's anything tagged) */}
      {emails.length > 0 && topicCounts.size > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setTopicFilter("all")}
            className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${topicFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent/40"}`}
          >
            All {emails.length}
          </button>
          {[...topicCounts.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => {
            const meta = TOPIC_META[t];
            const active = topicFilter === t;
            return (
              <button
                key={t}
                onClick={() => setTopicFilter(t)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent/40"}`}
              >
                {meta?.label ?? (t === "untagged" ? "Untagged" : t)} {n}
              </button>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && emails.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Inbox className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <div className="font-medium">No correspondence yet</div>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              {connected
                ? "Click Sync now to pull in the water-billing and meter threads with R4 and the City of Opa-Locka — everything is logged here as a complete trail."
                : "Connect your Gmail to pull in the R4 and City of Opa-Locka threads for this project, or compose a branded letter — everything you send and receive will be logged here as a complete trail."}
            </p>
            {connected && (
              <Button className="mt-4" size="sm" onClick={runSync} disabled={sync.isPending}>
                <RefreshCw className={`h-4 w-4 mr-1 ${sync.isPending ? "animate-spin" : ""}`} /> {sync.isPending ? "Syncing…" : "Sync now"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground p-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading correspondence…
        </div>
      )}

      {/* Timeline */}
      {shown.length > 0 && (
        <div className="space-y-2">
          {shown.map((e) => {
            const inbound = e.direction === "inbound";
            const tl = topicLabel(e.topic);
            return (
              <Card key={e.id} className="transition-colors hover:bg-accent/30">
                <CardContent className="p-3.5">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${inbound ? "bg-emerald-100 text-emerald-700" : "bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)]"}`}>
                      {inbound ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{e.subject || "(no subject)"}</span>
                        {tl && <Badge variant="outline" className={`text-[10px] ${TOPIC_META[e.topic!]?.cls ?? ""}`}>{tl}</Badge>}
                        {e.status !== "received" && e.status !== "sent" && (
                          <Badge variant="outline" className="text-[10px] capitalize">{e.status}</Badge>
                        )}
                        {e.has_attachments && <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {party(e)} · {fmtDate(e.occurred_at)}
                      </div>
                      {e.snippet && <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{e.snippet}</div>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
