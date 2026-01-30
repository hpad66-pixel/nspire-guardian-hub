import { useState, useRef, useEffect } from 'react';
import { useIssueComments, useCreateIssueComment, IssueComment } from '@/hooks/useIssueComments';
import { useCreateIssueMentions } from '@/hooks/useIssueMentions';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { MentionInput } from './MentionInput';
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

// Highlight @mentions in comment text
function formatCommentContent(content: string): React.ReactNode {
  const mentionRegex = /@([^\s@]+(?:\s[^\s@]+)?)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    // Add the mention with styling
    parts.push(
      <span key={match.index} className="text-primary font-medium bg-primary/10 px-1 rounded">
        {match[0]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }
  
  return parts.length > 0 ? parts : content;
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
        <p className="text-sm text-foreground whitespace-pre-wrap">
          {formatCommentContent(comment.content)}
        </p>
      </div>
    </div>
  );
}

export function IssueConversation({ issueId }: IssueConversationProps) {
  const { user } = useAuth();
  const { data: comments, isLoading } = useIssueComments(issueId);
  const createComment = useCreateIssueComment();
  const createMentions = useCreateIssueMentions();
  const [newComment, setNewComment] = useState('');
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new comments arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);
  
  const handleCommentChange = (value: string, userIds: string[]) => {
    setNewComment(value);
    setMentionedUserIds(userIds);
  };
  
  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    
    const result = await createComment.mutateAsync({ issueId, content: newComment.trim() });
    
    // Create mentions if any users were tagged
    if (mentionedUserIds.length > 0 && result?.id) {
      await createMentions.mutateAsync({
        issueId,
        commentId: result.id,
        mentionedUserIds: [...new Set(mentionedUserIds)], // dedupe
      });
    }
    
    setNewComment('');
    setMentionedUserIds([]);
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
      
      <ScrollArea className="flex-1 pr-2">
        <div className="space-y-2" ref={scrollRef}>
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
        <MentionInput
          value={newComment}
          onChange={handleCommentChange}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... Use @ to tag users"
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
