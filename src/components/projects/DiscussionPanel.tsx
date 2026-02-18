import { useState, useRef, useEffect, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { format, isToday, isYesterday, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquarePlus,
  X,
  CalendarDays,
  List,
  Pin,
  Send,
  ArrowLeft,
  LinkIcon,
  MessageCircle,
  Sparkles,
  ImagePlus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MentionTextarea } from "./MentionTextarea";
import { useCreateNotification } from "@/hooks/useNotifications";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  useProjectDiscussions,
  useDiscussionReplies,
  useCreateDiscussion,
  useCreateReply,
  useDiscussionRealtime,
  type DiscussionWithDetails,
} from "@/hooks/useProjectDiscussions";
import { useAuth } from "@/hooks/useAuth";

interface DiscussionPanelProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

type View = "list" | "calendar" | "thread" | "new";

async function uploadAttachment(file: File, projectId: string): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${projectId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("discussion-attachments")
    .upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage
    .from("discussion-attachments")
    .getPublicUrl(path);
  return data.publicUrl;
}

export function DiscussionPanel({ projectId, open, onClose }: DiscussionPanelProps) {
  const isMobile = useIsMobile();
  const [view, setView] = useState<View>("list");
  const [selectedDiscussion, setSelectedDiscussion] = useState<DiscussionWithDetails | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [newAttachments, setNewAttachments] = useState<string[]>([]);
  const [replyAttachments, setReplyAttachments] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingReply, setIsUploadingReply] = useState(false);
  const [newMentionIds, setNewMentionIds] = useState<string[]>([]);
  const [replyMentionIds, setReplyMentionIds] = useState<string[]>([]);

  const { user } = useAuth();
  const { data: discussions = [], isLoading } = useProjectDiscussions(projectId);
  const { data: replies = [] } = useDiscussionReplies(selectedDiscussion?.id ?? null);
  const createDiscussion = useCreateDiscussion();
  const createReply = useCreateReply();
  const createNotification = useCreateNotification();
  useDiscussionRealtime(projectId);

  const bottomRef = useRef<HTMLDivElement>(null);
  const newFileRef = useRef<HTMLInputElement>(null);
  const replyFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (bottomRef.current && view === "thread") {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [replies.length, view]);

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "MMM d");
  };

  const getInitials = (name: string | null) =>
    name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  const discussionsByDate = new Map<string, DiscussionWithDetails[]>();
  discussions.forEach((d) => {
    const key = format(new Date(d.created_at), "yyyy-MM-dd");
    if (!discussionsByDate.has(key)) discussionsByDate.set(key, []);
    discussionsByDate.get(key)!.push(d);
  });

  const filteredDiscussions = selectedDate
    ? discussions.filter((d) => isSameDay(new Date(d.created_at), selectedDate))
    : discussions;

  const handleFileUpload = useCallback(async (
    files: FileList | null,
    target: "new" | "reply"
  ) => {
    if (!files || files.length === 0) return;
    const setter = target === "new" ? setNewAttachments : setReplyAttachments;
    const setLoading = target === "new" ? setIsUploading : setIsUploadingReply;
    setLoading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadAttachment(file, projectId);
        urls.push(url);
      }
      setter((prev) => [...prev, ...urls]);
    } catch (err) {
      toast.error("Failed to upload file");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const handleCreateDiscussion = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    await createDiscussion.mutateAsync({
      projectId,
      title: newTitle.trim(),
      content: newContent.trim(),
      attachments: newAttachments.length > 0 ? newAttachments : undefined,
    });
    // Notify mentioned users (including self for reminders)
    for (const userId of newMentionIds) {
      await createNotification.mutateAsync({
        userId,
        type: "mention",
        title: userId === user?.id ? `Reminder: "${newTitle.trim()}"` : `You were tagged in a discussion`,
        message: `"${newTitle.trim()}" — respond in the project discussions.`,
        entityType: "project",
        entityId: projectId,
      });
    }
    setNewTitle("");
    setNewContent("");
    setNewAttachments([]);
    setNewMentionIds([]);
    setView("list");
  };

  const handleReply = async () => {
    if ((!replyContent.trim() && replyAttachments.length === 0) || !selectedDiscussion) return;
    await createReply.mutateAsync({
      discussionId: selectedDiscussion.id,
      projectId,
      content: replyContent.trim() || "(photo)",
      attachments: replyAttachments.length > 0 ? replyAttachments : undefined,
    });
    // Notify mentioned users (including self for reminders)
    for (const userId of replyMentionIds) {
      await createNotification.mutateAsync({
        userId,
        type: "mention",
        title: userId === user?.id ? `Reminder in "${selectedDiscussion.title}"` : `You were tagged in "${selectedDiscussion.title}"`,
        message: `${replyContent.trim().slice(0, 100)}${replyContent.trim().length > 100 ? "..." : ""}`,
        entityType: "project",
        entityId: projectId,
      });
    }
    setReplyContent("");
    setReplyAttachments([]);
    setReplyMentionIds([]);
  };

  const openThread = (discussion: DiscussionWithDetails) => {
    setSelectedDiscussion(discussion);
    setView("thread");
  };

  const calendarDays = eachDayOfInterval({
    start: startOfMonth(calendarMonth),
    end: endOfMonth(calendarMonth),
  });

  const startDayOfWeek = startOfMonth(calendarMonth).getDay();

  if (!open) return null;

  const panelContent = (
    <div className="w-full bg-background flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          {view === "thread" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => { setView(selectedDate ? "calendar" : "list"); setSelectedDiscussion(null); }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          {view === "new" && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setView("list")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h3 className="font-semibold text-sm">
            {view === "thread" ? "Thread" : view === "new" ? "New Discussion" : "Discussions"}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {view !== "thread" && view !== "new" && (
            <>
              <Button
                variant={view === "list" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => { setView("list"); setSelectedDate(null); }}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "calendar" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setView("calendar")}
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setView("new")}>
                <MessageSquarePlus className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <AnimatePresence mode="wait">
          {/* NEW DISCUSSION */}
          {view === "new" && (
            <motion.div
              key="new"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 space-y-4"
            >
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Topic</label>
                <Input
                  placeholder="Discussion topic..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Message <span className="text-muted-foreground/60 font-normal">· Type @ to tag someone</span></label>
                <MentionTextarea
                  placeholder="Start the conversation... Type @ to tag a team member"
                  value={newContent}
                  onChange={setNewContent}
                  onMentionsChange={setNewMentionIds}
                  rows={5}
                  className="min-h-[100px]"
                />
              </div>

              {/* Attachment previews */}
              {newAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {newAttachments.map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt="" className="h-16 w-16 object-cover rounded-lg border border-border" />
                      <button
                        type="button"
                        onClick={() => setNewAttachments((a) => a.filter((_, j) => j !== i))}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  ref={newFileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files, "new")}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => newFileRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4 mr-1.5" />
                  )}
                  Add Photo
                </Button>
              </div>

              <Button
                onClick={handleCreateDiscussion}
                disabled={!newTitle.trim() || !newContent.trim() || createDiscussion.isPending}
                className="w-full"
              >
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                {createDiscussion.isPending ? "Posting..." : "Start Discussion"}
              </Button>
            </motion.div>
          )}

          {/* CALENDAR VIEW */}
          {view === "calendar" && (
            <motion.div
              key="calendar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))
                  }
                >
                  ←
                </Button>
                <span className="text-sm font-semibold">{format(calendarMonth, "MMMM yyyy")}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))
                  }
                >
                  →
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <div key={d} className="text-[10px] font-medium text-muted-foreground py-1">
                    {d}
                  </div>
                ))}
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {calendarDays.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const count = discussionsByDate.get(key)?.length || 0;
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isTodayDate = isToday(day);

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDate(isSelected ? null : day)}
                      className={cn(
                        "relative h-9 w-full rounded-md text-xs transition-all",
                        "hover:bg-accent/50",
                        isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                        isTodayDate && !isSelected && "bg-accent font-bold",
                        count > 0 && !isSelected && "font-medium"
                      )}
                    >
                      {format(day, "d")}
                      {count > 0 && (
                        <span
                          className={cn(
                            "absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full",
                            isSelected ? "bg-primary-foreground" : "bg-primary"
                          )}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <Separator />

              {selectedDate && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    {format(selectedDate, "EEEE, MMMM d")} — {filteredDiscussions.length} discussion
                    {filteredDiscussions.length !== 1 ? "s" : ""}
                  </p>
                  {filteredDiscussions.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-4 text-center">
                      No discussions on this date
                    </p>
                  ) : (
                    filteredDiscussions.map((d) => (
                      <DiscussionItem key={d.id} discussion={d} onClick={() => openThread(d)} getInitials={getInitials} />
                    ))
                  )}
                </div>
              )}

              {!selectedDate && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Tap a date to view discussions
                </p>
              )}
            </motion.div>
          )}

          {/* LIST VIEW */}
          {view === "list" && (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-2"
            >
              {isLoading ? (
                <div className="space-y-3 p-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />
                  ))}
                </div>
              ) : discussions.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Sparkles className="h-7 w-7 text-primary/60" />
                  </div>
                  <p className="font-medium text-sm">No discussions yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start a conversation about this project
                  </p>
                  <Button size="sm" className="mt-4" onClick={() => setView("new")}>
                    <MessageSquarePlus className="h-4 w-4 mr-1.5" />
                    New Discussion
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {discussions.map((d) => (
                    <DiscussionItem key={d.id} discussion={d} onClick={() => openThread(d)} getInitials={getInitials} />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* THREAD VIEW */}
          {view === "thread" && selectedDiscussion && (
            <motion.div
              key="thread"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col"
            >
              {/* Original post */}
              <div className="p-4 border-b bg-muted/20">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 mt-0.5">
                    <AvatarImage src={selectedDiscussion.author?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {getInitials(selectedDiscussion.author?.full_name ?? null)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">
                        {selectedDiscussion.author?.full_name || "Unknown"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDateLabel(selectedDiscussion.created_at)} ·{" "}
                        {format(new Date(selectedDiscussion.created_at), "h:mm a")}
                      </span>
                      {selectedDiscussion.is_pinned && (
                        <Pin className="h-3 w-3 text-amber-500" />
                      )}
                    </div>
                    <h4 className="text-sm font-semibold mt-1">{selectedDiscussion.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {selectedDiscussion.content}
                    </p>
                    {/* Original post attachments */}
                    <AttachmentGallery attachments={(selectedDiscussion as any).attachments} />
                    {selectedDiscussion.linked_entity_type && (
                      <Badge variant="outline" className="mt-2 text-[10px] gap-1">
                        <LinkIcon className="h-2.5 w-2.5" />
                        {selectedDiscussion.linked_entity_type}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Replies */}
              <div className="p-4 space-y-4">
                {replies.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No replies yet. Be the first to respond.
                  </p>
                ) : (
                  replies.map((reply) => (
                    <div key={reply.id} className="flex items-start gap-3">
                      <Avatar className="h-7 w-7 mt-0.5">
                        <AvatarImage src={reply.author?.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px] bg-accent text-accent-foreground">
                          {getInitials(reply.author?.full_name ?? null)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">
                            {reply.author?.full_name || "Unknown"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDateLabel(reply.created_at)} ·{" "}
                            {format(new Date(reply.created_at), "h:mm a")}
                          </span>
                          {reply.is_edited && (
                            <span className="text-[10px] text-muted-foreground italic">(edited)</span>
                          )}
                        </div>
                        {reply.content && reply.content !== "(photo)" && (
                          <p className="text-sm mt-0.5 whitespace-pre-wrap">{reply.content}</p>
                        )}
                        <AttachmentGallery attachments={(reply as any).attachments} />
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </ScrollArea>

      {/* Reply composer (thread view) — prominent and always visible */}
      {view === "thread" && selectedDiscussion && (
        <div className="border-t bg-card p-3 space-y-2 shadow-[0_-2px_10px_-3px_hsl(var(--foreground)/0.06)]">
          {/* Reply attachment previews */}
          {replyAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-1">
              {replyAttachments.map((url, i) => (
                <div key={i} className="relative group">
                  <img src={url} alt="" className="h-14 w-14 object-cover rounded-lg border border-border" />
                  <button
                    type="button"
                    onClick={() => setReplyAttachments((a) => a.filter((_, j) => j !== i))}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={replyFileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files, "reply")}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => replyFileRef.current?.click()}
              disabled={isUploadingReply}
            >
              {isUploadingReply ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
            </Button>
            <MentionTextarea
              placeholder="Reply... Type @ to tag someone"
              value={replyContent}
              onChange={setReplyContent}
              onMentionsChange={setReplyMentionIds}
              rows={2}
              className="min-h-[44px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleReply();
                }
              }}
            />
            <Button
              size="icon"
              className="h-9 w-9 shrink-0"
              disabled={(!replyContent.trim() && replyAttachments.length === 0) || createReply.isPending}
              onClick={handleReply}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">⌘+Enter to send · 📷 attach photos · @ tag team members</p>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <SheetContent side="bottom" className="h-[85vh] p-0 rounded-t-xl overflow-hidden flex flex-col">
          {panelContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="w-full bg-background flex flex-col h-full overflow-hidden border-l">
      {panelContent}
    </div>
  );
}

// Attachment gallery
function AttachmentGallery({ attachments }: { attachments?: string[] | null }) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {attachments.map((url, i) => (
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-lg overflow-hidden border border-border hover:border-accent transition-colors"
        >
          <img src={url} alt="" className="h-24 w-24 object-cover" />
        </a>
      ))}
    </div>
  );
}

// Discussion list item
function DiscussionItem({
  discussion,
  onClick,
  getInitials,
}: {
  discussion: DiscussionWithDetails;
  onClick: () => void;
  getInitials: (name: string | null) => string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3.5 rounded-xl border border-border/60 hover:border-accent/40 hover:shadow-sm bg-card transition-all group mb-1"
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8 mt-0.5 ring-2 ring-background shadow-sm">
          <AvatarImage src={discussion.author?.avatar_url || undefined} />
          <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
            {getInitials(discussion.author?.full_name ?? null)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {discussion.is_pinned && <Pin className="h-3 w-3 text-amber-500 shrink-0" />}
            <span className="text-sm font-semibold text-foreground truncate">{discussion.title}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-3 leading-relaxed">{discussion.content}</p>
          {/* Show attachment indicator */}
          {(discussion as any).attachments?.length > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <ImagePlus className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{(discussion as any).attachments.length} photo(s)</span>
            </div>
          )}
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/40">
            <span className="text-[10px] text-muted-foreground font-medium">
              {discussion.author?.full_name || "Unknown"}
            </span>
            <span className="text-[10px] text-muted-foreground/60">
              {format(new Date(discussion.created_at), "MMM d, h:mm a")}
            </span>
            {discussion.reply_count > 0 && (
              <span className="text-[10px] text-accent font-medium flex items-center gap-0.5 ml-auto">
                <MessageCircle className="h-3 w-3" />
                {discussion.reply_count} {discussion.reply_count === 1 ? 'reply' : 'replies'}
              </span>
            )}
            {discussion.linked_entity_type && (
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-muted/50">
                <LinkIcon className="h-2 w-2 mr-0.5" />
                {discussion.linked_entity_type}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
