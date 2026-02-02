import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useThreadsWithDetails } from "@/hooks/useMessageThreads";
import { useThreadMessages, useThreadRealtime } from "@/hooks/useThreadMessages";
import { useMarkThreadRead } from "@/hooks/useThreadReadStatus";
import { ThreadList } from "@/components/messages/ThreadList";
import { ThreadConversation } from "@/components/messages/ThreadConversation";
import { ThreadParticipants } from "@/components/messages/ThreadParticipants";
import { NewThreadDialog } from "@/components/messages/NewThreadDialog";
import { Button } from "@/components/ui/button";
import { Plus, PanelRightClose, PanelRightOpen, MessageCircle, Sparkles } from "lucide-react";
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
      <div className="h-[calc(100vh-4rem)] flex flex-col bg-gradient-to-b from-muted/30 to-background">
        <AnimatePresence mode="wait">
          {mobileView === "list" ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold">Messages</h1>
                    <p className="text-xs text-muted-foreground">Team communication</p>
                  </div>
                </div>
                <Button 
                  onClick={() => setShowNewThread(true)} 
                  size="sm"
                  className="rounded-full bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/25"
                >
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
            </motion.div>
          ) : (
            <motion.div
              key="conversation"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 flex flex-col"
            >
              <ThreadConversation
                thread={selectedThread}
                messages={messages ?? []}
                isLoading={messagesLoading}
                currentUserId={user?.id}
                onBack={handleBack}
                isMobile={isMobile}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <NewThreadDialog
          open={showNewThread}
          onOpenChange={setShowNewThread}
          onThreadCreated={handleThreadCreated}
        />
      </div>
    );
  }

  // Desktop layout - three panel with premium styling
  return (
    <div className="h-[calc(100vh-4rem)] flex bg-gradient-to-br from-muted/20 via-background to-muted/10">
      {/* Thread List Panel */}
      <div className="w-80 border-r flex flex-col bg-background/50 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold">Messages</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Team Hub</p>
            </div>
          </div>
          <Button 
            onClick={() => setShowNewThread(true)} 
            size="icon" 
            className="h-9 w-9 rounded-full bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
          >
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
                className="h-9 w-9 rounded-full"
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
          <div className="flex-1 flex items-center justify-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center p-8"
            >
              <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-muted via-muted/50 to-muted/30 flex items-center justify-center mb-6 shadow-inner">
                <Sparkles className="h-12 w-12 text-muted-foreground/40" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Welcome to Messages</h2>
              <p className="text-muted-foreground max-w-sm">
                Select a conversation from the sidebar or start a new one to begin chatting with your team
              </p>
              <Button 
                onClick={() => setShowNewThread(true)}
                className="mt-6 rounded-full bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/25"
              >
                <Plus className="h-4 w-4 mr-2" />
                Start New Conversation
              </Button>
            </motion.div>
          </div>
        )}
      </div>

      {/* Participants Panel */}
      <AnimatePresence>
        {showParticipants && threadId && selectedThread && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-l bg-background/50 backdrop-blur-sm overflow-hidden"
          >
            <ThreadParticipants
              thread={selectedThread}
              currentUserId={user?.id}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <NewThreadDialog
        open={showNewThread}
        onOpenChange={setShowNewThread}
        onThreadCreated={handleThreadCreated}
      />
    </div>
  );
}
