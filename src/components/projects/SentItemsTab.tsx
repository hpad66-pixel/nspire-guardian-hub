import { useState } from 'react';
import { format } from 'date-fns';
import { useSentItemsByProject, useDeleteSentItem, type SentItem } from '@/hooks/useSentItems';
import { useIsPlatformAdmin } from '@/hooks/useIsPlatformAdmin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Send, Mail, FileText, Trash2, Eye, CheckCircle, XCircle, Clock, Paperclip } from 'lucide-react';

const MODULE_LABELS: Record<string, string> = {
  proposals: 'Proposal',
  daily_report: 'Daily Report',
  inspection: 'Inspection',
  rfi: 'RFI',
  submittal: 'Submittal',
  change_order: 'Change Order',
  work_order: 'Work Order',
  action_items: 'Action Item',
  progress_report: 'Progress Report',
};

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; className: string }> = {
  sent: { label: 'Sent', icon: CheckCircle, className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  delivered: { label: 'Delivered', icon: CheckCircle, className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  failed: { label: 'Failed', icon: XCircle, className: 'bg-destructive/10 text-destructive border-destructive/20' },
  pending: { label: 'Pending', icon: Clock, className: 'bg-warning/10 text-warning border-warning/20' },
};

export function SentItemsTab({ projectId }: { projectId: string }) {
  const { data: items, isLoading } = useSentItemsByProject(projectId);
  const { data: isPlatformAdmin } = useIsPlatformAdmin();
  const deleteMutation = useDeleteSentItem();

  const [viewItem, setViewItem] = useState<SentItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<SentItem | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      </div>
    );
  }

  if (!items?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Send className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">No sent items yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          When you send proposals, reports, or other documents from this project, they'll appear here as an audit trail.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm">Communications Log</h3>
          <p className="text-xs text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''} sent from this project</p>
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden divide-y">
        {items.map(item => {
          const statusCfg = STATUS_CONFIG[item.status || 'sent'] || STATUS_CONFIG.sent;
          const StatusIcon = statusCfg.icon;
          const moduleLabel = MODULE_LABELS[item.source_module || ''] || item.source_module || 'Email';

          return (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => setViewItem(item)}
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium truncate">{item.subject}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {moduleLabel}
                  </Badge>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusCfg.className}`}>
                    <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
                    {statusCfg.label}
                  </Badge>
                  {item.attachment_filename && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Paperclip className="h-2.5 w-2.5" /> {item.attachment_filename}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                  <span>To: {item.recipients.join(', ')}</span>
                  <span>·</span>
                  <span>{format(new Date(item.sent_at), 'MMM d, yyyy h:mm a')}</span>
                  {item.from_user_name && (
                    <>
                      <span>·</span>
                      <span>By: {item.from_user_name}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); setViewItem(item); }}>
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                {isPlatformAdmin && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); setDeleteItem(item); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={open => !open && setViewItem(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {viewItem?.subject}
            </DialogTitle>
            <DialogDescription>
              Sent {viewItem ? format(new Date(viewItem.sent_at), 'MMMM d, yyyy \'at\' h:mm a') : ''}
            </DialogDescription>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-0.5">Recipients</p>
                  <p>{viewItem.recipients.join(', ')}</p>
                </div>
                {viewItem.cc_recipients?.length ? (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-0.5">CC</p>
                    <p>{viewItem.cc_recipients.join(', ')}</p>
                  </div>
                ) : null}
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-0.5">Sent By</p>
                  <p>{viewItem.from_user_name || 'System'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-0.5">Module</p>
                  <p>{MODULE_LABELS[viewItem.source_module || ''] || viewItem.source_module || 'Email'}</p>
                </div>
                {viewItem.error_message && (
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase tracking-widest font-semibold text-destructive mb-0.5">Error</p>
                    <p className="text-destructive text-sm">{viewItem.error_message}</p>
                  </div>
                )}
              </div>
              {viewItem.body_html ? (
                <div className="border rounded-lg p-4 bg-background">
                  <div dangerouslySetInnerHTML={{ __html: viewItem.body_html }} className="prose prose-sm max-w-none dark:prose-invert" />
                </div>
              ) : viewItem.body_text ? (
                <div className="border rounded-lg p-4 bg-background">
                  <p className="text-sm whitespace-pre-wrap">{viewItem.body_text}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No content recorded.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={open => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete sent item</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this communication record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteItem) {
                  deleteMutation.mutate({ id: deleteItem.id, projectId });
                  setDeleteItem(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
