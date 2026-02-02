import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Send, Plus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useSendEmail } from "@/hooks/useSendEmail";

const composeSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200, "Subject too long"),
  bodyHtml: z.string().min(1, "Message body is required"),
});

type ComposeFormData = z.infer<typeof composeSchema>;

interface ComposeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ComposeEmailDialog({ open, onOpenChange }: ComposeEmailDialogProps) {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [ccRecipients, setCcRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState("");
  const [newCc, setNewCc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [recipientError, setRecipientError] = useState<string | null>(null);

  const { mutate: sendEmail, isPending } = useSendEmail();

  const form = useForm<ComposeFormData>({
    resolver: zodResolver(composeSchema),
    defaultValues: {
      subject: "",
      bodyHtml: "",
    },
  });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const addRecipient = (email: string, list: string[], setList: (list: string[]) => void) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    
    if (!emailRegex.test(trimmed)) {
      setRecipientError("Invalid email address");
      return;
    }
    
    if (list.includes(trimmed)) {
      setRecipientError("Email already added");
      return;
    }
    
    setList([...list, trimmed]);
    setRecipientError(null);
  };

  const removeRecipient = (email: string, list: string[], setList: (list: string[]) => void) => {
    setList(list.filter((e) => e !== email));
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    value: string,
    setValue: (v: string) => void,
    list: string[],
    setList: (list: string[]) => void
  ) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addRecipient(value, list, setList);
      setValue("");
    }
  };

  const handleSubmit = (data: ComposeFormData) => {
    if (recipients.length === 0) {
      setRecipientError("At least one recipient is required");
      return;
    }

    sendEmail(
      {
        recipients,
        ccRecipients: ccRecipients.length > 0 ? ccRecipients : undefined,
        subject: data.subject,
        bodyHtml: wrapEmailHtml(data.bodyHtml),
        bodyText: stripHtml(data.bodyHtml),
      },
      {
        onSuccess: () => {
          form.reset();
          setRecipients([]);
          setCcRecipients([]);
          setShowCc(false);
          onOpenChange(false);
        },
      }
    );
  };

  const wrapEmailHtml = (content: string) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden;">
      <div style="padding: 32px;">
        ${content}
      </div>
      <div style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #94a3b8; font-size: 12px;">
          Sent from Glorieta Gardens Apartments
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Compose Email
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Recipients */}
            <div className="space-y-2">
              <FormLabel>To</FormLabel>
              <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px]">
                {recipients.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1">
                    {email}
                    <button
                      type="button"
                      onClick={() => removeRecipient(email, recipients, setRecipients)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Input
                  type="email"
                  placeholder="Add recipient..."
                  value={newRecipient}
                  onChange={(e) => {
                    setNewRecipient(e.target.value);
                    setRecipientError(null);
                  }}
                  onKeyDown={(e) =>
                    handleKeyDown(e, newRecipient, setNewRecipient, recipients, setRecipients)
                  }
                  onBlur={() => {
                    if (newRecipient) {
                      addRecipient(newRecipient, recipients, setRecipients);
                      setNewRecipient("");
                    }
                  }}
                  className="flex-1 min-w-[200px] border-0 shadow-none focus-visible:ring-0 p-0"
                />
              </div>
              {recipientError && (
                <p className="text-sm text-destructive">{recipientError}</p>
              )}
              {!showCc && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCc(true)}
                  className="text-xs text-muted-foreground"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Cc
                </Button>
              )}
            </div>

            {/* CC Recipients */}
            {showCc && (
              <div className="space-y-2">
                <FormLabel>Cc</FormLabel>
                <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px]">
                  {ccRecipients.map((email) => (
                    <Badge key={email} variant="secondary" className="gap-1">
                      {email}
                      <button
                        type="button"
                        onClick={() => removeRecipient(email, ccRecipients, setCcRecipients)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <Input
                    type="email"
                    placeholder="Add Cc recipient..."
                    value={newCc}
                    onChange={(e) => setNewCc(e.target.value)}
                    onKeyDown={(e) =>
                      handleKeyDown(e, newCc, setNewCc, ccRecipients, setCcRecipients)
                    }
                    onBlur={() => {
                      if (newCc) {
                        addRecipient(newCc, ccRecipients, setCcRecipients);
                        setNewCc("");
                      }
                    }}
                    className="flex-1 min-w-[200px] border-0 shadow-none focus-visible:ring-0 p-0"
                  />
                </div>
              </div>
            )}

            {/* Subject */}
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="Email subject..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Body */}
            <FormField
              control={form.control}
              name="bodyHtml"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      content={field.value}
                      onChange={field.onChange}
                      placeholder="Write your message..."
                      className="min-h-[200px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
