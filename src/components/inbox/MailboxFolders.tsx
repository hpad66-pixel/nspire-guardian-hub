import { cn } from "@/lib/utils";
import { Inbox, Send, AlertCircle, Mail, Plus, Archive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export type FolderType = "all" | "sent" | "failed" | "inbox" | "archive" | "trash";

interface MailboxFoldersProps {
  currentFolder: FolderType;
  onFolderChange: (folder: FolderType) => void;
  folderCounts: {
    total: number;
    sent: number;
    failed: number;
    pending: number;
    unread: number;
    archived: number;
    deleted: number;
  } | undefined;
  onCompose?: () => void;
}

const folders: { id: FolderType; label: string; icon: typeof Inbox }[] = [
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "sent", label: "Sent", icon: Send },
  { id: "failed", label: "Failed", icon: AlertCircle },
  { id: "archive", label: "Archive", icon: Archive },
  { id: "trash", label: "Trash", icon: Trash2 },
  { id: "all", label: "All Mail", icon: Mail },
];

export function MailboxFolders({
  currentFolder,
  onFolderChange,
  folderCounts,
  onCompose,
}: MailboxFoldersProps) {
  const getCount = (folder: FolderType) => {
    if (!folderCounts) return 0;
    switch (folder) {
      case "sent":
        return folderCounts.sent;
      case "failed":
        return folderCounts.failed;
      case "inbox":
        return folderCounts.pending;
      case "archive":
        return folderCounts.archived || 0;
      case "trash":
        return folderCounts.deleted || 0;
      case "all":
        return folderCounts.total;
      default:
        return 0;
    }
  };

  return (
    <div className="flex flex-col h-full bg-muted/30">
      {onCompose && (
        <div className="p-4 border-b">
          <Button onClick={onCompose} className="w-full gap-2" size="lg">
            <Plus className="h-5 w-5" />
            Compose
          </Button>
        </div>
      )}

      <div className="px-4 py-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Mail className="h-3.5 w-3.5" />
          Folders
        </h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 pb-2 space-y-1">
          {folders.map((folder) => {
            const Icon = folder.icon;
            const count = getCount(folder.id);
            const isActive = currentFolder === folder.id;

            return (
              <button
                key={folder.id}
                onClick={() => onFolderChange(folder.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-foreground"
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {folder.label}
                </span>
                {count > 0 && (
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted-foreground/10 text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
