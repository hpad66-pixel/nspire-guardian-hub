import { useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mail,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Paperclip,
  FileText,
} from "lucide-react";
import { useReportEmail, useMarkEmailRead } from "@/hooks/useReportEmails";
import { useProfiles } from "@/hooks/useProfiles";
import { EmailActions } from "./EmailActions";

interface EmailPreviewProps {
  emailId: string | null;
  onClose?: () => void;
  onEmailDeleted?: () => void;
}

export function EmailPreview({ emailId, onClose, onEmailDeleted }: EmailPreviewProps) {
  const { data: email, isLoading } = useReportEmail(emailId);
  const { data: profiles = [] } = useProfiles();
  const markRead = useMarkEmailRead();
  const hasMarkedRead = useRef(false);

  // Mark as read after 2 seconds of viewing
  useEffect(() => {
    if (email && !email.is_read && !hasMarkedRead.current) {
      const timer = setTimeout(() => {
        markRead.mutate(email.id);
        hasMarkedRead.current = true;
      }, 2000);
      return () => clearTimeout(timer);
    }
    // Reset when email changes
    if (!email) {
      hasMarkedRead.current = false;
    }
  }, [email, markRead]);

  const getSenderName = (sentBy: string | null) => {
    if (!sentBy) return "System";
    const profile = profiles.find((p) => p.user_id === sentBy);
    return profile?.full_name || profile?.email || "Unknown";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Sent
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!emailId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-muted/20">
        <div className="p-6 rounded-full bg-muted mb-4">
          <Mail className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-medium mb-2">Select an email</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Choose an email from the list to view its contents
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-6 space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <div className="flex-1 space-y-3 pt-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <p className="text-muted-foreground">Email not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold truncate">{email.subject}</h2>
            <div className="mt-2 flex items-center gap-2">
              {getStatusBadge(email.status)}
              {(email as any).is_read === false && (
                <Badge variant="secondary">Unread</Badge>
              )}
            </div>
          </div>
          <EmailActions email={email} onActionComplete={onEmailDeleted} variant="dropdown" />
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-16">From:</span>
            <span className="font-medium">{getSenderName(email.sent_by)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-16">To:</span>
            <span>{email.recipients.join(", ")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-16">Date:</span>
            <span>{format(parseISO(email.sent_at), "MMMM d, yyyy 'at' h:mm a")}</span>
          </div>
        </div>

        {email.error_message && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">
              <strong>Error:</strong> {email.error_message}
            </p>
          </div>
        )}
      </div>

      {/* Body */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {email.body_html ? (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: email.body_html }}
            />
          ) : email.body_text ? (
            <p className="whitespace-pre-wrap text-sm">{email.body_text}</p>
          ) : (
            <p className="text-muted-foreground italic">No email content available</p>
          )}
        </div>
      </ScrollArea>

      {/* Attachments */}
      {email.attachment_filename && (
        <div className="p-4 border-t bg-muted/30">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Attachments
          </h4>
          <div className="flex items-center justify-between p-3 bg-background rounded-md border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{email.attachment_filename}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(email.attachment_size)}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            PDF attachments are not stored. Regenerate from the original report to download.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 border-t flex items-center justify-between gap-2">
        <EmailActions email={email} onActionComplete={onEmailDeleted} />
        {email.status === "failed" && (
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Resend
          </Button>
        )}
      </div>
    </div>
  );
}
