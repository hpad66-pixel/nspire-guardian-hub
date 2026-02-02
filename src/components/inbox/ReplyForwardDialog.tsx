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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Send, Loader2 } from "lucide-react";
import { ReportEmailFull } from "@/hooks/useReportEmails";
import { useSendEmail } from "@/hooks/useSendEmail";
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
  const originalSubject = email.subject.startsWith("Re: ") || email.subject.startsWith("Fwd: ")
    ? email.subject
    : subjectPrefix + email.subject;

  const [recipients, setRecipients] = useState<string[]>(
    isReply ? email.recipients : []
  );
  const [recipientInput, setRecipientInput] = useState("");
  const [subject, setSubject] = useState(originalSubject);
  const [message, setMessage] = useState("");

  const sendEmail = useSendEmail();

  const handleAddRecipient = () => {
    const trimmed = recipientInput.trim();
    if (trimmed && !recipients.includes(trimmed)) {
      setRecipients([...recipients, trimmed]);
      setRecipientInput("");
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients(recipients.filter((r) => r !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddRecipient();
    }
  };

  const formatQuotedContent = () => {
    const sentDate = format(parseISO(email.sent_at), "MMMM d, yyyy 'at' h:mm a");
    const originalContent = email.body_text || "No content";
    
    return `

---------- Original Message ----------
From: ${email.recipients.join(", ")}
Date: ${sentDate}
Subject: ${email.subject}

${originalContent}
`;
  };

  const handleSend = async () => {
    if (recipients.length === 0) return;

    const fullMessage = message + formatQuotedContent();

    await sendEmail.mutateAsync({
      recipients,
      subject,
      bodyHtml: `<p>${message.replace(/\n/g, "<br>")}</p>
        <div style="margin-top: 20px; padding: 10px; border-left: 2px solid #ccc; color: #666;">
          <p><strong>---------- Original Message ----------</strong></p>
          <p><strong>From:</strong> ${email.recipients.join(", ")}</p>
          <p><strong>Date:</strong> ${format(parseISO(email.sent_at), "MMMM d, yyyy 'at' h:mm a")}</p>
          <p><strong>Subject:</strong> ${email.subject}</p>
          <br>
          ${email.body_html || `<p>${email.body_text || "No content"}</p>`}
        </div>`,
      bodyText: fullMessage,
    });

    onOpenChange(false);
    setMessage("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isReply ? "Reply to Email" : "Forward Email"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipients */}
          <div className="space-y-2">
            <Label>To</Label>
            <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px]">
              {recipients.map((recipient) => (
                <Badge
                  key={recipient}
                  variant="secondary"
                  className="gap-1 pr-1"
                >
                  {recipient}
                  <button
                    type="button"
                    onClick={() => handleRemoveRecipient(recipient)}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Input
                type="email"
                placeholder={recipients.length === 0 ? "Add recipients..." : ""}
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleAddRecipient}
                className="flex-1 min-w-[150px] border-0 p-0 h-auto focus-visible:ring-0"
              />
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
            />
          </div>

          {/* Original Message Preview */}
          <div className="p-3 bg-muted/50 rounded-md border-l-2 border-muted-foreground/30">
            <p className="text-xs text-muted-foreground mb-2">Original message will be included below</p>
            <p className="text-sm font-medium">{email.subject}</p>
            <p className="text-xs text-muted-foreground">
              {format(parseISO(email.sent_at), "MMM d, yyyy")} • To: {email.recipients.join(", ")}
            </p>
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
