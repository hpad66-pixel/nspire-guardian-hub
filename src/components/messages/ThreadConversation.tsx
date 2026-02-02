import { useRef, useEffect, ReactNode } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";
import type { ThreadWithLastMessage } from "@/hooks/useMessageThreads";
import type { ThreadMessageWithSender } from "@/hooks/useThreadMessages";

interface ThreadConversationProps {
  thread?: ThreadWithLastMessage;
  messages: ThreadMessageWithSender[];
  isLoading: boolean;
  currentUserId?: string;
  onBack?: () => void;
  isMobile: boolean;
  rightPanelToggle?: ReactNode;
}

export function ThreadConversation({
  thread,
  messages,
  isLoading,
  currentUserId,
  onBack,
  isMobile,
  rightPanelToggle,
}: ThreadConversationProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  // Group messages by date
  const groupedMessages = messages.reduce<
    { date: string; messages: ThreadMessageWithSender[] }[]
  >((groups, message) => {
    const dateStr = format(new Date(message.created_at), "yyyy-MM-dd");
    const existingGroup = groups.find((g) => g.date === dateStr);
    if (existingGroup) {
      existingGroup.messages.push(message);
    } else {
      groups.push({ date: dateStr, messages: [message] });
    }
    return groups;
  }, []);

  // Format date header
  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM d, yyyy");
  };

  if (!thread) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>Select a conversation to view messages</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background">
        {isMobile && onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">{thread.subject}</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" />
            {thread.participants?.length || 0} participants
          </p>
        </div>
        {rightPanelToggle}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${i % 2 === 0 ? "flex-row-reverse" : ""}`}
                >
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-16 w-48 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No messages yet</p>
              <p className="text-sm mt-1">Send a message to start the conversation</p>
            </div>
          ) : (
            groupedMessages.map((group) => (
              <div key={group.date}>
                {/* Date divider */}
                <div className="flex items-center gap-4 my-4">
                  <div className="flex-1 border-t" />
                  <span className="text-xs text-muted-foreground font-medium">
                    {formatDateHeader(group.date)}
                  </span>
                  <div className="flex-1 border-t" />
                </div>

                {/* Messages for this date */}
                <div className="space-y-3">
                  {group.messages.map((message, idx) => {
                    const isOwn = message.sender_id === currentUserId;
                    const prevMessage = group.messages[idx - 1];
                    const showAvatar =
                      !prevMessage || prevMessage.sender_id !== message.sender_id;

                    return (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isOwn={isOwn}
                        showAvatar={showAvatar}
                      />
                    );
                  })}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Composer */}
      <MessageComposer threadId={thread.id} />
    </div>
  );
}
