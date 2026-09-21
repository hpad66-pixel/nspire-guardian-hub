/**
 * Owner portal — Project Updates. The client reads the briefings the GC publishes:
 * latest update front and center, with the history alongside.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Send, ShieldCheck } from "lucide-react";
import { useClientUpdates } from "@/hooks/useClientUpdates";
import { useClientPortalNotes } from "@/hooks/useClientPortalNotes";
import { useMyPortalKind } from "@/hooks/usePortals";
import { ClientUpdateView } from "@/components/portal/ClientUpdateView";
import { UPDATE_TYPES } from "@/lib/clientUpdates/presentation";
import { useClientPortalProject, useOwnerPortalHref } from "@/components/portal/ClientPortalProjectContext";

function ClientNoteBox({ projectId }: { projectId: string | null }) {
  const { data: portalKind } = useMyPortalKind();
  const { data: notes = [], isLoading, create } = useClientPortalNotes(projectId);
  const [draft, setDraft] = useState("");
  const canWrite = portalKind !== "main";

  async function handleSend() {
    const value = draft.trim();
    if (!value || create.isPending) return;
    setDraft("");
    try {
      await create.mutateAsync(value);
    } catch {
      setDraft(value);
    }
  }

  return (
    <Card className="border-slate-200 bg-white/85 shadow-sm">
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="text-base font-semibold text-[#082b23]">Send the team an update</h2>
          <p className="mt-1 text-sm text-slate-500">One place for client notes, questions, and quick status updates.</p>
        </div>

        {canWrite ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type your note for the project team..."
              rows={4}
              className="min-h-24 w-full resize-none bg-transparent text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400"
            />
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleSend}
                disabled={!draft.trim() || create.isPending}
                className="inline-flex items-center gap-2 rounded-full bg-[#0d6b57] px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              >
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send note
              </button>
            </div>
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            Client-view preview. Invited clients can write here; administrators can read notes in this preview.
          </p>
        )}

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Recent client notes</h3>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading notes...</p>
          ) : notes.length === 0 ? (
            <p className="text-sm text-slate-500">No client notes yet.</p>
          ) : (
            notes.slice(0, 5).map((note) => (
              <article key={note.id} className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{note.body}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {note.author_email || "Client"} · {new Date(note.created_at).toLocaleDateString()}
                </p>
              </article>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function OwnerUpdatesPage() {
  const href = useOwnerPortalHref();
  const { selectedProjectId: projectId } = useClientPortalProject();
  const { data: updates = [], isLoading } = useClientUpdates(projectId, { publishedOnly: true });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => updates.find((u) => u.id === selectedId) ?? updates[0] ?? null, [updates, selectedId]);

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
        <Link to={href()} className="text-sm text-muted-foreground hover:underline">← Portal overview</Link>
        <h1 className="mt-2 text-4xl font-medium">Project briefings</h1>
        <p className="mt-1 text-muted-foreground">Clear, approved updates from your project team.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"><ShieldCheck className="h-4 w-4" />Published information only</span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground p-8 justify-center"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : updates.length === 0 ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card><CardContent className="p-8 text-center text-muted-foreground">No updates published yet.</CardContent></Card>
          <div className="xl:sticky xl:top-4 xl:self-start">
            <ClientNoteBox projectId={projectId} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[230px_minmax(0,1fr)_320px]">
          <div className="space-y-2 md:sticky md:top-4 md:self-start">
            {updates.map((u) => {
              const meta = UPDATE_TYPES[u.update_type ?? "general"] ?? UPDATE_TYPES.general;
              const Icon = meta.icon;
              return (
                <button key={u.id} onClick={() => setSelectedId(u.id)} className={`w-full rounded-2xl border p-3.5 text-left transition-colors ${selected?.id === u.id ? "border-[#0d6b57] bg-emerald-50/70 shadow-sm" : "border-slate-200 bg-white/70 hover:border-slate-300"}`}>
                  <div className="flex items-start gap-2.5"><span className="mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-xl bg-white shadow-sm"><Icon className={`h-4 w-4 ${meta.accent}`} /></span><span className="min-w-0"><strong className="block truncate text-sm text-[#082b23]">{u.title}</strong><small className="mt-1 block text-slate-500">{u.period_label || (u.published_at ? new Date(u.published_at).toLocaleDateString() : "")}</small></span></div>
                </button>
              );
            })}
          </div>
          <Card className="border-0 bg-transparent shadow-none">
            <CardContent className="p-0">
              {selected && <ClientUpdateView update={selected} />}
            </CardContent>
          </Card>
          <div className="xl:sticky xl:top-4 xl:self-start">
            <ClientNoteBox projectId={projectId} />
          </div>
        </div>
      )}
    </div>
  );
}
