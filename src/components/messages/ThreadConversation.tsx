import { useRef, useEffect, ReactNode } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Users, Sparkles, MessageCircle } from "lucide-react";
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
    return format(date, "EEEE, MMMM d");
  };

  if (!thread) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8"
        >
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-4">
            <MessageCircle className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <p className="text-lg font-medium text-muted-foreground">Select a conversation</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Choose from your existing conversations or start a new one</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-muted/20 to-background">
      {/* Header with glassmorphism effect */}
      <motion.div 
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-3 px-4 py-3 border-b bg-background/80 backdrop-blur-xl sticky top-0 z-10"
      >
        {isMobile && onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-foreground truncate">{thread.subject}</h2>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <Users className="h-3 w-3" />
            <span>{thread.participants?.length || 0} participants</span>
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Active now
            </span>
          </p>
        </div>
        {rightPanelToggle}
      </motion.div>

      {/* Messages with refined styling */}
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
                    <Skeleton className="h-16 w-48 rounded-2xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-primary/60" />
              </div>
              <p className="font-medium text-foreground">Start the conversation</p>
              <p className="text-sm text-muted-foreground mt-1">
                Send a message to begin chatting
              </p>
            </motion.div>
          ) : (
            <AnimatePresence>
              {groupedMessages.map((group) => (
                <div key={group.date}>
                  {/* Date divider with premium styling */}
                  <div className="flex items-center gap-4 my-6">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                    <span className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase px-3 py-1 rounded-full bg-muted/50">
                      {formatDateHeader(group.date)}
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                  </div>

                  {/* Messages for this date */}
                  <div className="space-y-3">
                    {group.messages.map((message, idx) => {
                      const isOwn = message.sender_id === currentUserId;
                      const prevMessage = group.messages[idx - 1];
                      const showAvatar =
                        !prevMessage || prevMessage.sender_id !== message.sender_id;
                      const isLast = idx === group.messages.length - 1;

                      return (
                        <MessageBubble
                          key={message.id}
                          message={message}
                          isOwn={isOwn}
                          showAvatar={showAvatar}
                          isLast={isLast}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </AnimatePresence>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Composer */}
      <MessageComposer threadId={thread.id} />
    </div>
  );
}
