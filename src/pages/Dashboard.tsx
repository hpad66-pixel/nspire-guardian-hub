import { useState, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format, differenceInDays, parseISO, addDays, startOfDay,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { useQueryClient, useQuery } from '@tanstack/react-query';

// Icons
import {
  AlertTriangle, Clock, Users, CheckCircle2, RefreshCw,
  ChevronDown, ChevronUp, BadgeCheck, GraduationCap, ShieldAlert,
  Truck, Share2, ArrowRight, Wrench, FolderKanban, ClipboardCheck,
  Activity, CircleDot, TrendingUp, TrendingDown, Minus,
  ShieldCheck, CalendarDays, Building2, TriangleAlert,
} from 'lucide-react';

// UI
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

// Supabase client
import { supabase } from '@/integrations/supabase/client';

// Hooks
import { useAuth } from '@/hooks/useAuth';
import { useMyProfile } from '@/hooks/useMyProfile';
import { useIssues } from '@/hooks/useIssues';
import { useProjects } from '@/hooks/useProjects';
import { useWorkOrders } from '@/hooks/useWorkOrders';
import { useCommandCenter, type CommandCenterAlert, type TeamMemberStatus } from '@/hooks/useCommandCenter';
import { useCompanyBranding } from '@/hooks/useCompanyBranding';
import { useModules } from '@/contexts/ModuleContext';
import { useAllCredentials, getCredentialStatus } from '@/hooks/useCredentials';
import { useAllAssignments } from '@/hooks/useTraining';
import { usePendingIncidents } from '@/hooks/useSafety';
import { useExpiringDocuments } from '@/hooks/useEquipment';
import { usePortals } from '@/hooks/usePortal';

// ─────────────────────────────────────────────────────────────────────────────
// Constants & Helpers
// ─────────────────────────────────────────────────────────────────────────────

const MODULE_META: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  credentials: { icon: BadgeCheck,    color: 'text-blue-500',   bg: 'bg-blue-500/10',   label: 'Credentials' },
  training:    { icon: GraduationCap, color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'Training'    },
  safety:      { icon: ShieldAlert,   color: 'text-amber-500',  bg: 'bg-amber-500/10',  label: 'Safety'      },
  equipment:   { icon: Truck,         color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Equipment'   },
  portals:     { icon: Share2,        color: 'text-teal-500',   bg: 'bg-teal-500/10',   label: 'Portals'     },
  projects:    { icon: FolderKanban,  color: 'text-indigo-500', bg: 'bg-indigo-500/10', label: 'Projects'    },
  core:        { icon: AlertTriangle, color: 'text-destructive',bg: 'bg-destructive/10',label: 'System'      },
};

const DOT_COLORS = {
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red:   'bg-destructive',
  gray:  'bg-muted-foreground/30',
} as const;

const DOT_RING = {
  red:   'ring-destructive/30',
  amber: 'ring-amber-500/30',
  green: 'ring-green-500/20',
  gray:  'ring-border',
} as const;

function getGreeting(name: string | null): string {
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const first = name?.split(' ')[0];
  return first ? `${greet}, ${first}` : greet;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('');
}

const cardVariants = {
  hidden:  { opacity: 0, y: 8 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.035, duration: 0.2 } }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared: Zone Section Wrapper
// ─────────────────────────────────────────────────────────────────────────────

function ZoneSection({
  icon: Icon, iconClass, accentClass, title, badge, badgeClass, subtext, children,
}: {
  icon: React.ElementType;
  iconClass: string;
  accentClass: string;
  title: string;
  badge?: number | string;
  badgeClass?: string;
  subtext?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className={cn('flex items-start gap-3 pl-4 border-l-4', accentClass)}>
        <div className="flex-1 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Icon className={cn('h-4 w-4', iconClass)} />
            <h2 className="text-base font-semibold leading-none">{title}</h2>
            {badge !== undefined && (
              <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full leading-none', badgeClass)}>
                {badge}
              </span>
            )}
          </div>
          {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Zone 1 — Alert Card
// ─────────────────────────────────────────────────────────────────────────────

function AlertCard({ alert, index, isCritical }: { alert: CommandCenterAlert; index: number; isCritical: boolean }) {
  const navigate = useNavigate();
  const mod = MODULE_META[alert.module] ?? MODULE_META.core;
  const ModIcon = mod.icon;

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3.5 border-l-4',
        isCritical ? 'border-l-destructive' : 'border-l-amber-500'
      )}
    >
      <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', mod.bg)}>
        <ModIcon className={cn('h-4 w-4', mod.color)} />
      </div>

      {(alert.personAvatar !== undefined || alert.personName) && (
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarImage src={alert.personAvatar} />
          <AvatarFallback className="text-[9px]">{getInitials(alert.personName)}</AvatarFallback>
        </Avatar>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate leading-tight">{alert.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{alert.subtitle}</p>
      </div>

      <Button
        size="sm"
        variant="outline"
        className="shrink-0 text-xs h-7 gap-1"
        onClick={() => navigate(alert.actionPath)}
      >
        {alert.actionLabel}
        <ArrowRight className="h-3 w-3" />
      </Button>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Zone 2 — Coming Up Timeline
// ─────────────────────────────────────────────────────────────────────────────

interface TimelineItem {
  id: string;
  module: string;
  title: string;
  person?: string;
  date: Date;
  daysUntil: number;
  actionPath: string;
}

function getBucket(days: number): string {
  if (days <= 7)  return 'This week';
  if (days <= 14) return 'Next week';
  if (days <= 28) return 'In 2–4 weeks';
  return 'In 4–8 weeks';
}

const BUCKET_ORDER = ['This week', 'Next week', 'In 2–4 weeks', 'In 4–8 weeks'];

function TimelineCard({ item, index }: { item: TimelineItem; index: number }) {
  const navigate = useNavigate();
  const mod = MODULE_META[item.module] ?? MODULE_META.core;
  const ModIcon = mod.icon;

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      onClick={() => navigate(item.actionPath)}
      className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3.5 cursor-pointer hover:bg-accent/40 transition-colors group"
    >
      <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', mod.bg)}>
        <ModIcon className={cn('h-4 w-4', mod.color)} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate leading-tight">{item.title}</p>
        {item.person && <p className="text-xs text-muted-foreground">{item.person}</p>}
      </div>

      <div className="text-right shrink-0">
        <p className="text-xs font-semibold tabular-nums">
          {item.daysUntil === 0 ? 'Today' : `${item.daysUntil}d`}
        </p>
        <p className="text-[10px] text-muted-foreground">{format(item.date, 'MMM d')}</p>
      </div>

      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </motion.div>
  );
}

function ComingUpZone() {
  const { isModuleEnabled } = useModules();
  const { data: credentials = [], isLoading: l1 } = useAllCredentials();
  const { data: assignments = [], isLoading: l2 } = useAllAssignments();
  const { data: expiringDocs = [], isLoading: l3 } = useExpiringDocuments(60);
  const isLoading = l1 || l2 || l3;

  const items = useMemo((): TimelineItem[] => {
    const now = startOfDay(new Date());
    const list: TimelineItem[] = [];

    // Credentials expiring in next 60 days
    if (isModuleEnabled('credentialWalletEnabled')) {
      for (const cred of credentials) {
        if (!cred.expiry_date) continue;
        const date = parseISO(cred.expiry_date);
        const days = differenceInDays(date, now);
        if (days < 0 || days > 60) continue;
        list.push({
          id: `cred-${cred.id}`,
          module: 'credentials',
          title: `${cred.custom_type_label ?? cred.credential_type} expires`,
          person: (cred.holder as any)?.full_name ?? undefined,
          date,
          daysUntil: days,
          actionPath: '/credentials',
        });
      }
    }

    // Training assignments due in next 60 days
    if (isModuleEnabled('trainingHubEnabled')) {
      for (const a of assignments) {
        if ((a.status as string) === 'completed' || !a.due_date) continue;
        const date = parseISO(a.due_date);
        const days = differenceInDays(date, now);
        if (days < 0 || days > 60) continue;
        const assignee = (a as any).assignee;
        list.push({
          id: `training-${a.id}`,
          module: 'training',
          title: `${a.lw_course_id ?? 'Training'} due`,
          person: assignee?.full_name ?? undefined,
          date,
          daysUntil: days,
          actionPath: '/training/dashboard',
        });
      }
    }

    // Equipment documents expiring in next 60 days
    if (isModuleEnabled('equipmentTrackerEnabled')) {
      for (const doc of expiringDocs) {
        if (!doc.expiry_date) continue;
        const date = parseISO(doc.expiry_date);
        const days = differenceInDays(date, now);
        if (days < 0 || days > 60) continue;
        const assetName = (doc as any).asset?.name ?? 'Asset';
        list.push({
          id: `equip-${doc.id}`,
          module: 'equipment',
          title: `${assetName} — ${doc.document_type}`,
          date,
          daysUntil: days,
          actionPath: '/equipment',
        });
      }
    }

    return list.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [credentials, assignments, expiringDocs, isModuleEnabled]);

  const grouped = useMemo(() => {
    const g: Record<string, TimelineItem[]> = {};
    for (const item of items) {
      const bucket = getBucket(item.daysUntil);
      if (!g[bucket]) g[bucket] = [];
      g[bucket].push(item);
    }
    return g;
  }, [items]);

  if (isLoading) {
    return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card py-10 text-center">
        <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
        <p className="text-sm font-medium">Nothing due in the next 60 days</p>
        <p className="text-xs text-muted-foreground mt-1">All modules are clear of upcoming deadlines</p>
      </div>
    );
  }

  let itemIndex = 0;
  return (
    <div className="space-y-5">
      {BUCKET_ORDER.filter(b => grouped[b]?.length).map(bucket => (
        <div key={bucket} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{bucket}</span>
            <div className="flex-1 h-px bg-border/60" />
            <span className="text-xs text-muted-foreground">{grouped[bucket].length}</span>
          </div>
          {grouped[bucket].map(item => <TimelineCard key={item.id} item={item} index={itemIndex++} />)}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Zone 3 — Team Compliance Grid
// ─────────────────────────────────────────────────────────────────────────────

const TEAM_PAGE_SIZE = 12;

function TeamMemberCard({ member, index }: { member: TeamMemberStatus; index: number }) {
  const dotLabel =
    member.dot === 'red'   ? 'Non-compliant' :
    member.dot === 'amber' ? 'Attention needed' :
    member.dot === 'green' ? 'Fully compliant' : 'No data';

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'relative flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-card p-4 text-center',
        member.dot === 'red'   && 'bg-destructive/5',
        member.dot === 'amber' && 'bg-amber-500/5',
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'absolute top-3 right-3 h-2.5 w-2.5 rounded-full ring-2',
            DOT_COLORS[member.dot],
            DOT_RING[member.dot],
          )} />
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs font-semibold">{dotLabel}</p>
          {member.worstReason && <p className="text-xs text-muted-foreground max-w-[200px]">{member.worstReason}</p>}
        </TooltipContent>
      </Tooltip>

      <Avatar className="h-10 w-10">
        <AvatarImage src={member.avatar} />
        <AvatarFallback className="text-xs font-semibold">{getInitials(member.name)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 w-full">
        <p className="text-xs font-semibold truncate">{member.name}</p>
        {(member.jobTitle || member.department) && (
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
            {member.jobTitle ?? member.department}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function TeamZone({ teamStatuses, isLoading }: { teamStatuses: TeamMemberStatus[]; isLoading: boolean }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? teamStatuses : teamStatuses.slice(0, TEAM_PAGE_SIZE);
  const hasMore = teamStatuses.length > TEAM_PAGE_SIZE;

  const redCount   = teamStatuses.filter(t => t.dot === 'red').length;
  const amberCount = teamStatuses.filter(t => t.dot === 'amber').length;
  const greenCount = teamStatuses.filter(t => t.dot === 'green').length;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  if (teamStatuses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card py-10 text-center">
        <Users className="h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm font-medium text-muted-foreground">No team data available</p>
        <p className="text-xs text-muted-foreground mt-1">Enable Credentials or Training modules to see team compliance</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {redCount > 0   && <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive inline-block" />{redCount} non-compliant</span>}
        {amberCount > 0 && <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />{amberCount} needs attention</span>}
        {greenCount > 0 && <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" />{greenCount} compliant</span>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <AnimatePresence>
          {visible.map((member, i) => (
            <TeamMemberCard key={member.userId} member={member} index={i} />
          ))}
        </AnimatePresence>
      </div>

      {hasMore && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs gap-1"
          onClick={() => setShowAll(v => !v)}
        >
          {showAll
            ? <><ChevronUp className="h-3.5 w-3.5" />Show less</>
            : <><ChevronDown className="h-3.5 w-3.5" />View all {teamStatuses.length} team members</>}
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Zone 4 — Module Quick Stat Cards
// ─────────────────────────────────────────────────────────────────────────────

interface StatLine {
  label: string;
  value: number;
  highlight: false | 'red' | 'amber';
}

function ModuleStatCard({
  module, isLoading, enabled, path, stats, overrideLabel, overrideIcon,
}: {
  module: string;
  isLoading: boolean;
  enabled: boolean;
  path: string;
  stats: StatLine[];
  overrideLabel?: string;
  overrideIcon?: React.ElementType;
}) {
  const navigate = useNavigate();
  const meta = MODULE_META[module] ?? MODULE_META.core;
  const Icon = overrideIcon ?? meta.icon;
  const label = overrideLabel ?? meta.label;

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3 flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center', meta.bg)}>
            <Icon className={cn('h-3.5 w-3.5', meta.color)} />
          </div>
          <span className="text-sm font-semibold">{label}</span>
        </div>
        {!enabled && <Badge variant="secondary" className="text-[10px] py-0">Off</Badge>}
      </div>

      {isLoading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-4 rounded" />)}
        </div>
      ) : !enabled ? (
        <p className="text-xs text-muted-foreground">Module not enabled</p>
      ) : (
        <div className="space-y-1.5 flex-1">
          {stats.map(stat => (
            <div key={stat.label} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{stat.label}</span>
              <span className={cn(
                'font-semibold tabular-nums',
                stat.highlight === 'red'   ? 'text-destructive' :
                stat.highlight === 'amber' ? 'text-amber-600 dark:text-amber-400' :
                ''
              )}>
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="w-full h-7 text-xs gap-1 mt-auto"
        onClick={() => navigate(path)}
      >
        Go to {label}
        <ArrowRight className="h-3 w-3" />
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Equipment stats (asset count + checkout count)
// ─────────────────────────────────────────────────────────────────────────────

function useEquipmentStats(enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['command-center', 'equipment-stats'],
    enabled: !!user && enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [totalRes, checkoutRes] = await Promise.all([
        supabase.from('equipment_assets').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('equipment_checkouts').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);
      return {
        total:      totalRes.count ?? 0,
        checkedOut: checkoutRes.count ?? 0,
      };
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual Module Stat Cards
// ─────────────────────────────────────────────────────────────────────────────

function CredentialsStatCard() {
  const { isModuleEnabled } = useModules();
  const enabled = isModuleEnabled('credentialWalletEnabled');
  const { data: credentials = [], isLoading } = useAllCredentials();

  const { active, expiringSoon, expired } = useMemo(() => ({
    active:      credentials.filter(c => getCredentialStatus(c.expiry_date) === 'current' || getCredentialStatus(c.expiry_date) === 'no_expiry').length,
    expiringSoon: credentials.filter(c => getCredentialStatus(c.expiry_date) === 'expiring_soon').length,
    expired:     credentials.filter(c => getCredentialStatus(c.expiry_date) === 'expired').length,
  }), [credentials]);

  return (
    <ModuleStatCard
      module="credentials" isLoading={isLoading} enabled={enabled} path="/credentials"
      stats={[
        { label: 'Active',    value: active,       highlight: false },
        { label: 'Expiring',  value: expiringSoon,  highlight: expiringSoon > 0 ? 'amber' : false },
        { label: 'Expired',   value: expired,       highlight: expired > 0 ? 'red' : false },
      ]}
    />
  );
}

function SafetyStatCard() {
  const { isModuleEnabled } = useModules();
  const enabled = isModuleEnabled('safetyModuleEnabled');
  const { data: incidents = [], isLoading } = usePendingIncidents();

  const { open, recordable } = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return {
      open: incidents.filter(i => i.status !== 'classified').length,
      recordable: incidents.filter(i => {
        const year = new Date(i.created_at).getFullYear();
        return year === currentYear && (i as any).is_osha_recordable === true;
      }).length,
    };
  }, [incidents]);

  return (
    <ModuleStatCard
      module="safety" isLoading={isLoading} enabled={enabled} path="/safety"
      stats={[
        { label: 'Open',            value: open,       highlight: open > 0 ? 'amber' : false },
        { label: 'Recordables YTD', value: recordable, highlight: recordable > 0 ? 'red' : false },
      ]}
    />
  );
}

function EquipmentStatCard() {
  const { isModuleEnabled } = useModules();
  const enabled = isModuleEnabled('equipmentTrackerEnabled');
  const { data: allDocs = [], isLoading: l1 } = useExpiringDocuments(365);
  const { data: equipStats, isLoading: l2 } = useEquipmentStats(enabled);

  const expired = useMemo(() =>
    allDocs.filter(d => {
      if (!d.expiry_date) return false;
      return differenceInDays(parseISO(d.expiry_date), new Date()) < 0;
    }).length,
  [allDocs]);

  return (
    <ModuleStatCard
      module="equipment" isLoading={l1 || l2} enabled={enabled} path="/equipment"
      stats={[
        { label: 'Total Assets',  value: equipStats?.total ?? 0,      highlight: false },
        { label: 'Checked Out',   value: equipStats?.checkedOut ?? 0,  highlight: false },
        { label: 'Doc Issues',    value: expired,                      highlight: expired > 0 ? 'red' : false },
      ]}
    />
  );
}

function TrainingStatCard() {
  const { isModuleEnabled } = useModules();
  const enabled = isModuleEnabled('trainingHubEnabled');
  const { data: assignments = [], isLoading } = useAllAssignments();

  const { completionsThisMonth, current } = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    // Count by checking updated_at as a proxy for recent completions
    const completionsThisMonth = assignments.filter(a => {
      if ((a.status as string) !== 'completed') return false;
      const updated = (a as any).updated_at ?? a.created_at;
      return updated && new Date(updated) >= startOfMonth;
    }).length;

    const uniqueMembers = new Set(assignments.map(a => a.assigned_to)).size;
    const membersWithOverdue = new Set(
      assignments
        .filter(a => (a.status as string) !== 'completed' && a.due_date && differenceInDays(parseISO(a.due_date), now) < 0)
        .map(a => a.assigned_to)
    ).size;

    return { completionsThisMonth, current: uniqueMembers - membersWithOverdue };
  }, [assignments]);

  return (
    <ModuleStatCard
      module="training" isLoading={isLoading} enabled={enabled} path="/training/dashboard"
      stats={[
        { label: 'Completions (mo)', value: completionsThisMonth, highlight: false },
        { label: 'Members current',  value: Math.max(0, current), highlight: false },
      ]}
    />
  );
}

function PortalsStatCard() {
  const { isModuleEnabled } = useModules();
  const enabled = isModuleEnabled('clientPortalEnabled');
  const { data: portals = [], isLoading } = usePortals();

  const { active, pending } = useMemo(() => ({
    active:  portals.filter(p => p.is_active).length,
    pending: portals.reduce((s, p) => s + (p.pending_requests_count ?? 0), 0),
  }), [portals]);

  return (
    <ModuleStatCard
      module="portals" isLoading={isLoading} enabled={enabled} path="/portals"
      stats={[
        { label: 'Active portals',    value: active,  highlight: false },
        { label: 'Pending requests',  value: pending, highlight: pending > 0 ? 'amber' : false },
      ]}
    />
  );
}

function TeamStatCard({ teamStatuses, isLoading }: { teamStatuses: TeamMemberStatus[]; isLoading: boolean }) {
  const total   = teamStatuses.length;
  const flagged = teamStatuses.filter(t => t.dot === 'red' || t.dot === 'amber').length;

  return (
    <ModuleStatCard
      module="core" isLoading={isLoading} enabled={true} path="/people"
      overrideLabel="Team" overrideIcon={Users}
      stats={[
        { label: 'Active members', value: total,   highlight: false },
        { label: 'With flags',     value: flagged, highlight: flagged > 0 ? 'amber' : false },
      ]}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI Glance Strip
// ─────────────────────────────────────────────────────────────────────────────

function KpiTile({
  label, value, icon: Icon, iconClass, accent, sub, onClick,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  iconClass: string;
  accent: string;
  sub?: string;
  onClick?: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col gap-2 rounded-xl border bg-card p-4 text-left w-full',
        accent,
        onClick ? 'cursor-pointer' : 'cursor-default',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className={cn('h-4 w-4', iconClass)} />
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard — Command Center
// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate  = useNavigate();
  const qc        = useQueryClient();

  const { data: profile }  = useMyProfile();
  const { data: branding } = useCompanyBranding();
  const { data: issues = [] }     = useIssues();
  const { data: projects = [] }   = useProjects();
  const { data: workOrders = [] } = useWorkOrders();

  const { criticalAlerts, warningAlerts, teamStatuses, isLoading, counts } = useCommandCenter();

  const [showAllCritical, setShowAllCritical] = useState(false);
  const [showAllWarning,  setShowAllWarning]  = useState(false);
  const [refreshing, setRefreshing]           = useState(false);
  const [refreshedAt, setRefreshedAt]         = useState<Date>(new Date());

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setRefreshedAt(new Date());
    setTimeout(() => setRefreshing(false), 800);
  }, [qc]);

  const openIssues     = useMemo(() => issues.filter(i => i.status !== 'resolved' && i.status !== 'closed').length, [issues]);
  const activeProjects = useMemo(() => projects.filter(p => p.status === 'active' || p.status === 'planning').length, [projects]);
  const openWOs        = useMemo(() => workOrders.filter(w => !['completed','verified','closed','rejected'].includes(w.status)).length, [workOrders]);
  const totalAlerts    = counts.critical + counts.warnings;

  const today         = format(new Date(), 'EEEE, MMMM d, yyyy');
  const greeting      = getGreeting(profile?.full_name ?? null);
  const workspaceName = branding?.company_name ?? 'Your Workspace';

  const CRITICAL_LIMIT = 5;
  const WARNING_LIMIT  = 5;
  const visibleCritical = showAllCritical ? criticalAlerts : criticalAlerts.slice(0, CRITICAL_LIMIT);
  const visibleWarning  = showAllWarning  ? warningAlerts  : warningAlerts.slice(0, WARNING_LIMIT);

  return (
    <div className="space-y-8 p-4 sm:p-6 max-w-7xl mx-auto pb-16">

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            <span>{workspaceName}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
          <p className="text-sm text-muted-foreground">{greeting} · {today}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:block">
            Refreshed {format(refreshedAt, 'h:mm a')}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Glance Strip ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiTile
          label="Open Issues" value={openIssues}
          icon={ClipboardCheck} iconClass="text-destructive" accent="border-destructive/20"
          onClick={() => navigate('/issues')}
        />
        <KpiTile
          label="Active Projects" value={activeProjects}
          icon={FolderKanban} iconClass="text-indigo-500" accent="border-indigo-500/20"
          onClick={() => navigate('/projects')}
        />
        <KpiTile
          label="Work Orders" value={openWOs}
          icon={Wrench} iconClass="text-orange-500" accent="border-orange-500/20"
          onClick={() => navigate('/work-orders')}
        />
        <KpiTile
          label="Alerts" value={totalAlerts}
          icon={TriangleAlert}
          iconClass={totalAlerts > 0 ? 'text-amber-500' : 'text-green-500'}
          accent={totalAlerts > 0 ? 'border-amber-500/20' : 'border-green-500/20'}
          sub={totalAlerts > 0 ? `${counts.critical} critical · ${counts.warnings} warnings` : 'All clear'}
        />
      </div>

      {/* ── Zone 1 — Needs Attention Now ─────────────────────────────── */}
      <ZoneSection
        icon={AlertTriangle} iconClass="text-destructive" accentClass="border-destructive"
        title="Needs Attention Now"
        badge={counts.critical > 0 ? counts.critical : undefined}
        badgeClass="bg-destructive/15 text-destructive"
        subtext="Critical items requiring immediate action"
      >
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : criticalAlerts.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/5 p-4">
            <ShieldCheck className="h-5 w-5 text-green-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">All clear</p>
              <p className="text-xs text-muted-foreground">No critical items require attention right now</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleCritical.map((alert, i) => <AlertCard key={alert.id} alert={alert} index={i} isCritical={true} />)}
            {criticalAlerts.length > CRITICAL_LIMIT && (
              <Button variant="ghost" size="sm" className="w-full text-xs gap-1" onClick={() => setShowAllCritical(v => !v)}>
                {showAllCritical
                  ? <><ChevronUp className="h-3.5 w-3.5" />Show less</>
                  : <><ChevronDown className="h-3.5 w-3.5" />Show {criticalAlerts.length - CRITICAL_LIMIT} more</>}
              </Button>
            )}
          </div>
        )}
      </ZoneSection>

      {/* Warnings sub-section */}
      {(warningAlerts.length > 0 || isLoading) && (
        <ZoneSection
          icon={Clock} iconClass="text-amber-500" accentClass="border-amber-500"
          title="Warnings"
          badge={counts.warnings > 0 ? counts.warnings : undefined}
          badgeClass="bg-amber-500/15 text-amber-700 dark:text-amber-400"
          subtext="Items needing attention soon"
        >
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : (
            <div className="space-y-2">
              {visibleWarning.map((alert, i) => <AlertCard key={alert.id} alert={alert} index={i} isCritical={false} />)}
              {warningAlerts.length > WARNING_LIMIT && (
                <Button variant="ghost" size="sm" className="w-full text-xs gap-1" onClick={() => setShowAllWarning(v => !v)}>
                  {showAllWarning
                    ? <><ChevronUp className="h-3.5 w-3.5" />Show less</>
                    : <><ChevronDown className="h-3.5 w-3.5" />Show {warningAlerts.length - WARNING_LIMIT} more</>}
                </Button>
              )}
            </div>
          )}
        </ZoneSection>
      )}

      {/* ── Zone 2 — Coming Up (Next 60 Days) ───────────────────────── */}
      <ZoneSection
        icon={CalendarDays} iconClass="text-blue-500" accentClass="border-blue-500"
        title="Coming Up"
        subtext="Expirations and deadlines in the next 60 days, sorted by urgency"
      >
        <ComingUpZone />
      </ZoneSection>

      {/* ── Zone 3 — Team Compliance ─────────────────────────────────── */}
      <ZoneSection
        icon={Users} iconClass="text-primary" accentClass="border-primary"
        title="Team Compliance"
        badge={counts.teamRed > 0 ? `${counts.teamRed} flagged` : undefined}
        badgeClass="bg-destructive/15 text-destructive"
        subtext="Compliance health snapshot for all active team members"
      >
        <TeamZone teamStatuses={teamStatuses} isLoading={isLoading} />
      </ZoneSection>

      {/* ── Zone 4 — Module Snapshot ──────────────────────────────────── */}
      <ZoneSection
        icon={Activity} iconClass="text-muted-foreground" accentClass="border-border"
        title="Module Snapshot"
        subtext="Current status across all six workforce modules"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <CredentialsStatCard />
          <SafetyStatCard />
          <EquipmentStatCard />
          <TrainingStatCard />
          <PortalsStatCard />
          <TeamStatCard teamStatuses={teamStatuses} isLoading={isLoading} />
        </div>
      </ZoneSection>

    </div>
  );
}
