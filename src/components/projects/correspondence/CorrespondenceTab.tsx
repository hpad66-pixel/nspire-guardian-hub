/**
 * CorrespondenceTab — a project's full correspondence trail: inbound emails
 * synced from Gmail and outbound branded letters drafted/sent from projOS, in one
 * timeline. This is the foundation view; Gmail connect + sync (PR3) and the
 * outbound composer (PR2) wire into the two entry points below.
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, ArrowDownLeft, ArrowUpRight, Paperclip, PenLine, Loader2, Inbox, Check } from "lucide-react";
import { toast } from "sonner";
import { useProjectEmails, type ProjectEmail } from "@/hooks/useProjectEmails";
import { useGmailConnection } from "@/hooks/useGmailConnection";
import { CorrespondenceComposer } from "./CorrespondenceComposer";

const fmtDate = (d: string) =>
  new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

function party(e: ProjectEmail): string {
  if (e.direction === "inbound") return e.from_name || e.from_email || "Unknown sender";
  const to = e.to_emails?.[0];
  return to ? `To ${to}${e.to_emails.length > 1 ? ` +${e.to_emails.length - 1}` : ""}` : "Outbound";
}

export function CorrespondenceTab({ projectId, projectName }: { projectId: string; projectName?: string | null }) {
  const { data: emails = [], isLoading } = useProjectEmails(projectId);
  const gmail = useGmailConnection();
  const [composeOpen, setComposeOpen] = useState(false);

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

  const counts = useMemo(() => ({
    inbound: emails.filter((e) => e.direction === "inbound").length,
    outbound: emails.filter((e) => e.direction === "outbound").length,
  }), [emails]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Mail className="h-5 w-5 text-[var(--apas-sapphire)]" /> Correspondence</h2>
          <p className="text-sm text-muted-foreground">
            Every email and letter with the client and agencies, in one trail — {counts.inbound} received · {counts.outbound} sent.
          </p>
        </div>
        <div className="flex gap-2">
          {connected ? (
            <Button variant="outline" size="sm" onClick={disconnectGmail} title="Gmail connected — click to disconnect" disabled={gmail.disconnect.isPending}>
              <Check className="h-4 w-4 mr-1 text-emerald-600" /> {gmail.status.data?.email}
            </Button>
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


      {/* Not-connected hint (until Gmail OAuth lands) */}
      {!isLoading && emails.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Inbox className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <div className="font-medium">No correspondence yet</div>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Connect your Gmail to pull in the R4 and City of Opa-Locka threads for this project, or compose a
              branded letter — everything you send and receive will be logged here as a complete trail.
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground p-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading correspondence…
        </div>
      )}

      {/* Timeline */}
      {emails.length > 0 && (
        <div className="space-y-2">
          {emails.map((e) => {
            const inbound = e.direction === "inbound";
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
