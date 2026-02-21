import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Send, Loader2, CornerDownRight } from "lucide-react";
import { ReportEmailFull } from "@/hooks/useReportEmails";
import { useSendEmail } from "@/hooks/useSendEmail";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { format, parseISO } from "date-fns";

interface ReplyForwardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: ReportEmailFull;
  mode: "reply" | "forward";
}

export function ReplyForwardDialog({
  open,
  onOpenChange,
  email,
  mode,
}: ReplyForwardDialogProps) {
  const isReply = mode === "reply";
  const subjectPrefix = isReply ? "Re: " : "Fwd: ";
  const originalSubject =
    email.subject.startsWith("Re: ") || email.subject.startsWith("Fwd: ")
      ? email.subject
      : subjectPrefix + email.subject;

  const [recipients, setRecipients] = useState<string[]>(
    isReply ? email.recipients : []
  );
  const [ccRecipients, setCcRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState("");
  const [ccInput, setCcInput] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState(originalSubject);
  const [bodyHtml, setBodyHtml] = useState("");

  const sendEmail = useSendEmail();

  const handleAddToList = (
    input: string,
    list: string[],
    setList: (l: string[]) => void,
    setInput: (v: string) => void
  ) => {
    const trimmed = input.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
      setInput("");
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    input: string,
    list: string[],
    setList: (l: string[]) => void,
    setInput: (v: string) => void
  ) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddToList(input, list, setList, setInput);
    }
  };

  const chipInput = (
    label: string,
    list: string[],
    setList: (l: string[]) => void,
    inputVal: string,
    setInputVal: (v: string) => void,
    placeholder: string
  ) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px]">
        {list.map((addr) => (
          <Badge key={addr} variant="secondary" className="gap-1 pr-1">
            {addr}
            <button
              type="button"
              onClick={() => setList(list.filter((r) => r !== addr))}
              className="ml-1 hover:bg-muted rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Input
          type="email"
          placeholder={list.length === 0 ? placeholder : ""}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, inputVal, list, setList, setInputVal)}
          onBlur={() => handleAddToList(inputVal, list, setList, setInputVal)}
          className="flex-1 min-w-[150px] border-0 p-0 h-auto focus-visible:ring-0"
        />
      </div>
    </div>
  );

  const handleSend = async () => {
    if (recipients.length === 0) return;

    const quotedHtml = `
      <div style="margin-top: 24px; padding: 12px 16px; border-left: 3px solid #94a3b8; color: #64748b;">
        <p style="margin:0 0 8px; font-size:12px; color:#94a3b8;">
          Original message — ${format(parseISO(email.sent_at), "MMM d, yyyy h:mm a")}
        </p>
        ${email.body_html || `<p>${email.body_text || "No content"}</p>`}
      </div>`;

    await sendEmail.mutateAsync({
      recipients,
      ccRecipients: ccRecipients.length > 0 ? ccRecipients : undefined,
      subject,
      bodyHtml: bodyHtml + quotedHtml,
      bodyText: "",
      threadId: isReply ? (email.thread_id || email.id) : undefined,
      replyToId: isReply ? email.id : undefined,
    });

    onOpenChange(false);
    setBodyHtml("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CornerDownRight className="h-4 w-4" />
            {isReply ? "Reply to Email" : "Forward Email"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* To */}
          {chipInput(
            "To",
            recipients,
            setRecipients,
            recipientInput,
            setRecipientInput,
            "Add recipients..."
          )}

          {/* CC toggle */}
          {!showCc && (
            <button
              type="button"
              onClick={() => setShowCc(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              + Add Cc
            </button>
          )}
          {showCc &&
            chipInput(
              "Cc",
              ccRecipients,
              setCcRecipients,
              ccInput,
              setCcInput,
              "Add Cc recipient..."
            )}

          {/* Subject */}
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Message body — RichTextEditor */}
          <div className="space-y-2">
            <Label>Message</Label>
            <RichTextEditor
              content={bodyHtml}
              onChange={setBodyHtml}
              placeholder="Type your message..."
              className="min-h-[160px]"
            />
          </div>

          {/* Quoted thread block */}
          <div className="rounded-md border-l-2 border-muted-foreground/30 bg-muted/30 p-3 space-y-1">
            <p className="text-[11px] text-muted-foreground">
              Original message — {format(parseISO(email.sent_at), "MMM d, yyyy h:mm a")}
            </p>
            {email.body_html ? (
              <div
                className="prose prose-sm max-w-none text-muted-foreground text-xs [&_*]:text-muted-foreground line-clamp-4"
                dangerouslySetInnerHTML={{ __html: email.body_html }}
              />
            ) : (
              <p className="text-xs text-muted-foreground line-clamp-4">
                {email.body_text || "No content"}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={recipients.length === 0 || sendEmail.isPending}
            className="gap-2"
          >
            {sendEmail.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
