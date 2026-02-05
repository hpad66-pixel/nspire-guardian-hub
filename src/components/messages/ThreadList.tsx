import { useMemo } from "react";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MessageCircle, Search } from "lucide-react";
import type { ThreadWithLastMessage } from "@/hooks/useMessageThreads";

interface ThreadListProps {
  threads: ThreadWithLastMessage[];
  selectedThreadId?: string;
  onSelectThread: (threadId: string) => void;
  isLoading: boolean;
  currentUserId?: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function ThreadList({
  threads,
  selectedThreadId,
  onSelectThread,
  isLoading,
  currentUserId,
  searchQuery,
  onSearchChange,
}: ThreadListProps) {
  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    const query = searchQuery.toLowerCase();
    return threads.filter((thread) => {
      const subjectMatch = thread.subject?.toLowerCase().includes(query);
      const participantMatch = thread.participants?.some((p) =>
        (p.full_name || "").toLowerCase().includes(query)
      );
      const lastMessageMatch = thread.last_message?.content
        ?.toLowerCase()
        .includes(query);
      return subjectMatch || participantMatch || lastMessageMatch;
    });
  }, [threads, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex-1 p-3 space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (filteredThreads.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <MessageCircle className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {threads.length === 0 ? "No conversations yet" : "No results"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {threads.length === 0
                ? "Start a new conversation to connect with your team"
                : "Try a different search query"}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          <AnimatePresence>
          {filteredThreads.map((thread, index) => (
            <motion.div
              key={thread.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <ThreadListItem
                thread={thread}
                isSelected={thread.id === selectedThreadId}
                onClick={() => onSelectThread(thread.id)}
                currentUserId={currentUserId}
              />
            </motion.div>
          ))}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}

interface ThreadListItemProps {
  thread: ThreadWithLastMessage;
  isSelected: boolean;
  onClick: () => void;
  currentUserId?: string;
}

function ThreadListItem({
  thread,
  isSelected,
  onClick,
  currentUserId,
}: ThreadListItemProps) {
  // Get other participants (not current user)
  const otherParticipants = thread.participants?.filter(
    (p) => p.user_id !== currentUserId
  );

  // Get display name for the thread
  const displayName = otherParticipants?.length
    ? otherParticipants.length === 1
      ? otherParticipants[0].full_name || "Unknown"
      : `${otherParticipants[0].full_name || "Unknown"} +${otherParticipants.length - 1}`
    : thread.subject;

  // Get initials for avatar
  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Format time for display
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, "h:mm a");
    }
    if (isYesterday(date)) {
      return "Yesterday";
    }
    if (isThisWeek(date)) {
      return format(date, "EEE");
    }
    return format(date, "MMM d");
  };

  // Truncate last message
  const lastMessagePreview = thread.last_message?.content
    ? thread.last_message.content.length > 45
      ? thread.last_message.content.slice(0, 45) + "..."
      : thread.last_message.content
    : "No messages yet";

  // Check if last message was from current user
  const isOwnMessage = thread.last_message?.sender_id === currentUserId;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 p-3 text-left rounded-xl transition-all duration-200",
        "hover:bg-accent/50 active:scale-[0.98]",
        isSelected && "bg-accent/80 shadow-sm"
      )}
    >
      {/* Avatar with online indicator styling */}
      <div className="relative flex-shrink-0">
        {thread.is_group ? (
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/30 flex items-center justify-center shadow-sm border border-border/30">
            <span className="text-sm font-bold text-primary">
              {otherParticipants?.length || 0}
            </span>
          </div>
        ) : (
          <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
            <AvatarImage src={otherParticipants?.[0]?.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-semibold">
              {getInitials(otherParticipants?.[0]?.full_name || null)}
            </AvatarFallback>
          </Avatar>
        )}
        {/* Online indicator dot */}
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-foreground truncate">{displayName}</span>
          <span className="text-[11px] font-medium text-muted-foreground flex-shrink-0">
            {formatTime(thread.last_message_at)}
          </span>
        </div>
        <p className="text-sm font-medium text-primary/80 truncate mt-0.5">
          {thread.subject}
        </p>
        <p className="text-sm text-muted-foreground truncate mt-0.5">
          {isOwnMessage && <span className="font-medium text-foreground/70">You: </span>}
          {lastMessagePreview}
        </p>
      </div>
    </button>
  );
}
