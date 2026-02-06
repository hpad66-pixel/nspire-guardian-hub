import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Paperclip,
  Mail,
  Users,
  Filter,
} from "lucide-react";
import { format, parseISO, isToday, isYesterday, isThisWeek } from "date-fns";
import { ReportEmail } from "@/hooks/useReportEmails";
import { FolderType } from "./MailboxFolders";
import { useAuth } from "@/hooks/useAuth";

interface EmailListProps {
  emails: ReportEmail[];
  isLoading: boolean;
  folder: FolderType;
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function EmailList({
  emails,
  isLoading,
  folder,
  selectedId,
  onSelect,
  searchQuery,
  onSearchChange,
}: EmailListProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [showInternalOnly, setShowInternalOnly] = useState(false);

  const filteredEmails = useMemo(() => {
    let result = emails;

    // Filter by folder
    if (folder === "sent") {
      // Show emails sent by current user
      result = result.filter(
        (e) => e.sent_by === userId && e.status === "sent" && !(e as any).is_archived && !(e as any).is_deleted
      );
    } else if (folder === "failed") {
      result = result.filter((e) => e.status === "failed" && !(e as any).is_archived && !(e as any).is_deleted);
    } else if (folder === "inbox") {
      // Show emails received by current user (where they are in recipient_user_ids)
      result = result.filter(
        (e) => 
          userId && 
          e.recipient_user_ids?.includes(userId) && 
          !(e as any).is_archived && 
          !(e as any).is_deleted
      );
    } else if (folder === "archive") {
      result = result.filter((e) => (e as any).is_archived && !(e as any).is_deleted);
    } else if (folder === "trash") {
      result = result.filter((e) => (e as any).is_deleted);
    } else if (folder === "all") {
      result = result.filter((e) => !(e as any).is_archived && !(e as any).is_deleted);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.subject.toLowerCase().includes(query) ||
          e.recipients.some((r) => r.toLowerCase().includes(query)) ||
          (e.from_user_name && e.from_user_name.toLowerCase().includes(query))
      );
    }

    if (showUnreadOnly) {
      result = result.filter((e) => !(e as any).is_read);
    }

    if (showInternalOnly) {
      result = result.filter((e) => e.message_type === "internal");
    }

    return result;
  }, [emails, folder, searchQuery, userId, showUnreadOnly, showInternalOnly]);

  const groupedEmails = useMemo(() => {
    const groups: { label: string; emails: ReportEmail[] }[] = [];
    const today: ReportEmail[] = [];
    const yesterday: ReportEmail[] = [];
    const thisWeek: ReportEmail[] = [];
    const older: ReportEmail[] = [];

    filteredEmails.forEach((email) => {
      const date = parseISO(email.sent_at);
      if (isToday(date)) {
        today.push(email);
      } else if (isYesterday(date)) {
        yesterday.push(email);
      } else if (isThisWeek(date)) {
        thisWeek.push(email);
      } else {
        older.push(email);
      }
    });

    if (today.length > 0) groups.push({ label: "Today", emails: today });
    if (yesterday.length > 0) groups.push({ label: "Yesterday", emails: yesterday });
    if (thisWeek.length > 0) groups.push({ label: "This Week", emails: thisWeek });
    if (older.length > 0) groups.push({ label: "Earlier", emails: older });

    return groups;
  }, [filteredEmails]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case "failed":
        return <XCircle className="h-3.5 w-3.5 text-red-500" />;
      case "pending":
        return <Clock className="h-3.5 w-3.5 text-amber-500" />;
      default:
        return null;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) {
      return format(date, "h:mm a");
    }
    if (isYesterday(date)) {
      return "Yesterday";
    }
    if (isThisWeek(date)) {
      return format(date, "EEE");
    }
    return format(date, "MMM d");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full border-x">
        <div className="p-3 border-b">
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex-1 p-3 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border-x">
      <div className="p-3 border-b space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={showUnreadOnly ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowUnreadOnly((prev) => !prev)}
          >
            <Filter className="h-3 w-3 mr-1" />
            Unread
          </Button>
          <Button
            type="button"
            variant={showInternalOnly ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowInternalOnly((prev) => !prev)}
          >
            <Users className="h-3 w-3 mr-1" />
            Internal
          </Button>
          {(showUnreadOnly || showInternalOnly) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setShowUnreadOnly(false);
                setShowInternalOnly(false);
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        {filteredEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Mail className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-1">No emails</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? "No emails match your search"
                : "No emails in this folder"}
            </p>
          </div>
        ) : (
          <div>
            {groupedEmails.map((group) => (
              <div key={group.label}>
                <div className="px-4 py-2 bg-muted/50 border-b sticky top-0">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </span>
                </div>
                {group.emails.map((email) => {
                  const isInternal = email.message_type === "internal";
                  const isReceived = userId && email.recipient_user_ids?.includes(userId);
                  const displayFrom = isReceived && email.from_user_name 
                    ? email.from_user_name 
                    : null;

                  return (
                    <button
                      key={email.id}
                      onClick={() => onSelect(email.id)}
                      className={cn(
                        "w-full text-left px-4 py-3 border-b transition-colors",
                        selectedId === email.id
                          ? "bg-primary/10 border-l-2 border-l-primary"
                          : "hover:bg-muted/50",
                        !(email as any).is_read && "bg-accent/30"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 pt-0.5">
                          {!(email as any).is_read && (
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {isInternal ? (
                                <Users className="h-3.5 w-3.5 text-blue-500" />
                              ) : (
                                getStatusIcon(email.status)
                              )}
                              <span
                                className={cn(
                                  "truncate text-sm",
                                  !(email as any).is_read && "font-semibold"
                                )}
                              >
                                {email.subject}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formatTime(email.sent_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground truncate">
                              {displayFrom 
                                ? `From: ${displayFrom}`
                                : `To: ${email.recipients.join(", ")}`
                              }
                            </span>
                            {(email as any).attachment_filename && (
                              <Paperclip className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            )}
                            {isInternal && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                Internal
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
