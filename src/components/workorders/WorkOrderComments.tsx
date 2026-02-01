import { useState } from 'react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { VoiceDictationTextareaWithAI } from '@/components/ui/voice-dictation-textarea-ai';
import { Loader2, Send, Trash2 } from 'lucide-react';
import {
  useWorkOrderComments,
  useCreateWorkOrderComment,
  useDeleteWorkOrderComment,
} from '@/hooks/useWorkOrderComments';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface WorkOrderCommentsProps {
  workOrderId: string;
}

export function WorkOrderComments({ workOrderId }: WorkOrderCommentsProps) {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  
  const { data: comments = [], isLoading } = useWorkOrderComments(workOrderId);
  const createComment = useCreateWorkOrderComment();
  const deleteComment = useDeleteWorkOrderComment();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    await createComment.mutateAsync({
      workOrderId,
      content: newComment,
    });
    setNewComment('');
  };
  
  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        Communication Thread
      </h4>
      
      {/* Comments list */}
      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No comments yet. Start the conversation below.
          </p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className={cn(
                'group p-3 rounded-lg border bg-muted/30 transition-colors',
                comment.user_id === user?.id && 'bg-primary/5 border-primary/20'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(comment.profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {comment.profile?.full_name || 'Unknown User'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </div>
                
                {comment.user_id === user?.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteComment.mutate({ id: comment.id, workOrderId })}
                    disabled={deleteComment.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* New comment form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <VoiceDictationTextareaWithAI
          value={newComment}
          onValueChange={setNewComment}
          placeholder="Type a message..."
          rows={2}
          context="notes"
          className="text-sm"
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={!newComment.trim() || createComment.isPending}
          >
            {createComment.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
