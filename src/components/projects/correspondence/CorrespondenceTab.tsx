/**
 * CorrespondenceTab — a project's correspondence, grouped into threads, each with
 * an AI intelligence header (summary · status · ball-in-court · entities · action
 * items) and outbound letters drafted from projOS. Inbound sync (PR3c) fills the
 * trail; correspondence-intel (PR3d) analyzes each thread; extracted action items
 * push into the project's Action Items (PR3e).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, PenLine, Loader2, Inbox, Check, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useProjectEmails, type ProjectEmail } from "@/hooks/useProjectEmails";
import { useGmailConnection } from "@/hooks/useGmailConnection";
import { useGmailSync } from "@/hooks/useGmailSync";
import { useCorrespondenceThreads, type CorrespondenceThread } from "@/hooks/useCorrespondenceThreads";
import { useActionItemsByProject, useCreateActionItem } from "@/hooks/useActionItems";
import { useAuth } from "@/hooks/useAuth";
import { CorrespondenceComposer } from "./CorrespondenceComposer";
import { CorrespondenceThreadCard, type AddActionItemArgs } from "./CorrespondenceThreadCard";

const fmtAgo = (d: string): string => {
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

const TOPIC_LABEL: Record<string, string> = {
  water_billing: "Water billing", water_meters: "Water meters", sewer_extension: "Sewer", stormwater: "Storm water", other: "Other", untagged: "Untagged",
};

interface ThreadGroup { key: string; threadId: string | null; messages: ProjectEmail[]; intel?: CorrespondenceThread; topic: string; lastAt: number }

export function CorrespondenceTab({ projectId, projectName }: { projectId: string; projectName?: string | null }) {
  const { data: emails = [], isLoading } = useProjectEmails(projectId);
  const gmail = useGmailConnection();
  const { settings, sync } = useGmailSync(projectId);
  const { threads, analyze } = useCorrespondenceThreads(projectId);
  const { data: actionItems = [] } = useActionItemsByProject(projectId);
  const createActionItem = useCreateActionItem(projectId);
  const { user } = useAuth();
  const [composeOpen, setComposeOpen] = useState(false);
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [pushing, setPushing] = useState<string | null>(null);
  const autoAnalyzed = useRef(false);

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

  const runAnalyze = (opts?: { force?: boolean }) =>
    analyze.mutate(opts, {
      onSuccess: (r) => { if ((r?.analyzed ?? 0) > 0) toast.success(`Analyzed ${r.analyzed} thread${r.analyzed === 1 ? "" : "s"}.`, { id: "intel" }); },
      onError: (e: any) => toast.error(e?.message ?? "Analysis failed.", { id: "intel" }),
    });

  const runSync = () => {
    toast.loading("Syncing Gmail…", { id: "gsync" });
    sync.mutate(undefined, {
      onSuccess: (r) => {
        const imported = r.imported ?? 0;
        toast.success(imported > 0 ? `Imported ${imported} message${imported === 1 ? "" : "s"}. Analyzing…` : `Scanned ${r.scanned} thread${r.scanned === 1 ? "" : "s"} — nothing new.`, { id: "gsync" });
        // Chain: analyze the freshly-synced threads.
        toast.loading("Analyzing threads…", { id: "intel" });
        runAnalyze();
      },
      onError: (e: any) => toast.error(e?.message ?? "Sync failed.", { id: "gsync" }),
    });
  };

  // Auto-analyze once if there are threads with messages but no intelligence yet.
  const threadIntel = useMemo(() => new Map((threads.data ?? []).map((t) => [t.gmail_thread_id, t])), [threads.data]);
  useEffect(() => {
    if (autoAnalyzed.current || threads.isLoading || emails.length === 0) return;
    const distinctThreads = new Set(emails.filter((e) => e.gmail_thread_id).map((e) => e.gmail_thread_id));
    const anyUnanalyzed = [...distinctThreads].some((tid) => !threadIntel.has(tid as string));
    if (anyUnanalyzed && !analyze.isPending) { autoAnalyzed.current = true; runAnalyze(); }
  }, [emails, threadIntel, threads.isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Topic filter chips (thread-level).
  const topicCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of groups) m.set(g.topic, (m.get(g.topic) ?? 0) + 1);
    return m;
  }, [groups]);
  const shown = topicFilter === "all" ? groups : groups.filter((g) => g.topic === topicFilter);

  // Which extracted action items are already in Action Items (linked to their thread).
  const addedByThread = useMemo(() => {
    const m = new Map<string, Set<string>>(); // intelId → titles
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
      description: a.due_hint ? `From correspondence · ${a.owner}${a.due_hint ? ` · ${a.due_hint}` : ""}` : `From correspondence · ${a.owner}`,
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Mail className="h-5 w-5 text-[var(--apas-sapphire)]" /> Correspondence</h2>
          <p className="text-sm text-muted-foreground">
            Every email and letter with the client and agencies, in one intelligent trail — {counts.inbound} received · {counts.outbound} sent
            {lastSynced ? ` · synced ${fmtAgo(lastSynced)}` : ""}
            {analyzing ? " · analyzing…" : ""}.
          </p>
        </div>
        <div className="flex gap-2">
          {connected ? (
            <>
              <Button variant="outline" size="sm" onClick={runSync} disabled={sync.isPending} title="Pull the latest water-billing & meter threads from Gmail, then analyze them">
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

      {/* Topic filter chips */}
      {groups.length > 0 && topicCounts.size > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={() => setTopicFilter("all")} className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${topicFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent/40"}`}>
            All {groups.length}
          </button>
          {[...topicCounts.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => (
            <button key={t} onClick={() => setTopicFilter(t)} className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${topicFilter === t ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent/40"}`}>
              {TOPIC_LABEL[t] ?? t} {n}
            </button>
          ))}
          {connected && groups.some((g) => g.threadId && !g.intel) && (
            <button onClick={() => runAnalyze()} disabled={analyzing} className="ml-auto rounded-full border px-2.5 py-1 text-xs flex items-center gap-1 hover:bg-accent/40 disabled:opacity-60">
              <Sparkles className={`h-3.5 w-3.5 ${analyzing ? "animate-pulse" : ""}`} /> {analyzing ? "Analyzing…" : "Analyze threads"}
            </button>
          )}
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
                ? "Click Sync now to pull in the water-billing and meter threads with R4 and the City of Opa-Locka — each thread is analyzed into a summary, status, and action items."
                : "Connect your Gmail to pull in the R4 and City of Opa-Locka threads for this project, or compose a branded letter — everything is logged here as a complete trail."}
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

      {/* Thread cards */}
      {shown.length > 0 && (
        <div className="space-y-2.5">
          {shown.map((g) => (
            <CorrespondenceThreadCard
              key={g.key}
              messages={g.messages}
              intel={g.intel}
              onAddActionItem={onAddActionItem}
              pushingActionItem={pushing}
              addedTitles={g.intel ? addedByThread.get(g.intel.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
