import { useState } from "react";
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
import { X, Search, Loader2 } from "lucide-react";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Participants */}
          <div className="space-y-2">
            <Label>To</Label>
            
            {/* Selected users */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedUsers.map((user) => (
                  <Badge
                    key={user.user_id}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {user.full_name || "Unknown"}
                    <button
                      onClick={() => handleRemoveUser(user.user_id)}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search team members..."
                className="pl-9"
              />
            </div>

            {/* Search results */}
            {searchQuery && (
              <ScrollArea className="h-40 border rounded-md">
                {searching ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : filteredResults && filteredResults.length > 0 ? (
                  <div className="p-1">
                    {filteredResults.map((profile) => (
                      <button
                        key={profile.user_id}
                        onClick={() =>
                          handleSelectUser({
                            user_id: profile.user_id,
                            full_name: profile.full_name,
                            avatar_url: profile.avatar_url,
                          })
                        }
                        className="w-full flex items-center gap-2 p-2 hover:bg-muted rounded-md text-left"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
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
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    No users found
                  </div>
                )}
              </ScrollArea>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What's this about?"
            />
          </div>

          {/* Initial message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Start the conversation..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                !subject.trim() ||
                selectedUsers.length === 0 ||
                createThread.isPending
              }
            >
              {createThread.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Start Conversation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
