import { useState } from "react";
import { useReportEmails, useReportEmailStats } from "@/hooks/useReportEmails";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { MailboxFolders, FolderType } from "@/components/inbox/MailboxFolders";
import { EmailList } from "@/components/inbox/EmailList";
import { EmailPreview } from "@/components/inbox/EmailPreview";
import { EmailDetailSheet } from "@/components/inbox/EmailDetailSheet";

export default function MailboxPage() {
  const [folder, setFolder] = useState<FolderType>("sent");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const isMobile = useIsMobile();
  const { data: emails = [], isLoading } = useReportEmails({});
  const { data: stats } = useReportEmailStats();

  const handleSelectEmail = (id: string) => {
    setSelectedEmailId(id);
    if (isMobile) {
      setMobileSheetOpen(true);
    }
  };

  if (isMobile) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex-1 flex flex-col">
          <div className="border-b">
            <div className="flex overflow-x-auto gap-1 p-2">
              {(["sent", "failed", "all"] as FolderType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFolder(f)}
                  className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${
                    folder === f
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <EmailList
            emails={emails}
            isLoading={isLoading}
            folder={folder}
            selectedId={selectedEmailId}
            onSelect={handleSelectEmail}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>
        <EmailDetailSheet
          emailId={selectedEmailId}
          open={mobileSheetOpen}
          onOpenChange={setMobileSheetOpen}
        />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel defaultSize={18} minSize={15} maxSize={25}>
          <MailboxFolders
            currentFolder={folder}
            onFolderChange={setFolder}
            folderCounts={stats}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={32} minSize={25} maxSize={45}>
          <EmailList
            emails={emails}
            isLoading={isLoading}
            folder={folder}
            selectedId={selectedEmailId}
            onSelect={handleSelectEmail}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={50} minSize={30}>
          <EmailPreview emailId={selectedEmailId} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
