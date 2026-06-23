/**
 * AssistantPanel — the financial assistant chat drawer. Ask in text or by voice
 * (VoiceDictation → elevenlabs-transcribe), get answers grounded in this project's
 * live financials via the assistant-chat edge function. Optional spoken answers.
 */
import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VoiceDictation } from "@/components/ui/voice-dictation";
import { Sparkles, Send, Volume2, VolumeX, RotateCcw, Loader2, Bot, User } from "lucide-react";
import { useAssistant } from "@/hooks/useAssistant";
import { cn } from "@/lib/utils";

const GC_PROMPTS = [
  "What's my cash position?",
  "Which pay apps are still unpaid?",
  "How much retainage is being held?",
  "What does the owner still owe us?",
  "Show me pending change orders",
  "How much have we paid each subcontractor?",
];
const OWNER_PROMPTS = [
  "How much is left on my contract?",
  "What change orders have I approved?",
  "How much retainage is being held?",
  "What's the status of the latest pay application?",
  "How much have I been billed to date?",
  "Are there any change orders awaiting my approval?",
];

export function AssistantPanel({
  projectId, projectName, open, onOpenChange, audience = "gc",
}: { projectId: string; projectName?: string; open: boolean; onOpenChange: (v: boolean) => void; audience?: "gc" | "owner" }) {
  const { messages, isLoading, send, reset } = useAssistant(projectId, audience);
  const PROMPTS = audience === "owner" ? OWNER_PROMPTS : GC_PROMPTS;
  const [input, setInput] = useState("");
  const [speak, setSpeak] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const spokenRef = useRef(0);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  // Speak the latest assistant reply when voice-answers is on.
  useEffect(() => {
    if (!speak || !messages.length) return;
    const last = messages[messages.length - 1];
    if (last.role === "assistant" && messages.length > spokenRef.current && typeof window !== "undefined" && "speechSynthesis" in window) {
      spokenRef.current = messages.length;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(last.content.replace(/[*#⚠️]/g, "")));
    }
  }, [messages, speak]);

  function submit(text: string) {
    const t = text.trim();
    if (!t || isLoading) return;
    setInput("");
    send(t);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[440px] p-0 flex flex-col gap-0">
        <SheetHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-[var(--apas-sapphire)]" /> Financial Assistant
            </SheetTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" title={speak ? "Mute answers" : "Speak answers"}
                onClick={() => { setSpeak((s) => !s); if (speak) window.speechSynthesis?.cancel(); }}>
                {speak ? <Volume2 className="h-4 w-4 text-[var(--apas-sapphire)]" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="New chat"
                onClick={() => { reset(); spokenRef.current = 0; window.speechSynthesis?.cancel(); }}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {projectName && <p className="text-xs text-muted-foreground text-left">{projectName} · live financials</p>}
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Ask me about this project's contract, billings, change orders, cash flow, retainage or subcontractors.
              </div>
              <div className="flex flex-wrap gap-2">
                {PROMPTS.map((p) => (
                  <button key={p} onClick={() => submit(p)}
                    className="text-xs px-2.5 py-1.5 rounded-full border border-[var(--apas-sapphire)]/30 text-[var(--apas-sapphire)] hover:bg-[var(--apas-sapphire)]/10 transition-colors">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cn("flex gap-2 text-sm", m.role === "user" && "flex-row-reverse")}>
              <div className={cn("h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0",
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)]")}>
                {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className={cn("rounded-lg px-3 py-2 max-w-[80%] whitespace-pre-wrap leading-relaxed",
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2 text-sm">
              <div className="h-7 w-7 rounded-full bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)] flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-lg px-3 py-2 bg-muted flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
              </div>
            </div>
          )}
        </div>

        <div className="border-t p-3">
          <form onSubmit={(e) => { e.preventDefault(); submit(input); }} className="flex items-center gap-2">
            <VoiceDictation onTranscript={(t) => submit(t)} disabled={isLoading} />
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about the finances…"
              disabled={isLoading} className="flex-1" />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            Read-only · grounded in this project's data. Verify figures before acting.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
