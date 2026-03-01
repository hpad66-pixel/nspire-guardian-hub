import { useState, useMemo } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, MapPin, Mail, StickyNote, MoreHorizontal,
  X, Plus, Sparkles, Loader2, Mic, MicOff, Trash2, ChevronDown,
  Search, Filter, Activity, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  meeting:       <Users className="h-3.5 w-3.5" />,
  note:          <StickyNote className="h-3.5 w-3.5" />,
  other:         <StickyNote className="h-3.5 w-3.5" />,
};

const TYPE_COLORS: Record<UICommType, { badge: string; dot: string; timeline: string }> = {
  call:          { badge: "bg-blue-500/10 text-blue-600 border-blue-500/20",    dot: "bg-blue-500",   timeline: "border-blue-400/40" },
  site_visit:    { badge: "bg-success/10 text-success border-success/20",        dot: "bg-success",    timeline: "border-success/40" },
  email_summary: { badge: "bg-module-projects/10 text-module-projects border-module-projects/20", dot: "bg-module-projects", timeline: "border-module-projects/40" },
  meeting:       { badge: "bg-purple-500/10 text-purple-600 border-purple-500/20", dot: "bg-purple-500", timeline: "border-purple-400/40" },
  note:          { badge: "bg-warning/10 text-warning border-warning/20",        dot: "bg-warning",    timeline: "border-warning/40" },
  other:         { badge: "bg-muted text-muted-foreground border-border",        dot: "bg-muted-foreground", timeline: "border-border" },
};

const ALL_TYPES: UICommType[] = ['call', 'site_visit', 'email_summary', 'meeting', 'note', 'other'];

function groupByDay(comms: ProjectComm[]) {
  const groups: { label: string; date: string; items: ProjectComm[] }[] = [];
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
    groups.push({ label, date: key, items });
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

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<UICommType | 'all'>('all');

  const filteredComms = useMemo(() => {
    return comms.filter(c => {
      const matchesType = filterType === 'all' || c.uiType === filterType;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        c.subject.toLowerCase().includes(q) ||
        (c.content?.toLowerCase().includes(q) ?? false);
      return matchesType && matchesSearch;
    });
  }, [comms, filterType, searchQuery]);

  const groups = groupByDay(filteredComms);

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
    const polished = await polish(fullText, { context: 'notes', model: 'google/gemini-3-flash-preview' });
    if (polished) {
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
    if (!SpeechRecognitionCtor) { toast.error("Speech recognition not supported in this browser"); return; }
    const rec = new SpeechRecognitionCtor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results).slice(e.resultIndex).map(r => r[0].transcript).join(" ");
      setContent(prev => (prev ? prev + " " + transcript : transcript).trim());
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    rec.start();
    setRecognition(rec);
    setIsListening(true);
  };

  const stopListening = () => { recognition?.stop(); setRecognition(null); setIsListening(false); };
  const toggleListening = () => { if (isListening) stopListening(); else startListening(); };

  if (!open) return null;

  return (
    <div className="w-full bg-background flex flex-col h-full overflow-hidden border-l">
      {/* ── Header ── */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b bg-gradient-to-br from-module-projects/5 to-background">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-module-projects/10 flex items-center justify-center">
              <Activity className="h-4 w-4 text-module-projects" />
            </div>
            <div>
              <h3 className="font-semibold text-sm leading-none">Activity Feed</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {filteredComms.length} of {comms.length} updates
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" className="h-7 text-xs gap-1 bg-module-projects hover:bg-module-projects/90 text-white" onClick={() => setComposing(true)}>
              <Plus className="h-3.5 w-3.5" /> Log
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search updates…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs bg-muted/40 border-border/60"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setFilterType('all')}
            className={cn(
              "px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition-all",
              filterType === 'all'
                ? "bg-module-projects text-white border-module-projects"
                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
            )}
          >
            All
          </button>
          {ALL_TYPES.map(type => {
            const { label } = COMM_TYPE_LABELS[type];
            const colors = TYPE_COLORS[type];
            const isActive = filterType === type;
            return (
              <button
                key={type}
                onClick={() => setFilterType(isActive ? 'all' : type)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition-all",
                  isActive ? colors.badge + " ring-1 ring-current/30" : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                )}
              >
                {TYPE_ICONS[type]}
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Compose Form ── */}
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
            <div className="p-4 space-y-3 bg-module-projects/3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">New Update</p>

              {/* Type selector */}
              <div className="flex flex-wrap gap-1.5">
                {(Object.entries(COMM_TYPE_LABELS) as [UICommType, { label: string }][]).map(([key, { label }]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedType(key)}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                      selectedType === key
                        ? TYPE_COLORS[key].badge + " ring-2 ring-offset-1 ring-current/20"
                        : "bg-background border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {TYPE_ICONS[key]}
                    {label}
                  </button>
                ))}
              </div>

              {/* Subject */}
              <Input
                placeholder="Subject — e.g. Call with Al Detburn, site update"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="text-sm h-8 bg-background"
              />

              {/* Details */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-medium text-muted-foreground">Details</p>
                  <button
                    onClick={toggleListening}
                    className={cn(
                      "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-all",
                      isListening ? "bg-destructive/10 text-destructive animate-pulse" : "text-muted-foreground hover:text-foreground"
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
                  className="text-sm min-h-[80px] resize-none bg-background"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm" variant="outline" className="h-7 text-xs gap-1"
                  onClick={handlePolish}
                  disabled={isPolishing || (!subject && !content)}
                >
                  {isPolishing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-module-projects" />}
                  Polish with AI
                </Button>
                <div className="flex-1" />
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={resetForm}>Cancel</Button>
                <Button
                  size="sm" className="h-7 text-xs bg-module-projects hover:bg-module-projects/90 text-white"
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

      {/* ── Feed ── */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {isLoading ? (
            <div className="space-y-4 pt-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted/60 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted/60 rounded animate-pulse w-3/4" />
                    <div className="h-12 bg-muted/40 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="py-16 text-center">
              <div className="h-14 w-14 rounded-2xl bg-module-projects/10 flex items-center justify-center mx-auto mb-4">
                <Activity className="h-7 w-7 text-module-projects/60" />
              </div>
              <p className="text-sm font-semibold text-foreground/70">
                {searchQuery || filterType !== 'all' ? "No matching updates" : "No updates yet"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery || filterType !== 'all' ? "Try a different filter or search term" : "Log a call, site visit, or quick note"}
              </p>
              {!searchQuery && filterType === 'all' && (
                <Button size="sm" variant="outline" className="mt-4 h-7 text-xs gap-1" onClick={() => setComposing(true)}>
                  <Plus className="h-3.5 w-3.5" /> Log first update
                </Button>
              )}
            </div>
          ) : (
            groups.map(({ label, items }) => (
              <div key={label}>
                {/* Day divider */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-border/60" />
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-2 py-0.5 bg-muted/50 rounded-full border border-border/50">
                    {label}
                  </span>
                  <div className="h-px flex-1 bg-border/60" />
                </div>

                {/* Timeline items */}
                <div className="relative pl-6">
                  {/* Vertical line */}
                  <div className="absolute left-[11px] top-1 bottom-1 w-px bg-border/60" />

                  <div className="space-y-3">
                    {items.map((comm, idx) => (
                      <CommCard
                        key={comm.id}
                        comm={comm}
                        isFirst={idx === 0}
                        onDelete={() => deleteComm.mutate(comm.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function CommCard({ comm, isFirst, onDelete }: { comm: ProjectComm; isFirst: boolean; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const uiType = (comm.uiType ?? 'note') as UICommType;
  const { label } = COMM_TYPE_LABELS[uiType] ?? { label: 'Note' };
  const colors = TYPE_COLORS[uiType];
  const hasContent = comm.content && comm.content.trim().length > 0;
  const isLong = hasContent && comm.content!.length > 140;

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className="relative"
    >
      {/* Timeline dot */}
      <div className={cn(
        "absolute -left-6 top-3.5 h-4 w-4 rounded-full border-2 border-background flex items-center justify-center",
        colors.dot
      )}>
        <div className="h-1.5 w-1.5 rounded-full bg-white/80" />
      </div>

      {/* Card */}
      <div className={cn(
        "rounded-xl border bg-card p-3.5 space-y-2 hover:shadow-md transition-all duration-200 group",
        "border-l-2",
        colors.timeline
      )}>
        {/* Top row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0", colors.badge)}>
              {TYPE_ICONS[uiType]}
              {label}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {format(new Date(comm.created_at), "h:mm a")}
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity -mt-0.5 -mr-1">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem className="text-destructive focus:text-destructive text-xs gap-2" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Subject */}
        <p className="text-sm font-semibold leading-snug">{comm.subject}</p>

        {/* Content */}
        {hasContent && (
          <div>
            <p className={cn("text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap", !expanded && isLong && "line-clamp-3")}>
              {comm.content}
            </p>
            {isLong && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="flex items-center gap-0.5 text-[10px] text-module-projects mt-1.5 hover:underline font-medium"
              >
                {expanded ? "Show less" : "Show more"}
                <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
