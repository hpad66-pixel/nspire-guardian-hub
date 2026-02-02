import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSendThreadMessage } from "@/hooks/useThreadMessages";
import { cn } from "@/lib/utils";

interface MessageComposerProps {
  threadId: string;
}

export function MessageComposer({ threadId }: MessageComposerProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendMessage = useSendThreadMessage();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [content]);

  const handleSend = () => {
    const trimmedContent = content.trim();
    if (!trimmedContent) return;

    sendMessage.mutate(
      {
        threadId,
        content: trimmedContent,
      },
      {
        onSuccess: () => {
          setContent("");
          if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
          }
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-background p-3">
      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className={cn(
            "min-h-[40px] max-h-[120px] resize-none py-2",
            "focus-visible:ring-1"
          )}
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={!content.trim() || sendMessage.isPending}
          size="icon"
          className="h-10 w-10 flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1 px-1">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
