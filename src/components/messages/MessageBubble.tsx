import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ThreadMessageWithSender } from "@/hooks/useThreadMessages";

interface MessageBubbleProps {
  message: ThreadMessageWithSender;
  isOwn: boolean;
  showAvatar: boolean;
}

export function MessageBubble({ message, isOwn, showAvatar }: MessageBubbleProps) {
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
    <div
      className={cn(
        "flex gap-2",
        isOwn ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      {showAvatar ? (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={message.sender?.avatar_url || undefined} />
          <AvatarFallback className="text-xs">
            {getInitials(message.sender?.full_name || null)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-8 flex-shrink-0" />
      )}

      {/* Message content */}
      <div
        className={cn(
          "flex flex-col max-w-[70%]",
          isOwn ? "items-end" : "items-start"
        )}
      >
        {/* Sender name (only for others, and only if showing avatar) */}
        {!isOwn && showAvatar && (
          <span className="text-xs text-muted-foreground mb-1 px-1">
            {message.sender?.full_name || "Unknown"}
          </span>
        )}

        {/* Bubble */}
        <div
          className={cn(
            "px-3 py-2 rounded-2xl",
            isOwn
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted rounded-tl-sm"
          )}
        >
          {message.content_html ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
              dangerouslySetInnerHTML={{ __html: message.content_html }}
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}
        </div>

        {/* Time and edited indicator */}
        <div className="flex items-center gap-1 mt-0.5 px-1">
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(message.created_at), "h:mm a")}
          </span>
          {message.is_edited && (
            <span className="text-[10px] text-muted-foreground">(edited)</span>
          )}
        </div>
      </div>
    </div>
  );
}
