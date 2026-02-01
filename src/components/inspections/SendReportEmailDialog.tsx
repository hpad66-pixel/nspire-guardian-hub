import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useSendReportEmail } from "@/hooks/useReportEmails";
import { generatePDFBase64 } from "@/lib/generatePDF";
import { X, Loader2, Mail, Paperclip, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ContactPicker } from "@/components/crm/ContactPicker";

interface SendReportEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspectionId: string;
  propertyName: string;
  inspectorName: string;
  inspectionDate: string;
  reportElementId: string;
  statusSummary?: {
    ok: number;
    attention: number;
    defect: number;
  };
}

export function SendReportEmailDialog({
  open,
  onOpenChange,
  inspectionId,
  propertyName,
  inspectorName,
  inspectionDate,
  reportElementId,
  statusSummary,
}: SendReportEmailDialogProps) {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [subject, setSubject] = useState(
    `Daily Grounds Inspection - ${propertyName} - ${format(parseISO(inspectionDate), "MMM d, yyyy")}`
  );
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const sendEmail = useSendReportEmail();

  const pdfFilename = `daily-grounds-inspection-${format(parseISO(inspectionDate), "yyyy-MM-dd")}.pdf`;

  const validateEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email.trim());
  };

  const addRecipient = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;

    if (!validateEmail(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (recipients.includes(email)) {
      toast.error("This email is already added");
      return;
    }

    setRecipients([...recipients, email]);
    setEmailInput("");
  };

  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter((r) => r !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addRecipient();
    }
  };

  const handleSend = async () => {
    if (recipients.length === 0) {
      toast.error("Please add at least one recipient");
      return;
    }

    if (!subject.trim()) {
      toast.error("Please enter a subject");
      return;
    }

    setIsSending(true);

    try {
      // Generate PDF as base64
      const pdfBase64 = await generatePDFBase64({
        elementId: reportElementId,
        scale: 2,
      });

      await sendEmail.mutateAsync({
        recipients,
        subject: subject.trim(),
        reportType: "daily_inspection",
        reportId: inspectionId,
        propertyName,
        inspectorName,
        inspectionDate: format(parseISO(inspectionDate), "MMMM d, yyyy"),
        message: message.trim() || undefined,
        pdfBase64,
        pdfFilename,
        statusSummary,
      });

      onOpenChange(false);
      // Reset form
      setRecipients([]);
      setEmailInput("");
      setMessage("");
    } catch (error) {
      console.error("Failed to send email:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Inspection Report
          </DialogTitle>
          <DialogDescription>
            Send this inspection report as a PDF attachment to one or more recipients.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Recipients */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="recipients">To</Label>
              <ContactPicker
                selectedEmails={recipients}
                onSelect={setRecipients}
                trigger={
                  <Button variant="ghost" size="sm" className="h-7 gap-1">
                    <Users className="h-3 w-3" />
                    From Contacts
                  </Button>
                }
              />
            </div>
            <div className="flex flex-wrap gap-2 p-2 min-h-[42px] border rounded-md bg-background">
              {recipients.map((email) => (
                <Badge
                  key={email}
                  variant="secondary"
                  className="flex items-center gap-1 py-1"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => removeRecipient(email)}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Input
                id="recipients"
                type="email"
                placeholder="Add email address..."
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={addRecipient}
                className="flex-1 min-w-[200px] border-0 shadow-none focus-visible:ring-0 p-0 h-auto"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Press Enter or comma to add recipients, or select from your contacts
            </p>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal message..."
              rows={3}
            />
          </div>

          {/* Attachment Preview */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Attachment: <span className="font-medium text-foreground">{pdfFilename}</span>
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending || recipients.length === 0}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
