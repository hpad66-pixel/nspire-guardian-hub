import { useState } from "react";
import { useReportEmails, useReportEmailStats, ReportEmail } from "@/hooks/useReportEmails";
import { useProfiles } from "@/hooks/useProfiles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mail,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Inbox as InboxIcon,
} from "lucide-react";
import { format, parseISO, isToday, isYesterday, isThisWeek } from "date-fns";
import { cn } from "@/lib/utils";

export default function ReportInboxPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: emails = [], isLoading } = useReportEmails({
    status: statusFilter,
    search: searchQuery || undefined,
  });
  const { data: stats } = useReportEmailStats();
  const { data: profiles = [] } = useProfiles();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Sent
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Failed
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) {
      return format(date, "h:mm a");
    }
    if (isYesterday(date)) {
      return "Yesterday";
    }
    if (isThisWeek(date)) {
      return format(date, "EEEE");
    }
    return format(date, "MMM d");
  };

  const getSenderName = (sentBy: string | null) => {
    if (!sentBy) return "System";
    const profile = profiles.find((p) => p.user_id === sentBy);
    return profile?.full_name || profile?.email || "Unknown";
  };

  const groupEmailsByDate = (emails: ReportEmail[]) => {
    const groups: { label: string; emails: ReportEmail[] }[] = [];
    const today: ReportEmail[] = [];
    const yesterday: ReportEmail[] = [];
    const thisWeek: ReportEmail[] = [];
    const older: ReportEmail[] = [];

    emails.forEach((email) => {
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
  };

  const emailGroups = groupEmailsByDate(emails);

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Report Inbox</h1>
              <p className="text-sm text-muted-foreground">
                Track all sent inspection reports
              </p>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>{stats.sent} Sent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <XCircle className="h-4 w-4 text-red-500" />
                <span>{stats.failed} Failed</span>
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by subject or recipient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="sent" className="gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Sent
              </TabsTrigger>
              <TabsTrigger value="failed" className="gap-1.5">
                <XCircle className="h-3.5 w-3.5" />
                Failed
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Email List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-4 p-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <InboxIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-1">No emails found</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {searchQuery
                    ? "No emails match your search criteria"
                    : "When you send inspection reports via email, they'll appear here"}
                </p>
              </div>
            ) : (
              <div>
                {emailGroups.map((group) => (
                  <div key={group.label}>
                    <div className="px-4 py-2 bg-muted/50 border-b">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {group.label}
                      </span>
                    </div>
                    {group.emails.map((email, index) => (
                      <div
                        key={email.id}
                        className={cn(
                          "flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors cursor-pointer",
                          index !== group.emails.length - 1 && "border-b"
                        )}
                      >
                        <div className="pt-1">{getStatusIcon(email.status)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-medium truncate">{email.subject}</h4>
                              <p className="text-sm text-muted-foreground truncate">
                                To: {email.recipients.join(", ")}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {getStatusBadge(email.status)}
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatRelativeTime(email.sent_at)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              Sent by {getSenderName(email.sent_by)}
                            </span>
                            {email.error_message && (
                              <span className="text-xs text-red-500 truncate">
                                • {email.error_message}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer stats */}
        {emails.length > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            Showing {emails.length} email{emails.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
