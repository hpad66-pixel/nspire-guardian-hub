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
import { ComposeEmailDialog } from "@/components/inbox/ComposeEmailDialog";
import { Button } from "@/components/ui/button";
import { Plus, Mail, Sparkles, Send, Inbox } from "lucide-react";
import { motion } from "framer-motion";

export default function MailboxPage() {
  const [folder, setFolder] = useState<FolderType>("sent");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);

  const isMobile = useIsMobile();
  const { data: emails = [], isLoading } = useReportEmails({});
  const { data: stats } = useReportEmailStats();

  const handleSelectEmail = (id: string) => {
    setSelectedEmailId(id);
    if (isMobile) {
      setMobileSheetOpen(true);
    }
  };

  const handleEmailDeleted = () => {
    setSelectedEmailId(null);
  };

  if (isMobile) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Mobile Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b"
        >
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold">Mailbox</h1>
                  <p className="text-xs text-muted-foreground">
                    {stats?.total || 0} messages
                  </p>
                </div>
              </div>
              <Button onClick={() => setComposeOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Compose
              </Button>
            </div>
          </div>
          
          {/* Folder tabs */}
          <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
            {(["sent", "archive", "trash", "all"] as FolderType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFolder(f)}
                className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all ${
                  folder === f
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 hover:bg-muted text-muted-foreground"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </motion.div>

        <div className="flex-1 overflow-hidden">
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
          onEmailDeleted={handleEmailDeleted}
        />
        <ComposeEmailDialog open={composeOpen} onOpenChange={setComposeOpen} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Desktop Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b bg-gradient-to-r from-primary/5 via-background to-background"
      >
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
                <Mail className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">Mailbox</h1>
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Manage all your communications in one place
                </p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600">
                  <Send className="h-3.5 w-3.5" />
                  <span className="font-medium">{stats?.sent || 0} sent</span>
                </div>
                {(stats?.failed || 0) > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive">
                    <span className="font-medium">{stats.failed} failed</span>
                  </div>
                )}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-muted-foreground">
                  <Inbox className="h-3.5 w-3.5" />
                  <span className="font-medium">{stats?.total || 0} total</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={18} minSize={15} maxSize={25}>
            <MailboxFolders
              currentFolder={folder}
              onFolderChange={setFolder}
              folderCounts={stats}
              onCompose={() => setComposeOpen(true)}
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
            <EmailPreview emailId={selectedEmailId} onEmailDeleted={handleEmailDeleted} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <ComposeEmailDialog open={composeOpen} onOpenChange={setComposeOpen} />
    </div>
  );
}
