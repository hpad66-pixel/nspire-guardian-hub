import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Search, Archive, Loader2 } from "lucide-react";
import { useSearchProfiles } from "@/hooks/useProfiles";
import { useAddParticipant, useArchiveThread, type ThreadWithLastMessage } from "@/hooks/useMessageThreads";
import { useNavigate } from "react-router-dom";

interface ThreadParticipantsProps {
  thread: ThreadWithLastMessage;
  currentUserId?: string;
}

export function ThreadParticipants({
  thread,
  currentUserId,
}: ThreadParticipantsProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const { data: searchResults, isLoading: searching } = useSearchProfiles(searchQuery);
  const addParticipant = useAddParticipant();
  const archiveThread = useArchiveThread();

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAddParticipant = (userId: string) => {
    addParticipant.mutate(
      { threadId: thread.id, userId },
      {
        onSuccess: () => {
          setShowAddDialog(false);
          setSearchQuery("");
        },
      }
    );
  };

  const handleArchive = () => {
    archiveThread.mutate(thread.id, {
      onSuccess: () => {
        navigate("/messages");
      },
    });
  };

  const filteredResults = searchResults?.filter(
    (profile) =>
      !thread.participant_ids.includes(profile.user_id)
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Participants</h3>
        <p className="text-sm text-muted-foreground">
          {thread.participants?.length || 0} members
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {thread.participants?.map((participant) => (
            <div
              key={participant.user_id}
              className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={participant.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(participant.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {participant.full_name || "Unknown"}
                </p>
                {participant.user_id === currentUserId && (
                  <Badge variant="outline" className="text-[10px] h-4">
                    You
                  </Badge>
                )}
                {participant.user_id === thread.created_by && (
                  <Badge variant="secondary" className="text-[10px] h-4 ml-1">
                    Creator
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-2 border-t space-y-2">
        {/* Add participant button */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <UserPlus className="h-4 w-4 mr-2" />
              Add People
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Participant</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search team members..."
                  className="pl-9"
                />
              </div>

              <ScrollArea className="h-60">
                {searching ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : filteredResults && filteredResults.length > 0 ? (
                  <div className="space-y-1">
                    {filteredResults.map((profile) => (
                      <button
                        key={profile.user_id}
                        onClick={() => handleAddParticipant(profile.user_id)}
                        disabled={addParticipant.isPending}
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
                            {profile.email}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : searchQuery ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    No users found
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    Type to search
                  </div>
                )}
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>

        <Separator />

        {/* Archive button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground hover:text-destructive"
          onClick={handleArchive}
          disabled={archiveThread.isPending}
        >
          <Archive className="h-4 w-4 mr-2" />
          Archive Conversation
        </Button>
      </div>
    </div>
  );
}
