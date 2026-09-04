import { FormEvent, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, Bot, Camera, CheckCircle2, ExternalLink, Loader2, RotateCcw,
  Send, ShieldCheck, Sparkles, Square, User,
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useProjectAgent } from "@/hooks/useProjectAgent";
import { BusinessCardScanDialog } from "@/components/crm/BusinessCardScanDialog";
import { CRM_CARD_SCAN_ENABLED } from "@/lib/crm/cardIntake";

const STARTERS = [
  "Show my open tasks",
  "What tasks are in progress?",
];

export function AgentPanel({
  projectId,
  projectName,
  open,
  onOpenChange,
}: {
  projectId: string;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const agent = useProjectAgent(projectId);
  const [input, setInput] = useState("");
  const [cardScanOpen, setCardScanOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [agent.messages, agent.progress]);

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const message = input.trim();
    if (!message || agent.isBusy) return;
    setInput("");
    void agent.send(message);
  }

  function sendStarter(message: string) {
    if (agent.isBusy) return;
    void agent.send(message);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px]">
        <SheetHeader className="border-b border-border/70 bg-background/95 px-5 py-4 pr-12 text-left backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)]">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <SheetTitle className="text-lg tracking-tight">Project Agent</SheetTitle>
            <Badge variant="outline" className="rounded-full border-emerald-500/25 bg-emerald-500/10 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              Read-only pilot
            </Badge>
          </div>
          <SheetDescription className="sr-only">
            Read-only project assistant for {projectName}
          </SheetDescription>
          <div className="grid gap-2 pt-1 text-xs">
            <div className="rounded-xl border border-border/60 bg-muted/35 px-3 py-2">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Project</span>
              <span className="block truncate font-medium text-foreground" title={projectName}>{projectName}</span>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/35 px-3 py-2">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Profile</span>
              <span className="block truncate font-medium text-foreground">
                {agent.profile?.displayName ?? "Assigned securely by Proj OS"}
              </span>
            </div>
          </div>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 sm:px-5">
          {agent.messages.length === 0 ? (
            <div className="mx-auto flex max-w-sm flex-col items-center py-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)]">
                <Bot className="h-7 w-7" aria-hidden="true" />
              </div>
              <h2 className="text-base font-semibold tracking-tight">What would you like to check?</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                I can read the task list for this project. I cannot create, update, approve, or send anything.
              </p>

              {!agent.isConfigured && (
                <div className="mt-4 flex w-full gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-left text-xs text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>This preview is visible, but its runtime connection has not been configured in this environment.</span>
                </div>
              )}

              <div className="mt-6 grid w-full gap-2">
                {STARTERS.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => sendStarter(starter)}
                    disabled={agent.isBusy || !agent.isConfigured}
                    className="rounded-xl border border-border/70 bg-background px-4 py-3 text-left text-sm font-medium shadow-sm transition-colors hover:border-[var(--apas-sapphire)]/35 hover:bg-[var(--apas-sapphire)]/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {starter}
                  </button>
                ))}
                {CRM_CARD_SCAN_ENABLED && (
                  <Button type="button" variant="outline" className="h-auto justify-start rounded-xl px-4 py-3" onClick={() => setCardScanOpen(true)}>
                    <Camera className="mr-2 h-4 w-4" /> Scan a business card
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {agent.messages.map((message) => (
                <article key={message.id} className={cn("flex gap-2.5", message.role === "user" && "flex-row-reverse")}>
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)]",
                  )}>
                    {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={cn("max-w-[84%]", message.role === "user" && "text-right")}>
                    <div className={cn(
                      "inline-block whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-left text-sm leading-relaxed",
                      message.role === "user"
                        ? "rounded-tr-md bg-primary text-primary-foreground"
                        : message.state === "error"
                          ? "rounded-tl-md border border-destructive/20 bg-destructive/5 text-foreground"
                          : "rounded-tl-md bg-muted/70 text-foreground",
                    )}>
                      {message.content || (
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparing a clear answer…
                        </span>
                      )}
                    </div>
                    {message.sources.length > 0 && (
                      <div className="mt-2 space-y-1 text-left">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Sources</p>
                        {message.sources.map((source) => (
                          <a
                            key={`${source.recordType}:${source.recordId}`}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2.5 py-2 text-xs font-medium text-[var(--apas-sapphire)] hover:bg-muted/40"
                          >
                            <span className="truncate">{source.label}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          {agent.approval && (
            <section className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4" aria-label="Approval preview">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
                <div>
                  <h3 className="text-sm font-semibold">Review required</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{agent.approval.summary}</p>
                  <p className="mt-2 text-xs font-medium">Writes are not enabled in this pilot, so no action was taken.</p>
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="border-t border-border/70 bg-background/95 px-4 py-3 backdrop-blur-xl sm:px-5">
          <div className="mb-2.5 flex items-center justify-between gap-3" aria-live="polite">
            <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              {agent.status === "complete" ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              ) : agent.isBusy ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--apas-sapphire)]" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[var(--apas-sapphire)]" />
              )}
              <span className="truncate">{agent.progress}</span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {agent.isBusy && (
                <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs" onClick={agent.cancel}>
                  <Square className="h-3 w-3 fill-current" /> Stop
                </Button>
              )}
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={agent.reset} title="Clear conversation" aria-label="Clear conversation">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <form onSubmit={submit} className="flex items-end gap-2">
            <label htmlFor="agent-message" className="sr-only">Message the project Agent</label>
            <Textarea
              id="agent-message"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
              placeholder="Ask about this project's tasks…"
              disabled={agent.isBusy || !agent.isConfigured}
              rows={1}
              className="min-h-11 max-h-28 resize-none rounded-xl"
            />
            <Button type="submit" size="icon" className="h-11 w-11 shrink-0 rounded-xl" disabled={agent.isBusy || !agent.isConfigured || !input.trim()} aria-label="Send message">
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
            <span>Memory off for this read-only pilot</span>
            <span>{agent.memories.length > 0 ? `${agent.memories.length} disclosed memory source${agent.memories.length === 1 ? "" : "s"}` : "No saved memory used"}</span>
          </div>
        </div>
      </SheetContent>
      {CRM_CARD_SCAN_ENABLED && (
        <BusinessCardScanDialog
          projects={[{ id: projectId, name: projectName }]}
          initialProjectId={projectId}
          open={cardScanOpen}
          onOpenChange={setCardScanOpen}
        />
      )}
    </Sheet>
  );
}
