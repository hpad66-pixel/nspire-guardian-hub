import { useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  AlertCircle, ArrowRight, Camera, CheckCircle2, Clock3, History, Images,
  Loader2, Lock, MapPin, MessageCircle, RotateCcw, Send, ShieldCheck, UserRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { VoiceDictationTextareaWithAI } from '@/components/ui/voice-dictation-textarea-ai';
import { AccountabilityPhotoViewer } from './AccountabilityPhotoViewer';
import {
  useFieldAccountability,
  type FieldBallInCourt,
  type FieldEvidenceType,
  type FieldItem,
  type FieldStatus,
} from '@/hooks/useFieldAccountability';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_LABELS: Record<FieldStatus, string> = {
  needs_triage: 'Needs triage', assigned: 'Assigned', in_progress: 'In progress',
  ready_for_review: 'Ready for review', verified: 'Verified', reopened: 'Reopened',
  deferred: 'Deferred', rejected: 'Rejected',
};

const BALL_LABELS: Record<FieldBallInCourt, string> = {
  apas: 'APAS / consultant', property_management: 'Property management', maintenance: 'Maintenance crew', owner: 'Owner', vendor: 'Vendor',
};

const EVIDENCE_LABELS: Record<FieldEvidenceType, string> = {
  observation: 'Observation', before: 'Before', progress: 'Progress', after: 'After',
};

interface FieldAccountabilityDetailProps {
  item: FieldItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portalMode?: 'staff' | 'owner';
}

export function FieldAccountabilityDetail({ item, open, onOpenChange, portalMode = 'staff' }: FieldAccountabilityDetailProps) {
  const projectId = item?.project_id ?? null;
  const { uploadPhotos, addComment, addAnnotation, transitionItem, updateItem } = useFieldAccountability(projectId);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const [comment, setComment] = useState('');
  const [commentVisibility, setCommentVisibility] = useState<'owner' | 'internal'>('owner');
  const [commentPhotoId, setCommentPhotoId] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const [evidenceType, setEvidenceType] = useState<FieldEvidenceType>('after');

  const photosByType = useMemo(() => {
    const map: Record<FieldEvidenceType, typeof item.photos> = { observation: [], before: [], progress: [], after: [] };
    item?.photos.forEach((photo) => map[photo.evidence_type].push(photo));
    return map;
  }, [item]);

  if (!item) return null;

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (evidenceType === 'after' && photosByType.after.length + selected.length > 3) {
      toast.error(`Add no more than ${3 - photosByType.after.length} additional after photo${3 - photosByType.after.length === 1 ? '' : 's'}.`);
      return;
    }
    try {
      await uploadPhotos.mutateAsync({ itemId: item.id, visitId: item.visit_id, evidenceType, files: selected.map((file) => ({ file })) });
      toast.success(`${selected.length} ${EVIDENCE_LABELS[evidenceType].toLowerCase()} photo${selected.length === 1 ? '' : 's'} added`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Evidence upload failed');
    }
  }

  async function transition(status: FieldStatus, note?: string) {
    try {
      await transitionItem.mutateAsync({ itemId: item.id, status, note });
      toast.success(status === 'verified' ? 'Work verified' : `Item moved to ${STATUS_LABELS[status].toLowerCase()}`);
      setReopenReason('');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Status could not be changed');
    }
  }

  async function submitComment() {
    if (!comment.trim()) return;
    try {
      await addComment.mutateAsync({ itemId: item.id, body: comment, visibility: portalMode === 'owner' ? 'owner' : commentVisibility, photoId: commentPhotoId });
      setComment('');
      setCommentPhotoId(null);
      toast.success('Comment added');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Comment could not be added');
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl">
        <div className="sticky top-0 z-20 border-b bg-white/95 px-5 py-5 backdrop-blur sm:px-7">
          <SheetHeader className="pr-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={item.status === 'verified' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : 'bg-amber-100 text-amber-800 hover:bg-amber-100'}>{STATUS_LABELS[item.status]}</Badge>
              <span className="text-xs font-semibold text-muted-foreground">FA-{String(item.item_number).padStart(4, '0')}</span>
              {item.repeat_count > 0 && <Badge variant="destructive">Repeat ×{item.repeat_count + 1}</Badge>}
            </div>
            <SheetTitle className="font-display text-2xl text-[#082b23]">{item.title}</SheetTitle>
            <SheetDescription>{item.description || 'No additional observation note was provided.'}</SheetDescription>
          </SheetHeader>
        </div>

        <div className="space-y-7 p-5 pb-24 sm:p-7">
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InfoTile icon={MapPin} label="Location" value={item.location_label || 'Not specified'} />
            <InfoTile icon={AlertCircle} label="Severity" value={item.severity} />
            <InfoTile icon={UserRound} label="Ball in court" value={BALL_LABELS[item.ball_in_court]} />
            <InfoTile icon={Clock3} label="Due" value={item.due_date ? format(new Date(`${item.due_date}T12:00:00`), 'MMM d, yyyy') : 'No due date'} />
          </section>

          {portalMode === 'staff' && (
            <section className="space-y-3 rounded-2xl border bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div><h3 className="text-sm font-semibold">Responsibility controls</h3><p className="text-xs text-muted-foreground">Update the current ball-in-court without changing the evidence.</p></div>
                <Select value={item.ball_in_court} onValueChange={(value) => updateItem.mutate({ itemId: item.id, patch: { ball_in_court: value as FieldBallInCourt } })}>
                  <SelectTrigger className="w-[190px] bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(BALL_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-4 border-t pt-3"><div><p className="text-sm font-medium">Owner acceptance required</p><p className="text-xs text-muted-foreground">Use for critical, repeat, or owner-originated work.</p></div><Switch checked={item.owner_verification_required} onCheckedChange={(checked) => updateItem.mutate({ itemId: item.id, patch: { owner_verification_required: checked } })} /></div>
            </section>
          )}

          <section className="space-y-4">
            <div className="flex items-center justify-between"><div><h3 className="font-display text-xl text-[#082b23]">Photographic evidence</h3><p className="text-xs text-muted-foreground">Open any photograph to inspect details, place a pin, or ask a question.</p></div>{portalMode === 'staff' && <Badge variant="outline">{item.photos.length} total</Badge>}</div>
            {(['observation', 'before', 'progress'] as FieldEvidenceType[]).map((type) => photosByType[type].length > 0 && (
              <EvidenceLane key={type} title={EVIDENCE_LABELS[type]} photos={photosByType[type]} item={item} onAnnotate={async (input) => addAnnotation.mutateAsync({ itemId: item.id, ...input })} onAsk={(photoId) => { setCommentPhotoId(photoId); setTimeout(() => commentRef.current?.focus(), 100); }} />
            ))}

            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/40 p-4">
              <div className="mb-3 flex items-center justify-between gap-3"><div><h4 className="font-semibold text-emerald-950">After / completion proof</h4><p className="text-xs text-emerald-800/70">Minimum 1 · maximum 3 photographs</p></div><span className="text-sm font-bold text-emerald-800">{photosByType.after.length}/3</span></div>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((slot) => photosByType.after[slot] ? (
                  <AccountabilityPhotoViewer key={photosByType.after[slot].id} link={photosByType.after[slot]} annotations={item.annotations} compact onAnnotate={async (input) => addAnnotation.mutateAsync({ itemId: item.id, ...input })} onAsk={(photoId) => { setCommentPhotoId(photoId); setTimeout(() => commentRef.current?.focus(), 100); }} />
                ) : (
                  <button key={slot} type="button" disabled={portalMode === 'owner'} onClick={() => { setEvidenceType('after'); cameraRef.current?.click(); }} className="aspect-[4/3] rounded-2xl border-2 border-dashed border-emerald-200 bg-white/70 text-center text-emerald-800 transition hover:border-emerald-400 disabled:cursor-default disabled:opacity-60"><Camera className="mx-auto h-5 w-5" /><span className="mt-1 block text-[10px] font-semibold">Proof {slot + 1}</span></button>
                ))}
              </div>
            </div>

            {portalMode === 'staff' && (
              <div className="flex flex-wrap items-center gap-2">
                <Select value={evidenceType} onValueChange={(value) => setEvidenceType(value as FieldEvidenceType)}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(EVIDENCE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
                <Button variant="outline" onClick={() => cameraRef.current?.click()}><Camera className="mr-2 h-4 w-4" /> Camera</Button>
                <Button variant="outline" onClick={() => libraryRef.current?.click()}><Images className="mr-2 h-4 w-4" /> Photo library</Button>
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { void upload(event.target.files); event.currentTarget.value = ''; }} />
                <input ref={libraryRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => { void upload(event.target.files); event.currentTarget.value = ''; }} />
              </div>
            )}
          </section>

          <section className="space-y-3" id="field-conversation">
            <div className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-[#0d6b57]" /><h3 className="font-display text-xl text-[#082b23]">Conversation</h3></div>
            {item.comments.length === 0 ? <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No questions or updates yet. Keep the conversation attached to the evidence.</p> : (
              <div className="space-y-2">
                {item.comments.map((entry) => (
                  <div key={entry.id} className={cn('rounded-2xl border p-3', entry.visibility === 'internal' ? 'border-amber-200 bg-amber-50/60' : 'bg-white')}>
                    <div className="mb-1 flex items-center justify-between gap-3"><span className="text-xs font-semibold">{entry.author_id.slice(0, 8)}</span><span className="flex items-center gap-1 text-[10px] text-muted-foreground">{entry.visibility === 'internal' && <Lock className="h-3 w-3" />}{new Date(entry.created_at).toLocaleString()}</span></div>
                    <p className="text-sm leading-relaxed">{entry.body}</p>
                    {entry.photo_id && <span className="mt-2 inline-flex text-[10px] font-semibold text-sky-700">Attached to a photograph</span>}
                  </div>
                ))}
              </div>
            )}
            {commentPhotoId && <div className="flex items-center justify-between rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-800"><span>Question will be linked to the selected photograph.</span><button onClick={() => setCommentPhotoId(null)}>Remove link</button></div>}
            <VoiceDictationTextareaWithAI ref={commentRef} value={comment} onValueChange={setComment} context="site_photo" placeholder={portalMode === 'owner' ? 'Ask a question or explain why work should be reopened…' : 'Add an update, answer, or completion note…'} className="min-h-28" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              {portalMode === 'staff' ? <label className="flex items-center gap-2 text-xs text-muted-foreground"><Switch checked={commentVisibility === 'owner'} onCheckedChange={(checked) => setCommentVisibility(checked ? 'owner' : 'internal')} />Visible to owner</label> : <span className="text-xs text-muted-foreground">Shared with the project team</span>}
              <Button onClick={submitComment} disabled={!comment.trim() || addComment.isPending} className="bg-[#0d6b57] hover:bg-[#095746]"><Send className="mr-2 h-4 w-4" />Add comment</Button>
            </div>
          </section>

          <section className="space-y-3 rounded-3xl border p-4 sm:p-5">
            <div className="flex items-center gap-2"><History className="h-5 w-5 text-[#0d6b57]" /><h3 className="font-display text-xl text-[#082b23]">Accountability trail</h3></div>
            <div className="space-y-3">
              {item.events.map((event) => (
                <div key={event.id} className="grid grid-cols-[10px_1fr] gap-3 text-sm"><span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" /><div><p className="font-medium">{event.action === 'created' ? 'Item created' : event.action === 'status_note' ? event.note : `${event.from_status ? STATUS_LABELS[event.from_status as FieldStatus] || event.from_status : 'New'} → ${event.to_status ? STATUS_LABELS[event.to_status as FieldStatus] || event.to_status : ''}`}</p><p className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</p></div></div>
              ))}
            </div>
          </section>

          {portalMode === 'staff' ? (
            <section className="sticky bottom-3 rounded-2xl border bg-white/95 p-3 shadow-xl backdrop-blur">
              <div className="flex flex-wrap gap-2">
                {item.status === 'assigned' && <Button onClick={() => transition('in_progress')}><ArrowRight className="mr-2 h-4 w-4" />Start work</Button>}
                {['assigned', 'in_progress', 'reopened'].includes(item.status) && <Button onClick={() => transition('ready_for_review')} className="bg-amber-500 text-amber-950 hover:bg-amber-400"><ShieldCheck className="mr-2 h-4 w-4" />Submit for review</Button>}
                {item.status === 'ready_for_review' && !item.owner_verification_required && <Button onClick={() => transition('verified')} className="bg-emerald-700 hover:bg-emerald-600"><CheckCircle2 className="mr-2 h-4 w-4" />Verify complete</Button>}
                {item.status === 'ready_for_review' && item.owner_verification_required && <span className="flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800"><ShieldCheck className="h-4 w-4" />Waiting for owner acceptance</span>}
              </div>
            </section>
          ) : item.status === 'ready_for_review' && item.owner_verification_required ? (
            <section className="sticky bottom-3 space-y-3 rounded-2xl border border-emerald-200 bg-white/95 p-4 shadow-xl backdrop-blur">
              <p className="text-sm font-semibold text-[#082b23]">Your acceptance is requested</p>
              <div className="flex flex-wrap gap-2"><Button onClick={() => transition('verified')} className="bg-emerald-700 hover:bg-emerald-600"><CheckCircle2 className="mr-2 h-4 w-4" />Accept work</Button><Button variant="outline" onClick={() => document.getElementById('owner-reopen-reason')?.focus()}><RotateCcw className="mr-2 h-4 w-4" />Reopen</Button></div>
              <div className="flex gap-2"><Input id="owner-reopen-reason" value={reopenReason} onChange={(event) => setReopenReason(event.target.value)} placeholder="Required reason to reopen…" /><Button variant="destructive" disabled={reopenReason.trim().length < 3} onClick={() => transition('reopened', reopenReason)}>Send back</Button></div>
            </section>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return <div className="min-w-0 rounded-2xl border bg-white p-3"><Icon className="mb-2 h-4 w-4 text-[#0d6b57]" /><p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">{label}</p><p className="mt-0.5 truncate text-sm font-semibold capitalize text-[#082b23]" title={value}>{value.replace(/_/g, ' ')}</p></div>;
}

function EvidenceLane({ title, photos, item, onAnnotate, onAsk }: { title: string; photos: FieldItem['photos']; item: FieldItem; onAnnotate: (input: { photoId: string; x: number; y: number; label: string }) => Promise<unknown>; onAsk: (photoId: string) => void }) {
  return <div><h4 className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">{title}</h4><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{photos.map((photo) => <AccountabilityPhotoViewer key={photo.id} link={photo} annotations={item.annotations} compact onAnnotate={onAnnotate} onAsk={onAsk} />)}</div></div>;
}
