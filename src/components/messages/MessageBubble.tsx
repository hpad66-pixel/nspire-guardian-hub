import { format } from "date-fns";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Check, CheckCheck } from "lucide-react";
import type { ThreadMessageWithSender } from "@/hooks/useThreadMessages";

interface MessageBubbleProps {
  message: ThreadMessageWithSender;
  isOwn: boolean;
  showAvatar: boolean;
  isLast?: boolean;
}

export function MessageBubble({ message, isOwn, showAvatar, isLast }: MessageBubbleProps) {
  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.2, 
        ease: [0.23, 1, 0.32, 1] 
      }}
      className={cn(
        "flex gap-2.5 group",
        isOwn ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      {showAvatar ? (
        <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-background shadow-sm">
          <AvatarImage src={message.sender?.avatar_url || undefined} />
          <AvatarFallback className="text-xs bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-medium">
            {getInitials(message.sender?.full_name || null)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-8 flex-shrink-0" />
      )}

      {/* Message content */}
      <div
        className={cn(
          "flex flex-col max-w-[75%]",
          isOwn ? "items-end" : "items-start"
        )}
      >
        {/* Sender name (only for others, and only if showing avatar) */}
        {!isOwn && showAvatar && (
          <span className="text-[11px] font-medium text-muted-foreground mb-1 ml-1 tracking-wide uppercase">
            {message.sender?.full_name || "Unknown"}
          </span>
        )}

        {/* Bubble with premium styling */}
        <div
          className={cn(
            "relative px-4 py-2.5 shadow-sm",
            isOwn
              ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-[20px] rounded-br-md"
              : "bg-card border border-border/50 rounded-[20px] rounded-bl-md",
            "transition-all duration-200"
          )}
        >
          {message.content_html ? (
            <div
              className={cn(
                "prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
                isOwn ? "prose-invert" : "dark:prose-invert"
              )}
              dangerouslySetInnerHTML={{ __html: message.content_html }}
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
              {message.content}
            </p>
          )}
        </div>

        {/* Time and status indicators */}
        <div className={cn(
          "flex items-center gap-1.5 mt-1 px-1",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
          isLast && "opacity-100"
        )}>
          <span className="text-[10px] text-muted-foreground font-medium">
            {format(new Date(message.created_at), "h:mm a")}
          </span>
          {message.is_edited && (
            <span className="text-[10px] text-muted-foreground italic">· edited</span>
          )}
          {isOwn && (
            <CheckCheck className="h-3 w-3 text-primary/70" />
          )}
        </div>
      </div>
    </motion.div>
  );
}
