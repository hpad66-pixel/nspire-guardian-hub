import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Smile, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSendThreadMessage } from "@/hooks/useThreadMessages";
import { cn } from "@/lib/utils";

interface MessageComposerProps {
  threadId: string;
}

export function MessageComposer({ threadId }: MessageComposerProps) {
  const [content, setContent] = useState("");
  const [isFocused, setIsFocused] = useState(false);
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

  const canSend = content.trim().length > 0;

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="border-t bg-background/80 backdrop-blur-xl p-3"
    >
      <div 
        className={cn(
          "flex items-end gap-2 p-2 rounded-2xl border transition-all duration-200",
          isFocused 
            ? "border-primary/50 bg-background shadow-lg shadow-primary/5" 
            : "border-border bg-muted/30"
        )}
      >
        {/* Left actions */}
        <div className="flex items-center gap-1 pb-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
        </div>

        {/* Text input */}
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Type a message..."
          className={cn(
            "min-h-[40px] max-h-[120px] resize-none py-2.5 px-1 flex-1",
            "border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0",
            "placeholder:text-muted-foreground/60"
          )}
          rows={1}
        />

        {/* Right actions */}
        <div className="flex items-center gap-1 pb-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
          >
            <Smile className="h-4 w-4" />
          </Button>
          
          <motion.div
            animate={{ 
              scale: canSend ? 1 : 0.9,
              opacity: canSend ? 1 : 0.5 
            }}
            transition={{ duration: 0.15 }}
          >
            <Button
              onClick={handleSend}
              disabled={!canSend || sendMessage.isPending}
              size="icon"
              className={cn(
                "h-9 w-9 rounded-full transition-all duration-200",
                canSend 
                  ? "bg-gradient-to-r from-primary to-primary/90 hover:shadow-lg hover:shadow-primary/25" 
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Send className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </div>
      
      <p className="text-[10px] text-muted-foreground mt-2 px-2 text-center">
        <span className="font-medium">Enter</span> to send · <span className="font-medium">Shift + Enter</span> for new line
      </p>
    </motion.div>
  );
}
