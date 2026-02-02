import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ThreadWithLastMessage } from "@/hooks/useMessageThreads";

interface ThreadListProps {
  threads: ThreadWithLastMessage[];
  selectedThreadId?: string;
  onSelectThread: (threadId: string) => void;
  isLoading: boolean;
  currentUserId?: string;
}

export function ThreadList({
  threads,
  selectedThreadId,
  onSelectThread,
  isLoading,
  currentUserId,
}: ThreadListProps) {
  if (isLoading) {
    return (
      <div className="flex-1 p-2 space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-3 p-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-center text-muted-foreground">
        <div>
          <p className="font-medium">No conversations yet</p>
          <p className="text-sm mt-1">Start a new conversation</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="divide-y">
        {threads.map((thread) => (
          <ThreadListItem
            key={thread.id}
            thread={thread}
            isSelected={thread.id === selectedThreadId}
            onClick={() => onSelectThread(thread.id)}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </ScrollArea>
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
    ? thread.last_message.content.length > 50
      ? thread.last_message.content.slice(0, 50) + "..."
      : thread.last_message.content
    : "No messages yet";

  // Check if last message was from current user
  const isOwnMessage = thread.last_message?.sender_id === currentUserId;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 p-3 text-left hover:bg-muted/50 transition-colors",
        isSelected && "bg-muted"
      )}
    >
      {/* Avatar */}
      <div className="relative">
        {thread.is_group ? (
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {otherParticipants?.length || 0}
            </span>
          </div>
        ) : (
          <Avatar className="h-10 w-10">
            <AvatarImage src={otherParticipants?.[0]?.avatar_url || undefined} />
            <AvatarFallback>
              {getInitials(otherParticipants?.[0]?.full_name || null)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium truncate">{displayName}</span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatTime(thread.last_message_at)}
          </span>
        </div>
        <p className="text-sm font-medium text-muted-foreground truncate mt-0.5">
          {thread.subject}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          {isOwnMessage && <span className="text-foreground">You: </span>}
          {lastMessagePreview}
        </p>
      </div>
    </button>
  );
}
