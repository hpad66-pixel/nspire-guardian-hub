import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useThreadsWithDetails } from "@/hooks/useMessageThreads";
import { useThreadMessages, useThreadRealtime } from "@/hooks/useThreadMessages";
import { useMarkThreadRead } from "@/hooks/useThreadReadStatus";
import { ThreadList } from "@/components/messages/ThreadList";
import { ThreadConversation } from "@/components/messages/ThreadConversation";
import { ThreadParticipants } from "@/components/messages/ThreadParticipants";
import { NewThreadDialog } from "@/components/messages/NewThreadDialog";
import { Button } from "@/components/ui/button";
import { Plus, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export default function MessagesPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [showNewThread, setShowNewThread] = useState(false);
  const [showParticipants, setShowParticipants] = useState(!isMobile);
  const [mobileView, setMobileView] = useState<"list" | "conversation">("list");

  const { data: threads, isLoading: threadsLoading } = useThreadsWithDetails();
  const { data: messages, isLoading: messagesLoading } = useThreadMessages(threadId ?? null);
  const markRead = useMarkThreadRead();

  // Subscribe to realtime updates for the selected thread
  useThreadRealtime(threadId ?? null);

  // Get the selected thread details
  const selectedThread = threads?.find((t) => t.id === threadId);

  // Mark thread as read when viewing it
  useEffect(() => {
    if (threadId && user?.id) {
      markRead.mutate(threadId);
    }
  }, [threadId, user?.id]);

  // Handle thread selection
  const handleSelectThread = (id: string) => {
    navigate(`/messages/${id}`);
    if (isMobile) {
      setMobileView("conversation");
    }
  };

  // Handle back button on mobile
  const handleBack = () => {
    setMobileView("list");
    navigate("/messages");
  };

  // Handle new thread created
  const handleThreadCreated = (newThreadId: string) => {
    setShowNewThread(false);
    navigate(`/messages/${newThreadId}`);
    if (isMobile) {
      setMobileView("conversation");
    }
  };

  // Mobile layout
  if (isMobile) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {mobileView === "list" ? (
          <>
            <div className="flex items-center justify-between p-4 border-b">
              <h1 className="text-xl font-semibold">Messages</h1>
              <Button onClick={() => setShowNewThread(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </div>
            <ThreadList
              threads={threads ?? []}
              selectedThreadId={threadId}
              onSelectThread={handleSelectThread}
              isLoading={threadsLoading}
              currentUserId={user?.id}
            />
          </>
        ) : (
          <ThreadConversation
            thread={selectedThread}
            messages={messages ?? []}
            isLoading={messagesLoading}
            currentUserId={user?.id}
            onBack={handleBack}
            isMobile={isMobile}
          />
        )}

        <NewThreadDialog
          open={showNewThread}
          onOpenChange={setShowNewThread}
          onThreadCreated={handleThreadCreated}
        />
      </div>
    );
  }

  // Desktop layout - three panel
  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Thread List Panel */}
      <div className="w-80 border-r flex flex-col bg-background">
        <div className="flex items-center justify-between p-4 border-b">
          <h1 className="text-lg font-semibold">Messages</h1>
          <Button onClick={() => setShowNewThread(true)} size="sm" variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ThreadList
          threads={threads ?? []}
          selectedThreadId={threadId}
          onSelectThread={handleSelectThread}
          isLoading={threadsLoading}
          currentUserId={user?.id}
        />
      </div>

      {/* Conversation Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {threadId ? (
          <ThreadConversation
            thread={selectedThread}
            messages={messages ?? []}
            isLoading={messagesLoading}
            currentUserId={user?.id}
            isMobile={false}
            rightPanelToggle={
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowParticipants(!showParticipants)}
                className="h-8 w-8"
              >
                {showParticipants ? (
                  <PanelRightClose className="h-4 w-4" />
                ) : (
                  <PanelRightOpen className="h-4 w-4" />
                )}
              </Button>
            }
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg">Select a conversation</p>
              <p className="text-sm mt-1">or start a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* Participants Panel */}
      {showParticipants && threadId && selectedThread && (
        <div className="w-64 border-l bg-background">
          <ThreadParticipants
            thread={selectedThread}
            currentUserId={user?.id}
          />
        </div>
      )}

      <NewThreadDialog
        open={showNewThread}
        onOpenChange={setShowNewThread}
        onThreadCreated={handleThreadCreated}
      />
    </div>
  );
}
