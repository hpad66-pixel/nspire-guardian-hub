import { useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleDot,
  Clock3,
  Lightbulb,
  MessageSquareText,
  PartyPopper,
  Plus,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserPermissions } from '@/hooks/usePermissions';
import {
  type ProductIdea,
  useCastProductIdeaVote,
  useCreateProductIdea,
  useProductIdeas,
  usePublishProductIdeaUpdate,
} from '@/hooks/useProductIdeas';
import {
  PRODUCT_IDEA_CATEGORIES,
  PRODUCT_IDEA_CATEGORY_LABELS,
  PRODUCT_IDEA_PROGRESS,
  PRODUCT_IDEA_STATUSES,
  PRODUCT_IDEA_STATUS_META,
  isProductIdeaRoadmapStatus,
  productIdeaProgressIndex,
  productIdeaScore,
  type ProductIdeaCategory,
  type ProductIdeaStatus,
} from '@/lib/productIdeas';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

type BoardView = 'browse' | 'mine' | 'updates';
type StatusFilter = 'all' | 'review' | 'roadmap' | 'shipped' | 'rejected';
type SortMode = 'popular' | 'newest' | 'recently_updated';

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All ideas' },
  { value: 'review', label: 'In review' },
  { value: 'roadmap', label: 'Roadmap' },
  { value: 'shipped', label: 'Executed' },
  { value: 'rejected', label: 'Decisions' },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function StatusBadge({ status }: { status: ProductIdeaStatus }) {
  const meta = PRODUCT_IDEA_STATUS_META[status];
  return (
    <Badge variant="outline" className={cn('gap-1.5 rounded-full px-2.5 py-1 font-semibold', meta.tone)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </Badge>
  );
}

const PROGRESS_CONFETTI = [
  ['4%', '#D5AA52', '0ms', '5px'],
  ['14%', '#69C2A2', '620ms', '4px'],
  ['25%', '#9F91CF', '240ms', '5px'],
  ['38%', '#94A3B8', '860ms', '4px'],
  ['51%', '#D5AA52', '420ms', '5px'],
  ['64%', '#69C2A2', '1040ms', '4px'],
  ['77%', '#9F91CF', '180ms', '5px'],
  ['89%', '#94A3B8', '740ms', '4px'],
  ['97%', '#D5AA52', '1120ms', '5px'],
] as const;

/** Small, slow celebration emitted by the fully completed progress bar. */
function ProgressBarConfetti({ condensed }: { condensed: boolean }) {
  const pieces = condensed ? PROGRESS_CONFETTI.filter((_, index) => index % 2 === 0) : PROGRESS_CONFETTI;
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-x-0 z-20 overflow-visible',
        condensed ? '-top-4 h-7' : '-top-7 h-10',
      )}
    >
      {pieces.map(([left, color, delay, size], index) => (
        <span
          key={`${left}-${index}`}
          className="product-idea-bar-confetti-piece absolute bottom-0 rounded-[1px]"
          style={{ left, backgroundColor: color, animationDelay: delay, height: size, width: size }}
        />
      ))}
    </div>
  );
}

function VoteControl({ idea, compact = false }: { idea: ProductIdea; compact?: boolean }) {
  const vote = useCastProductIdeaVote();
  const score = productIdeaScore(idea.upvotes, idea.downvotes);

  const cast = (value: -1 | 1) => vote.mutate({ ideaId: idea.id, value });

  return (
    <div
      className={cn(
        'flex items-center overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm',
        compact ? 'h-10' : 'flex-col',
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-label={idea.user_vote === 1 ? 'Remove upvote' : 'Upvote idea'}
        aria-pressed={idea.user_vote === 1}
        disabled={vote.isPending}
        onClick={() => cast(1)}
        className={cn(
          'flex items-center justify-center transition-colors hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50',
          compact ? 'h-10 w-10 border-r' : 'h-9 w-12 border-b',
          idea.user_vote === 1 && 'bg-emerald-50 text-emerald-700',
        )}
      >
        <ThumbsUp className="h-4 w-4" />
      </button>
      <div
        className={cn(
          'flex items-center justify-center font-bold tabular-nums text-foreground',
          compact ? 'h-10 min-w-11 px-2 text-sm' : 'h-9 w-12 text-sm',
        )}
        title={`${idea.upvotes} up · ${idea.downvotes} down`}
      >
        {score}
      </div>
      <button
        type="button"
        aria-label={idea.user_vote === -1 ? 'Remove downvote' : 'Downvote idea'}
        aria-pressed={idea.user_vote === -1}
        disabled={vote.isPending}
        onClick={() => cast(-1)}
        className={cn(
          'flex items-center justify-center transition-colors hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50',
          compact ? 'h-10 w-10 border-l' : 'h-9 w-12 border-t',
          idea.user_vote === -1 && 'bg-rose-50 text-rose-700',
        )}
      >
        <ThumbsDown className="h-4 w-4" />
      </button>
    </div>
  );
}

function ProgressTickler({
  status,
  condensed = false,
  onStageSelect,
}: {
  status: ProductIdeaStatus;
  condensed?: boolean;
  onStageSelect?: (status: ProductIdeaStatus) => void;
}) {
  const activeIndex = productIdeaProgressIndex(status);
  const rejected = status === 'rejected';
  const executed = status === 'shipped';

  return (
    <div className={cn('relative w-full overflow-visible', condensed ? 'max-w-[220px]' : '')}>
      {executed && <ProgressBarConfetti condensed={condensed} />}
      <div className="relative z-10 flex items-center">
        {PRODUCT_IDEA_PROGRESS.map((stage, index) => {
          const complete = !rejected && index <= activeIndex;
          const decisionPoint = rejected && index === activeIndex;
          const markerClassName = cn(
            'flex shrink-0 items-center justify-center rounded-full border-2 bg-background transition-all',
            condensed ? 'h-3.5 w-3.5' : 'h-6 w-6',
            complete && 'border-emerald-500 bg-emerald-500 text-white',
            decisionPoint && 'border-rose-500 bg-rose-500 text-white',
            !complete && !decisionPoint && 'border-border text-muted-foreground',
            onStageSelect && 'cursor-pointer hover:scale-110 hover:ring-4 hover:ring-primary/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20',
          );
          const marker = onStageSelect ? (
            <button
              type="button"
              aria-label={`Move idea to ${stage.label}`}
              title={`Move to ${stage.label}`}
              className={markerClassName}
              onClick={() => onStageSelect(stage.key)}
            >
              {!condensed && complete && <Check className="h-3.5 w-3.5 stroke-[3]" />}
              {!condensed && decisionPoint && <XCircle className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <div className={markerClassName}>
              {!condensed && complete && <Check className="h-3.5 w-3.5 stroke-[3]" />}
              {!condensed && decisionPoint && <XCircle className="h-3.5 w-3.5" />}
            </div>
          );
          return (
            <div key={stage.key} className={cn('flex items-center', index < PRODUCT_IDEA_PROGRESS.length - 1 && 'flex-1')}>
              {marker}
              {index < PRODUCT_IDEA_PROGRESS.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1',
                    index < activeIndex && !rejected && 'bg-emerald-500',
                    (index >= activeIndex || rejected) && 'bg-border',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      {!condensed && (
        <div className="mt-2 grid grid-cols-6 gap-1">
          {PRODUCT_IDEA_PROGRESS.map((stage, index) => (
            <span
              key={stage.key}
              className={cn(
                'text-center text-[10px] font-semibold leading-tight text-muted-foreground',
                index <= activeIndex && !rejected && 'text-emerald-700',
                index === activeIndex && rejected && 'text-rose-700',
              )}
            >
              {stage.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function IdeaCard({ idea, onOpen }: { idea: ProductIdea; onOpen: () => void }) {
  const latestUpdate = idea.updates[0];
  const executed = idea.status === 'shipped';
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onOpen();
      }}
      className={cn(
        'group relative grid cursor-pointer grid-cols-[auto_1fr] gap-4 overflow-hidden rounded-2xl border p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:p-5 lg:grid-cols-[auto_1fr_auto]',
        executed
          ? 'border-slate-200 bg-slate-50/90 shadow-none hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm'
          : 'border-border/70 bg-card shadow-sm hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md',
      )}
    >
      <div className="relative z-10"><VoteControl idea={idea} /></div>
      <div className="relative z-10 min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={idea.status} />
          <span className="text-xs font-semibold text-muted-foreground">
            {PRODUCT_IDEA_CATEGORY_LABELS[idea.category]}
          </span>
        </div>
        <h3 className={cn(
          'text-lg font-bold tracking-[-0.02em] transition-colors',
          executed ? 'text-slate-700 group-hover:text-slate-900' : 'text-foreground group-hover:text-primary',
        )}>
          {idea.title}
        </h3>
        <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
          {idea.description}
        </p>
        {executed && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm">
            <Trophy className="h-3.5 w-3.5 text-amber-600" /> Execution complete · +1 client improvement
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5">
              <AvatarImage src={idea.requester_avatar_url ?? undefined} />
              <AvatarFallback className="text-[8px]">{initials(idea.requester_name)}</AvatarFallback>
            </Avatar>
            <span className="font-medium text-foreground/80">{idea.requester_name}</span>
          </div>
          <span>·</span>
          <span>{formatDistanceToNow(new Date(idea.created_at), { addSuffix: true })}</span>
          {latestUpdate && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1 font-medium text-primary">
                <MessageSquareText className="h-3.5 w-3.5" />
                {idea.updates.length} team {idea.updates.length === 1 ? 'update' : 'updates'}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="relative z-10 col-span-2 flex min-w-[220px] items-center gap-3 border-t pt-4 lg:col-span-1 lg:flex-col lg:items-end lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
        <ProgressTickler status={idea.status} condensed />
        <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground group-hover:text-primary">
          View details <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </article>
  );
}

function CreateIdeaDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const create = useCreateProductIdea();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ProductIdeaCategory>('project_controls');

  const submit = async () => {
    if (!title.trim() || !description.trim()) return;
    try {
      await create.mutateAsync({ title, description, category });
      setTitle('');
      setDescription('');
      setCategory('project_controls');
      onOpenChange(false);
    } catch {
      // The hook presents the error and keeps the draft intact.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Lightbulb className="h-5 w-5" />
          </div>
          <DialogTitle className="text-2xl tracking-tight">Share a product idea</DialogTitle>
          <DialogDescription className="text-base leading-6">
            Tell us what would make your work clearer, faster, or safer. Give as much context as you need—there is no word limit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <label htmlFor="idea-title" className="text-sm font-semibold">What should Proj OS do?</label>
            <Input
              id="idea-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Example: Let owners approve pay applications from their phone"
              className="h-11 text-base"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="idea-description" className="text-sm font-semibold">Describe the need</label>
            <Textarea
              id="idea-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What are you trying to accomplish? What happens today, who is affected, and what would a good outcome look like?"
              className="min-h-[190px] resize-y text-base leading-6"
            />
            <p className="text-xs text-muted-foreground">Specific examples help the community understand and support your idea.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Area of the product</label>
            <Select value={category} onValueChange={(value) => setCategory(value as ProductIdeaCategory)}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_IDEA_CATEGORIES.map((value) => (
                  <SelectItem key={value} value={value}>{PRODUCT_IDEA_CATEGORY_LABELS[value]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-4">
            <div className="flex gap-3">
              <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-sm leading-6 text-muted-foreground">
                Your name and idea will be visible to other signed-in Proj OS clients. You will automatically be its first supporter.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!title.trim() || !description.trim() || create.isPending}>
            {create.isPending ? 'Sharing…' : 'Share idea'}
            {!create.isPending && <ArrowUpRight className="ml-2 h-4 w-4" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminUpdateDialog({
  idea,
  open,
  onOpenChange,
  initialStatus,
  initialTitle = '',
  initialBody = '',
}: {
  idea: ProductIdea;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStatus?: ProductIdeaStatus;
  initialTitle?: string;
  initialBody?: string;
}) {
  const publish = usePublishProductIdeaUpdate();
  const [status, setStatus] = useState<ProductIdeaStatus>(initialStatus ?? idea.status);
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const statusChanged = status !== idea.status;
  const needsRequiredExplanation = status === 'rejected';
  const canSubmit = needsRequiredExplanation
    ? Boolean(title.trim() && body.trim())
    : statusChanged || Boolean(title.trim() && body.trim());

  const submit = async () => {
    if (!canSubmit) return;
    const statusLabel = PRODUCT_IDEA_STATUS_META[status].label;
    const resolvedTitle = title.trim() || (status === 'shipped' ? 'Executed and available' : `Moved to ${statusLabel}`);
    const resolvedBody = body.trim() || (
      status === 'shipped'
        ? 'This improvement has been completed, verified, and is now available in Proj OS.'
        : `The Proj OS product team moved this idea to ${statusLabel}. Additional details will be posted as work progresses.`
    );
    try {
      await publish.mutateAsync({ ideaId: idea.id, status, title: resolvedTitle, body: resolvedBody });
      setTitle('');
      setBody('');
      onOpenChange(false);
    } catch {
      // Hook displays the server/RLS error.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage idea progress</DialogTitle>
          <DialogDescription>
            Change the delivery milestone, add a client-facing update, or mark the improvement executed. Every change stays in the permanent history.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-semibold">Milestone</label>
              <span className="text-xs text-muted-foreground">Current: {PRODUCT_IDEA_STATUS_META[idea.status].label}</span>
            </div>
            <Select value={status} onValueChange={(value) => setStatus(value as ProductIdeaStatus)}>
              <SelectTrigger aria-label="Idea milestone" className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRODUCT_IDEA_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>{PRODUCT_IDEA_STATUS_META[value].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PRODUCT_IDEA_STATUSES.map((value) => {
                const meta = PRODUCT_IDEA_STATUS_META[value];
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={status === value}
                    onClick={() => setStatus(value)}
                    className={cn(
                      'flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-all',
                      status === value
                        ? cn('ring-2 ring-primary/20', meta.tone)
                        : 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground',
                    )}
                  >
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', meta.dot)} />
                    {meta.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>
          {statusChanged && (
            <div className={cn(
              'flex items-start gap-3 rounded-xl border p-3 text-sm leading-6',
              status === 'shipped' ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-primary/15 bg-primary/[0.04] text-foreground/80',
            )}>
              {status === 'shipped' ? <PartyPopper className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /> : <SlidersHorizontal className="mt-0.5 h-5 w-5 shrink-0 text-primary" />}
              <p>
                This will move the idea from <strong>{PRODUCT_IDEA_STATUS_META[idea.status].label}</strong> to{' '}
                <strong>{PRODUCT_IDEA_STATUS_META[status].label}</strong>.
                {status !== 'rejected' && ' A concise public note will be generated if you leave the update fields blank.'}
              </p>
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="update-title" className="text-sm font-semibold">
              Update headline {statusChanged && status !== 'rejected' && <span className="font-normal text-muted-foreground">(optional)</span>}
            </label>
            <Input
              id="update-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={status === 'rejected' ? 'Why we are not moving forward' : 'What changed?'}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="update-body" className="text-sm font-semibold">
              {status === 'rejected' ? 'Decision and reason' : 'Update for clients'}
              {statusChanged && status !== 'rejected' && <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}
            </label>
            <Textarea
              id="update-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={
                status === 'rejected'
                  ? 'Explain the constraint, tradeoff, or alternative so the requester understands the decision.'
                  : 'Explain what the team reviewed, what happens next, and anything clients should know.'
              }
              className="min-h-[150px] resize-y"
            />
          </div>
          {status === 'rejected' && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-800">
              A clear explanation is required before an idea can be marked “Not moving forward.”
            </div>
          )}
          {status === 'shipped' && (
            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <div className="relative z-10 flex gap-3">
                <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <p><strong>Execution complete.</strong> Saving this milestone activates the completed visual treatment and celebration across the board.</p>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!canSubmit || publish.isPending}>
            {publish.isPending
              ? 'Saving…'
              : status === 'shipped'
                ? 'Mark executed'
                : statusChanged
                  ? 'Save milestone'
                  : 'Publish update'}
            {!publish.isPending && <Send className="ml-2 h-4 w-4" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IdeaDetailSheet({
  idea,
  open,
  onOpenChange,
  isAdmin,
}: {
  idea: ProductIdea | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
}) {
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminDraft, setAdminDraft] = useState<{
    nonce: number;
    status?: ProductIdeaStatus;
    title?: string;
    body?: string;
  }>({ nonce: 0 });
  const [expandedUpdateIds, setExpandedUpdateIds] = useState<Set<string>>(
    () => new Set(idea?.updates[0] ? [idea.updates[0].id] : []),
  );
  if (!idea) return null;

  const rejectedUpdate = idea.updates.find((update) => update.to_status === 'rejected');
  const executed = idea.status === 'shipped';
  const allUpdatesExpanded = idea.updates.length > 0 && idea.updates.every((update) => expandedUpdateIds.has(update.id));

  const openAdminEditor = (
    status: ProductIdeaStatus = idea.status,
    defaults?: { title?: string; body?: string },
  ) => {
    setAdminDraft((current) => ({
      nonce: current.nonce + 1,
      status,
      title: defaults?.title,
      body: defaults?.body,
    }));
    setAdminOpen(true);
  };

  const toggleUpdate = (updateId: string) => {
    setExpandedUpdateIds((current) => {
      const next = new Set(current);
      if (next.has(updateId)) next.delete(updateId);
      else next.add(updateId);
      return next;
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-2xl">
          <div className={cn(
            'relative overflow-hidden border-b px-6 pb-6 pt-8 sm:px-8',
            executed
              ? 'border-slate-200 bg-gradient-to-br from-slate-100 via-slate-50 to-stone-100'
              : 'bg-gradient-to-br from-primary/[0.08] via-background to-amber-500/[0.07]',
          )}>
            <SheetHeader className="relative z-10 pr-7 text-left">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={idea.status} />
                <span className="text-xs font-semibold text-muted-foreground">
                  {PRODUCT_IDEA_CATEGORY_LABELS[idea.category]}
                </span>
              </div>
              <SheetTitle className="text-2xl font-bold leading-tight tracking-[-0.03em] sm:text-3xl">
                {idea.title}
              </SheetTitle>
              <SheetDescription asChild>
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={idea.requester_avatar_url ?? undefined} />
                    <AvatarFallback className="text-[9px]">{initials(idea.requester_name)}</AvatarFallback>
                  </Avatar>
                  <span>Requested by <strong className="font-semibold text-foreground">{idea.requester_name}</strong></span>
                  <span>·</span>
                  <span>{format(new Date(idea.created_at), 'MMM d, yyyy')}</span>
                </div>
              </SheetDescription>
            </SheetHeader>
          </div>

          <div className="space-y-8 px-6 py-7 sm:px-8">
            {executed && (
              <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                <div className="relative z-10 flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm ring-1 ring-slate-200">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Executed successfully</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      This client improvement has completed the delivery path and is now part of Proj OS.
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm ring-1 ring-slate-200">
                      <Sparkles className="h-3.5 w-3.5 text-amber-600" /> +1 client improvement delivered
                    </div>
                  </div>
                </div>
              </section>
            )}

            <section className="flex items-start gap-4">
              <VoteControl idea={idea} compact />
              <div>
                <p className="text-sm font-semibold text-foreground">Community support</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {idea.upvotes} up {idea.upvotes === 1 ? 'vote' : 'votes'} · {idea.downvotes} down {idea.downvotes === 1 ? 'vote' : 'votes'}
                </p>
              </div>
            </section>

            <section>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">The idea</p>
              <p className="whitespace-pre-wrap text-[15px] leading-7 text-foreground/90">{idea.description}</p>
            </section>

            <section className="rounded-2xl border bg-muted/20 p-5">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-bold">Delivery progress</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {isAdmin ? 'Select a milestone below or publish a client update.' : 'Updated by the Proj OS product team'}
                  </p>
                </div>
                {isAdmin && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => openAdminEditor()}>
                      <MessageSquareText className="mr-1.5 h-4 w-4" /> Add update
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openAdminEditor(idea.status)}>
                      <SlidersHorizontal className="mr-1.5 h-4 w-4" /> Manage milestone
                    </Button>
                    {!executed && (
                      <Button
                        size="sm"
                        onClick={() => openAdminEditor('shipped', {
                          title: 'Executed and available',
                          body: 'This improvement has been completed, verified, and is now available in Proj OS.',
                        })}
                        className="bg-slate-700 text-white hover:bg-slate-600"
                      >
                        <PartyPopper className="mr-1.5 h-4 w-4" /> Mark executed
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <ProgressTickler
                status={idea.status}
                onStageSelect={isAdmin ? (status) => openAdminEditor(status) : undefined}
              />
            </section>

            {idea.status === 'rejected' && (
              <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
                <div className="flex gap-3">
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                  <div>
                    <p className="font-bold text-rose-900">Why this is not moving forward</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-rose-800">
                      {rejectedUpdate?.body ?? 'The product team has not yet published the decision note.'}
                    </p>
                  </div>
                </div>
              </section>
            )}

            <section>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Updates &amp; comments</p>
                  <h3 className="mt-1 text-lg font-bold">From request to execution</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{idea.updates.length + 1} events</span>
                  {idea.updates.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2.5 text-xs"
                      onClick={() => setExpandedUpdateIds(
                        allUpdatesExpanded ? new Set() : new Set(idea.updates.map((update) => update.id)),
                      )}
                    >
                      {allUpdatesExpanded ? 'Collapse all' : 'Expand all'}
                    </Button>
                  )}
                </div>
              </div>

              <div className="relative space-y-0 pl-8 before:absolute before:bottom-3 before:left-[11px] before:top-3 before:w-px before:bg-border">
                {idea.updates.map((update, index) => {
                  const status = update.to_status ?? idea.status;
                  const expanded = expandedUpdateIds.has(update.id);
                  return (
                    <div key={update.id} className="relative pb-7">
                      <div className={cn('absolute -left-8 top-1 h-6 w-6 rounded-full border-4 border-background', PRODUCT_IDEA_STATUS_META[status].dot)} />
                      <button
                        type="button"
                        aria-expanded={expanded}
                        onClick={() => toggleUpdate(update.id)}
                        className="group/update flex w-full items-start justify-between gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold group-hover/update:text-primary">{update.title}</h4>
                            {index === 0 && <Badge className="rounded-full text-[10px]">Latest</Badge>}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {format(new Date(update.created_at), 'MMM d, yyyy')} · {update.author_name}
                          </p>
                        </div>
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors group-hover/update:border-primary/30 group-hover/update:text-primary">
                          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </span>
                      </button>
                      {expanded && (
                        <div className="animate-fade-in">
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground/80">{update.body}</p>
                          {update.update_type === 'status' && update.to_status && (
                            <div className="mt-3"><StatusBadge status={update.to_status} /></div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="relative pb-1">
                  <div className="absolute -left-8 top-1 flex h-6 w-6 items-center justify-center rounded-full border-4 border-background bg-slate-400 text-white">
                    <CircleDot className="h-3 w-3" />
                  </div>
                  <h4 className="font-bold">Idea submitted</h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {format(new Date(idea.created_at), 'MMM d, yyyy')} · {idea.requester_name}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </SheetContent>
      </Sheet>
      <AdminUpdateDialog
        key={`${idea.id}-${adminDraft.nonce}`}
        idea={idea}
        open={adminOpen}
        onOpenChange={setAdminOpen}
        initialStatus={adminDraft.status}
        initialTitle={adminDraft.title}
        initialBody={adminDraft.body}
      />
    </>
  );
}

function EmptyIdeas({ mine, onCreate }: { mine: boolean; onCreate: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Lightbulb className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-bold">{mine ? 'You have not shared an idea yet' : 'No ideas match this view'}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {mine
          ? 'Share the workflow, report, or control that would make the biggest difference to your team.'
          : 'Try a different search or status filter.'}
      </p>
      {mine && <Button className="mt-5" onClick={onCreate}><Plus className="mr-2 h-4 w-4" />Share your first idea</Button>}
    </div>
  );
}

export default function ProductIdeasPage() {
  const { user } = useAuth();
  const { currentRole } = useUserPermissions();
  const { data: ideas = [], isLoading, error } = useProductIdeas();
  const [view, setView] = useState<BoardView>('browse');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortMode>('popular');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const isAdmin = currentRole === 'admin';
  const selectedIdea = ideas.find((idea) => idea.id === selectedId) ?? null;

  const metrics = useMemo(() => ({
    ideas: ideas.length,
    votes: ideas.reduce((sum, idea) => sum + idea.upvotes + idea.downvotes, 0),
    roadmap: ideas.filter((idea) => isProductIdeaRoadmapStatus(idea.status)).length,
    shipped: ideas.filter((idea) => idea.status === 'shipped').length,
  }), [ideas]);

  const visibleIdeas = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = ideas.filter((idea) => {
      if (view === 'mine' && idea.created_by !== user?.id) return false;
      if (statusFilter === 'review' && !['submitted', 'under_review'].includes(idea.status)) return false;
      if (statusFilter === 'roadmap' && !isProductIdeaRoadmapStatus(idea.status)) return false;
      if (statusFilter === 'shipped' && idea.status !== 'shipped') return false;
      if (statusFilter === 'rejected' && idea.status !== 'rejected') return false;
      if (query) {
        const haystack = `${idea.title} ${idea.description} ${PRODUCT_IDEA_CATEGORY_LABELS[idea.category]}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === 'recently_updated') return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      return productIdeaScore(b.upvotes, b.downvotes) - productIdeaScore(a.upvotes, a.downvotes);
    });
  }, [ideas, search, sort, statusFilter, user?.id, view]);

  const updateFeed = useMemo(() =>
    ideas
      .flatMap((idea) => idea.updates.map((update) => ({ idea, update })))
      .sort((a, b) => new Date(b.update.created_at).getTime() - new Date(a.update.created_at).getTime()),
  [ideas]);

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.08),transparent_34%),linear-gradient(to_bottom,hsl(var(--background)),hsl(var(--muted)/0.22))]">
      <div className="mx-auto max-w-7xl space-y-7 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <header className="overflow-hidden rounded-3xl border border-primary/15 bg-[linear-gradient(135deg,hsl(var(--primary)/0.96),hsl(164_60%_16%),hsl(40_45%_24%))] px-6 py-7 text-primary-foreground shadow-xl shadow-primary/10 sm:px-8 sm:py-9 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/85 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                Community roadmap
              </div>
              <h1 className="text-3xl font-bold tracking-[-0.035em] text-white sm:text-4xl lg:text-5xl">
                Help shape what Proj OS builds next.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
                Share the capability your team needs, support ideas from other clients, and follow every decision from review to execution.
              </p>
              <Button
                size="lg"
                onClick={() => setCreateOpen(true)}
                className="mt-6 h-12 rounded-xl bg-amber-300 px-5 font-bold text-emerald-950 shadow-lg shadow-black/15 hover:bg-amber-200"
              >
                <Plus className="mr-2 h-5 w-5" />
                Share an idea
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
              {[
                { label: 'Ideas', value: metrics.ideas, icon: Lightbulb },
                { label: 'Votes', value: metrics.votes, icon: TrendingUp },
                { label: 'On roadmap', value: metrics.roadmap, icon: Clock3 },
                { label: 'Executed', value: metrics.shipped, icon: CheckCircle2 },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="min-w-[130px] rounded-2xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between text-white/60">
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em]">{label}</span>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        <Tabs value={view} onValueChange={(value) => setView(value as BoardView)}>
          <div className="flex flex-col gap-4 border-b sm:flex-row sm:items-end sm:justify-between">
            <TabsList className="h-auto justify-start gap-5 rounded-none bg-transparent p-0">
              <TabsTrigger value="browse" className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-1 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                Browse ideas
              </TabsTrigger>
              <TabsTrigger value="mine" className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-1 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                My ideas
              </TabsTrigger>
              <TabsTrigger value="updates" className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-1 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                <span className="relative">Product updates{updateFeed.length > 0 && <span className="absolute -right-2 -top-1 h-1.5 w-1.5 rounded-full bg-amber-500" />}</span>
              </TabsTrigger>
            </TabsList>
            {isAdmin && (
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
                <Sparkles className="h-3.5 w-3.5" /> Admin controls enabled
              </div>
            )}
          </div>

          <TabsContent value="browse" className="mt-6">
            <IdeasBoard
              ideas={visibleIdeas}
              isLoading={isLoading}
              error={error as Error | null}
              search={search}
              setSearch={setSearch}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              sort={sort}
              setSort={setSort}
              onOpen={(idea) => setSelectedId(idea.id)}
              onCreate={() => setCreateOpen(true)}
              mine={false}
            />
          </TabsContent>

          <TabsContent value="mine" className="mt-6">
            <IdeasBoard
              ideas={visibleIdeas}
              isLoading={isLoading}
              error={error as Error | null}
              search={search}
              setSearch={setSearch}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              sort={sort}
              setSort={setSort}
              onOpen={(idea) => setSelectedId(idea.id)}
              onCreate={() => setCreateOpen(true)}
              mine
            />
          </TabsContent>

          <TabsContent value="updates" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
                <div className="mb-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">Running product log</p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight">What changed, and why</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Every escalation, roadmap move, execution, and decision from the Proj OS team.</p>
                </div>
                {updateFeed.length === 0 ? (
                  <div className="rounded-xl border border-dashed py-14 text-center text-sm text-muted-foreground">No product updates have been published yet.</div>
                ) : (
                  <div className="relative space-y-0 pl-9 before:absolute before:bottom-4 before:left-3 before:top-4 before:w-px before:bg-border">
                    {updateFeed.map(({ idea, update }) => (
                      <button
                        key={update.id}
                        type="button"
                        onClick={() => setSelectedId(idea.id)}
                        className="group relative block w-full pb-8 text-left"
                      >
                        <span className={cn('absolute -left-9 top-1 h-6 w-6 rounded-full border-4 border-background', PRODUCT_IDEA_STATUS_META[update.to_status ?? idea.status].dot)} />
                        <div className="rounded-xl border border-transparent p-1 transition-colors group-hover:border-border group-hover:bg-muted/30 sm:p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={update.to_status ?? idea.status} />
                            <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}</span>
                          </div>
                          <h3 className="mt-3 text-lg font-bold tracking-tight group-hover:text-primary">{update.title}</h3>
                          <p className="mt-1 text-sm font-semibold text-foreground/70">{idea.title}</p>
                          <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{update.body}</p>
                          <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary">Read full history <ChevronRight className="h-3.5 w-3.5" /></span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <aside className="space-y-4">
                <div className="rounded-2xl border bg-card p-5 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800"><Lightbulb className="h-5 w-5" /></div>
                  <h3 className="mt-4 font-bold">A transparent feedback loop</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">The board keeps good ideas visible—even when the answer is “not now.” Decisions stay attached to the original request.</p>
                </div>
                <div className="rounded-2xl border bg-card p-5 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Response language</p>
                  <div className="mt-4 space-y-4 text-sm">
                    <div className="flex gap-3"><CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" /><p><strong>Review</strong><br /><span className="text-muted-foreground">We are validating the need and fit.</span></p></div>
                    <div className="flex gap-3"><Send className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" /><p><strong>Escalated</strong><br /><span className="text-muted-foreground">Developers are assessing the path.</span></p></div>
                    <div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" /><p><strong>Executed</strong><br /><span className="text-muted-foreground">The capability is completed and available.</span></p></div>
                  </div>
                </div>
              </aside>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <CreateIdeaDialog open={createOpen} onOpenChange={setCreateOpen} />
      <IdeaDetailSheet
        key={selectedIdea ? `${selectedIdea.id}-${selectedIdea.updated_at}` : 'none'}
        idea={selectedIdea}
        open={Boolean(selectedIdea)}
        onOpenChange={(open) => !open && setSelectedId(null)}
        isAdmin={isAdmin}
      />
    </div>
  );
}

function IdeasBoard({
  ideas,
  isLoading,
  error,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  sort,
  setSort,
  onOpen,
  onCreate,
  mine,
}: {
  ideas: ProductIdea[];
  isLoading: boolean;
  error: Error | null;
  search: string;
  setSearch: (value: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  sort: SortMode;
  setSort: (value: SortMode) => void;
  onOpen: (idea: ProductIdea) => void;
  onCreate: () => void;
  mine: boolean;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-sm sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search client ideas…"
              className="h-11 border-0 bg-muted/45 pl-10 shadow-none focus-visible:ring-1"
            />
          </div>
          <Select value={sort} onValueChange={(value) => setSort(value as SortMode)}>
            <SelectTrigger className="h-11 w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Most supported</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="recently_updated">Recently updated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                'shrink-0 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors',
                statusFilter === filter.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex gap-4 rounded-2xl border bg-card p-5">
              <Skeleton className="h-28 w-12 rounded-xl" />
              <div className="flex-1 space-y-3"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></div>
            </div>
          ))
        ) : error ? (
          <div className="rounded-2xl border border-destructive/25 bg-destructive/5 px-6 py-12 text-center">
            <XCircle className="mx-auto h-7 w-7 text-destructive" />
            <h3 className="mt-3 font-bold">Product Ideas could not be loaded</h3>
            <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
          </div>
        ) : ideas.length === 0 ? (
          <EmptyIdeas mine={mine} onCreate={onCreate} />
        ) : (
          ideas.map((idea) => <IdeaCard key={idea.id} idea={idea} onOpen={() => onOpen(idea)} />)
        )}
      </div>

      <aside className="space-y-4">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MessageSquareText className="h-5 w-5" />
          </div>
          <h3 className="mt-4 font-bold">How ideas move</h3>
          <ol className="mt-4 space-y-4">
            {[
              ['1', 'Share the need', 'Explain the outcome, not just the button.'],
              ['2', 'Clients vote', 'Support helps reveal shared priorities.'],
              ['3', 'We publish decisions', 'Every move includes context and next steps.'],
            ].map(([number, title, copy]) => (
              <li key={number} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">{number}</span>
                <div><p className="text-sm font-semibold">{title}</p><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{copy}</p></div>
              </li>
            ))}
          </ol>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="group w-full rounded-2xl border border-primary/20 bg-primary/[0.05] p-5 text-left transition-colors hover:bg-primary/[0.08]"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Plus className="h-4 w-4" /></div>
            <ChevronRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
          </div>
          <p className="mt-4 font-bold">What would help your team?</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">There is no word limit. Context helps us make a better decision.</p>
        </button>
      </aside>
    </div>
  );
}
