import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileCheck, Clock, CheckCircle2, XCircle, RotateCcw, Mail, Pencil, Trash2 } from 'lucide-react';
import { useSubmittalsByProject, useCreateSubmittal, useUpdateSubmittal, useDeleteSubmittal } from '@/hooks/useSubmittals';
import { useUserPermissions } from '@/hooks/usePermissions';
import { SendExternalEmailDialog } from './SendExternalEmailDialog';
import type { Database } from '@/integrations/supabase/types';

type SubmittalRow = Database['public']['Tables']['project_submittals']['Row'];

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle2 }> = {
  pending: { label: 'Pending', variant: 'secondary', icon: Clock },
  approved: { label: 'Approved', variant: 'default', icon: CheckCircle2 },
  rejected: { label: 'Rejected', variant: 'destructive', icon: XCircle },
  revise: { label: 'Revise & Resubmit', variant: 'outline', icon: RotateCcw },
};

const emptyForm = { title: '', description: '', due_date: '' };

export function SubmittalsTab({ projectId, projectName = '' }: { projectId: string; projectName?: string }) {
  const { data: submittals, isLoading } = useSubmittalsByProject(projectId);
  const createMutation = useCreateSubmittal();
  const updateMutation = useUpdateSubmittal();
  const deleteMutation = useDeleteSubmittal();
  const { canUpdate, canDelete } = useUserPermissions();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [detail, setDetail] = useState<SubmittalRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SubmittalRow | null>(null);
  const [emailSubmittal, setEmailSubmittal] = useState<SubmittalRow | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (s: SubmittalRow) => {
    setEditingId(s.id);
    setForm({ title: s.title, description: s.description ?? '', due_date: s.due_date ?? '' });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, ...form, due_date: form.due_date || null });
    } else {
      await createMutation.mutateAsync({ project_id: projectId, ...form });
    }
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleStatusChange = (id: string, status: string) => {
    updateMutation.mutate({
      id,
      status: status as 'pending' | 'approved' | 'rejected' | 'revise',
      reviewed_at: new Date().toISOString(),
    });
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    await deleteMutation.mutateAsync({ id: pendingDelete.id, projectId });
    setPendingDelete(null);
    setDetail(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Submittals
            </CardTitle>
            <CardDescription>Track material and shop drawing submittals</CardDescription>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Submittal
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : !submittals?.length ? (
          <div className="text-center py-12">
            <FileCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No submittals yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {submittals.map((s) => {
              const cfg = statusConfig[s.status] || statusConfig.pending;
              const Icon = cfg.icon;
              return (
                <div key={s.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <button
                    type="button"
                    className="flex items-center gap-3 text-left flex-1 min-w-0"
                    onClick={() => setDetail(s)}
                  >
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-muted-foreground">#{s.submittal_number}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate hover:underline">{s.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {s.due_date && <span>Due {format(new Date(s.due_date), 'MMM d, yyyy')}</span>}
                        {s.revision && s.revision > 1 && <span>Rev {s.revision}</span>}
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <Badge variant={cfg.variant}>
                      <Icon className="h-3 w-3 mr-1" />
                      {cfg.label}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      title="Email Externally"
                      onClick={() => {
                        setEmailSubmittal(s);
                        setEmailDialogOpen(true);
                      }}
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Select
                      value={s.status}
                      onValueChange={(val) => handleStatusChange(s.id, val)}
                    >
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approve</SelectItem>
                        <SelectItem value="rejected">Reject</SelectItem>
                        <SelectItem value="revise">Revise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Create / Edit dialog (shared form) */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Submittal' : 'New Submittal'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="grid gap-2">
              <Label>Due Date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingId ? 'Save Changes' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail sheet */}
      <Sheet open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <SheetContent className="sm:max-w-lg">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span className="text-muted-foreground">#{detail.submittal_number}</span>
                  {detail.title}
                </SheetTitle>
                <SheetDescription>Submittal details</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-28">Status</span>
                  <Badge variant={(statusConfig[detail.status] || statusConfig.pending).variant}>
                    {(statusConfig[detail.status] || statusConfig.pending).label}
                  </Badge>
                </div>
                {detail.due_date && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-28">Due date</span>
                    <span>{format(new Date(detail.due_date), 'MMM d, yyyy')}</span>
                  </div>
                )}
                {detail.revision != null && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-28">Revision</span>
                    <span>{detail.revision}</span>
                  </div>
                )}
                {detail.description && (
                  <div>
                    <p className="text-muted-foreground mb-1">Description</p>
                    <p className="whitespace-pre-wrap">{detail.description}</p>
                  </div>
                )}
              </div>
              <div className="mt-8 flex gap-2">
                {canUpdate('projects') && (
                  <Button variant="outline" onClick={() => { const d = detail; setDetail(null); openEdit(d); }}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
                {canDelete('projects') && (
                  <Button variant="destructive" onClick={() => setPendingDelete(detail)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => { if (!o) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Submittal</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes submittal #{pendingDelete?.submittal_number} — {pendingDelete?.title}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {emailSubmittal && (
        <SendExternalEmailDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          documentType="submittal"
          documentTitle={`Submittal #${emailSubmittal.submittal_number} — ${emailSubmittal.title}`}
          documentId={emailSubmittal.id}
          projectName={projectName}
          contentHtml={`
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <tr><td style="padding:8px 12px;border:1px solid #E5E7EB;background:#F8FAFC;font-weight:600;width:140px;">Submittal #</td><td style="padding:8px 12px;border:1px solid #E5E7EB;">${emailSubmittal.submittal_number}</td></tr>
              <tr><td style="padding:8px 12px;border:1px solid #E5E7EB;background:#F8FAFC;font-weight:600;">Title</td><td style="padding:8px 12px;border:1px solid #E5E7EB;">${emailSubmittal.title}</td></tr>
              <tr><td style="padding:8px 12px;border:1px solid #E5E7EB;background:#F8FAFC;font-weight:600;">Status</td><td style="padding:8px 12px;border:1px solid #E5E7EB;">${emailSubmittal.status}</td></tr>
              ${emailSubmittal.due_date ? `<tr><td style="padding:8px 12px;border:1px solid #E5E7EB;background:#F8FAFC;font-weight:600;">Due Date</td><td style="padding:8px 12px;border:1px solid #E5E7EB;">${emailSubmittal.due_date}</td></tr>` : ''}
            </table>
          `}
        />
      )}
    </Card>
  );
}
