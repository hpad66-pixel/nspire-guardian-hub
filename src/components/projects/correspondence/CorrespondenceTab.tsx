/**
 * CorrespondenceTab — two linked surfaces for a project:
 *   • Threads — emails grouped into conversations, each with an OPT-IN AI
 *     intelligence header (summary · status · ball-in-court · entities · actions).
 *   • Documents — upload/author/finalize/track documents (no API).
 * AI never runs on its own: you sync, and you click Analyze. Everything else —
 * the trail, the editor, exports — is API-free.
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, PenLine, Loader2, Inbox, Check, RefreshCw, Sparkles, FileText, MessagesSquare } from "lucide-react";
import { toast } from "sonner";
import { useProjectEmails, type ProjectEmail } from "@/hooks/useProjectEmails";
import { useGmailConnection } from "@/hooks/useGmailConnection";
import { useGmailSync } from "@/hooks/useGmailSync";
import { useCorrespondenceThreads, type CorrespondenceThread } from "@/hooks/useCorrespondenceThreads";
import { useActionItemsByProject, useCreateActionItem } from "@/hooks/useActionItems";
import { useAuth } from "@/hooks/useAuth";
import { CorrespondenceComposer } from "./CorrespondenceComposer";
import { CorrespondenceThreadCard, type AddActionItemArgs } from "./CorrespondenceThreadCard";
import { DocumentWorkspace } from "./DocumentWorkspace";

const fmtAgo = (d: string): string => {
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

// Legacy fallback for projects that predate a configured taxonomy — a project's
// OWN correspondence_settings.topics (see useGmailSync) always takes priority.
const TOPIC_LABEL: Record<string, string> = {
  water_billing: "Water billing", water_meters: "Water meters", sewer_extension: "Sewer", stormwater: "Storm water", other: "Other", untagged: "Untagged",
};

interface ThreadGroup { key: string; threadId: string | null; messages: ProjectEmail[]; intel?: CorrespondenceThread; topic: string; lastAt: number }

export function CorrespondenceTab({ projectId, projectName }: { projectId: string; projectName?: string | null }) {
  const { data: emails = [], isLoading, removeThread } = useProjectEmails(projectId);
  const gmail = useGmailConnection();
  const { settings, sync } = useGmailSync(projectId);
  const { threads, analyze } = useCorrespondenceThreads(projectId);
  const { data: actionItems = [] } = useActionItemsByProject(projectId);
  const createActionItem = useCreateActionItem(projectId);
  const { user } = useAuth();
  const [composeOpen, setComposeOpen] = useState(false);
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [pushing, setPushing] = useState<string | null>(null);
  const [view, setView] = useState<"threads" | "documents">("threads");

  // Toast the Gmail OAuth round-trip result and strip the ?gmail= param.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const g = p.get("gmail");
    if (!g) return;
    if (g === "connected") { toast.success("Gmail connected."); gmail.status.refetch(); }
    else if (g === "error") toast.error("Couldn't connect Gmail — please try again.");
    p.delete("gmail");
    window.history.replaceState({}, "", `${window.location.pathname}${p.toString() ? `?${p}` : ""}`);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const connected = gmail.status.data?.connected;

  const disconnectGmail = () => {
    if (!window.confirm("Disconnect Gmail? Synced threads stay; no new mail will sync.")) return;
    gmail.disconnect.mutate(undefined, {
      onSuccess: () => toast.success("Gmail disconnected."),
      onError: (e: any) => toast.error(e?.message ?? "Couldn't disconnect."),
    });
  };

  // AI analysis is OPT-IN — only runs when the user clicks. Never on load.
  const runAnalyze = (opts?: { force?: boolean }) => {
    toast.loading("Analyzing threads…", { id: "intel" });
    analyze.mutate(opts, {
      onSuccess: (r) => toast.success((r?.analyzed ?? 0) > 0 ? `Analyzed ${r.analyzed} thread${r.analyzed === 1 ? "" : "s"}.` : "Already up to date.", { id: "intel" }),
      onError: (e: any) => toast.error(e?.message ?? "Analysis failed.", { id: "intel" }),
    });
  };

  const runSync = () => {
    toast.loading("Syncing Gmail…", { id: "gsync" });
    sync.mutate(undefined, {
      onSuccess: (r) => {
        const imported = r.imported ?? 0;
        toast.success(imported > 0 ? `Imported ${imported} message${imported === 1 ? "" : "s"}.` : `Scanned ${r.scanned} thread${r.scanned === 1 ? "" : "s"} — nothing new.`, { id: "gsync" });
        if (r.insertErrors?.length) toast.error(`Some messages couldn't be saved: ${r.insertErrors[0]}`, { duration: 8000 });
      },
      onError: (e: any) => toast.error(e?.message ?? "Sync failed.", { id: "gsync" }),
    });
  };

  const threadIntel = useMemo(() => new Map((threads.data ?? []).map((t) => [t.gmail_thread_id, t])), [threads.data]);

  // Group messages into threads and attach intelligence.
  const groups = useMemo<ThreadGroup[]>(() => {
    const map = new Map<string, ThreadGroup>();
    for (const e of emails) {
      const key = e.gmail_thread_id ? `t:${e.gmail_thread_id}` : `m:${e.id}`;
      let g = map.get(key);
      if (!g) {
        g = { key, threadId: e.gmail_thread_id, messages: [], intel: e.gmail_thread_id ? threadIntel.get(e.gmail_thread_id) : undefined, topic: e.topic || "untagged", lastAt: 0 };
        map.set(key, g);
      }
      g.messages.push(e);
      g.lastAt = Math.max(g.lastAt, new Date(e.occurred_at).getTime());
      if (e.topic) g.topic = e.topic;
    }
    for (const g of map.values()) if (g.intel?.topic) g.topic = g.intel.topic;
    return [...map.values()].sort((a, b) => b.lastAt - a.lastAt);
  }, [emails, threadIntel]);

  const topicCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of groups) m.set(g.topic, (m.get(g.topic) ?? 0) + 1);
    return m;
  }, [groups]);

  // This project's OWN topic labels (configured in correspondence_settings.topics)
  // take priority over the legacy hardcoded map, which only covers Glorieta's
  // original taxonomy — every other project defines its own topics now.
  const topicLabel = useMemo(() => {
    const configured = new Map((settings.data?.topics ?? []).map((t) => [t.key, t.label]));
    return (key: string) => configured.get(key) ?? TOPIC_LABEL[key] ?? key;
  }, [settings.data?.topics]);
  const shown = topicFilter === "all" ? groups : groups.filter((g) => g.topic === topicFilter);

  // Which extracted action items are already in Action Items (linked to their thread).
  const addedByThread = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const it of actionItems) {
      if (it.linked_entity_type === "correspondence_thread" && it.linked_entity_id) {
        if (!m.has(it.linked_entity_id)) m.set(it.linked_entity_id, new Set());
        m.get(it.linked_entity_id)!.add(it.title);
      }
    }
    return m;
  }, [actionItems]);

  const onAddActionItem = (a: AddActionItemArgs) => {
    setPushing(a.title);
    const ownsSelf = /^(you|us|me)$/i.test(a.owner.trim());
    createActionItem.mutate({
      title: a.title,
      description: `From correspondence · ${a.owner}${a.due_hint ? ` · ${a.due_hint}` : ""}`,
      assigned_to: ownsSelf ? user?.id ?? null : null,
      tags: ["correspondence"],
      linked_entity_type: "correspondence_thread",
      linked_entity_id: a.intelId,
    }, {
      onSuccess: () => toast.success("Added to Action Items."),
      onSettled: () => setPushing(null),
    });
  };

  const counts = useMemo(() => ({
    inbound: emails.filter((e) => e.direction === "inbound").length,
    outbound: emails.filter((e) => e.direction === "outbound").length,
  }), [emails]);
  const lastSynced = settings.data?.last_synced_at;
  const analyzing = analyze.isPending;
  const unanalyzed = groups.filter((g) => g.threadId && !g.intel).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Mail className="h-5 w-5 text-[var(--apas-sapphire)]" /> Correspondence</h2>
          <p className="text-sm text-muted-foreground">
            Every email, letter, and document with the client and agencies — {counts.inbound} received · {counts.outbound} sent
            {lastSynced ? ` · synced ${fmtAgo(lastSynced)}` : ""}{analyzing ? " · analyzing…" : ""}.
          </p>
        </div>
        <div className="flex gap-2">
          {view === "threads" && (connected ? (
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
          ))}
          {view === "threads" && (
            <Button size="sm" onClick={() => setComposeOpen(true)}>
              <PenLine className="h-4 w-4 mr-1" /> Compose
            </Button>
          )}
        </div>
      </div>

      {/* Threads / Documents toggle */}
      <div className="inline-flex rounded-lg border bg-muted/40 p-0.5 text-sm">
        <button onClick={() => setView("threads")} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${view === "threads" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}>
          <MessagesSquare className="h-4 w-4" /> Threads {groups.length ? <span className="text-xs text-muted-foreground">{groups.length}</span> : null}
        </button>
        <button onClick={() => setView("documents")} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${view === "documents" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}>
          <FileText className="h-4 w-4" /> Documents
        </button>
      </div>

      <CorrespondenceComposer open={composeOpen} onOpenChange={setComposeOpen} projectId={projectId} projectName={projectName} />

      {view === "documents" ? (
        <DocumentWorkspace projectId={projectId} projectName={projectName} />
      ) : (
        <>
          {/* Topic filter chips + opt-in Analyze */}
          {groups.length > 0 && topicCounts.size > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button onClick={() => setTopicFilter("all")} className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${topicFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent/40"}`}>
                All {groups.length}
              </button>
              {[...topicCounts.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => (
                <button key={t} onClick={() => setTopicFilter(t)} className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${topicFilter === t ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent/40"}`}>
                  {topicLabel(t)} {n}
                </button>
              ))}
              <button onClick={() => runAnalyze(unanalyzed === 0 ? { force: true } : undefined)} disabled={analyzing} className="ml-auto rounded-full border px-2.5 py-1 text-xs flex items-center gap-1 hover:bg-accent/40 disabled:opacity-60" title="Run AI analysis on these threads (uses the AI API)">
                <Sparkles className={`h-3.5 w-3.5 ${analyzing ? "animate-pulse" : ""}`} /> {analyzing ? "Analyzing…" : unanalyzed > 0 ? `Analyze ${unanalyzed}` : "Re-analyze"}
              </button>
            </div>
          )}

          {!isLoading && emails.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Inbox className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <div className="font-medium">No correspondence yet</div>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  {connected
                    ? "Click Sync now to pull in the water-billing and meter threads with R4 and the City of Opa-Locka — then Analyze to summarize them."
                    : "Connect your Gmail to pull in the R4 and City of Opa-Locka threads, or switch to Documents to upload and author a letter."}
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

          {shown.length > 0 && (
            <div className="space-y-2.5">
              {shown.map((g) => (
                <CorrespondenceThreadCard
                  key={g.key}
                  projectId={projectId}
                  messages={g.messages}
                  intel={g.intel}
                  onAddActionItem={onAddActionItem}
                  pushingActionItem={pushing}
                  addedTitles={g.intel ? addedByThread.get(g.intel.id) : undefined}
                  topicLabel={topicLabel}
                  onDelete={(threadId) => removeThread.mutate(threadId, {
                    onSuccess: () => toast.success("Deleted — this won't come back on a future sync."),
                    onError: (e: any) => toast.error(e?.message ?? "Couldn't delete this thread."),
                  })}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
