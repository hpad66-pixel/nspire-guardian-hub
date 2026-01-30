import { useState, useRef, useEffect } from 'react';
import { useIssueComments, useCreateIssueComment, IssueComment } from '@/hooks/useIssueComments';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface IssueConversationProps {
  issueId: string;
}

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return '?';
}

function CommentItem({ comment, isCurrentUser }: { comment: IssueComment; isCurrentUser: boolean }) {
  const initials = getInitials(comment.user?.full_name ?? null, comment.user?.email ?? null);
  const displayName = comment.user?.full_name || comment.user?.email || 'Unknown';
  
  return (
    <div className={`flex gap-3 p-3 rounded-lg ${isCurrentUser ? 'bg-primary/5' : 'bg-muted/50'}`}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={comment.user?.avatar_url || undefined} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm truncate">
            {isCurrentUser ? 'You' : displayName}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
      </div>
    </div>
  );
}

export function IssueConversation({ issueId }: IssueConversationProps) {
  const { user } = useAuth();
  const { data: comments, isLoading } = useIssueComments(issueId);
  const createComment = useCreateIssueComment();
  const [newComment, setNewComment] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new comments arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);
  
  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    
    await createComment.mutateAsync({ issueId, content: newComment.trim() });
    setNewComment('');
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-medium text-sm">
          Conversation {comments && comments.length > 0 && `(${comments.length})`}
        </h3>
      </div>
      
      <ScrollArea className="flex-1 pr-2" ref={scrollRef}>
        <div className="space-y-2">
          {isLoading ? (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : comments && comments.length > 0 ? (
            comments.map((comment) => (
              <CommentItem 
                key={comment.id} 
                comment={comment} 
                isCurrentUser={comment.user_id === user?.id}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No comments yet. Start the conversation.
            </p>
          )}
        </div>
      </ScrollArea>
      
      <div className="mt-3 flex gap-2">
        <Textarea
          placeholder="Type your message..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[60px] resize-none"
        />
        <Button 
          size="icon" 
          onClick={handleSubmit}
          disabled={!newComment.trim() || createComment.isPending}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
