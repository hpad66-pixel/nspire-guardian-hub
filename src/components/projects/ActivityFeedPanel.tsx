import { useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, MapPin, Mail, StickyNote, MoreHorizontal,
  X, Plus, Sparkles, Loader2, Mic, MicOff, Trash2, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useProjectCommunications,
  COMM_TYPE_LABELS,
  type UICommType,
  type ProjectComm,
} from "@/hooks/useProjectCommunications";
import { useTextPolish } from "@/hooks/useTextPolish";

interface ActivityFeedPanelProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

const TYPE_ICONS: Record<UICommType, React.ReactNode> = {
  call:          <Phone className="h-3.5 w-3.5" />,
  site_visit:    <MapPin className="h-3.5 w-3.5" />,
  email_summary: <Mail className="h-3.5 w-3.5" />,
  note:          <StickyNote className="h-3.5 w-3.5" />,
  other:         <StickyNote className="h-3.5 w-3.5" />,
};

const TYPE_COLORS: Record<UICommType, string> = {
  call:          "bg-blue-500/10 text-blue-600 border-blue-500/20",
  site_visit:    "bg-green-500/10 text-green-600 border-green-500/20",
  email_summary: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  note:          "bg-amber-500/10 text-amber-600 border-amber-500/20",
  other:         "bg-muted text-muted-foreground border-border",
};

function groupByDay(comms: ProjectComm[]) {
  const groups: { label: string; items: ProjectComm[] }[] = [];
  const map = new Map<string, ProjectComm[]>();

  for (const c of comms) {
    const key = format(new Date(c.created_at), "yyyy-MM-dd");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  }

  for (const [key, items] of map) {
    const d = new Date(key);
    let label: string;
    if (isToday(d)) label = "Today";
    else if (isYesterday(d)) label = "Yesterday";
    else label = format(d, "EEEE, MMMM d");
    groups.push({ label, items });
  }

  return groups;
}

type UICommTypeOrEmpty = UICommType | '';

export function ActivityFeedPanel({ projectId, open, onClose }: ActivityFeedPanelProps) {
  const { comms, isLoading, createComm, deleteComm } = useProjectCommunications(projectId);
  const { polish, isPolishing } = useTextPolish();

  const [composing, setComposing] = useState(false);
  const [selectedType, setSelectedType] = useState<UICommTypeOrEmpty>('');
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [isListening, setIsListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [recognition, setRecognition] = useState<any | null>(null);

  const groups = groupByDay(comms);

  const resetForm = () => {
    setComposing(false);
    setSelectedType('');
    setSubject("");
    setContent("");
    stopListening();
  };

  const handleSubmit = async () => {
    if (!selectedType || !subject.trim()) {
      toast.error("Please select a type and enter a subject");
      return;
    }
    await createComm.mutateAsync({
      uiType: selectedType as UICommType,
      subject: subject.trim(),
      content: content.trim() || undefined,
    });
    resetForm();
  };

  const handlePolish = async () => {
    const fullText = `Subject: ${subject}\n\n${content}`;
    const polished = await polish(fullText, "notes");
    if (polished) {
      // Try to split back into subject/content
      const lines = polished.split("\n");
      const subjectLine = lines.find(l => l.toLowerCase().startsWith("subject:"));
      if (subjectLine) {
        setSubject(subjectLine.replace(/^subject:\s*/i, "").trim());
        const rest = lines.filter(l => l !== subjectLine).join("\n").trim();
        if (rest) setContent(rest);
      } else {
        setContent(polished);
      }
    }
  };

  const startListening = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }
    const rec = new SpeechRecognitionCtor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results)
        .slice(e.resultIndex)
        .map(r => r[0].transcript)
        .join(" ");
      setContent(prev => (prev ? prev + " " + transcript : transcript).trim());
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    rec.start();
    setRecognition(rec);
    setIsListening(true);
  };

  const stopListening = () => {
    recognition?.stop();
    setRecognition(null);
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) stopListening();
    else startListening();
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ x: 380, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 380, opacity: 0 }}
      transition={{ type: "spring", damping: 26, stiffness: 300 }}
      className="w-[360px] border-l bg-background flex flex-col h-full overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
            <StickyNote className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm leading-none">Activity Feed</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">{comms.length} updates</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setComposing(true)}
          >
            <Plus className="h-3.5 w-3.5" /> Log Update
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Compose Form */}
      <AnimatePresence>
        {composing && (
          <motion.div
            key="compose"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b shrink-0"
          >
            <div className="p-4 space-y-3 bg-muted/20">
              {/* Type selector */}
              <div>
                <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Update Type</p>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.entries(COMM_TYPE_LABELS) as [UICommType, { label: string }][]).map(([key, { label }]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedType(key)}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                        selectedType === key
                          ? TYPE_COLORS[key] + " ring-2 ring-offset-1 ring-current/30"
                          : "bg-background border-border text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {TYPE_ICONS[key]}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Subject</p>
                <Input
                  placeholder="e.g. Call with Al Detburn — Glorieta update"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="text-sm h-8"
                />
              </div>

              {/* Details */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground">Details</p>
                  <button
                    onClick={toggleListening}
                    className={cn(
                      "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-all",
                      isListening
                        ? "bg-destructive/10 text-destructive animate-pulse"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {isListening ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                    {isListening ? "Stop" : "Dictate"}
                  </button>
                </div>
                <Textarea
                  placeholder="What happened? Who was involved? Any action items?"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="text-sm min-h-[80px] resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={handlePolish}
                  disabled={isPolishing || (!subject && !content)}
                >
                  {isPolishing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  Polish
                </Button>
                <div className="flex-1" />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={resetForm}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleSubmit}
                  disabled={createComm.isPending || !selectedType || !subject.trim()}
                >
                  {createComm.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feed */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-5">
          {isLoading ? (
            <div className="space-y-3 pt-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="py-12 text-center">
              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <StickyNote className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No updates yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Log a call, site visit, or quick note</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 h-7 text-xs gap-1"
                onClick={() => setComposing(true)}
              >
                <Plus className="h-3.5 w-3.5" /> Log first update
              </Button>
            </div>
          ) : (
            groups.map(({ label, items }) => (
              <div key={label}>
                {/* Day header */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
                    {label}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Items */}
                <div className="space-y-2">
                  {items.map(comm => (
                    <CommCard
                      key={comm.id}
                      comm={comm}
                      onDelete={() => deleteComm.mutate(comm.id)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
}

function CommCard({ comm, onDelete }: { comm: ProjectComm; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const uiType = (comm.uiType ?? 'note') as UICommType;
  const { label } = COMM_TYPE_LABELS[uiType] ?? { label: 'Note' };
  const hasContent = comm.content && comm.content.trim().length > 0;
  const isLong = hasContent && comm.content!.length > 120;

  return (
    <div className="rounded-lg border bg-card p-3 space-y-1.5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0", TYPE_COLORS[uiType])}>
            {TYPE_ICONS[uiType]}
            {label}
          </span>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {format(new Date(comm.created_at), "h:mm a")}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 -mt-0.5 -mr-1">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive text-xs gap-2"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="text-sm font-medium leading-snug">{comm.subject}</p>

      {hasContent && (
        <div>
          <p className={cn("text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap", !expanded && isLong && "line-clamp-2")}>
            {comm.content}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-0.5 text-[10px] text-primary mt-1 hover:underline"
            >
              {expanded ? "Show less" : "Show more"}
              <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
