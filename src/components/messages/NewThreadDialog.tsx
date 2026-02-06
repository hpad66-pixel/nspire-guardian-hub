import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchProfiles } from "@/hooks/useProfiles";
import { useCreateThread } from "@/hooks/useMessageThreads";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Search, Loader2, MessageCircle, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewThreadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onThreadCreated: (threadId: string) => void;
}

export function NewThreadDialog({
  open,
  onOpenChange,
  onThreadCreated,
}: NewThreadDialogProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<
    Array<{ user_id: string; full_name: string | null; avatar_url: string | null }>
  >([]);

  const { data: searchResults, isLoading: searching } = useSearchProfiles(searchQuery);
  const createThread = useCreateThread();

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSelectUser = (user: {
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
  }) => {
    if (!selectedUsers.find((u) => u.user_id === user.user_id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchQuery("");
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.user_id !== userId));
  };

  const handleCreate = () => {
    if (!subject.trim() || selectedUsers.length === 0) return;

    createThread.mutate(
      {
        subject: subject.trim(),
        participantIds: selectedUsers.map((u) => u.user_id),
        initialMessage: message.trim() || undefined,
      },
      {
        onSuccess: (thread) => {
          // Reset form
          setSubject("");
          setMessage("");
          setSelectedUsers([]);
          setSearchQuery("");
          onThreadCreated(thread.id);
        },
      }
    );
  };

  const filteredResults = searchResults?.filter(
    (profile) => !selectedUsers.find((u) => u.user_id === profile.user_id)
  );

  const canCreate = subject.trim() && selectedUsers.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg overflow-hidden">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">New Conversation</DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">Start a conversation with your team</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Participants */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              Recipients
            </Label>
            
            {/* Selected users */}
            <AnimatePresence>
              {selectedUsers.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex flex-wrap gap-2 overflow-hidden"
                >
                  {selectedUsers.map((user) => (
                    <motion.div
                      key={user.user_id}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                    >
                      <Badge
                        variant="secondary"
                        className="gap-2 py-1.5 pl-1.5 pr-2 rounded-full bg-primary/10 text-primary border-0 hover:bg-primary/20"
                      >
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                            {getInitials(user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.full_name || "Unknown"}</span>
                        <button
                          onClick={() => handleRemoveUser(user.user_id)}
                          className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search team members..."
                className="pl-9 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors"
              />
            </div>

            {/* Search results */}
            <AnimatePresence>
              {searchQuery && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <ScrollArea className="h-40 border rounded-xl bg-muted/20">
                    {searching ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    ) : filteredResults && filteredResults.length > 0 ? (
                      <div className="p-2 space-y-1">
                        {filteredResults.map((profile) => (
                          <motion.button
                            key={profile.user_id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            onClick={() =>
                              handleSelectUser({
                                user_id: profile.user_id,
                                full_name: profile.full_name,
                                avatar_url: profile.avatar_url,
                              })
                            }
                            className="w-full flex items-center gap-3 p-2.5 hover:bg-accent/50 rounded-lg text-left transition-colors"
                          >
                            <Avatar className="h-9 w-9 ring-2 ring-background">
                              <AvatarImage src={profile.avatar_url || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-xs font-medium">
                                {getInitials(profile.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {profile.full_name || "Unknown"}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {profile.email || profile.work_email}
                              </p>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground">
                        <Search className="h-5 w-5 mb-2 opacity-50" />
                        No users found
                      </div>
                    )}
                  </ScrollArea>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              Subject
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What's this conversation about?"
              className="rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors"
            />
          </div>

          {/* Initial message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Message <span className="font-normal">(optional)</span>
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Start the conversation..."
              rows={3}
              className="rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!canCreate || createThread.isPending}
              className={cn(
                "rounded-xl transition-all duration-200",
                canCreate 
                  ? "bg-gradient-to-r from-primary to-primary/90 hover:shadow-lg hover:shadow-primary/25" 
                  : ""
              )}
            >
              {createThread.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <MessageCircle className="h-4 w-4 mr-2" />
              )}
              Start Conversation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
