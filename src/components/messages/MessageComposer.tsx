import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Smile, Paperclip, X, Loader2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSendThreadMessage } from "@/hooks/useThreadMessages";
import { cn } from "@/lib/utils";

const QUICK_EMOJIS = ["👍", "🙏", "🎉", "✅", "❤️", "😀", "😂", "🔥", "🚀", "👀", "💯", "⚠️"];

interface MessageComposerProps {
  threadId: string;
}

export function MessageComposer({ threadId }: MessageComposerProps) {
  const [content, setContent] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sendMessage = useSendThreadMessage();

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `messages/${threadId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("discussion-attachments").upload(path, file, { upsert: false });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from("discussion-attachments").getPublicUrl(path);
        setAttachments((a) => [...a, { name: file.name, url: publicUrl }]);
      }
    } catch (e: any) { toast.error(e?.message || "Upload failed"); }
    finally { setUploading(false); }
  }

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
    if (!trimmedContent && attachments.length === 0) return;

    sendMessage.mutate(
      {
        threadId,
        content: trimmedContent || (attachments.length ? "(attachment)" : ""),
        attachments: attachments.map((a) => a.url),
      },
      {
        onSuccess: () => {
          setContent("");
          setAttachments([]);
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

  const [emojiOpen, setEmojiOpen] = useState(false);

  const insertEmoji = (emoji: string) => {
    setContent((c) => c + emoji);
    setEmojiOpen(false);
    textareaRef.current?.focus();
  };

  const canSend = (content.trim().length > 0 || attachments.length > 0) && !uploading;

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="border-t bg-background/80 backdrop-blur-xl p-3"
    >
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {attachments.map((a, i) => (
            <span key={i} className="inline-flex max-w-[200px] items-center gap-1.5 rounded-full border bg-muted/50 px-2 py-1 text-xs">
              <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{a.name}</span>
              <button type="button" onClick={() => setAttachments((arr) => arr.filter((_, x) => x !== i))} className="text-muted-foreground hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
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
          <input ref={fileRef} type="file" multiple hidden
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                aria-label="Attach file"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Attach a file</TooltipContent>
          </Tooltip>
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
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Insert emoji"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              >
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-2">
              <div className="grid grid-cols-6 gap-1">
                {QUICK_EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => insertEmoji(e)}
                    className="h-8 w-8 rounded-md text-lg hover:bg-muted transition-colors"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

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
