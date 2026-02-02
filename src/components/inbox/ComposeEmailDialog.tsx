import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Send, Plus, Loader2, Users, Mail, User } from "lucide-react";
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
import { useSendInternalMessage } from "@/hooks/useInternalMessaging";
import { useProfiles } from "@/hooks/useProfiles";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

const composeSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200, "Subject too long"),
  bodyHtml: z.string().min(1, "Message body is required"),
});

type ComposeFormData = z.infer<typeof composeSchema>;

interface ComposeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface InternalRecipient {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export function ComposeEmailDialog({ open, onOpenChange }: ComposeEmailDialogProps) {
  const [messageType, setMessageType] = useState<"external" | "internal">("internal");
  
  // External email recipients
  const [recipients, setRecipients] = useState<string[]>([]);
  const [ccRecipients, setCcRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState("");
  const [newCc, setNewCc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [recipientError, setRecipientError] = useState<string | null>(null);

  // Internal message recipients
  const [internalRecipients, setInternalRecipients] = useState<InternalRecipient[]>([]);
  const [recipientPickerOpen, setRecipientPickerOpen] = useState(false);

  const { mutate: sendEmail, isPending: isSendingEmail } = useSendEmail();
  const { mutate: sendInternalMessage, isPending: isSendingInternal } = useSendInternalMessage();
  const { data: profiles = [] } = useProfiles();
  
  const isPending = isSendingEmail || isSendingInternal;

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

  const addInternalRecipient = (profile: typeof profiles[0]) => {
    if (internalRecipients.some((r) => r.userId === profile.user_id)) return;
    
    setInternalRecipients([
      ...internalRecipients,
      {
        userId: profile.user_id,
        name: profile.full_name || profile.email || "Unknown",
        email: profile.work_email || profile.email || "",
        avatarUrl: profile.avatar_url || undefined,
      },
    ]);
    setRecipientPickerOpen(false);
  };

  const removeInternalRecipient = (userId: string) => {
    setInternalRecipients(internalRecipients.filter((r) => r.userId !== userId));
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
    if (messageType === "external") {
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
            resetForm();
            onOpenChange(false);
          },
        }
      );
    } else {
      if (internalRecipients.length === 0) {
        setRecipientError("At least one recipient is required");
        return;
      }

      sendInternalMessage(
        {
          recipientUserIds: internalRecipients.map((r) => r.userId),
          subject: data.subject,
          bodyHtml: data.bodyHtml,
          bodyText: stripHtml(data.bodyHtml),
        },
        {
          onSuccess: () => {
            resetForm();
            onOpenChange(false);
          },
        }
      );
    }
  };

  const resetForm = () => {
    form.reset();
    setRecipients([]);
    setCcRecipients([]);
    setInternalRecipients([]);
    setShowCc(false);
    setRecipientError(null);
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Compose Message
          </DialogTitle>
        </DialogHeader>

        <Tabs value={messageType} onValueChange={(v) => setMessageType(v as "external" | "internal")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="internal" className="gap-2">
              <Users className="h-4 w-4" />
              Internal Message
            </TabsTrigger>
            <TabsTrigger value="external" className="gap-2">
              <Mail className="h-4 w-4" />
              External Email
            </TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-4">
              <TabsContent value="internal" className="mt-0 space-y-4">
                {/* Internal Recipients */}
                <div className="space-y-2">
                  <FormLabel>To (Team Members)</FormLabel>
                  <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px]">
                    {internalRecipients.map((recipient) => (
                      <Badge key={recipient.userId} variant="secondary" className="gap-1 pl-1">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={recipient.avatarUrl} />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(recipient.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="ml-1">{recipient.name}</span>
                        <button
                          type="button"
                          onClick={() => removeInternalRecipient(recipient.userId)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <Popover open={recipientPickerOpen} onOpenChange={setRecipientPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-muted-foreground"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add recipient
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search team members..." />
                          <CommandList>
                            <CommandEmpty>No team members found.</CommandEmpty>
                            <CommandGroup>
                              <ScrollArea className="h-48">
                                {profiles
                                  .filter((p) => !internalRecipients.some((r) => r.userId === p.user_id))
                                  .map((profile) => (
                                    <CommandItem
                                      key={profile.user_id}
                                      onSelect={() => addInternalRecipient(profile)}
                                      className="flex items-center gap-2 cursor-pointer"
                                    >
                                      <Avatar className="h-7 w-7">
                                        <AvatarImage src={profile.avatar_url || undefined} />
                                        <AvatarFallback className="text-xs">
                                          {getInitials(profile.full_name || profile.email || "?")}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex flex-col">
                                        <span className="text-sm font-medium">
                                          {profile.full_name || "Unknown"}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {profile.work_email || profile.email}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  ))}
                              </ScrollArea>
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  {recipientError && messageType === "internal" && (
                    <p className="text-sm text-destructive">{recipientError}</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="external" className="mt-0 space-y-4">
                {/* External Recipients */}
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
                  {recipientError && messageType === "external" && (
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
              </TabsContent>

              {/* Subject - shared */}
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input placeholder="Message subject..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Body - shared */}
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
                      {messageType === "internal" ? "Send Message" : "Send Email"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
