import { useState } from "react";
import { motion } from "framer-motion";
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
import { UserPlus, Search, Archive, Loader2, Users, Crown, Circle } from "lucide-react";
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

  const isCreator = (userId: string) => userId === thread.created_by;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col h-full"
    >
      {/* Premium Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Participants</h3>
            <p className="text-xs text-muted-foreground">
              {thread.participants?.length || 0} members
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {thread.participants?.map((participant, index) => {
            const isCurrentUser = participant.user_id === currentUserId;
            const isThreadCreator = isCreator(participant.user_id);
            // Simulate online status for demo
            const isOnline = index < 2;

            return (
              <motion.div
                key={participant.user_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent/50 transition-colors group cursor-pointer"
              >
                {/* Avatar with status */}
                <div className="relative">
                  <Avatar className="h-9 w-9 ring-2 ring-background shadow-sm">
                    <AvatarImage src={participant.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-xs font-medium">
                      {getInitials(participant.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online indicator */}
                  <span 
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${
                      isOnline ? "bg-emerald-500" : "bg-muted-foreground/30"
                    }`} 
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-sm truncate">
                      {participant.full_name || "Unknown"}
                    </span>
                    {isCurrentUser && (
                      <span className="text-[10px] text-muted-foreground">(you)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {isThreadCreator && (
                      <Badge 
                        variant="secondary" 
                        className="h-4 text-[9px] px-1.5 bg-amber-500/10 text-amber-600 border-0"
                      >
                        <Crown className="h-2.5 w-2.5 mr-0.5" />
                        Creator
                      </Badge>
                    )}
                    <span className={`flex items-center gap-1 text-[10px] ${isOnline ? "text-emerald-600" : "text-muted-foreground"}`}>
                      <Circle className={`h-1.5 w-1.5 ${isOnline ? "fill-emerald-500" : "fill-muted-foreground/30"}`} />
                      {isOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-3 border-t space-y-2 bg-muted/20">
        {/* Add participant button */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full rounded-xl border-dashed">
              <UserPlus className="h-4 w-4 mr-2" />
              Add People
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Add Participant
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search team members..."
                  className="pl-9 rounded-xl border-border/50 bg-muted/30 focus:bg-background"
                />
              </div>

              <ScrollArea className="h-60 rounded-xl border bg-muted/20">
                {searching ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : filteredResults && filteredResults.length > 0 ? (
                  <div className="p-2 space-y-1">
                    {filteredResults.map((profile, index) => (
                      <motion.button
                        key={profile.user_id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => handleAddParticipant(profile.user_id)}
                        disabled={addParticipant.isPending}
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
                            {profile.email}
                          </p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                ) : searchQuery ? (
                  <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground">
                    <Search className="h-5 w-5 mb-2 opacity-50" />
                    No users found
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground">
                    <Search className="h-5 w-5 mb-2 opacity-50" />
                    Type to search
                  </div>
                )}
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>

        <Separator className="bg-border/50" />

        {/* Archive button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground hover:text-destructive rounded-xl"
          onClick={handleArchive}
          disabled={archiveThread.isPending}
        >
          <Archive className="h-4 w-4 mr-2" />
          Archive Conversation
        </Button>
      </div>
    </motion.div>
  );
}
